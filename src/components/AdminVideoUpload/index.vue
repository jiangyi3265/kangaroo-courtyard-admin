<template>
  <div class="admin-video-upload">
    <video v-if="modelValue" :src="imageUrl(modelValue)" controls preload="metadata" />
    <template v-if="videoUi.running"><el-progress :percentage="videoUi.percent" /><span>{{ videoUi.text }}</span><el-button @click="cancelVideoUpload">取消上传</el-button></template>
    <div v-else><el-button type="primary" plain @click="pickVideo">{{ modelValue ? '更换视频' : '上传视频' }}</el-button><el-button v-if="modelValue" @click="removeVideo">移除视频</el-button></div>
    <input ref="videoInput" type="file" accept="video/mp4,video/quicktime,.mp4,.mov" hidden @change="onVideoChosen" />
    <p>支持 MP4 / MOV，{{ longVideo ? '最长 3 分钟，最大 200MB' : '最长 1 分钟，最大 200MB' }}。上传完成后点击确定保存。</p>
    <p v-if="kind === 'intro'">{{ STAY_VIDEO_TEXT }}。</p>
    <p v-if="unsaved" class="admin-video-upload__warn">{{ VIDEO_UNSAVED_TEXT }}，点确定才生效。<template v-if="modelValue && cover">{{ VIDEO_COVER_REMINDER }}。</template></p>
  </div>
</template>
<script setup>
import { ref, computed, watch, getCurrentInstance, onBeforeUnmount } from 'vue'
import { imageUrl } from '@/utils/imageUrl'
import { useStoreInterviewVideo } from '@/composables/useStoreInterviewVideo'
import { STAY_VIDEO_TEXT, VIDEO_COVER_REMINDER, VIDEO_UNSAVED_TEXT, videoChanged } from '@/utils/interviewVideo'
import { stayVideoApi } from '@/api/kangaroo/stayVideo'
const props = defineProps({ modelValue: { type: String, default: '' }, kind: { type: String, required: true }, active: Boolean, cover: { type: String, default: '' } })
const emit = defineEmits(['update:modelValue', 'busy'])
const { proxy } = getCurrentInstance()
const profile = ref({ storeId: props.kind, interviewVideo: props.modelValue, interviewSeconds: null })
const profileOpen = computed(() => props.active)
// 小院视频（intro）和岗位的住宿视频（lodging，V66）同一条规则：3 分钟、200MB；别的是短视频
const longVideo = props.kind === 'intro' || props.kind === 'lodging'
const VIDEO_LABELS = { intro: '小院视频', lodging: '住宿视频' }
// 弹窗每次打开都重新挂载（key 带主键），挂载时的值就是库里的值
const originVideo = props.modelValue
const unsaved = computed(() => videoChanged(originVideo, props.modelValue))
const { videoInput, videoUi, pickVideo, removeVideo, onVideoChosen, cancelVideoUpload } = useStoreInterviewVideo({
  profile, profileOpen, proxy, api: stayVideoApi(props.kind),
  limits: { maxSeconds: longVideo ? 180 : 60, maxBytes: 200 * 1024 * 1024, label: VIDEO_LABELS[props.kind] || '短视频' },
  hasCover: () => !!props.cover
})
watch(() => props.modelValue, value => { profile.value.interviewVideo = value || '' })
watch(() => profile.value.interviewVideo, value => { if (value !== props.modelValue) emit('update:modelValue', value) })
watch(() => videoUi.running, value => emit('busy', value), { flush: 'sync' })
watch(profileOpen, value => { if (!value) cancelVideoUpload() })
onBeforeUnmount(() => emit('busy', false))
</script>
<style scoped>
.admin-video-upload{width:100%}.admin-video-upload video{display:block;width:min(100%,380px);max-height:230px;margin-bottom:10px;background:#222}.admin-video-upload p{color:var(--el-text-color-regular);font-size:12px;line-height:1.6;margin:8px 0 0}.admin-video-upload .el-progress{margin:8px 0}.admin-video-upload .admin-video-upload__warn{color:var(--el-color-warning-dark-2)}
</style>
