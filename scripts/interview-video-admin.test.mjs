// 后台换视频（20261031-detail-fix）：提示文字、上传组合函数的真实流程、保存字段、页面接线。不需要浏览器、后端和数据库。
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { compileTemplate, parse } from '@vue/compiler-sfc'
import { STAY_VIDEO_TEXT, VIDEO_COVER_REMINDER, VIDEO_NOT_SHARED_TEXT, VIDEO_SHARED_TEXT, VIDEO_UNREADABLE_TEXT, VIDEO_UPLOADED_TEXT, formatVideoSeconds, interviewVideoBody, interviewVideoSummary, videoChanged, videoHiddenByMode } from '../src/utils/interviewVideo.js'
import { storeDisplayMaterials } from '../src/utils/displayMaterials.js'
import { firstErrorMessage, revealFirstFormError } from '../src/utils/formErrors.js'

const read = rel => readFileSync(new URL('../' + rel, import.meta.url), 'utf8')
const flush = async () => { for (let i = 0; i < 20; i++) await new Promise(resolve => setImmediate(resolve)) }

// ---------------------------------------------------------------- 文字和小判断

test('提示文字和主人定的说法一致', () => {
  assert.equal(VIDEO_UPLOADED_TEXT, '视频已上传，点保存才生效')
  assert.equal(VIDEO_SHARED_TEXT, '同一门店的所有岗位共用，换一次全部生效，已上架也能换，不用下架')
  assert.match(VIDEO_COVER_REMINDER, /记得换封面/)
  assert.match(VIDEO_UNREADABLE_TEXT, /手机视频可能是 HEVC，请转成 H\.264 的 mp4/)
  assert.match(STAY_VIDEO_TEXT, /旅居详情页的视频就是这个，已上线也能换/)
  assert.match(STAY_VIDEO_TEXT, /不互通/)
  assert.match(VIDEO_NOT_SHARED_TEXT, /不互通/)
})

// 2026-10-31 主人拍板去掉 60 秒下限：说明文字、提示、资料清单都不能再提「至少 60 秒」
test('页面和提示都不再写最短时长，300MB 上限的说明还在', () => {
  for (const rel of ['src/composables/useStoreInterviewVideo.js', 'src/utils/interviewVideo.js', 'src/utils/displayMaterials.js', 'src/views/kangaroo/job/StoreDisplaySettings.vue', 'src/views/kangaroo/store/index.vue', 'src/components/AdminVideoUpload/index.vue']) {
    assert.doesNotMatch(read(rel), /至少\s*(要\s*)?(60|\$\{|' ?\+)|minSeconds|VIDEO_MIN_SECONDS|videoTooShortText/, rel)
  }
  for (const rel of ['src/views/kangaroo/job/StoreDisplaySettings.vue', 'src/views/kangaroo/store/index.vue']) assert.match(read(rel), /不限时长，文件不超过 300MB/, rel)
})

test('资料清单：采访视频只要时长是有效正数就算齐，短视频不再显示「待补充」', () => {
  const row = seconds => storeDisplayMaterials({ interviewMode: 'online', interviewVideo: '/profile/a.mp4', interviewSeconds: seconds })[0]
  for (const seconds of [1, 5, 59, 60, 600]) assert.equal(row(seconds).state, 'filled', String(seconds))
  for (const seconds of [0, null, undefined, -3]) assert.equal(row(seconds).state, 'missing', String(seconds))
  assert.equal(storeDisplayMaterials({ interviewMode: 'none', interviewVideo: '/profile/a.mp4', interviewSeconds: 5 })[0].state, 'missing', '未采访不算齐')
  assert.doesNotMatch(row(null).hint, /60/)
})

test('概要：已上传带时长，没传写待补充', () => {
  assert.equal(interviewVideoSummary('/profile/a.mp4', 62), '已上传（1 分 2 秒）')
  assert.equal(interviewVideoSummary('/profile/a.mp4', 45), '已上传（45 秒）')
  assert.equal(interviewVideoSummary('/profile/a.mp4', null), '已上传')
  assert.equal(interviewVideoSummary('', 62), '待补充')
  assert.equal(formatVideoSeconds(120), '2 分 0 秒')
})

test('门店资料页：视频没变不发时长和视频，老视频没存时长也能保存别的项', () => {
  const body = interviewVideoBody('/profile/old.mp4', '/profile/old.mp4', 59)
  assert.equal('interviewSeconds' in body, false)
  assert.equal('interviewVideo' in body, false)
  assert.deepEqual(interviewVideoBody('', null, null), {}, '没视频、也没传，什么都不发')
})

test('门店资料页：换了或去掉视频才发，时长跟着走', () => {
  assert.deepEqual(interviewVideoBody('/profile/old.mp4', '/profile/new.mp4', 61), { interviewVideo: '/profile/new.mp4', interviewSeconds: 61 })
  assert.deepEqual(interviewVideoBody('/profile/old.mp4', '', 59), { interviewVideo: '', interviewSeconds: null }, '去掉视频：时长清空，不触发时长校验')
  assert.deepEqual(interviewVideoBody('', '/profile/new.mp4', 60), { interviewVideo: '/profile/new.mp4', interviewSeconds: 60 })
})

test('未采访判断：两个页面的两种写法都认，有方式或没视频都不算', () => {
  for (const mode of ['', null, undefined, 'none']) assert.equal(videoHiddenByMode(mode, '/profile/a.mp4'), true, String(mode))
  for (const mode of ['online', 'onsite']) assert.equal(videoHiddenByMode(mode, '/profile/a.mp4'), false, mode)
  assert.equal(videoHiddenByMode('none', ''), false)
  assert.equal(videoChanged(undefined, ''), false, '空值和空串算没变')
  assert.equal(videoChanged('/a', '/b'), true)
})

// ---------------------------------------------------------------- 校验失败滚到错误处

function fakeForm(errorText) {
  const calls = []
  const target = errorText == null ? null : {
    scrollIntoView: opts => calls.push(opts),
    querySelector: selector => selector === '.el-form-item__error' ? { textContent: ' ' + errorText + ' ' } : null
  }
  return { calls, form: { $el: { querySelector: selector => selector === '.el-form-item.is-error' ? target : null } } }
}

test('校验失败：滚到第一处错误，提示写错误原文', async () => {
  const { calls, form } = fakeForm('请至少上传 1 张岗位照片')
  const shown = []
  await revealFirstFormError(form, { title: [{ message: '岗位标题不能为空' }] }, text => shown.push(text))
  assert.deepEqual(shown, ['请至少上传 1 张岗位照片'], '按页面顺序，不按 invalidFields 的键顺序')
  assert.equal(calls.length, 1)
  assert.equal(calls[0].block, 'center')
})

test('校验失败：有没存的视频时提示里说清楚', async () => {
  const { form } = fakeForm('请至少上传 1 张岗位照片')
  const shown = []
  await revealFirstFormError(form, {}, text => shown.push(text), '。改好后点确定，视频才会一起保存')
  assert.equal(shown[0], '请至少上传 1 张岗位照片。改好后点确定，视频才会一起保存')
})

test('校验失败：找不到错误元素也要提示，不能静默', async () => {
  const shown = []
  await revealFirstFormError(fakeForm(null).form, { title: [{ message: '岗位标题不能为空' }] }, text => shown.push(text))
  await revealFirstFormError(null, null, text => shown.push(text))
  assert.equal(shown[0], '岗位标题不能为空')
  assert.ok(shown[1].length > 0)
  assert.equal(firstErrorMessage({ a: [], b: [{ message: 'x' }] }), 'x')
})

// ---------------------------------------------------------------- 上传组合函数：真跑，只替换接口和浏览器对象

/** 组合函数用了 @/ 别名，node 解析不了：把别名换成真实地址，放到临时目录里加载 */
async function loadComposable() {
  const dir = mkdtempSync(join(tmpdir(), 'kg-interview-video-'))
  const utils = new URL('../src/utils/interviewVideo.js', import.meta.url).href
  const source = read('src/composables/useStoreInterviewVideo.js')
    .replace(/from 'vue'/, () => "from '" + import.meta.resolve('vue') + "'")
    .replace(/import \{[^}]*\} from '@\/api\/kangaroo\/store'/, 'const beginStoreVideoUpload = null, uploadStoreVideoPart = null, finishStoreVideoUpload = null, abortStoreVideoUpload = null')
    .replace(/'@\/utils\/interviewVideo'/, () => "'" + utils + "'")
  const file = join(dir, 'composable.mjs')
  writeFileSync(file, source)
  try {
    return (await import(pathToFileURL(file).href)).useStoreInterviewVideo
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

function harness(useStoreInterviewVideo, { duration, profile = {}, limits, hasCover, decodeFails } = {}) {
  globalThis.document = { createElement: () => ({
    removeAttribute() {}, load() {},
    set src(_url) {
      setImmediate(() => {
        if (decodeFails) return this.onerror && this.onerror()
        this.duration = duration
        if (this.onloadedmetadata) this.onloadedmetadata()
      })
    }
  }) }
  globalThis.URL.createObjectURL = () => 'blob:x'
  globalThis.URL.revokeObjectURL = () => {}
  const shown = { success: [], warning: [], error: [] }
  const proxy = { $modal: { msgSuccess: t => shown.success.push(t), msgWarning: t => shown.warning.push(t), msgError: t => shown.error.push(t) } }
  const ref = { value: { storeId: 1, interviewVideo: '', interviewSeconds: null, interviewCover: '', ...profile } }
  const calls = { begin: 0 }
  const api = {
    begin: async body => { calls.begin++; calls.duration = body.duration; return { data: { uploadId: 'u1', partBytes: 10, parts: 1 } } },
    append: async () => {},
    finish: async () => ({ data: { url: '/profile/new.mp4' } }),
    abort: async () => {}
  }
  const warn = console.warn
  console.warn = () => {} // onBeforeUnmount 不在组件里调用时 Vue 会警告，这里不是被测内容
  const video = useStoreInterviewVideo({ profile: ref, profileOpen: { value: true }, proxy, api, limits, hasCover })
  console.warn = warn
  const choose = async (name = 'a.mp4') => {
    await video.onVideoChosen({ target: { value: 'x', files: [{ name, size: 10, slice: () => ({}) }] } })
    await flush()
  }
  return { video, ref, shown, calls, choose }
}

test('组合函数：采访视频多短都能传，秒数按实际存', async () => {
  for (const [duration, stored] of [[59.99, 60], [35, 35], [5, 5], [1.4, 1]]) {
    const h = harness(await loadComposable(), { duration })
    await h.choose()
    assert.deepEqual(h.shown.error, [], String(duration))
    assert.equal(h.calls.begin, 1, String(duration))
    assert.equal(h.ref.value.interviewVideo, '/profile/new.mp4')
    assert.equal(h.ref.value.interviewSeconds, stored, String(duration))
    assert.equal(h.video.videoUi.running, false)
  }
})

test('组合函数：不足 1 秒按 1 秒存，登记时长也不能四舍五入成 0（后端 0 秒会拒）', async () => {
  for (const duration of [0.4, 0.004]) {
    const h = harness(await loadComposable(), { duration })
    await h.choose()
    assert.deepEqual(h.shown.error, [], String(duration))
    assert.equal(h.ref.value.interviewSeconds, 1, String(duration))
    assert.ok(h.calls.duration > 0, '登记时长 ' + h.calls.duration)
  }
})

test('组合函数：读出来的时长不是有效正数仍然不上传', async () => {
  for (const duration of [0, -1, Number.NaN]) {
    const h = harness(await loadComposable(), { duration })
    await h.choose()
    assert.equal(h.calls.begin, 0, String(duration))
    assert.equal(h.ref.value.interviewVideo, '')
  }
})

test('组合函数：正好 60 秒能传；第一次传没有封面提醒', async () => {
  const h = harness(await loadComposable(), { duration: 60 })
  await h.choose()
  assert.deepEqual(h.shown.error, [])
  assert.deepEqual(h.shown.success, ['视频已上传，点保存才生效'])
  assert.deepEqual(h.shown.warning, [])
  assert.equal(h.ref.value.interviewVideo, '/profile/new.mp4')
  assert.equal(h.ref.value.interviewSeconds, 60)
})

test('组合函数：换视频提醒换封面，但不清封面', async () => {
  const h = harness(await loadComposable(), { duration: 62, profile: { interviewVideo: '/profile/old.mp4', interviewSeconds: 88, interviewCover: '/profile/upload/c.jpg' } })
  await h.choose()
  assert.deepEqual(h.shown.warning, [VIDEO_COVER_REMINDER])
  assert.equal(h.ref.value.interviewCover, '/profile/upload/c.jpg', '清封面在兼职详情上有副作用')
  assert.equal(h.ref.value.interviewSeconds, 62)
})

test('组合函数：先去掉再传也算换视频；旧视频没封面就不提醒', async () => {
  const useVideo = await loadComposable()
  const removed = harness(useVideo, { duration: 62, profile: { interviewVideo: '/profile/old.mp4', interviewCover: '/profile/upload/c.jpg' } })
  removed.video.removeVideo()
  await removed.choose()
  assert.deepEqual(removed.shown.warning, [VIDEO_COVER_REMINDER])
  const noCover = harness(useVideo, { duration: 62, profile: { interviewVideo: '/profile/old.mp4' } })
  await noCover.choose()
  assert.deepEqual(noCover.shown.warning, [])
})

test('组合函数：小院视频的封面在表单里，用传入的判断；没有最短限制', async () => {
  const h = harness(await loadComposable(), { duration: 5, profile: { interviewVideo: '/profile/old.mp4' }, limits: { maxSeconds: 180, maxBytes: 100, label: '小院视频' }, hasCover: () => true })
  await h.choose()
  assert.deepEqual(h.shown.error, [])
  assert.deepEqual(h.shown.warning, [VIDEO_COVER_REMINDER])
})

test('组合函数：读不出时长提示转 H.264', async () => {
  const h = harness(await loadComposable(), { decodeFails: true })
  await h.choose('hevc.mov')
  assert.deepEqual(h.shown.error, [VIDEO_UNREADABLE_TEXT])
  assert.equal(h.calls.begin, 0)
})

// ---------------------------------------------------------------- 页面接线：改动不会被后来的人顺手改掉

test('改过的页面模板都能编译', () => {
  for (const rel of ['src/views/kangaroo/job/StoreDisplaySettings.vue', 'src/views/kangaroo/job/index.vue', 'src/views/kangaroo/store/index.vue', 'src/views/kangaroo/ext/ExtCrud.vue', 'src/views/kangaroo/ext/stay/index.vue', 'src/components/AdminVideoUpload/index.vue']) {
    const { descriptor, errors } = parse(read(rel))
    assert.deepEqual(errors, [], rel)
    const out = compileTemplate({ source: descriptor.template.content, filename: rel, id: 'x' })
    assert.deepEqual(out.errors, [], rel)
  }
})

test('岗位弹窗门店区块：概要、单独的更换按钮、没有编辑权限不显示', () => {
  const page = read('src/views/kangaroo/job/StoreDisplaySettings.vue')
  assert.match(page, /采访视频：\{\{ videoSummary \}\}/)
  assert.match(page, /<el-button v-if="canEdit"[^>]*@click="focusVideo">\{\{ profile\.interviewVideo \? '更换采访视频' : '上传采访视频' \}\}/)
  assert.match(page, /修改门店资料（采访视频、店长等）/)
  assert.doesNotMatch(page, /修改共用资料/)
  assert.match(page, /editing\.value = canEdit && !profile\.value\.interviewVideo/, '没传视频默认展开')
  assert.match(page, /videoHiddenByMode\(current\.interviewMode, current\.interviewVideo\)\) await proxy\.\$modal\.confirm\(VIDEO_HIDDEN_CONFIRM\)/)
  assert.match(page, /defineExpose\(\{[^}]*hasUnsavedVideo[^}]*focusVideo/)
  assert.doesNotMatch(page, /interviewCover\s*=\s*['"]{2}/, '不自动清封面')
})

test('岗位页：顶部入口、校验失败提示、关弹窗确认，上架确认弹窗同样接上', () => {
  const page = read('src/views/kangaroo/job/index.vue')
  assert.match(page, /storeDisplayRef\?\.focusVideo\(\)/)
  assert.match(page, /validate\(async \(valid, invalidFields\) =>/)
  assert.match(page, /revealFirstFormError\(proxy\.\$refs\["jobRef"\]/)
  assert.match(page, /async function beforeJobClose\(done\) \{\s*if \(!canLeaveJob\(\) \|\| !\(await confirmUnsavedVideo\(storeDisplayRef\.value, canLeaveJob\)\)\) return/)
  assert.match(page, /confirmUnsavedVideo\(publishDisplayRef\.value, canLeavePublish\)/)
  assert.match(page, /save-label="「保存配置并上架」"/)
})

test('门店管理：按钮改名，保存不再无条件带时长，关弹窗确认', () => {
  const page = read('src/views/kangaroo/store/index.vue')
  assert.match(page, />门店资料 \/ 采访视频<\/el-button>/)
  assert.match(page, /\.\.\.interviewVideoBody\(profileVideoOrigin\.value, p\.interviewVideo, p\.interviewSeconds\)/)
  assert.doesNotMatch(page, /interviewSeconds: p\.interviewVideo \?/)
  assert.match(page, /videoHiddenByMode\(mode, p\.interviewVideo\)\) await proxy\.\$modal\.confirm\(VIDEO_HIDDEN_CONFIRM\)/)
  assert.match(page, /!videoUi\.running && !profileVideoDirty\.value/)
})

test('房源弹窗：门店列表读不到不拦弹窗，退回显示编号；视频传完没保存要确认', () => {
  const page = read('src/views/kangaroo/ext/ExtCrud.vue')
  assert.match(page, /if \(!checkPermi\(\['kangaroo:store:list'\]\)\) \{\s*storesUnavailable\.value = true\s*return/)
  assert.match(page, /try \{\s*do \{\s*const res = await listStore[\s\S]*?\} catch \(_\) \{[\s\S]*?storesUnavailable\.value = !stores\.value\.length/)
  // 原来只断言修改时禁用（:disabled="!!form[meta.pk]"）。新增手填会静默挂错门店，现在新增也禁用，断言比原来严
  assert.match(page, /&& storesUnavailable">\s*<el-input-number v-model="form\[f\.name\]" :precision="0" :min="1" disabled controls-position="right"/, '读不到门店列表时只显示编号，新增和修改都不能填')
  assert.doesNotMatch(page, /:disabled="!!form\[meta\.pk\]" controls-position="right" placeholder="门店编号"/)
  assert.match(page, /form\[meta\.pk\] \? '当前读不到门店列表，这里显示的是门店编号。' : '读不到门店列表，请找有门店权限的运营新增，或稍后重试。'/)
  assert.match(page, /async function beforeEditorClose\(done\) \{\s*if \(!canLeaveEditor\(\) \|\| !\(await confirmUnsavedVideo\(\)\)\) return/)
  assert.match(page, /:cover="form\[VIDEO_COVER_FIELDS\[videoKind\(f\.name\)\]\] \|\| ''"/)
})
