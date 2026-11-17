// 后台「商家需求」（V63）：铃铛轮询、跳转链接、员工授权角色显示、页面接线。不需要浏览器、后端和数据库。
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { compileTemplate, parse } from '@vue/compiler-sfc'
import { BELL_IDLE_MS, createPendingPoll, jobLinkOf, parseJobFocus, parseStoreFocus, storeLinkOf } from '../src/utils/merchantRequest.js'
import { ALSO_SERVICE_HINT, ALSO_SERVICE_LABEL, ALSO_SERVICE_ROLE, CITY_ROLE_HINTS, SWITCHED_ROLE_HINTS, alsoServiceValue, isAlsoService, mergeStaffRoles, roleHint, roleScopeText, selectableStaffRoles } from '../src/utils/staffRoles.js'
import { CONFIRM_WORDS, actionFailureText, clientTag, clientVersionText, confirmMatches, planRowText, roleText, rollbackPlanRows, routingAudience, routingText, splitWarnings } from '../src/utils/roleSwitch.js'

const read = (rel) => readFileSync(new URL('../' + rel, import.meta.url), 'utf8')
const flush = () => new Promise(resolve => setImmediate(resolve))

function pollHarness(overrides = {}) {
  const state = { calls: 0, shown: [], clock: 1000, hidden: false, tick: null, cleared: false }
  const poll = createPendingPoll({
    fetchCount: async () => { state.calls++; return state.calls * 10 },
    onCount: value => state.shown.push(value),
    isHidden: () => state.hidden,
    now: () => state.clock,
    setTimer: fn => { state.tick = fn; return 1 },
    clearTimer: () => { state.cleared = true },
    ...overrides
  })
  return { poll, state }
}

test('铃铛：打开就查一次，到点再查', async () => {
  const { poll, state } = pollHarness()
  poll.start()
  await flush()
  assert.deepEqual(state.shown, [10])
  state.tick()
  await flush()
  assert.deepEqual(state.shown, [10, 20])
  poll.stop()
})

test('铃铛：标签页在后台不查，回到前台能查', async () => {
  const { poll, state } = pollHarness()
  poll.start()
  await flush()
  state.hidden = true
  state.tick()
  await flush()
  assert.equal(state.calls, 1)
  state.hidden = false
  state.tick()
  await flush()
  assert.equal(state.calls, 2)
  poll.stop()
})

test('铃铛：人离开后不查（不能替没人看的电脑续登录），人回来马上查', async () => {
  const { poll, state } = pollHarness()
  poll.start()
  await flush()
  state.clock += BELL_IDLE_MS
  state.tick()
  await flush()
  assert.equal(state.calls, 1, '离开后到点不查')
  poll.markActive()
  await flush()
  assert.equal(state.calls, 2, '人回来马上查')
  poll.markActive()
  await flush()
  assert.equal(state.calls, 2, '一直在用时动鼠标不额外查')
  poll.stop()
})

test('铃铛：查询失败保留上一次的数字，不抛错，下一轮照查', async () => {
  let fail = false
  let n = 0
  const { poll, state } = pollHarness({ fetchCount: async () => { if (fail) throw new Error('down'); return ++n } })
  poll.start()
  await flush()
  fail = true
  state.tick()
  await flush()
  assert.deepEqual(state.shown, [1])
  fail = false
  state.tick()
  await flush()
  assert.deepEqual(state.shown, [1, 2])
  poll.stop()
})

test('铃铛：查询途中又要查时，旧结果不盖住新结果', async () => {
  const pending = []
  const { poll, state } = pollHarness({ fetchCount: () => new Promise(resolve => pending.push(resolve)) })
  poll.start()
  poll.refresh()
  assert.equal(pending.length, 1, '同一时间只发一个请求')
  pending[0](5)
  await flush()
  assert.deepEqual(state.shown, [], '刚重新派单前发出的旧结果不显示')
  assert.equal(pending.length, 2)
  pending[1](4)
  await flush()
  assert.deepEqual(state.shown, [4])
  poll.stop()
})

test('铃铛：离开页面后停表，晚到的结果不再显示', async () => {
  let resolve
  const { poll, state } = pollHarness({ fetchCount: () => new Promise(r => { resolve = r }) })
  poll.start()
  poll.stop()
  resolve(9)
  await flush()
  assert.deepEqual(state.shown, [])
  assert.equal(state.cleared, true)
  poll.refresh()
  assert.equal(typeof resolve, 'function')
})

test('商家需求 → 岗位管理的链接', () => {
  assert.deepEqual(jobLinkOf({ jobId: 7, storeId: 3, requestType: 'volunteer' }), { name: 'KgJob', query: { jobId: '7', storeId: '3', jobType: 'volunteer' } })
  assert.equal(jobLinkOf({ jobId: 7, storeId: 3, requestType: 'online_task' }).query.jobType, 'online')
  assert.equal(jobLinkOf({ jobId: null, storeId: 3, requestType: 'managed' }), null, '代运营、抖音卖房没有岗位')
  assert.equal(jobLinkOf({ jobId: 7, storeId: null }), null)
})

test('R5 改名：后台所有用户看得到的地方（包括注释）都是抖音卖房，一处老名字都没有；内部编码 cloud_chain 后端不动', () => {
  const OLD = '云' + '连锁' // 拆开写，这个文件自己不算
  const hits = []
  const walk = dir => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.(vue|js|mjs|scss|json|html)$/.test(entry.name) && readFileSync(full, 'utf8').includes(OLD)) hits.push(full)
    }
  }
  walk(fileURLToPath(new URL('../src', import.meta.url)))
  walk(fileURLToPath(new URL('../scripts', import.meta.url)))
  assert.deepEqual(hits, [])
  assert.match(CITY_ROLE_HINTS.merchant_service, /代运营、抖音卖房和线上任务派发/)
  assert.match(read('src/views/kangaroo/ext/merchantrequest/index.vue'), /代运营、抖音卖房线下办完点「标记完成」/)
  // 列表的类型选项和标题是后端给的，页面不写死：编码、名字都以后端为准
  const module = readFileSync(new URL('../../RuoYi-Vue/ruoyi-kangaroo/src/main/java/com/ruoyi/kangaroo/ext/staff/KgMerchantRequestModule.java', import.meta.url), 'utf8')
  assert.match(module, /cloud_chain:抖音卖房/)
})

test('岗位管理收到的跳转参数：不合法的不当筛选用', () => {
  assert.deepEqual(parseJobFocus({ jobId: '7', storeId: '3', jobType: 'online' }), { jobId: 7, storeId: 3, jobType: 'online' })
  assert.equal(parseJobFocus({ jobId: '7', storeId: '3', jobType: 'x' }).jobType, undefined)
  for (const q of [undefined, {}, { jobId: '7' }, { jobId: '1 or 1', storeId: '3' }, { jobId: '7', storeId: '' }]) assert.equal(parseJobFocus(q), null)
})

test('入驻申请 → 门店管理的链接', () => {
  assert.deepEqual(storeLinkOf({ storeId: 12 }), { name: 'KgStore', query: { storeId: '12' } })
  assert.equal(storeLinkOf({ storeId: null }), null, '老申请没有开通门店')
  assert.equal(parseStoreFocus({ storeId: '12' }), 12)
  for (const q of [undefined, {}, { storeId: 'abc' }, { storeId: '' }]) assert.equal(parseStoreFocus(q), null)
})

test('员工授权角色：字典优先，接口有而字典缺的补上，不显示英文编码', () => {
  const dict = [{ value: 'staff', label: '员工', elTagType: 'info' }, { value: 'manager', label: '门店管家', elTagType: 'danger' }, { value: 'city_lead', label: '旧名字', elTagType: 'warning' }]
  const api = [{ value: 'merchant_service', label: '商家服务人', matrix: [] }, { value: 'city_lead', label: '城市负责人', matrix: [] }, { value: 'staff', label: '员工', matrix: [] }]
  const merged = mergeStaffRoles(dict, api)
  assert.deepEqual(merged.map(r => r.value), ['staff', 'manager', 'city_lead', 'merchant_service'])
  assert.equal(merged[1].label, '换工主理人')
  assert.equal(merged[1].elTagType, 'danger', '颜色听字典')
  assert.equal(merged[2].label, '城市负责人')
  assert.equal(merged[3].label, '商家服务人')
  assert.deepEqual(mergeStaffRoles(undefined, undefined), [])
})

test('角色切换：可选列表只认接口的 selectable，「员工」只留在显示列表', () => {
  const labels = { city_lead: '城市负责人', keeper: '小院主理人', manager: '换工主理人', online_staff: '线上任务专员', merchant_service: '商家服务人', merchant: '合作商家', staff: '员工' }
  // 切换后：字典里的员工已停用（后台字典接口不再返回），接口的 roles 也没有它
  const dict = [{ value: 'city_lead', label: '城市负责人', elTagType: 'warning' }, { value: 'manager', label: '换工主理人', elTagType: 'danger' }, { value: 'keeper', label: '小院主理人' }]
  const api = ['city_lead', 'keeper', 'manager', 'online_staff', 'merchant_service', 'merchant'].map(value => ({ value, label: labels[value], matrix: [] }))
  const display = mergeStaffRoles(dict, api, labels)
  assert.equal(display.find(r => r.value === 'staff').label, '员工', '老记录还能显示中文，不是英文编码')
  const after = selectableStaffRoles(display, api.map(r => r.value))
  assert.deepEqual(after.map(r => r.value), ['city_lead', 'manager', 'keeper', 'online_staff', 'merchant_service', 'merchant'], '6 项，顺序听字典')
  assert.equal(after.find(r => r.value === 'staff'), undefined)
  // 切换前：7 项，员工还能选，和今天一样
  const before = selectableStaffRoles(mergeStaffRoles([{ value: 'staff', label: '员工' }, { value: 'manager', label: '门店管家' }], api, labels), [...api.map(r => r.value), 'staff'])
  assert.equal(before.length, 7)
  assert.equal(before[0].value, 'staff')
  // 接口没读到时什么都不能选，不退回字典：字典可能还带着员工
  assert.deepEqual(selectableStaffRoles(display, undefined), [])
  assert.deepEqual(selectableStaffRoles(undefined, ['manager']), [])
})

test('角色切换：说明和范围跟着阶段走，切换前一字不变', () => {
  assert.equal(roleHint('city_lead', 'legacy'), CITY_ROLE_HINTS.city_lead)
  assert.equal(roleHint('manager', 'legacy'), '', '切换前换工主理人没有这段说明')
  assert.equal(roleHint('keeper', 'new'), '')
  assert.equal(roleHint('merchant_service', 'new'), CITY_ROLE_HINTS.merchant_service)
  assert.match(roleHint('city_lead', 'new'), /活动退款审批/)
  assert.match(roleHint('city_lead', 'new'), /下级不在时顶上/)
  assert.match(roleHint('manager', 'new'), /退款和取消收费活动归城市负责人/)
  assert.deepEqual(Object.keys(SWITCHED_ROLE_HINTS).sort(), ['city_lead', 'manager', 'merchant_service'])
  assert.equal(roleScopeText('manager', { city: '大理' }), '限当前授权门店')
  assert.equal(roleScopeText('manager', { city: '大理' }, false, 'legacy'), '限当前授权门店')
  assert.match(roleScopeText('manager', { city: '大理' }, false, 'new'), /限当前授权门店.*大理/)
  assert.match(roleScopeText('manager', { city: '' }, false, 'new'), /还没填城市/)
  assert.equal(roleScopeText('keeper', { city: '大理' }, false, 'new'), '限当前授权门店')
})

test('角色切换页：确认字要一字不差', () => {
  assert.deepEqual(CONFIRM_WORDS, { switch: '切换', rollback: '退回', routing: '打开派单' })
  assert.equal(confirmMatches('切换', '切换'), true)
  assert.equal(confirmMatches(' 切换 ', '切换'), true, '手机输入法常带空格')
  for (const bad of ['', undefined, null, '切', '切换了', '退回', 'switch']) assert.equal(confirmMatches(bad, '切换'), false, String(bad))
})

test('角色切换页：每人版本、提醒分类、派单人数、开关文字', () => {
  assert.deepEqual(clientTag({ status: 'new', statusText: '已用新版' }), { type: 'success', text: '已用新版' })
  assert.deepEqual(clientTag({ status: 'old', statusText: '还在老版' }), { type: 'warning', text: '还在老版' })
  assert.deepEqual(clientTag({ status: 'never', statusText: '没打开过' }), { type: 'info', text: '没打开过' })
  assert.deepEqual(clientTag(undefined), { type: 'info', text: '没打开过' })
  assert.equal(clientVersionText({ status: 'new', channel: 'release', version: '2026.10.30.2' }), '正式版 2026.10.30.2')
  assert.equal(clientVersionText({ status: 'old', channel: 'trial', version: '2026.10.30.2' }), '体验版 2026.10.30.2')
  assert.equal(clientVersionText({ status: 'old', channel: 'none', version: '' }), '老版本')
  assert.equal(clientVersionText({ status: 'never' }), '')

  const { red, info } = splitWarnings([
    { code: 'onlyOldManager', level: 'red', count: 2 }, { code: 'noCityLead', level: 'red', count: 0 },
    { code: 'pendingRefunds', level: 'info', count: 3 }, { code: 'mixedAccounts', level: 'info', count: 0 }
  ])
  assert.deepEqual(red.map(w => w.code), ['onlyOldManager'], '0 的不显示')
  assert.deepEqual(info.map(w => w.code), ['pendingRefunds'])
  assert.deepEqual(splitWarnings(undefined), { red: [], info: [] })

  const people = [
    { appUserId: 1, city: '丽江' }, { appUserId: 2, city: '丽江' }, { appUserId: 3, city: '丽江' },
    { appUserId: 4, city: '大理' }, { appUserId: 4, city: '大理' }, // 同城两家店：只收一次
    { appUserId: 5, city: '大理' }, { appUserId: 5, city: '丽江' }, // 跨城：两个城市都算，总数算一个
    { appUserId: 6, city: '' }
  ]
  assert.deepEqual(routingAudience(people).rows, [{ city: '丽江', count: 4 }, { city: '大理', count: 2 }, { city: '门店没填城市', count: 1 }])
  assert.equal(routingAudience(people).total, 6)
  assert.deepEqual(routingAudience(undefined), { rows: [], total: 0 })

  assert.equal(routingText('off'), '关着')
  assert.equal(routingText('ON'), '开着')
  assert.equal(routingText('true'), '「true」', '手改的值原样给人看')
  assert.equal(routingText(''), '没有这个参数')
  assert.equal(roleText('manager'), '换工主理人')
  assert.equal(roleText('staff'), '员工')
  assert.equal(roleText('xxx'), 'xxx')
})

test('角色切换页：退回之前列出退回后是老主理人的行，切换后才开的也不能只给一个数字', () => {
  const plan = {
    restoreCount: 5,
    converted: [
      { grantId: 1, currentRole: 'city_lead', afterRole: 'manager', attention: '退回后这一行是老主理人' },
      { grantId: 2, currentRole: 'manager', afterRole: 'staff', attention: '' }
    ],
    skipped: [
      { grantId: 3, currentRole: 'manager', beforeSwitchRole: 'keeper', attention: '退回后这一行是老主理人' },
      { grantId: 4, currentRole: 'keeper', beforeSwitchRole: 'manager', attention: '' }
    ]
  }
  const rows = rollbackPlanRows(plan)
  assert.deepEqual(rows.attention.map(row => row.grantId), [1, 3])
  assert.deepEqual(rows.others.map(row => row.grantId), [2, 4])
  assert.equal(planRowText(rows.others[0]), '授权编号 2 换工主理人 倒成 员工')
  assert.equal(planRowText(rows.others[1]), '授权编号 4 小院主理人 不动')
  assert.deepEqual(rollbackPlanRows(null), { attention: [], others: [] }, '不能退回时接口给 null')

  const page = readFileSync(new URL('../src/views/kangaroo/roleswitch/index.vue', import.meta.url), 'utf8')
  assert.match(page, /rollbackResult\.converted/, '退回结果页要列出倒回的行')
  assert.match(page, /plan\.attention/, '退回之前要列出标红的行')
})

test('角色切换页：失败原因服务器回了就原样显示，没回话不能说失败', () => {
  const answered = Object.assign(new Error('名单变了，请重新看过再切换'), { answered: true })
  assert.equal(actionFailureText(answered), '名单变了，请重新看过再切换')
  for (const err of [new Error('timeout of 60000ms exceeded'), new Error('Network Error'), undefined]) {
    assert.match(actionFailureText(err), /不确定.*有没有成功/)
    assert.doesNotMatch(actionFailureText(err), /timeout|Network/)
  }
})

test('角色切换页接线：菜单组件对得上，权限编码、确认字、指纹都接好', () => {
  const sql = readFileSync(new URL('../../RuoYi-Vue/sql/kangaroo/V64__role_switch.sql', import.meta.url), 'utf8')
  assert.match(sql, /'roleswitch', 'kangaroo\/roleswitch\/index', '', 'KgRoleSwitch'/)
  const rel = 'src/views/kangaroo/roleswitch/index.vue'
  const page = read(rel)
  assert.match(page, /<script setup name="KgRoleSwitch">/)
  for (const perm of ['switch', 'rollback', 'routing']) {
    assert.match(page, new RegExp("checkPermi\\(\\['kangaroo:roleswitch:" + perm + "'\\]\\)"))
    assert.match(sql, new RegExp("'kangaroo:roleswitch:" + perm + "'"))
  }
  // 按钮要等输入对了才能点，切换还要服务器说 canSwitch
  assert.match(page, /:disabled="!preview\.canSwitch \|\| !confirmMatches\(typed\.switch, CONFIRM_WORDS\.switch\)"/)
  assert.match(page, /:disabled="!confirmMatches\(typed\.rollback, CONFIRM_WORDS\.rollback\)"/)
  assert.match(page, /:disabled="!confirmMatches\(typed\.routing, CONFIRM_WORDS\.routing\)"/)
  // 指纹原样带回；不管成败都重读状态、清掉确认字
  assert.match(page, /switchRoles\(preview\.value\.fingerprint, CONFIRM_WORDS\.switch\)/)
  assert.match(page, /finally \{\s+typed\.switch = typed\.rollback = typed\.routing = ''\s+await load\(\)/)
  assert.match(page, /await nextTick\(\)\s+rootEl\.value\?\.scrollIntoView/, '按钮在长名单最下面，结果写在最上面')
  // 读失败要清掉旧名单，不能对着旧按钮操作
  assert.match(page, /preview\.value = null\s+loadFailed\.value = true/)
  const api = read('src/api/kangaroo/roleswitch.js')
  assert.match(api, /err\.answered = true/)
  assert.match(api, /timeout: 60000/)
  for (const path of ["'switch'", "'rollback'", "'open-routing'"]) assert.ok(api.includes('action(' + path), path)
})

test('员工授权页接线（角色切换）：单选和搜索只用可选列表，标签用显示列表，默认不选', () => {
  const page = read('src/views/kangaroo/grant/index.vue').replace(/\r\n/g, '\n')
  assert.equal((page.match(/v-for="dict in selectableRoles"/g) || []).length, 2, '搜索和单选')
  assert.doesNotMatch(page, /v-for="dict in kg_staff_role"/)
  assert.match(page, /<dict-tag :options="kg_staff_role" :value="scope\.row\.roleCode" \/>/)
  assert.match(page, /mergeStaffRoles\(rawStaffRoles\.value, roleOptions\.value, roleLabels\.value\)/)
  assert.match(page, /selectableStaffRoles\(kg_staff_role\.value, roleSelectable\.value\)/)
  assert.match(page, /v-if="rolePhaseHint"/)
  assert.doesNotMatch(page, /roleCode: "staff"/)
  // 页面开着时可能已经切换：打开新增、修改都重新读
  assert.match(page, /getAppUserOptions\(\)\s+loadRoles\(\)[^\n]*\n\s+open\.value = true/)
  assert.match(page, /form\.value = response\.data\s+loadRoles\(\)/)
})

test('线上结算说明不点名具体角色', () => {
  const page = read('src/views/kangaroo/ext/onlinesettle/index.vue')
  assert.match(page, /由负责这单付款的账号在小程序员工端/)
  assert.doesNotMatch(page, /主理人/)
})

test('员工授权范围说明：两个新角色按城市，其他角色限门店', () => {
  assert.equal(roleScopeText('keeper', { city: '大理' }), '限当前授权门店')
  assert.equal(roleScopeText('city_lead', undefined), '按所选门店所在城市生效')
  assert.equal(roleScopeText('merchant_service', { city: '大理' }), '按所选门店所在城市生效：大理')
  assert.match(roleScopeText('city_lead', { city: '' }), /还没填城市/)
  assert.deepEqual(Object.keys(CITY_ROLE_HINTS).sort(), ['city_lead', 'merchant_service'])
})

test('兼任：只有小院主理人能开，别的角色传了也是 0', () => {
  assert.equal(alsoServiceValue('keeper', '1'), '1')
  assert.equal(alsoServiceValue('keeper', '0'), '0')
  assert.equal(alsoServiceValue('keeper', undefined), '0')
  for (const role of ['manager', 'staff', 'online_staff', 'merchant', 'merchant_service', 'city_lead']) assert.equal(alsoServiceValue(role, '1'), '0', role)
  assert.equal(isAlsoService({ roleCode: 'keeper', alsoService: '1' }), true)
  assert.equal(isAlsoService({ roleCode: 'keeper', alsoService: '0' }), false)
  assert.equal(isAlsoService({ roleCode: 'keeper' }), false, '老接口没有这个字段')
  assert.equal(isAlsoService({ roleCode: 'staff', alsoService: '1' }), false)
  assert.equal(isAlsoService(undefined), false)
})

test('兼任的范围说明：门店业务限这家店，商家需求按城市；没开时和原来一字不差', () => {
  assert.equal(roleScopeText('keeper', { city: '大理' }, false), '限当前授权门店')
  assert.match(roleScopeText('keeper', { city: '大理' }, true), /限当前授权门店.*大理/)
  assert.match(roleScopeText('keeper', { city: '' }, true), /还没填城市/)
  assert.match(roleScopeText('keeper', undefined, true), /所选门店所在城市/)
  assert.equal(roleScopeText('staff', { city: '大理' }, true), '限当前授权门店', '别的角色传了也不算')
  assert.equal(roleScopeText('merchant_service', { city: '大理' }, true), '按所选门店所在城市生效：大理')
})

test('员工授权页接线：勾选框只对小院主理人，新增、修改都传，切角色清掉，列表显示兼任', () => {
  const rel = 'src/views/kangaroo/grant/index.vue'
  const page = read(rel)
  const { descriptor, errors } = parse(page, { filename: rel })
  assert.deepEqual(errors, [])
  const out = compileTemplate({ source: descriptor.template.content, filename: rel, id: 'x' })
  assert.deepEqual(out.errors, [])
  assert.equal(ALSO_SERVICE_ROLE, 'keeper')
  assert.equal(ALSO_SERVICE_LABEL, '同时担任商家服务人')
  assert.match(ALSO_SERVICE_HINT, /小院工作台里多出商家需求和线上任务概况，按这家门店所在城市接单/)
  assert.match(page, /<el-form-item v-if="form\.roleCode === ALSO_SERVICE_ROLE"/)
  assert.match(page, /<el-checkbox v-model="form\.alsoService" true-value="1" false-value="0">/)
  assert.match(page, /updateGrant\(\{ grantId, roleCode, alsoService \}\)/)
  assert.match(page, /addGrant\(\{ appUserId, storeId, roleCode, alsoService \}\)/)
  assert.match(page, /if \(role !== ALSO_SERVICE_ROLE\) form\.value\.alsoService = "0"/)
  assert.match(page, /v-if="isAlsoService\(scope\.row\)"[^>]*>\+ 商家服务人</)
  assert.match(page, /roleCode: undefined,\s+alsoService: "0"/)
})

test('菜单组件路径、路由名和页面对得上（V63）', () => {
  const sql = readFileSync(new URL('../../RuoYi-Vue/sql/kangaroo/V63__merchant_roles.sql', import.meta.url), 'utf8')
  assert.match(sql, /'merchantrequest', 'kangaroo\/ext\/merchantrequest\/index', '', 'KgExtMerchantRequest'/)
  const page = read('src/views/kangaroo/ext/merchantrequest/index.vue')
  assert.match(page, /<script setup name="KgExtMerchantRequest">/)
  assert.match(page, /entity="merchantrequest"/)
  assert.match(read('src/layout/components/MerchantRequestBell.vue'), /ROUTE_NAME = 'KgExtMerchantRequest'/)
  assert.match(read('src/views/kangaroo/job/index.vue'), /<script setup name="KgJob">/)
  assert.match(read('src/views/kangaroo/store/index.vue'), /<script setup name="KgStore">/)
})

test('铃铛只有有权限才显示和轮询，接口不走会弹错的 request', () => {
  const bell = read('src/layout/components/MerchantRequestBell.vue')
  assert.match(bell, /checkPermi\(\['kangaroo:merchantrequest:list'\]\)/)
  assert.match(bell, /<el-tooltip v-if="visible"/)
  assert.match(bell, /if \(!visible\) return\s+ACTIVITY_EVENTS/)
  assert.doesNotMatch(read('src/api/kangaroo/merchantRequest.js'), /from '@\/utils\/request'/)
  const nav = read('src/layout/components/Navbar.vue')
  assert.ok(nav.indexOf('<merchant-request-bell />') < nav.indexOf("appStore.device !== 'mobile'"), '手机上也要显示')
})

test('改过的页面模板都能编译', () => {
  for (const rel of ['src/layout/components/MerchantRequestBell.vue', 'src/layout/components/Navbar.vue', 'src/views/kangaroo/ext/merchantrequest/index.vue', 'src/views/kangaroo/ext/merchantapply/index.vue', 'src/views/kangaroo/ext/ExtCrud.vue', 'src/views/kangaroo/ext/onlinesettle/index.vue', 'src/views/kangaroo/grant/index.vue', 'src/views/kangaroo/roleswitch/index.vue', 'src/views/kangaroo/job/index.vue', 'src/views/kangaroo/store/index.vue']) {
    const { descriptor, errors } = parse(read(rel), { filename: rel })
    assert.deepEqual(errors, [], rel)
    const out = compileTemplate({ source: descriptor.template.content, filename: rel, id: 'x' })
    assert.deepEqual(out.errors, [], rel)
  }
})
