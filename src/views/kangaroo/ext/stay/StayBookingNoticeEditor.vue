<template>
  <div class="stay-notice-editor">
    <el-checkbox :model-value="enabled" :disabled="disabled || !defaultsReady" @change="toggle">自定义预订须知</el-checkbox>
    <p v-if="!defaultsReady" class="notice-help">默认须知读取失败，请刷新页面后重试。</p>
    <template v-if="enabled">
      <label for="stay-notice-title">须知标题</label>
      <el-input id="stay-notice-title" :model-value="draft.title" :maxlength="80" show-word-limit :disabled="disabled" @update:model-value="update('title', $event)" />
      <label for="stay-notice-content">须知正文</label>
      <el-input id="stay-notice-content" type="textarea" :model-value="draft.content" :rows="8" :maxlength="6000" show-word-limit :disabled="disabled" @update:model-value="update('content', $event)" />
      <p class="notice-help">支持换行，可按条目填写；保存后在确认订单页展示。</p>
    </template>
    <div v-if="preview" class="notice-preview">
      <span class="preview-label">{{ enabled ? '用户看到的须知' : '当前使用的默认须知' }}</span>
      <strong>{{ preview.title }}</strong>
      <p>{{ preview.content }}</p>
    </div>
    <p v-else-if="enabled" class="notice-help">请填写标题和正文后查看预览。</p>
    <p class="notice-help">保存后用于新订单，已有订单保留原须知。取消自定义后恢复默认内容。取消退款条件请在上方「自定义退款规则」中设置。</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { readStayNotice, stayNoticeError } from '@/utils/stayBookingNotice'
const props = defineProps({ modelValue: { type: String, default: '' }, defaultValue: { type: Object, default: null }, disabled: Boolean })
const emit = defineEmits(['update:modelValue'])
const enabled = computed(() => !!props.modelValue)
const defaultsReady = computed(() => !!props.defaultValue && !stayNoticeError(props.defaultValue))
const draft = computed(() => { try { return readStayNotice(props.modelValue) || props.defaultValue || {} } catch { return {} } })
const preview = computed(() => (enabled.value || defaultsReady.value) && !stayNoticeError(enabled.value ? props.modelValue : props.defaultValue) ? draft.value : null)
function toggle(on) { emit('update:modelValue', on ? JSON.stringify(props.defaultValue) : null) }
function update(key, value) { emit('update:modelValue', JSON.stringify({ ...draft.value, [key]: value })) }
</script>

<style scoped>
.stay-notice-editor { width: 100%; min-width: 0; }
.stay-notice-editor > label { display: block; margin: 12px 0 6px; color: var(--el-text-color-regular); }
.notice-help { margin: 8px 0 0; font-size: 13px; line-height: 1.7; color: var(--el-text-color-secondary); }
.notice-preview { padding: 14px 16px; margin-top: 16px; border-radius: 6px; background: var(--el-fill-color-light); line-height: 1.7; overflow-wrap: anywhere; }
.preview-label { display: block; font-size: 12px; color: var(--el-text-color-secondary); margin-bottom: 6px; }
.notice-preview strong { display: block; }
.notice-preview p { white-space: pre-wrap; margin: 6px 0 0; }
</style>
