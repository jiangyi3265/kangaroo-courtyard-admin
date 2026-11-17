<template>
  <div class="place-location">
    <div class="place-location__status">
      <el-tag :type="point ? 'success' : 'warning'">{{ point ? '已设置定位' : '未设置定位' }}</el-tag>
      <a v-if="point" :href="previewUrl" target="_blank" rel="noopener noreferrer">查看位置</a>
      <span v-if="point" class="place-location__coordinates">{{ point.longitude }}, {{ point.latitude }}</span>
    </div>
    <template v-if="!disabled">
      <p class="place-location__help">在地图中搜索并选中门店，复制坐标后粘贴到下方。</p>
      <div class="place-location__controls">
        <el-button type="primary" plain @click="openPicker">地图选点</el-button>
        <el-input v-model="draft" placeholder="粘贴选点结果（经度,纬度）" aria-label="地图选点结果" @paste="pastePoint" @keyup.enter="applyPoint" />
        <el-button :disabled="!draft.trim()" @click="applyPoint">使用此位置</el-button>
      </div>
      <div v-if="error" class="place-location__error" role="alert">{{ error }}</div>
      <div v-if="hint" class="place-location__help" role="status">{{ hint }}</div>
      <div class="place-location__footer"><span>{{ point ? '点击表单保存后，前端即可使用此位置导航。' : emptyHint }}</span><el-button v-if="point" link type="danger" @click="clearPoint">清除定位</el-button></div>
    </template>
  </div>
</template>
<script setup>
import { computed, ref, watch } from 'vue'
import { locationPoint, parsePickedPoint, pointPreviewUrl, PICKER_URL } from './point.js'
const props = defineProps({ latitude: [Number, String], longitude: [Number, String], address: { type: String, default: '' }, city: { type: String, default: '' }, disabled: Boolean, emptyHint: { type: String, default: '仅填写文字地址不能直接导航，请补充地图定位。' } })
const emit = defineEmits(['change'])
const draft = ref(''), error = ref(''), hint = ref('')
const point = computed(() => locationPoint(props.latitude, props.longitude))
const previewUrl = computed(() => pointPreviewUrl(point.value, props.address))
watch(() => [props.latitude, props.longitude, props.address, props.city], () => { draft.value = ''; error.value = ''; hint.value = '' })
function applyPoint() {
  if (props.disabled) return
  const next = parsePickedPoint(draft.value)
  if (!next) { error.value = '请粘贴高德地图复制的完整坐标，经度在前、纬度在后。'; return }
  error.value = ''; draft.value = ''
  emit('change', next)
}
function pastePoint(event) {
  if (props.disabled) return
  const text = event.clipboardData?.getData('text/plain')
  if (!text) return
  event.preventDefault(); draft.value = text; applyPoint()
}
function clearPoint() { if (!props.disabled) emit('change', { latitude: null, longitude: null }) }
function openPicker() {
  if (props.disabled) return
  window.open(PICKER_URL, '_blank', 'noopener,noreferrer')
  const address = [props.city && !props.address.includes(props.city.replace(/市$/, '')) ? props.city : '', props.address].filter(Boolean).join(' ')
  hint.value = '在新打开的地图中搜索门店，确认标记位于门店，再复制坐标返回粘贴。'
  // 浏览器允许时复制搜索地址；失败仍可手动搜索，不读取用户剪贴板或当前位置。
  if (address && navigator.clipboard?.writeText) navigator.clipboard.writeText(address).catch(() => {})
}
</script>
<style scoped>
.place-location{width:100%;min-width:0}.place-location__status{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.place-location__status a{color:var(--el-color-primary)}.place-location__coordinates{color:#606266;font-size:12px}.place-location__controls{display:flex;gap:8px;flex-wrap:wrap}.place-location__controls .el-input{flex:1;min-width:190px}.place-location__help,.place-location__footer{font-size:12px;line-height:1.6;color:#606266;margin:8px 0}.place-location__error{color:var(--el-color-danger);font-size:12px;line-height:1.6;margin-top:6px}.place-location__footer{display:flex;align-items:center;justify-content:space-between;gap:10px}.place-location__footer .el-button{flex-shrink:0}
</style>
