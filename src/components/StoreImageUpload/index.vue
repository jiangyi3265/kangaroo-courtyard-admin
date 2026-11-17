<template>
  <div class="store-images">
    <el-upload
      ref="uploadRef" v-model:file-list="files" multiple list-type="picture-card"
      :action="uploadUrl" :headers="headers" :limit="9" accept=".png,.jpg,.jpeg"
      :disabled="disabled || uploading" :class="{ 'is-full': files.length >= 9 }"
      :before-upload="beforeUpload" :on-success="uploaded" :on-error="failed"
      :on-exceed="() => proxy.$modal.msgWarning('门店图片最多上传 9 张')"
    >
      <el-icon><Plus /></el-icon>
      <template #file="{ file }">
        <div class="store-images__item">
          <button type="button" class="store-images__preview" :aria-label="`预览第${indexOf(file) + 1}张图片`" @click="preview = file.url">
            <img :src="file.url" :alt="`门店图片 ${indexOf(file) + 1}`" />
          </button>
          <el-tag v-if="indexOf(file) === 0" class="store-images__cover" size="small" effect="dark">封面</el-tag>
          <div v-if="file.status === 'uploading' || file.status === 'ready'" class="store-images__progress">上传中…</div>
          <div class="store-images__actions">
            <el-button text :disabled="disabled || uploading || indexOf(file) === 0" :aria-label="`前移第${indexOf(file) + 1}张图片`" title="前移" @click="move(indexOf(file), indexOf(file) - 1)"><el-icon><ArrowLeft /></el-icon></el-button>
            <el-button text :disabled="disabled || uploading || indexOf(file) === files.length - 1" :aria-label="`后移第${indexOf(file) + 1}张图片`" title="后移" @click="move(indexOf(file), indexOf(file) + 1)"><el-icon><ArrowRight /></el-icon></el-button>
            <el-button text type="danger" :disabled="disabled || uploading" :aria-label="`删除第${indexOf(file) + 1}张图片`" title="删除" @click="remove(file)"><el-icon><Delete /></el-icon></el-button>
          </div>
        </div>
      </template>
    </el-upload>
    <div class="store-images__tip">最多 9 张，PNG / JPG / JPEG，单张不超过 20MB。</div>
    <div class="store-images__tip">拖动图片或点击左右箭头排序，第一张作为封面。调整后请点击“确定”保存。</div>
    <el-dialog :model-value="!!preview" title="门店图片预览" width="800px" append-to-body @close="preview = ''">
      <img :src="preview" alt="门店图片预览" class="store-images__large" />
    </el-dialog>
  </div>
</template>

<script setup>
import { genFileId } from 'element-plus'
import Sortable from 'sortablejs'
import { getToken } from '@/utils/auth'
import { imageUrl } from '@/utils/imageUrl'

const props = defineProps({ modelValue: { type: Array, default: () => [] }, disabled: Boolean })
const emit = defineEmits(['update:modelValue', 'busy'])
const { proxy } = getCurrentInstance()
const files = ref([])
const uploadRef = ref()
const preview = ref('')
const pending = reactive(new Set())
const uploading = computed(() => pending.size > 0)
const uploadUrl = import.meta.env.VITE_APP_BASE_API + '/common/upload'
const headers = { Authorization: 'Bearer ' + getToken() }
let sortable
let disposed = false
const paths = () => files.value.filter(file => file.path).map(file => file.path)
const indexOf = file => files.value.findIndex(item => item.uid === file.uid)

watch(() => props.modelValue, value => {
  if (uploading.value || JSON.stringify(value) === JSON.stringify(paths())) return
  files.value = value.map(path => ({ uid: genFileId(), name: path, path, url: imageUrl(path), status: 'success' }))
}, { immediate: true, deep: true })
watch(() => props.disabled || uploading.value, disabled => sortable?.option('disabled', disabled))

function beforeUpload(file) {
  if (!/\.(png|jpe?g)$/i.test(file.name)) {
    proxy.$modal.msgError('请上传 PNG、JPG 或 JPEG 图片')
    return false
  }
  if (file.size > 20 * 1024 * 1024) {
    proxy.$modal.msgError('单张图片不能超过 20MB')
    return false
  }
  pending.add(file.uid)
  emit('busy', true)
  return true
}
function finish(file) {
  pending.delete(file.uid)
  if (!pending.size) {
    // 按选择时的顺序保存，避免并发上传完成先后改变首图。
    emit('update:modelValue', paths())
    emit('busy', false)
  }
}
function uploaded(response, file) {
  if (disposed || !pending.has(file.uid)) return
  if (response.code === 200 && response.fileName) {
    file.path = response.fileName
    file.url = imageUrl(response.fileName)
  } else {
    files.value = files.value.filter(item => item.uid !== file.uid)
    proxy.$modal.msgError(response.msg || '图片上传失败，请重新上传')
  }
  finish(file)
}
function failed(error, file) {
  if (disposed || !pending.has(file.uid)) return
  files.value = files.value.filter(item => item.uid !== file.uid)
  proxy.$modal.msgError('图片上传失败，请重新上传')
  finish(file)
}
function remove(file) {
  if (props.disabled || uploading.value) return
  files.value = files.value.filter(item => item.uid !== file.uid)
  emit('update:modelValue', paths())
}
function move(from, to) {
  if (props.disabled || uploading.value || from < 0 || to < 0 || to >= files.value.length || from === to) return
  const [file] = files.value.splice(from, 1)
  files.value.splice(to, 0, file)
  emit('update:modelValue', paths())
}
onMounted(() => {
  sortable = Sortable.create(uploadRef.value.$el.querySelector('.el-upload-list'), {
    draggable: '.el-upload-list__item', filter: '.store-images__actions', preventOnFilter: false,
    animation: 150, disabled: props.disabled || uploading.value,
    onEnd(event) {
      if (event.oldDraggableIndex === event.newDraggableIndex) return
      // 先还原 Sortable 移动的 DOM，再让 Vue 按 uid 渲染新顺序。
      event.from.removeChild(event.item)
      event.from.insertBefore(event.item, event.from.children[event.oldIndex] || null)
      move(event.oldDraggableIndex, event.newDraggableIndex)
    }
  })
})
onBeforeUnmount(() => {
  disposed = true
  uploadRef.value?.abort()
  sortable?.destroy()
  pending.clear()
  emit('busy', false)
})
</script>

<style scoped lang="scss">
.store-images { width: 100%; }
.store-images :deep(.el-upload-list__item), .store-images :deep(.el-upload--picture-card) { width: 128px; height: 156px; margin: 0 8px 8px 0; }
.store-images :deep(.is-full .el-upload--picture-card) { display: none; }
.store-images__item { position: relative; width: 100%; height: 100%; }
.store-images__preview { display: block; padding: 0; width: 100%; height: 120px; border: 0; background: var(--el-fill-color-light); cursor: grab; }
.store-images__preview img { width: 100%; height: 100%; object-fit: cover; }
.store-images__cover { position: absolute; top: 6px; left: 6px; pointer-events: none; }
.store-images__progress { position: absolute; top: 96px; width: 100%; color: #fff; background: rgba(0, 0, 0, .65); text-align: center; font-size: 12px; }
.store-images__actions { display: flex; justify-content: space-around; height: 34px; background: var(--el-bg-color); }
.store-images__actions .el-button { margin: 0; padding: 6px; min-width: 32px; }
.store-images__tip { color: var(--el-text-color-regular); font-size: 12px; line-height: 1.7; }
.store-images__large { display: block; max-width: 100%; max-height: 70vh; margin: auto; }
</style>
