<template>
  <section class="display-materials" aria-label="展示资料检查">
    <div class="display-materials__heading"><strong>展示资料检查</strong><span>{{ missing ? `${missing} 项待补充` : '所列资料已填写' }}</span></div>
    <p>按当前表单检查，点击项目可定位字段；提交保存后生效。</p>
    <div class="display-materials__items">
      <button v-for="entry in items" :key="entry.field" type="button" :class="['display-materials__item', { 'is-missing': entry.state === 'missing' }]" :title="entry.hint || ''" @click="$emit('locate', entry.field)">
        <span>{{ entry.label }}</span><small>{{ entry.state === 'missing' ? '待补充' : entry.state === 'inherited' ? inheritedLabel : '已填写' }}</small>
      </button>
    </div>
    <p v-if="items.some(entry => entry.state === 'inherited')" class="display-materials__inherit">{{ inheritedHint }}</p>
  </section>
</template>
<script setup>
import { computed } from 'vue'
const props = defineProps({
  items: { type: Array, default: () => [] },
  inheritedLabel: { type: String, default: '沿用小院' },
  inheritedHint: { type: String, default: '沿用小院的项目无需重复填写；店长头像和介绍请在对应小院资料中核对。' }
})
defineEmits(['locate'])
const missing = computed(() => props.items.filter(entry => entry.state === 'missing').length)
</script>
<style scoped>
.display-materials{margin:16px 0 22px;padding:16px;border:1px solid var(--el-border-color-light);border-radius:8px;background:var(--el-fill-color-light)}
.display-materials__heading{display:flex;align-items:baseline;flex-wrap:wrap;gap:10px;color:var(--el-text-color-primary)}
.display-materials__heading>span{font-size:13px;color:var(--el-text-color-regular)}
.display-materials p{margin:7px 0 12px;font-size:13px;line-height:1.6;color:var(--el-text-color-regular)}
.display-materials__items{display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:8px}
.display-materials__item{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;text-align:left;font:inherit;font-size:13px;line-height:1.4;color:var(--el-text-color-regular);background:var(--el-bg-color);border:1px solid var(--el-border-color-light);border-radius:5px;cursor:pointer}
.display-materials__item small{font-size:12px;white-space:nowrap;color:var(--el-color-success-dark-2)}
.display-materials__item.is-missing small{color:var(--el-color-warning-dark-2)}
.display-materials__item:hover,.display-materials__item:focus-visible{border-color:var(--el-color-primary);outline:2px solid var(--el-color-primary-light-7);outline-offset:1px}
.display-materials .display-materials__inherit{margin:10px 0 0}
@media(max-width:420px){.display-materials{padding:12px}.display-materials__items{grid-template-columns:1fr}}
</style>
