/**
 * 后台「商家需求」（V63）用到的纯逻辑：铃铛轮询、跳转链接。不依赖 Vue 和接口，scripts/merchant-request-admin.test.mjs 直接测。
 */

/** 页面里处理完一条需求后发这个事件，铃铛马上重查，不用等下一轮 */
export const MERCHANT_REQUEST_CHANGED = 'kg:merchant-request-changed'
export const BELL_POLL_MS = 60 * 1000
export const BELL_IDLE_MS = 5 * 60 * 1000

/**
 * 铃铛轮询。
 * - 标签页在后台不查；回到前台马上查一次。
 * - 人离开超过 idleMs 也不查：后台登录态是「有请求就续期」（TokenService.verifyToken），
 *   一直轮询会让没人看的电脑永远不退出登录。人回来了马上查一次。
 * - 查询失败时保留上一次的数字，不弹错误：这是后台默默做的事，不该打扰正在干活的人。
 */
export function createPendingPoll({
  fetchCount,
  onCount,
  isHidden = () => false,
  now = () => Date.now(),
  setTimer = (fn, ms) => setInterval(fn, ms),
  clearTimer = (id) => clearInterval(id),
  intervalMs = BELL_POLL_MS,
  idleMs = BELL_IDLE_MS
}) {
  let running = false
  let timer = null
  let inFlight = false
  let again = false
  let lastActive = now()

  async function refresh() {
    if (!running) return
    // 正在查的时候又要查（刚重新派单）：等这次回来再查一次，旧结果不能盖住新结果
    if (inFlight) { again = true; return }
    inFlight = true
    try {
      const count = await fetchCount()
      if (running && !again) onCount(count)
    } catch {
      // 保留上一次的数字
    } finally {
      inFlight = false
      if (again) { again = false; refresh() }
    }
  }
  function tick() {
    if (isHidden() || now() - lastActive >= idleMs) return
    refresh()
  }
  return {
    start() {
      if (running) return
      running = true
      lastActive = now()
      timer = setTimer(tick, intervalMs)
      refresh()
    },
    stop() {
      running = false
      if (timer !== null) clearTimer(timer)
      timer = null
    },
    refresh,
    tick,
    /** 有人动了鼠标键盘：记时间；之前算离开的话马上查一次 */
    markActive() {
      const wasIdle = now() - lastActive >= idleMs
      lastActive = now()
      if (wasIdle) refresh()
    }
  }
}

// 需求类型 → 岗位管理的「岗位分类」；代运营、抖音卖房没有岗位
const JOB_TYPE_OF_REQUEST = { volunteer: 'volunteer', parttime: 'parttime', fulltime: 'fulltime', online_task: 'online' }

/** 商家需求列表的「岗位ID」→ 岗位管理（筛到这家店这一类，并标出这一行）。没有岗位的需求返回 null，显示普通文字 */
export function jobLinkOf(row) {
  if (!row || !row.jobId || !row.storeId) return null
  const query = { jobId: String(row.jobId), storeId: String(row.storeId) }
  const jobType = JOB_TYPE_OF_REQUEST[row.requestType]
  if (jobType) query.jobType = jobType
  return { name: 'KgJob', query }
}

/** 岗位管理收到的跳转参数：不合法的一律当没传 */
export function parseJobFocus(query) {
  const q = query || {}
  if (!/^\d+$/.test(String(q.jobId ?? '')) || !/^\d+$/.test(String(q.storeId ?? ''))) return null
  const jobType = Object.values(JOB_TYPE_OF_REQUEST).includes(q.jobType) ? q.jobType : undefined
  return { jobId: Number(q.jobId), storeId: Number(q.storeId), jobType }
}

/** 商家入驻申请列表的「开通门店ID」→ 门店管理并打开这家店。没开通门店的老申请返回 null */
export function storeLinkOf(row) {
  if (!row || !row.storeId) return null
  return { name: 'KgStore', query: { storeId: String(row.storeId) } }
}

/** 门店管理收到的跳转参数 */
export function parseStoreFocus(query) {
  const id = (query || {}).storeId
  return /^\d+$/.test(String(id ?? '')) ? Number(id) : null
}
