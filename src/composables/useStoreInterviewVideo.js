import { reactive, ref, onBeforeUnmount } from 'vue'
import { beginStoreVideoUpload, uploadStoreVideoPart, finishStoreVideoUpload, abortStoreVideoUpload } from '@/api/kangaroo/store'
import { VIDEO_COVER_REMINDER, VIDEO_UNREADABLE_TEXT, VIDEO_UPLOADED_TEXT, formatVideoSeconds } from '@/utils/interviewVideo'

// 门店页与岗位发布页共用分段上传、取消、重试和大小/时长校验。
export function useStoreInterviewVideo({ profile, profileOpen, proxy, api = {}, limits = {}, hasCover }) {
const VIDEO_MAX_SECONDS = limits.maxSeconds ?? Infinity
const VIDEO_MAX_BYTES = limits.maxBytes ?? 300 * 1024 * 1024
const label = limits.label || '采访视频'
const beginUpload = api.begin || beginStoreVideoUpload
const appendUpload = api.append || uploadStoreVideoPart
const finishUpload = api.finish || finishStoreVideoUpload
const abortUpload = api.abort || abortStoreVideoUpload
const VIDEO_PART_RETRIES = 3
const videoInput = ref(null)
const videoUi = reactive({ running: false, percent: 0, text: '' })
let videoTask = null
let selectionVersion = 0
// 先「移除」再传新视频也算换视频：旧封面同样还在
let videoRemoved = false
const formatSeconds = formatVideoSeconds
const coverExists = hasCover || (() => !!String(profile.value.interviewCover || '').trim())

function pickVideo() {
  const input = videoInput.value
  if (!input) return
  input.value = ""
  input.click()
}

function removeVideo() {
  videoRemoved = true
  profile.value.interviewVideo = ""
  profile.value.interviewSeconds = null
}

/** 用浏览器读出视频时长：建一个不挂到页面上的 <video>，只加载元数据 */
function readVideoDuration(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement("video")
    let finished = false
    const finish = (ok, value) => {
      if (finished) return
      finished = true
      clearTimeout(timer)
      video.onloadedmetadata = null
      video.ontimeupdate = null
      video.onerror = null
      video.removeAttribute("src")
      video.load()
      URL.revokeObjectURL(url)
      ok ? resolve(value) : reject(value)
    }
    const timer = setTimeout(() => finish(false, new Error("timeout")), 20000)
    video.preload = "metadata"
    video.muted = true
    video.onloadedmetadata = () => {
      if (isFinite(video.duration) && video.duration > 0) {
        finish(true, video.duration)
        return
      }
      // 少数文件元数据里时长是 Infinity：跳到末尾让浏览器算出真实时长
      video.ontimeupdate = () => finish(isFinite(video.duration), isFinite(video.duration) ? video.duration : new Error("no duration"))
      video.currentTime = 1e7
    }
    video.onerror = () => finish(false, new Error("decode"))
    video.src = url
  })
}

/** 选好视频：先在浏览器里查格式、大小、时长，不合格的不上传 */
async function onVideoChosen(event) {
  const file = event.target.files && event.target.files[0]
  event.target.value = ""
  if (!file || videoUi.running) return
  const ext = (file.name.lastIndexOf(".") > -1 ? file.name.slice(file.name.lastIndexOf(".") + 1) : "").toLowerCase()
  if (ext !== "mp4" && ext !== "mov") {
    proxy.$modal.msgError("只能上传 mp4 / mov 视频")
    return
  }
  if (!file.size) {
    proxy.$modal.msgError("这个视频是空的，请重新选择")
    return
  }
  if (file.size > VIDEO_MAX_BYTES) {
    proxy.$modal.msgError("这个视频有 " + (file.size / 1024 / 1024).toFixed(0) + "MB，超过 " + (VIDEO_MAX_BYTES / 1024 / 1024) + "MB 了，可以剪短一点或压缩后再传")
    return
  }
  const selection = ++selectionVersion
  const selectedStore = profile.value.storeId
  Object.assign(videoUi, { running: true, percent: 0, text: '正在读取视频信息…' })
  let duration
  try {
    duration = await readVideoDuration(file)
  } catch (e) {
    if (selection !== selectionVersion) return
    Object.assign(videoUi, { running: false, percent: 0, text: '' })
    proxy.$modal.msgError(VIDEO_UNREADABLE_TEXT)
    return
  }
  if (selection !== selectionVersion) return
  if (!profileOpen.value || profile.value.storeId !== selectedStore) {
    Object.assign(videoUi, { running: false, percent: 0, text: '' })
    return
  }
  if (!Number.isFinite(duration) || duration <= 0) {
    Object.assign(videoUi, { running: false, percent: 0, text: '' })
    proxy.$modal.msgError(VIDEO_UNREADABLE_TEXT)
    return
  }
  if (duration > VIDEO_MAX_SECONDS + 1) {
    Object.assign(videoUi, { running: false, percent: 0, text: '' })
    proxy.$modal.msgError(label + '不能超过 ' + VIDEO_MAX_SECONDS + ' 秒')
    return
  }
  uploadVideo(file, duration)
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** 分段上传：开始 → 一段一段按顺序传（失败的段最多再试 3 次）→ 收尾拿到地址 */
async function uploadVideo(file, duration) {
  const storeId = profile.value.storeId
  const task = { canceled: false, controller: null, uploadId: null }
  videoTask = task
  const mb = bytes => (bytes / 1024 / 1024).toFixed(1)
  const percentOf = bytes => Math.min(99, Math.floor(bytes * 100 / file.size))
  Object.assign(videoUi, { running: true, percent: 0, text: "正在准备上传…" })
  try {
    const begin = await beginUpload({ name: file.name, size: file.size, duration: Math.max(0.01, Math.round(duration * 100) / 100) })
    const info = begin.data || {}
    task.uploadId = info.uploadId || null
    if (task.canceled) {
      // 点取消时还没拿到 uploadId，这里补一次放弃，免得占着后端「同时在传」的名额
      if (task.uploadId) abortUpload(task.uploadId).catch(() => {})
      return
    }
    const partBytes = Number(info.partBytes)
    const parts = Number(info.parts)
    if (!task.uploadId || !(partBytes > 0) || !(parts > 0)) {
      throw Object.assign(new Error("上传没能开始，请重试"), { show: true })
    }
    for (let index = 0; index < parts; index++) {
      const start = index * partBytes
      const end = Math.min(file.size, start + partBytes)
      const blob = file.slice(start, end)
      for (let attempt = 0; ; attempt++) {
        if (task.canceled) return
        task.controller = new AbortController()
        try {
          await appendUpload(task.uploadId, index, blob, e => {
            if (videoTask === task) videoUi.percent = percentOf(start + (e.loaded || 0))
          }, task.controller.signal)
          break
        } catch (err) {
          if (task.canceled || err.canceled) return
          if (!err.retriable || attempt >= VIDEO_PART_RETRIES) throw err
          if (videoTask === task) videoUi.text = "第 " + (index + 1) + " 段没传上，正在重试（第 " + (attempt + 1) + " 次）…"
          await sleep(1000 * (attempt + 1))
        }
      }
      if (videoTask === task) {
        videoUi.percent = percentOf(end)
        videoUi.text = "已上传 " + mb(end) + " / " + mb(file.size) + " MB"
      }
    }
    if (task.canceled) return
    if (videoTask === task) videoUi.text = "正在收尾，请稍候…"
    const finish = await finishUpload(task.uploadId)
    task.uploadId = null
    if (task.canceled) return
    const url = finish.data && finish.data.url
    if (!url) throw Object.assign(new Error("视频上传没有完成，请重试"), { show: true })
    if (profileOpen.value && profile.value.storeId === storeId) {
      const replaced = !!profile.value.interviewVideo || videoRemoved
      videoRemoved = false
      profile.value.interviewVideo = url
      // 不足 1 秒也按 1 秒存：四舍五入成 0 时，保存会被后端当成无效时长拒绝
      profile.value.interviewSeconds = Math.max(1, Math.round(duration))
      if (videoTask === task) videoUi.percent = 100
      proxy.$modal.msgSuccess(VIDEO_UPLOADED_TEXT)
      // 只提醒，不自动清封面：兼职详情没封面时采访卡不显示图片，清了反而少一块
      if (replaced && coverExists()) proxy.$modal.msgWarning(VIDEO_COVER_REMINDER)
    }
  } catch (err) {
    if (task.canceled) return
    // 开始 / 收尾走 request.js，失败原因它已经弹过；分段和这里自己抛的错要自己弹
    if (err && err.show) proxy.$modal.msgError(err.message)
    if (task.uploadId) abortUpload(task.uploadId).catch(() => {})
  } finally {
    if (videoTask === task) {
      videoTask = null
      Object.assign(videoUi, { running: false, percent: 0, text: "" })
    }
  }
}

/** 取消上传：停掉正在传的那一段，并告诉后端丢掉已收的部分 */
function cancelVideoUpload() {
  selectionVersion++
  videoRemoved = false
  const task = videoTask
  Object.assign(videoUi, { running: false, percent: 0, text: "" })
  if (!task) return
  task.canceled = true
  if (task.controller) task.controller.abort()
  if (task.uploadId) abortUpload(task.uploadId).catch(() => {})
  videoTask = null
  Object.assign(videoUi, { running: false, percent: 0, text: "" })
}

onBeforeUnmount(cancelVideoUpload)
return { videoInput, videoUi, pickVideo, removeVideo, onVideoChosen, cancelVideoUpload, formatSeconds }
}
