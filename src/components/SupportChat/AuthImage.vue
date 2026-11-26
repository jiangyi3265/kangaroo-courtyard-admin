<template>
  <div class="auth-image" :style="boxStyle">
    <el-image
      v-if="src"
      :src="src"
      :preview-src-list="[src]"
      preview-teleported
      hide-on-click-modal
      fit="cover"
      class="auth-image__img"
      :alt="alt"
    />
    <div v-else-if="error" class="auth-image__state">
      <span>{{ error }}</span>
      <el-button link type="primary" size="small" @click="load">重新加载</el-button>
    </div>
    <div v-else class="auth-image__state" v-loading="true" />
  </div>
</template>

<script setup>
// 客服聊天里的图片要带登录凭证才能取：先下成 Blob 再显示，离开页面时释放
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { getSupportImage } from '@/api/kangaroo/support'

const props = defineProps({
  url: { type: String, default: '' },           // 接口地址（服务器图片）
  localSrc: { type: String, default: '' },      // 本地预览地址（刚选的图片还没发完时）
  width: { type: Number, default: 0 },
  height: { type: Number, default: 0 },
  alt: { type: String, default: '图片' }
})

const fetched = ref('')
const error = ref('')
let seq = 0

const src = computed(() => props.localSrc || fetched.value)

// 按原图比例缩成最长边 200px 的框，避免加载前后跳动
const boxStyle = computed(() => {
  const w = props.width, h = props.height
  if (!w || !h) return { width: '180px', height: '180px' }
  const scale = Math.min(1, 200 / Math.max(w, h))
  return { width: Math.max(60, Math.round(w * scale)) + 'px', height: Math.max(60, Math.round(h * scale)) + 'px' }
})

function release() {
  if (fetched.value) URL.revokeObjectURL(fetched.value)
  fetched.value = ''
}

async function load() {
  if (props.localSrc || !props.url) return
  const current = ++seq
  error.value = ''
  release()
  try {
    const blob = await getSupportImage(props.url)
    if (!(blob instanceof Blob) || !String(blob.type).startsWith('image/')) {
      let message = '图片读取失败'
      try { message = JSON.parse(await blob.text()).msg || message } catch { /* 不是 JSON 就用默认提示 */ }
      throw new Error(message)
    }
    const objectUrl = URL.createObjectURL(blob)
    if (current !== seq) { URL.revokeObjectURL(objectUrl); return }
    fetched.value = objectUrl
  } catch (e) {
    if (current === seq) error.value = e?.message || '图片读取失败'
  }
}

watch(() => [props.url, props.localSrc], load, { immediate: true })
onBeforeUnmount(() => { seq++; release() })
</script>

<style lang="scss" scoped>
.auth-image {
  position: relative;
  max-width: 100%;
  border-radius: 6px;
  overflow: hidden;
  background: var(--el-fill-color-light);

  &__img {
    display: block;
    width: 100%;
    height: 100%;
    cursor: zoom-in;
  }

  &__state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    width: 100%;
    height: 100%;
    padding: 6px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    text-align: center;
  }
}
</style>
