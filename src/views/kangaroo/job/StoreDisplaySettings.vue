<template>
  <section class="store-display" v-loading="loading">
    <el-divider content-position="left">招聘门店资料</el-divider>
    <el-alert type="info" :closable="false" show-icon :title="`以下资料属于「${profile.storeName || '当前招聘门店'}」。同一家招聘门店的换工、兼职、全职共用；代招其他民宿请先选择实际招聘门店。`" />
    <el-alert v-if="!canRead" type="warning" :closable="false" title="当前账号没有门店查询权限，可继续保存岗位；采访和亮点由有门店权限的运营设置。" />
    <template v-else>
      <div v-if="loadFailed" class="store-display__error">门店资料加载失败，未覆盖原配置。<el-button link type="primary" @click="load">重新加载</el-button></div>
      <el-alert v-if="!canEdit" type="warning" :closable="false" title="当前账号只能查看门店资料，修改需要门店编辑权限。" />
      <div class="store-display__summary">
        <div class="store-display__row">
          <strong>采访视频：{{ videoSummary }}<em v-if="videoDirty">（{{ VIDEO_UNSAVED_TEXT }}）</em></strong>
          <el-button v-if="canEdit" type="primary" plain :disabled="disabled" @click="focusVideo">{{ profile.interviewVideo ? '更换采访视频' : '上传采访视频' }}</el-button>
        </div>
        <p class="store-display__shared">{{ VIDEO_SHARED_TEXT }}。</p>
        <p v-if="videoHidden" class="store-display__warn">{{ VIDEO_HIDDEN_TEXT }}。</p>
        <div class="store-display__row">
          <span>店长：{{ profile.managerName || profile.fallback?.managerName || '待补充' }} · 设施：{{ displayFacilities.length }} 项 · 营业执照：{{ profile.licenseImage ? '已上传' : '待补充' }}</span>
          <el-button link type="primary" :aria-expanded="editing" @click="editing = !editing">{{ editing ? '收起门店资料' : canEdit ? '修改门店资料（采访视频、店长等）' : '查看门店资料' }}</el-button>
        </div>
      </div>
      <fieldset v-show="editing" :disabled="disabled">
        <el-form-item label="采访方式" label-width="110px">
          <el-radio-group v-model="profile.interviewMode" :disabled="disabled || (!canCert && origin.interviewMode === 'onsite')">
            <el-radio value="onsite" :disabled="!canCert && origin.interviewMode !== 'onsite'">线下实地探访</el-radio>
            <el-radio value="online">线上视频采访</el-radio>
            <el-radio value="">未采访</el-radio>
          </el-radio-group>
          <p class="store-display__tip">线下实地探访关联安心商家认证，切换需认证权限；线上采访不会显示线下核验。采访方式与岗位分类独立。</p>
        </el-form-item>
        <el-form-item label="采访视频" label-width="110px">
          <div ref="videoField" class="store-display__media">
            <video v-if="profile.interviewVideo" :src="imageUrl(profile.interviewVideo)" :poster="imageUrl(profile.interviewCover)" controls preload="metadata" />
            <template v-if="videoUi.running">
              <el-progress :percentage="videoUi.percent" />
              <span>{{ videoUi.text }}</span>
              <el-button @click="cancelVideoUpload">取消上传</el-button>
            </template>
            <template v-else>
              <el-button :disabled="disabled" @click="pickVideo">{{ profile.interviewVideo ? '更换视频' : '上传视频' }}</el-button>
              <el-button v-if="profile.interviewVideo" :disabled="disabled" @click="removeVideo">移除视频</el-button>
              <span v-if="profile.interviewSeconds">{{ formatSeconds(profile.interviewSeconds) }}</span>
            </template>
            <input ref="videoInput" type="file" accept="video/mp4,video/quicktime,.mp4,.mov" hidden @change="onVideoChosen" />
            <p v-if="videoDirty" class="store-display__warn">{{ VIDEO_UNSAVED_TEXT }}，点{{ saveLabel }}才生效。<template v-if="profile.interviewVideo && profile.interviewCover">{{ VIDEO_COVER_REMINDER }}。</template></p>
            <p class="store-display__tip">支持 mp4 / mov，不限时长，文件不超过 300MB。上传完成后点{{ saveLabel }}才生效。{{ VIDEO_SHARED_TEXT }}。{{ VIDEO_NOT_SHARED_TEXT }}。</p>
          </div>
        </el-form-item>
        <el-form-item label="视频封面" label-width="110px">
          <image-upload v-if="canEdit" v-model="profile.interviewCover" :disabled="disabled" :limit="1" @busy="coverUploading = $event" />
          <image-preview v-else-if="profile.interviewCover" :src="profile.interviewCover" :width="120" :height="75" />
          <span v-else>暂无封面</span>
        </el-form-item>
        <el-form-item label="采访说明" label-width="110px">
          <el-input v-model="profile.interviewNote" :disabled="disabled" type="textarea" :rows="2" maxlength="100" show-word-limit :placeholder="defaultNote" />
          <p class="store-display__tip">留空时随线上 / 线下方式显示对应说明，自定义内容按填写内容展示。</p>
        </el-form-item>
        <el-form-item label="营业执照" label-width="110px">
          <image-upload v-if="canEdit" v-model="profile.licenseImage" action="/kangaroo/store/profile/license/upload" :disabled="disabled" :limit="1" @busy="licenseUploading = $event" />
          <image-preview v-else-if="profile.licenseImage" :src="profile.licenseImage" :width="100" :height="100" />
          <p class="store-display__tip">上传当前招聘门店的真实营业执照，自动添加“仅用于袋鼠认证”水印；保存后用户可查看带水印的图片。</p>
        </el-form-item>
        <el-form-item label="店长称呼" label-width="110px"><el-input v-model="profile.managerName" :disabled="disabled" maxlength="32" placeholder="填写真实店长称呼" /></el-form-item>
        <el-form-item label="店长头像" label-width="110px"><image-upload v-model="profile.managerAvatar" :disabled="disabled" :limit="1" @busy="avatarUploading = $event" /></el-form-item>
        <el-form-item label="店长擅长" label-width="110px"><el-input v-model="profile.managerSkills" :disabled="disabled" maxlength="100" placeholder="如：民宿运营、摄影" /></el-form-item>
        <el-form-item label="店长介绍" label-width="110px"><el-input v-model="profile.managerQuote" :disabled="disabled" type="textarea" :rows="2" maxlength="200" placeholder="简单介绍工作和生活安排" /></el-form-item>
        <el-form-item label="该店亮点" label-width="110px">
          <el-switch v-model="profile.inheritFacilities" :disabled="disabled" active-text="沿用小院设施" aria-label="沿用小院设施" />
          <el-checkbox-group v-model="displayFacilities" :disabled="disabled || profile.inheritFacilities" class="store-display__facilities">
            <el-checkbox v-for="option in options" :key="option.code" :value="option.code">{{ option.label }}</el-checkbox>
          </el-checkbox-group>
          <p v-if="profile.inheritFacilities" class="store-display__tip">当前沿用：{{ fallbackText || '暂无小院设施' }}。关闭沿用后可单独勾选。</p>
          <p v-else class="store-display__tip">只展示已勾选的亮点；全部取消后不再自动补回小院设施。</p>
        </el-form-item>
      </fieldset>
    </template>
  </section>
</template>

<script setup>
import { ref, computed, watch, nextTick, getCurrentInstance, onBeforeUnmount } from 'vue'
import { getStoreProfile, updateStoreProfile } from '@/api/kangaroo/store'
import { imageUrl } from '@/utils/imageUrl'
import { useStoreInterviewVideo } from '@/composables/useStoreInterviewVideo'
import { VIDEO_COVER_REMINDER, VIDEO_HIDDEN_CONFIRM, VIDEO_HIDDEN_TEXT, VIDEO_NOT_SHARED_TEXT, VIDEO_SHARED_TEXT, VIDEO_UNSAVED_TEXT, interviewVideoSummary, videoChanged, videoHiddenByMode } from '@/utils/interviewVideo'

const props = defineProps({ storeId: { type: [Number, String], required: true }, busy: Boolean, saveLabel: { type: String, default: '弹窗底部的「确定」' } })
const emit = defineEmits(['busy'])
const { proxy } = getCurrentInstance()
const canRead = proxy.$auth.hasPermi('kangaroo:store:query')
const canEdit = proxy.$auth.hasPermi('kangaroo:store:edit')
const canCert = proxy.$auth.hasPermi('kangaroo:store:cert')
const profile = ref({ storeId: props.storeId, facilities: [] })
const origin = ref({})
const options = ref([])
const fallback = ref([])
const loading = ref(false)
const editing = ref(false)
const loadFailed = ref(false)
const saving = ref(false)
const coverUploading = ref(false)
const licenseUploading = ref(false)
const avatarUploading = ref(false)
const profileOpen = ref(true)
const { videoInput, videoUi, pickVideo, removeVideo, onVideoChosen, cancelVideoUpload, formatSeconds } = useStoreInterviewVideo({ profile, profileOpen, proxy })
const hasPendingMedia = () => coverUploading.value || licenseUploading.value || avatarUploading.value || videoUi.running
const videoField = ref(null)
const videoSummary = computed(() => interviewVideoSummary(profile.value.interviewVideo, profile.value.interviewSeconds))
const videoDirty = computed(() => canEdit && !loading.value && !loadFailed.value && videoChanged(origin.value.interviewVideo, profile.value.interviewVideo))
const videoHidden = computed(() => !loading.value && videoHiddenByMode(profile.value.interviewMode, profile.value.interviewVideo))
const hasUnsavedVideo = () => videoDirty.value
// 资料还在加载时点了跳转：加载完再滚，否则 load 收尾会把展开状态改掉
let focusAfterLoad = false
function focusVideo() {
  if (!canRead) return
  if (loading.value) { focusAfterLoad = true; return }
  editing.value = true
  nextTick(() => {
    const field = videoField.value
    if (!field) return
    field.scrollIntoView({ block: 'center', behavior: 'smooth' })
    field.querySelector('button:not(:disabled)')?.focus({ preventScroll: true })
  })
}
watch(hasPendingMedia, value => emit('busy', value))
const disabled = computed(() => !canEdit || loading.value || loadFailed.value || saving.value || props.busy)
const defaultNote = computed(() => profile.value.interviewMode === 'online'
  ? '袋鼠工作人员视频连线店长，讲清工作、食宿与真实氛围'
  : '袋鼠工作人员线下实拍，店长讲清工作、食宿与真实氛围')
const fallbackText = computed(() => fallback.value.map(code => options.value.find(o => o.code === code)?.label).filter(Boolean).join('、'))
const displayFacilities = computed({
  get: () => profile.value.inheritFacilities ? fallback.value : profile.value.facilities,
  set: value => { profile.value.facilities = value }
})
const snapshot = () => ({
  interviewMode: profile.value.interviewMode || '',
  interviewVideo: profile.value.interviewVideo || '',
  interviewSeconds: profile.value.interviewVideo ? profile.value.interviewSeconds : null,
  interviewCover: String(profile.value.interviewCover || '').split(',')[0],
  interviewNote: String(profile.value.interviewNote || '').trim(),
  licenseImage: String(profile.value.licenseImage || '').split(',')[0],
  managerName: String(profile.value.managerName || '').trim(),
  managerAvatar: String(profile.value.managerAvatar || '').split(',')[0],
  managerSkills: String(profile.value.managerSkills || '').trim(),
  managerQuote: String(profile.value.managerQuote || '').trim(),
  inheritFacilities: !!profile.value.inheritFacilities,
  facilities: [...(profile.value.facilities || [])].sort()
})
let loadVersion = 0
async function load() {
  if (!canRead) return
  const version = ++loadVersion
  editing.value = false
  cancelVideoUpload()
  loading.value = true
  loadFailed.value = false
  try {
    const { data } = await getStoreProfile(props.storeId)
    if (version !== loadVersion) return
    options.value = data.facilityOptions || []
    fallback.value = data.fallback?.facilities || []
    const inherit = data.inheritFacilities === true
    profile.value = {
      ...data, storeId: props.storeId, inheritFacilities: inherit,
      facilities: [...(inherit ? fallback.value : data.facilities || [])]
    }
    origin.value = snapshot()
    // 还没传视频时直接摊开，省得运营找；只读账号摊开也传不了，保持收起
    editing.value = canEdit && !profile.value.interviewVideo
  } catch (_) {
    if (version === loadVersion) loadFailed.value = true
  } finally {
    if (version === loadVersion) {
      loading.value = false
      if (focusAfterLoad) { focusAfterLoad = false; focusVideo() }
    }
  }
}
function blocked(message) {
  proxy.$modal.msgWarning(message)
  throw new Error(message)
}
async function saveIfDirty() {
  if (!canRead || !canEdit) return false
  if (saving.value) blocked('门店资料正在保存，请稍候')
  if (!profileOpen.value) blocked('门店资料已关闭，请重新打开后提交')
  if (loading.value || loadFailed.value) blocked('请先成功加载门店资料，再提交')
  if (coverUploading.value || licenseUploading.value || avatarUploading.value) blocked('图片还在上传，请完成或取消后再提交')
  if (videoUi.running) blocked('视频还在上传，请完成或取消后再提交')
  const version = loadVersion
  const storeId = props.storeId
  const current = snapshot()
  const changed = Object.keys(current).filter(key => JSON.stringify(current[key]) !== JSON.stringify(origin.value[key]))
  if (!changed.length) return false
  const body = Object.fromEntries(changed.map(key => [key, current[key]]))
  // 设施开关与选择是同一项配置，避免只传开关后丢失选择。
  if (changed.includes('inheritFacilities') || changed.includes('facilities')) {
    body.inheritFacilities = current.inheritFacilities
    body.facilities = current.facilities
  }
  saving.value = true
  try {
  if ((origin.value.interviewMode === 'onsite') !== (current.interviewMode === 'onsite')) {
    if (!canCert) blocked('切换线下实地探访需要门店认证权限')
    await proxy.$modal.confirm(current.interviewMode === 'onsite'
      ? '设为线下实地探访会同时给这家门店添加安心商家认证，确认保存？'
      : '离开线下实地探访会同时撤销这家门店的安心商家认证，确认保存？')
  }
  if (videoHiddenByMode(current.interviewMode, current.interviewVideo)) await proxy.$modal.confirm(VIDEO_HIDDEN_CONFIRM)
    if (!profileOpen.value || version !== loadVersion || String(props.storeId) !== String(storeId)) blocked('当前门店已变化，请重新确认后提交')
    await updateStoreProfile(storeId, body)
    if (profileOpen.value && version === loadVersion && String(props.storeId) === String(storeId)) origin.value = current
    return true
  } finally {
    saving.value = false
  }
}
watch(() => props.storeId, load, { immediate: true })
onBeforeUnmount(() => {
  profileOpen.value = false
  loadVersion++
  cancelVideoUpload()
  emit('busy', false)
})
defineExpose({ saveIfDirty, hasPendingMedia, hasUnsavedVideo, focusVideo })
</script>

<style scoped>
.store-display { margin: 4px 0 16px; }
.store-display :deep(.el-alert) { margin-bottom: 16px; }
.store-display fieldset { border: 0; margin: 0; padding: 0; min-width: 0; }
.store-display__tip { flex-basis: 100%; width: 100%; margin: 5px 0 0; color: #606266; font-size: 12px; line-height: 1.7; }
.store-display__media { width: 100%; }
.store-display__media video { display: block; width: 340px; max-width: 100%; max-height: 210px; background: #111; margin-bottom: 10px; }
.store-display__facilities { width: 100%; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.store-display__facilities :deep(.el-checkbox) { margin-right: 8px; }
.store-display__error { color: #c45656; margin-bottom: 16px; }
.store-display__summary { margin: 0 0 16px; padding: 12px 16px; background: #f6f8fa; border-radius: 6px; color: #606266; font-size: 13px; line-height: 1.7; }
.store-display__row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px 16px; }
.store-display__row strong { color: var(--el-text-color-primary); font-size: 14px; font-weight: 600; }
.store-display__row em { color: var(--el-color-warning-dark-2); font-style: normal; font-weight: 400; }
.store-display__shared { margin: 6px 0 10px; }
.store-display__warn { width: 100%; margin: 6px 0; color: var(--el-color-warning-dark-2); font-size: 13px; line-height: 1.7; }
@media (max-width: 600px) { .store-display__facilities { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
