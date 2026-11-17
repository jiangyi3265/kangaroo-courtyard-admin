<template>
  <el-tooltip v-if="visible" :content="tip" effect="dark" placement="bottom">
    <button type="button" class="merchant-bell" :aria-label="tip" @click="openPage">
      <el-badge :value="count" :max="99" :is-dot="count === 0" :hidden="count === 0 && recent === 0">
        <el-icon><Bell /></el-icon>
      </el-badge>
    </button>
  </el-tooltip>
</template>

<script setup>
/**
 * 商家需求铃铛（V63）：本城没有换工主理人或商家服务人时，需求等老板处理（状态 unassigned），显示数字。
 * 派给本地的不用老板处理，但老板要知道：最近 24 小时有新派出的，没有待处理时显示小红点，鼠标放上去看条数。
 * 只有能看「商家需求」页的账号才显示、才轮询；手机上也显示。这只是后台页面里的提醒，关着后台就看不到。
 */
import { checkPermi } from '@/utils/permission'
import { getPendingCount } from '@/api/kangaroo/merchantRequest'
import { createPendingPoll, MERCHANT_REQUEST_CHANGED } from '@/utils/merchantRequest'

const ROUTE_NAME = 'KgExtMerchantRequest'
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart']

const router = useRouter()
const count = ref(0)
const recent = ref(0)
const visible = checkPermi(['kangaroo:merchantrequest:list']) && router.hasRoute(ROUTE_NAME)
const tip = computed(() => [
  count.value > 0 ? '有 ' + count.value + ' 条商家需求等平台安排' : '商家需求：暂时没有等平台安排的',
  recent.value > 0 ? '最近 24 小时派给本地 ' + recent.value + ' 条' : ''
].filter(Boolean).join('；'))

const poll = createPendingPoll({
  fetchCount: getPendingCount,
  onCount: value => { count.value = value.count; recent.value = value.recent },
  isHidden: () => document.hidden
})
const onActivity = () => poll.markActive()
const onVisibility = () => { if (!document.hidden) { poll.markActive(); poll.refresh() } }
const onChanged = () => poll.refresh()

function openPage() {
  router.push({ name: ROUTE_NAME })
}

onMounted(() => {
  if (!visible) return
  ACTIVITY_EVENTS.forEach(name => window.addEventListener(name, onActivity, { passive: true, capture: true }))
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener(MERCHANT_REQUEST_CHANGED, onChanged)
  poll.start()
})
onBeforeUnmount(() => {
  poll.stop()
  ACTIVITY_EVENTS.forEach(name => window.removeEventListener(name, onActivity, { capture: true }))
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener(MERCHANT_REQUEST_CHANGED, onChanged)
})
</script>

<style lang="scss" scoped>
.merchant-bell {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 12px 0 8px;
  border: 0;
  background: transparent;
  color: #5a5e66;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.3s;

  &:hover {
    background: rgba(0, 0, 0, 0.025);
  }

  :deep(.el-badge) {
    display: flex;
    align-items: center;
  }
}
</style>
