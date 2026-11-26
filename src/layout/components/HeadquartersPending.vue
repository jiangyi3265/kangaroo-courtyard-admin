<template>
  <router-link v-for="item in visible" :key="item.name" :to="{ name: item.name, query: item.query }" class="pending-link">
    {{ item.label }}（{{ stale[item.name] ? '暂未更新' : counts[item.name] }}）
  </router-link>
</template>
<script setup>
import { readPendingCount } from '@/api/kangaroo/merchantRequest'
import { checkPermi } from '@/utils/permission'
import useUserStore from '@/store/modules/user'
import { createPendingPoll } from '@/utils/merchantRequest'
const router = useRouter()
const features = useUserStore().adminFeatures
const items = [
  { name: 'KgExtInsApply', feature: 'insuranceRefundCount', label: '待办退费', query: { tab: 'refunds' }, url: '/kangaroo/insurance-finance/headquarters-count', permissions: ['insapply:handle','insapply:list'] },
  { name: 'KgExtTaskAssignee', feature: 'storeTaskReview', label: '待验收', url: '/kangaroo/staff-task/store-reviews/count', permissions: ['stafftask:audit','taskassignee:list'] }
].filter(item => features.includes(item.feature) && router.hasRoute(item.name) && item.permissions.every(p => checkPermi(['kangaroo:' + p])))
const counts = reactive({})
const stale = reactive({})
const visible = computed(() => items.filter(item => stale[item.name] || counts[item.name] > 0))
const polls = items.map(item => createPendingPoll({
  fetchCount: () => readPendingCount(item.url),
  onCount: count => { counts[item.name] = count; stale[item.name] = false },
  onError: () => { stale[item.name] = true },
  isHidden: () => document.hidden
}))
const active = () => polls.forEach(poll => poll.markActive())
const resume = () => { if (!document.hidden) { active(); polls.forEach(poll => poll.refresh()) } }
const events = ['pointerdown','keydown','wheel','touchstart']
onMounted(() => {
  polls.forEach(poll => poll.start())
  events.forEach(e => window.addEventListener(e, active, { passive: true }))
  document.addEventListener('visibilitychange',resume)
})
onBeforeUnmount(() => {
  polls.forEach(poll => poll.stop())
  events.forEach(e => window.removeEventListener(e, active))
  document.removeEventListener('visibilitychange',resume)
})
</script>
<style scoped>
.pending-link { align-self: center; margin-inline: 4px; color: var(--el-color-danger); font-size: 13px; }
</style>
