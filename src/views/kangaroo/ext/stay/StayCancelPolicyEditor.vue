<template>
  <div class="stay-policy-editor">
    <el-checkbox :model-value="enabled" :disabled="disabled" @change="toggle">启用自定义规则</el-checkbox>
    <template v-if="enabled">
      <div class="policy-row"><label for="stay-policy-days">免费取消截止</label><div class="policy-input-group"><span>入住前</span><el-input-number id="stay-policy-days" :model-value="draft.freeDays" :min="0" :max="180" :precision="0" :disabled="disabled" @update:model-value="update('freeDays', $event)" /><span>天</span></div></div>
      <p class="policy-help">按房源的入住时间计算。0 表示入住前均可免费取消。</p>
      <div class="policy-row"><label for="stay-policy-mode">截止后、入住前</label><el-select id="stay-policy-mode" :model-value="draft.lateMode" :disabled="disabled" @update:model-value="update('lateMode', $event)"><el-option label="扣首晚房费" value="first_night" /><el-option label="按房费比例扣费" value="percent" /><el-option label="不可退款" value="nonrefundable" /></el-select></div>
      <div v-if="draft.lateMode === 'percent'" class="policy-row"><label for="stay-policy-percent">扣费比例</label><div class="policy-input-group"><el-input-number id="stay-policy-percent" :model-value="draft.latePercent" :min="0" :max="100" :precision="0" :disabled="disabled" @update:model-value="update('latePercent', $event)" /><span>% 房费</span></div></div>
      <p class="policy-help">入住时刻及之后不可退款；扣费金额不超过订单实付金额。</p>
    </template>
    <div class="policy-preview"><strong>用户看到的规则</strong><p>{{ preview }}</p></div>
    <p class="policy-help">保存后用于新订单，已生成订单仍按原规则退款。不可退的早鸟特价优先按不可退规则执行。</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { defaultStayPolicy, readStayPolicy, stayPolicyPreview } from '@/utils/stayCancelPolicy'
const props = defineProps({ modelValue: { type: String, default: '' }, disabled: Boolean })
const emit = defineEmits(['update:modelValue'])
const enabled = computed(() => !!props.modelValue)
const draft = computed(() => { try { return readStayPolicy(props.modelValue) || defaultStayPolicy() } catch { return defaultStayPolicy() } })
const preview = computed(() => stayPolicyPreview(props.modelValue))
const toggle = on => emit('update:modelValue', on ? JSON.stringify(defaultStayPolicy()) : null)
const update = (key, value) => {
  const next = { ...draft.value, [key]: value == null ? null : value }
  if (key === 'lateMode') next.latePercent = value === 'percent' ? 50 : 0
  emit('update:modelValue', JSON.stringify(next))
}
</script>

<style scoped>
.stay-policy-editor { width: 100%; }
.policy-row { display: flex; align-items: center; gap: 16px; margin-top: 16px; }
.policy-row > label { flex: 0 0 120px; color: var(--el-text-color-regular); }
.policy-input-group { display: flex; align-items: center; gap: 10px; }
.policy-row .el-select { width: 240px; }
.policy-help { margin: 8px 0 0; color: var(--el-text-color-secondary); font-size: 13px; line-height: 1.6; }
.policy-preview { margin-top: 16px; padding: 14px 16px; border-radius: 6px; background: var(--el-fill-color-light); line-height: 1.7; }
.policy-preview p { margin: 4px 0 0; }
@media (max-width: 600px) { .policy-row { flex-wrap: wrap; gap: 8px; } }
</style>
