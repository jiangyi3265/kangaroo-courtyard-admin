<template>
  <div ref="rootEl" class="app-container role-switch" v-loading="loading">
    <div class="rs-head">
      <div>
        <h2>角色切换</h2>
        <p>把原换工主理人变成城市负责人，原员工变成换工主理人。点切换之前，所有人的权限和今天一样；点了当下就生效，不用重启。</p>
      </div>
      <el-button icon="Refresh" :disabled="loading || acting" @click="load">重新读取</el-button>
    </div>

    <el-alert v-if="loadFailed" class="rs-alert" type="error" :closable="false" show-icon title="读取失败，现在不能操作。请点右上角「重新读取」。" />
    <el-alert v-if="notice" class="rs-alert rs-notice" :type="notice.type" show-icon :title="notice.text" @close="notice = null" />

    <template v-if="preview">
      <div class="rs-status">
        <div class="rs-tile" :class="switched ? 'rs-tile--on' : ''">
          <span>现在的阶段</span>
          <strong>{{ switched ? '已切换（新规则）' : '还没切换（旧规则）' }}</strong>
          <small v-if="switched">{{ preview.switchedBy }} 在 {{ parseTime(preview.switchedTime) }} 切换</small>
          <small v-else>所有人的权限和今天一样。看完名单，到这一页最下面确认</small>
        </div>
        <div class="rs-tile">
          <span>派单开关</span>
          <strong>{{ routingText(preview.routing) }}</strong>
          <small v-if="preview.routingOpenedTime">{{ parseTime(preview.routingOpenedTime) }} 打开</small>
          <small v-else>商家需求现在进老板后台</small>
        </div>
        <div class="rs-tile">
          <span>谁用上了新版小程序（共 {{ preview.clientSummary.people }} 人）</span>
          <strong class="rs-client-count">
            <em class="rs-ok">已用新版 {{ preview.clientSummary.newCount }}</em>
            <em class="rs-warn">还在老版 {{ preview.clientSummary.oldCount }}</em>
            <em>没打开过 {{ preview.clientSummary.neverCount }}</em>
          </strong>
          <small>新版指正式版或体验版 {{ preview.minClientVersion }} 或更新</small>
        </div>
      </div>

      <p v-if="preview.rollbackNote && !switched" class="rs-rollback-note">
        上次退回：{{ preview.rollbackNote }}（{{ preview.rolledBackBy }}，{{ parseTime(preview.rolledBackTime) }}）
      </p>

      <!-- 退回结果：被改成别的角色的行没动，切换后才开的倒回去了，都要老板看一眼。写在这里的只在这一次页面上，刷新后「上次退回」那行还有授权编号 -->
      <section v-if="rollbackResult && rollbackResult.converted.length" class="rs-card rs-card--danger">
        <h3>切换后才开的授权，已经倒回去</h3>
        <p class="rs-tip">这些人是切换之后才开的。旧规则下角色的意思不一样，标红的现在是有资金权的老主理人，请到「员工授权」确认。</p>
        <div v-for="row in rollbackResult.converted" :key="row.grantId" class="rs-skipped" :class="row.attention ? 'rs-skipped--attention' : ''">
          <div>授权编号 {{ row.grantId }}，账号 ID {{ row.appUserId }}，门店编号 {{ row.storeId }}</div>
          <div>{{ roleText(row.currentRole) }} → {{ roleText(row.afterRole) }}</div>
          <strong v-if="row.attention">{{ row.attention }}</strong>
        </div>
      </section>
      <section v-if="rollbackResult && (rollbackResult.skipped.length || rollbackResult.dictSkipped.length)" class="rs-card rs-card--danger">
        <h3>这些这次没有退回，请看一眼</h3>
        <p class="rs-tip">它们在切换之后被改成了别的角色，为了不盖掉别人的修改，这次没动。</p>
        <div v-for="row in rollbackResult.skipped" :key="row.grantId" class="rs-skipped" :class="row.attention ? 'rs-skipped--attention' : ''">
          <div>授权编号 {{ row.grantId }}，账号 ID {{ row.appUserId }}，门店编号 {{ row.storeId }}</div>
          <div>现在是 {{ roleText(row.currentRole) }}，切换前是 {{ roleText(row.beforeSwitchRole) }}<span v-if="row.updateBy">；{{ row.updateBy }} 在 {{ parseTime(row.updateTime) }} 改的</span></div>
          <strong v-if="row.attention">{{ row.attention }}</strong>
        </div>
        <div v-for="row in rollbackResult.dictSkipped" :key="row.dictValue" class="rs-skipped">
          <div>字典里的角色名字「{{ row.currentLabel }}」（{{ row.dictValue }}）切换后被人改过，没有还原</div>
        </div>
      </section>

      <!-- 切换之后：操作放最上面，名单退到下面备查 -->
      <template v-if="switched">
        <section class="rs-card" :class="preview.canRollback ? '' : 'rs-card--muted'">
          <h3>退回到切换前</h3>
          <template v-if="preview.canRollback">
            <p class="rs-tip">退回后，所有人回到切换前的角色和旧规则，当下就生效。会还原 {{ preview.rollbackPlan ? preview.rollbackPlan.restoreCount : 0 }} 条授权。切换后被改成别的角色的不会被盖掉。</p>
            <template v-if="plan.attention.length">
              <p class="rs-danger-line">下面 {{ plan.attention.length }} 条退回后是有资金权、能加人撤人的老主理人，请确认再退回：</p>
              <div v-for="row in plan.attention" :key="row.grantId" class="rs-skipped rs-skipped--attention">
                <div>授权编号 {{ row.grantId }}，账号 ID {{ row.appUserId }}，门店编号 {{ row.storeId }}：现在是 {{ roleText(row.currentRole) }}<span v-if="row.afterRole">，切换后才开的，会倒成 {{ roleText(row.afterRole) }}</span><span v-else>，被改过，不会动</span></div>
              </div>
            </template>
            <p v-if="plan.others.length" class="rs-tip">另外 {{ plan.others.length }} 条：{{ plan.others.map(planRowText).join('；') }}。</p>
            <div v-if="canDoRollback" class="rs-confirm">
              <el-input v-model="typed.rollback" :disabled="acting" maxlength="10" placeholder="输入「退回」两个字" aria-label="输入退回两个字" />
              <el-button type="danger" plain :loading="acting" :disabled="!confirmMatches(typed.rollback, CONFIRM_WORDS.rollback)" @click="doRollback">确认退回</el-button>
            </div>
          </template>
          <p v-else class="rs-blocked">现在不能退回：{{ preview.rollbackBlockedReason }}</p>
        </section>

        <section class="rs-card">
          <h3>打开派单</h3>
          <p v-if="preview.routingOpenedTime" class="rs-tip">派单已经打开（{{ parseTime(preview.routingOpenedTime) }}）。</p>
          <template v-else-if="preview.canOpenRouting">
            <p class="rs-tip">打开后，商家提交的需求自动派到本城：<strong>一条招募会发给本城每一位换工主理人</strong>。建议切换后观察半天到一天、真机看过再点。</p>
            <p class="rs-danger-line">打开之后，这一页就不能一键退回了。</p>
            <div class="rs-audience">
              <div class="rs-audience__title">变成换工主理人的共 {{ audience.total }} 人（切换后才开的不算在内），分布在：</div>
              <span v-for="row in audience.rows" :key="row.city" class="rs-chip">{{ row.city }} {{ row.count }} 人</span>
              <p v-if="!audience.rows.length" class="rs-blocked">没有人会收到：现在打开，需求还是回到老板后台。</p>
            </div>
            <div v-if="canDoRouting" class="rs-confirm">
              <el-input v-model="typed.routing" :disabled="acting" maxlength="10" placeholder="输入「打开派单」四个字" aria-label="输入打开派单四个字" />
              <el-button type="primary" :loading="acting" :disabled="!confirmMatches(typed.routing, CONFIRM_WORDS.routing)" @click="doOpenRouting">确认打开派单</el-button>
            </div>
          </template>
          <p v-else class="rs-blocked">派单开关现在是 {{ routingText(preview.routing) }}，不是从这一页打开的。这一页不能再操作，请联系 Claude 确认。</p>
        </section>
      </template>

      <section v-if="!switched && preview.blockers.length" class="rs-card rs-card--danger" aria-label="现在不能切换的原因">
        <h3>现在还不能切换</h3>
        <ul class="rs-list rs-list--danger"><li v-for="text in preview.blockers" :key="text">{{ text }}</li></ul>
      </section>

      <section v-if="warnings.red.length" class="rs-card rs-card--danger" aria-label="标红的门店">
        <h3>这些门店要你看一眼<small v-if="!switched">不拦切换，也可以先处理再切</small></h3>
        <p v-if="switched" class="rs-tip">这些是按切换前的角色算的。现在已经没有「员工」这个选项了，要给门店加人，请到「员工授权」开换工主理人。</p>
        <div v-for="item in warnings.red" :key="item.code" class="rs-warning">
          <div class="rs-warning__title">{{ item.title }}<b>{{ item.count }} 家</b></div>
          <div class="rs-warning__stores">
            <span v-for="store in item.items" :key="store.storeId" class="rs-chip rs-chip--danger">{{ store.city ? store.city + ' · ' : '' }}{{ store.storeName || '门店' + store.storeId }}</span>
          </div>
        </div>
      </section>

      <section v-if="warnings.info.length" class="rs-card" aria-label="其他提醒">
        <h3>其他提醒</h3>
        <div v-for="item in warnings.info" :key="item.code" class="rs-warning">
          <div class="rs-warning__title">{{ item.title }}<b>{{ item.count }}</b></div>
          <div v-if="item.items && item.items.length" class="rs-warning__stores">
            <span v-for="store in item.items" :key="store.storeId" class="rs-chip">{{ store.city ? store.city + ' · ' : '' }}{{ store.storeName || '门店' + store.storeId }}{{ store.count != null ? ' ' + store.count + ' 笔' : '' }}</span>
          </div>
        </div>
      </section>

      <h3 class="rs-section-title">{{ switched ? '这次改动的名单' : '切换后谁会变' }}</h3>
      <section v-for="group in preview.groups" :key="group.code" class="rs-card" :aria-label="group.title">
        <h3>{{ group.title }}<small>{{ group.count }} 条授权（一个人管几家店就有几条）</small></h3>
        <div class="rs-changes">
          <div>
            <div class="rs-changes__title rs-ok">多了</div>
            <ul class="rs-list"><li v-for="text in group.gains" :key="text">{{ text }}</li></ul>
          </div>
          <div>
            <div class="rs-changes__title rs-warn">少了</div>
            <ul v-if="group.loses.length" class="rs-list"><li v-for="text in group.loses" :key="text">{{ text }}</li></ul>
            <p v-else class="rs-tip">原来的都不变</p>
          </div>
        </div>
        <div v-if="group.people.length" class="rs-people">
          <div class="rs-person rs-person--head"><span>账号</span><span>手机号</span><span>门店</span><span>小程序版本</span><span>授权时间</span></div>
          <div v-for="person in group.people" :key="person.grantId" class="rs-person">
            <span class="rs-person__name"><b>{{ person.nickname || '未设置昵称' }}</b>（ID {{ person.appUserId }}）</span>
            <span>{{ person.phone || '没有手机号' }}</span>
            <span>
              {{ person.city ? person.city + ' · ' : '' }}{{ person.storeName || '门店' + person.storeId }}
              <el-tag v-if="!person.storeActive" type="info" size="small">门店已停用</el-tag>
            </span>
            <span>
              <el-tag :type="clientTag(person.client).type" size="small">{{ clientTag(person.client).text }}</el-tag>
              <small v-if="clientVersionText(person.client)" class="rs-version">{{ clientVersionText(person.client) }}</small>
            </span>
            <span class="rs-person__time">{{ parseTime(person.grantedTime) }}</span>
          </div>
        </div>
        <p v-else class="rs-tip">没有人</p>
      </section>

      <p class="rs-tip rs-others">
        <span v-if="preview.inactiveRows">另有 {{ preview.inactiveRows }} 条已撤销、已删除的授权也会一起改（原值有备份），不恢复他们的身份。</span>
        商家服务人 {{ preview.counts.merchantService }} 条、兼任商家服务人的小院主理人 {{ preview.counts.alsoService }} 条，都不变。
        <span v-if="preview.counts.unknownRole" class="rs-blocked">有 {{ preview.counts.unknownRole }} 条授权的角色认不出来，切换不会改它们。</span>
      </p>

      <!-- 切换之前：看完名单再确认，所以放在最下面 -->
      <section v-if="!switched && canDoSwitch" class="rs-card rs-card--action" aria-label="确认切换">
        <h3>确认切换</h3>
        <p class="rs-tip">切换后：{{ groupCount('toCityLead') }} 条授权变城市负责人，{{ groupCount('toManager') }} 条变换工主理人，已有的 {{ groupCount('cityLeadGainsFinance') }} 条城市负责人多出财务。当事人会收到一条站内消息。派单开关不会跟着打开。</p>
        <p v-if="preview.clientSummary.oldCount || preview.clientSummary.neverCount" class="rs-danger-line">还有 {{ preview.clientSummary.oldCount + preview.clientSummary.neverCount }} 人没用上新版。切换后他们要彻底关闭小程序、重新打开才能正常用。</p>
        <p class="rs-tip">切换前请先确认：微信公众平台「设置 → 版本设置」里的最低可用版本已经设成 {{ preview.minClientVersion }}（这一步系统查不到，要你自己看）。</p>
        <div class="rs-confirm">
          <el-input v-model="typed.switch" :disabled="acting || !preview.canSwitch" maxlength="10" placeholder="输入「切换」两个字" aria-label="输入切换两个字" />
          <el-button type="danger" :loading="acting" :disabled="!preview.canSwitch || !confirmMatches(typed.switch, CONFIRM_WORDS.switch)" @click="doSwitch">确认切换</el-button>
        </div>
        <p v-if="!preview.canSwitch" class="rs-blocked">上面写的原因解决之后，点右上角「重新读取」才能切换。</p>
      </section>
    </template>
  </div>
</template>

<script setup name="KgRoleSwitch">
import { getRoleSwitchPreview, switchRoles, rollbackRoles, openRouting } from '@/api/kangaroo/roleswitch'
import { CONFIRM_WORDS, actionFailureText, clientTag, clientVersionText, confirmMatches, planRowText, roleText, rollbackPlanRows, routingAudience, routingText, splitWarnings } from '@/utils/roleSwitch'
import { checkPermi } from '@/utils/permission'
import useDictStore from '@/store/modules/dict'

const loading = ref(true)
const loadFailed = ref(false)
const acting = ref(false)
const preview = ref(null)
const notice = ref(null)
const rollbackResult = ref(null)
const rootEl = ref(null)
const typed = reactive({ switch: '', rollback: '', routing: '' })

const canDoSwitch = checkPermi(['kangaroo:roleswitch:switch'])
const canDoRollback = checkPermi(['kangaroo:roleswitch:rollback'])
const canDoRouting = checkPermi(['kangaroo:roleswitch:routing'])

const switched = computed(() => preview.value?.phase === 'new')
const warnings = computed(() => splitWarnings(preview.value?.warnings))
const plan = computed(() => rollbackPlanRows(preview.value?.rollbackPlan))
const audience = computed(() => routingAudience(preview.value?.groups.find(group => group.code === 'toManager')?.people))

function groupCount(code) {
  return preview.value?.groups.find(group => group.code === code)?.count || 0
}

let loadRequest = 0
/** 读不到就把旧名单清掉：不能让人对着上一次的名单和按钮操作 */
async function load() {
  const request = ++loadRequest
  loading.value = true
  loadFailed.value = false
  try {
    const res = await getRoleSwitchPreview()
    if (request === loadRequest) preview.value = res.data
  } catch {
    if (request === loadRequest) {
      preview.value = null
      loadFailed.value = true
    }
  } finally {
    if (request === loadRequest) loading.value = false
  }
}

/**
 * 三个操作共用：同一时间只做一个；不管成败都重新读一次状态，输入的确认字也清掉，下一步要重新看过再输入。
 * 按钮可能在长名单的最下面，而结果写在最上面：做完滚回顶上，不然人看不到结果。
 * 字典切换时改过，前端缓存的角色名字和排序一并作废。
 */
async function run(request, onSuccess) {
  if (acting.value) return
  acting.value = true
  notice.value = null
  try {
    onSuccess(await request())
    useDictStore().removeDict('kg_staff_role')
  } catch (err) {
    notice.value = { type: 'error', text: actionFailureText(err) }
  } finally {
    typed.switch = typed.rollback = typed.routing = ''
    await load()
    acting.value = false
    await nextTick()
    rootEl.value?.scrollIntoView({ block: 'start' })
  }
}

function doSwitch() {
  return run(() => switchRoles(preview.value.fingerprint, CONFIRM_WORDS.switch), data => {
    rollbackResult.value = null
    notice.value = { type: 'success', text: '已切换：' + data.toCityLead + ' 条授权变城市负责人，' + data.toManager + ' 条变换工主理人，已发站内消息 ' + data.noticeSent + ' 条。请让当事人彻底关闭小程序重新打开。' }
  })
}

function doRollback() {
  return run(() => rollbackRoles(CONFIRM_WORDS.rollback), data => {
    rollbackResult.value = { skipped: data.skipped || [], converted: data.converted || [], dictSkipped: data.dictSkipped || [] }
    notice.value = { type: 'success', text: '已退回到切换前。' + (data.message || '') }
  })
}

function doOpenRouting() {
  return run(() => openRouting(CONFIRM_WORDS.routing), () => {
    notice.value = { type: 'success', text: '派单已打开。商家提交的需求现在会派给本城换工主理人。' }
  })
}

load()
// 菜单开了页面缓存：切到别的页再回来时重新读，不让人看着旧名单
let firstActivation = true
onActivated(() => {
  if (firstActivation) { firstActivation = false; return }
  if (!acting.value) load()
})
onBeforeUnmount(() => { ++loadRequest })
</script>

<style scoped>
.rs-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:16px}
.rs-head h2{margin:0 0 6px;font-size:20px;font-weight:600}
.rs-head p{margin:0;line-height:1.7;color:var(--el-text-color-regular)}
.rs-head .el-button{flex:none}
.rs-alert{margin-bottom:12px}
.rs-notice :deep(.el-alert__title){white-space:normal;line-height:1.7;font-size:14px}
.rs-status{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:16px}
.rs-tile{display:flex;flex-direction:column;gap:6px;min-width:0;padding:14px 16px;background:var(--el-fill-color-light);border-radius:8px}
.rs-tile>span,.rs-tile small{font-size:12px;line-height:1.6;color:var(--el-text-color-secondary)}
.rs-tile strong{font-size:16px;font-weight:600}
.rs-tile--on{background:var(--el-color-warning-light-9)}
.rs-client-count{display:flex;flex-wrap:wrap;column-gap:12px;row-gap:2px}
.rs-client-count em{font-style:normal;font-size:14px}
.rs-ok{color:var(--el-color-success)}
.rs-warn{color:var(--el-color-warning-dark-2)}
.rs-rollback-note{margin:0 0 16px;font-size:13px;line-height:1.7;color:var(--el-text-color-secondary)}
.rs-card{margin-bottom:16px;padding:16px;background:var(--el-bg-color);border:1px solid var(--el-border-color-lighter);border-radius:8px}
.rs-card h3{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 10px;margin:0 0 10px;font-size:15px;font-weight:600}
.rs-card h3 small{font-size:12px;font-weight:400;color:var(--el-text-color-secondary)}
.rs-card--danger{border-color:var(--el-color-danger-light-5);background:var(--el-color-danger-light-9)}
.rs-card--danger h3{color:var(--el-color-danger)}
.rs-card--action{border-color:var(--el-color-danger-light-5)}
.rs-card--muted{background:var(--el-fill-color-lighter)}
.rs-section-title{margin:20px 0 10px;font-size:16px;font-weight:600}
.rs-tip{margin:0 0 10px;font-size:13px;line-height:1.7;color:var(--el-text-color-regular)}
.rs-danger-line,.rs-blocked{margin:0 0 10px;font-size:13px;line-height:1.7;color:var(--el-color-danger);font-weight:600}
.rs-others{margin-bottom:16px;color:var(--el-text-color-secondary)}
.rs-list{margin:0;padding-left:18px;font-size:13px;line-height:1.8}
.rs-list--danger{color:var(--el-color-danger)}
.rs-warning+.rs-warning{margin-top:12px;padding-top:12px;border-top:1px solid var(--el-border-color-lighter)}
.rs-warning__title{font-size:13px;line-height:1.7}
.rs-warning__title b{margin-left:8px;white-space:nowrap}
.rs-card--danger .rs-warning__title{color:var(--el-color-danger)}
.rs-warning__stores{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.rs-chip{display:inline-block;max-width:100%;padding:2px 8px;font-size:12px;line-height:1.6;background:var(--el-fill-color);border-radius:4px;overflow-wrap:anywhere}
.rs-chip--danger{background:var(--el-bg-color);color:var(--el-color-danger);border:1px solid var(--el-color-danger-light-7)}
.rs-audience{margin-bottom:12px}
.rs-audience .rs-chip{margin:0 6px 6px 0}
.rs-audience__title{margin-bottom:6px;font-size:13px;line-height:1.7}
.rs-confirm{display:flex;gap:10px;max-width:420px}
.rs-confirm .el-input{flex:1;min-width:0}
.rs-confirm .el-button{flex:none}
.rs-changes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:12px}
.rs-changes__title{margin-bottom:2px;font-size:13px;font-weight:600}
.rs-person{display:grid;grid-template-columns:minmax(0,1.5fr) 110px minmax(0,1.5fr) minmax(0,1.1fr) 150px;gap:10px;align-items:center;padding:8px 0;font-size:13px;line-height:1.6;border-top:1px solid var(--el-border-color-lighter)}
.rs-person--head{font-size:12px;color:var(--el-text-color-secondary);border-top:0}
.rs-person>span{min-width:0;overflow-wrap:anywhere}
.rs-person__name b{font-weight:600}
.rs-person__time{font-size:12px;color:var(--el-text-color-secondary)}
.rs-version{display:block;font-size:12px;color:var(--el-text-color-secondary)}
.rs-skipped{padding:8px 0;font-size:13px;line-height:1.7;border-top:1px solid var(--el-color-danger-light-7)}
.rs-skipped strong{color:var(--el-color-danger)}
.rs-skipped--attention{color:var(--el-color-danger)}
/* 手机：状态卡一列；名单每人一小块，不用左右滑 */
@media (max-width: 768px) {
  .rs-head{flex-direction:column;gap:10px}
  .rs-status,.rs-changes{grid-template-columns:minmax(0,1fr)}
  .rs-card{padding:12px}
  .rs-confirm{flex-direction:column;max-width:none}
  .rs-confirm .el-button{width:100%;margin-left:0}
  .rs-person--head{display:none}
  .rs-person{grid-template-columns:minmax(0,1fr) auto;gap:2px 10px;padding:10px 0}
  .rs-person>span:nth-child(1){grid-column:1}
  .rs-person>span:nth-child(4){grid-column:2;grid-row:1 / span 2;text-align:right}
  .rs-person>span:nth-child(2),.rs-person>span:nth-child(3),.rs-person>span:nth-child(5){grid-column:1}
}
</style>
