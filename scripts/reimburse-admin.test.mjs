// 后台「采购报销」（R12，20261031-forms，V66）：纯逻辑、页面真实流程（换掉接口和弹窗跑页面脚本）、接线。真点在 Playwright 里跑过，这里钉住不要被顺手改掉的部分。
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { compileTemplate, parse } from '@vue/compiler-sfc'
import * as vue from 'vue'
import * as logic from '../src/utils/reimburse.js'

const { REASON_MAX, STATUS_META, STATUS_ORDER, approveConfirmText, canApprove, canMarkPaid, canReject, exportFileName, filterParams, moneyText, paidConfirmText, receiptThumbs, rejectReasonProblem, summaryView } = logic
const read = rel => readFileSync(new URL('../' + rel, import.meta.url), 'utf8')
const PAGE = 'src/views/kangaroo/reimburse/index.vue'
const ACTIONS = 'src/views/kangaroo/reimburse/ReimburseActions.vue'
const THUMBS = 'src/views/kangaroo/reimburse/ReceiptThumbs.vue'
const CONTROLLER = '../RuoYi-Vue/ruoyi-kangaroo/src/main/java/com/ruoyi/kangaroo/controller/admin/KgReimburseAdminController.java'
const tick = () => new Promise(resolve => setImmediate(resolve))
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }

// ---------------------------------------------------------------- 纯逻辑

test('金额：按字符串加逗号，不过浮点数', () => {
  assert.equal(moneyText('128.50'), '¥128.50')
  assert.equal(moneyText('1234.50'), '¥1,234.50')
  assert.equal(moneyText('100000.00'), '¥100,000.00')
  assert.equal(moneyText('1234567.10'), '¥1,234,567.10')
  assert.equal(moneyText('999.00'), '¥999.00')
  assert.equal(moneyText('0.10'), '¥0.10', '转成数字会变成 0.1')
  assert.equal(moneyText('12345678901234.50'), '¥12,345,678,901,234.50', '大数不丢精度')
  for (const empty of [undefined, null, '']) assert.equal(moneyText(empty), '¥0.00')
  assert.equal(moneyText('abc'), '¥abc', '不是金额的写法原样给人看')
})

test('表头合计：显示不含驳回的；笔数也去掉驳回；接口没回时都是 0，不显示 undefined', () => {
  const view = summaryView({ count: 42, sumAmount: '3120.50', validAmount: '2900.00', byStatus: {
    pending: { count: 3, amount: '120.00' }, approved: { count: 2, amount: '80.00' }, rejected: { count: 4, amount: '220.50' }, paid: { count: 33, amount: '2700.00' } } })
  assert.equal(view.validAmount, '¥2,900.00')
  assert.equal(view.validCount, 38)
  assert.deepEqual(view.statuses.map(s => [s.status, s.count, s.amount]), [['pending', 3, '¥120.00'], ['approved', 2, '¥80.00'], ['paid', 33, '¥2,700.00'], ['rejected', 4, '¥220.50']])
  assert.match(view.statuses.find(s => s.status === 'rejected').tile, /不计入合计/)
  assert.match(view.statuses.find(s => s.status === 'approved').tile, /待打款/)
  const empty = summaryView(undefined)
  assert.equal(empty.validAmount, '¥0.00')
  assert.equal(empty.validCount, 0)
  assert.ok(empty.statuses.every(s => s.count === 0 && s.amount === '¥0.00'))
})

test('状态：四个都有文字和颜色，和后端取值一致', () => {
  assert.deepEqual([...STATUS_ORDER].sort(), ['approved', 'paid', 'pending', 'rejected'])
  assert.deepEqual(STATUS_ORDER.map(s => STATUS_META[s].text), ['待审核', '已通过', '已打款', '已驳回'])
  const java = read('../RuoYi-Vue/ruoyi-kangaroo/src/main/java/com/ruoyi/kangaroo/ext/stay/KgReimburseService.java')
  for (const s of STATUS_ORDER) assert.match(java, new RegExp('"' + s + '"'), s)
  assert.match(java, /order by field\(status, 'pending', 'approved', 'rejected', 'paid'\)/, '待审排前是后端排的，页面不重排')
})

test('筛选参数：空的不带；日期范围拆成两个；提交人去空白', () => {
  assert.deepEqual(filterParams({ pageNum: 3, pageSize: 20 }), {}, '翻页参数不算筛选，导出不带')
  assert.deepEqual(filterParams({ storeId: '', status: null, submitter: '   ' }, [], null), {})
  assert.deepEqual(filterParams({ storeId: 7, status: 'pending', submitter: ' 小杨 ' }, ['2026-10-01', '2026-10-31'], ['2026-10-02', '2026-10-30']), {
    storeId: 7, status: 'pending', submitter: '小杨', purchaseBegin: '2026-10-01', purchaseEnd: '2026-10-31', submitBegin: '2026-10-02', submitEnd: '2026-10-30' })
  assert.deepEqual(Object.keys(filterParams(undefined, undefined, undefined)), [])
})

test('筛选的参数名后端都认', () => {
  const java = read('../RuoYi-Vue/ruoyi-kangaroo/src/main/java/com/ruoyi/kangaroo/ext/stay/KgReimburseService.java')
  const keys = Object.keys(filterParams({ storeId: 1, status: 'pending', submitter: 'x' }, ['a', 'b'], ['c', 'd']))
  assert.equal(keys.length, 7)
  for (const key of keys) assert.match(java, new RegExp('Param\\(q, "' + key + '"|param\\(q, "' + key + '"'), key)
})

test('驳回理由：必填、要有看得见的字、不超过 255 字（按字算）', () => {
  for (const bad of [undefined, null, '', '   ', ' \n\t ', '​‍⁠', '　']) assert.match(rejectReasonProblem(bad), /请填写驳回理由/, JSON.stringify(bad))
  assert.equal(rejectReasonProblem('小票看不清'), '')
  assert.equal(rejectReasonProblem('  小票看不清  '), '', '首尾空白不算字')
  assert.equal(REASON_MAX, 255)
  assert.equal(rejectReasonProblem('字'.repeat(255)), '')
  assert.match(rejectReasonProblem('字'.repeat(256)), /最多 255 字/)
  assert.equal(rejectReasonProblem('😀'.repeat(255)), '', '一个表情算一个字，和后端一样')
  assert.match(rejectReasonProblem('😀'.repeat(256)), /最多 255 字/)
  assert.match(read('../RuoYi-Vue/ruoyi-kangaroo/src/main/java/com/ruoyi/kangaroo/ext/stay/KgReimburseService.java'), /REASON_MAX = 255/)
})

test('按钮：待审核能通过、驳回；已通过能标记打款；已驳回、已打款都不能', () => {
  const table = { pending: [true, true, false], approved: [false, false, true], rejected: [false, false, false], paid: [false, false, false] }
  for (const [status, want] of Object.entries(table)) assert.deepEqual([canApprove({ status }), canReject({ status }), canMarkPaid({ status })], want, status)
  for (const fn of [canApprove, canReject, canMarkPaid]) assert.equal(fn(null), false)
})

test('确认框写清这一笔，也写清系统不打款、不能撤销', () => {
  const row = { itemName: '床单', amount: '128.50', storeName: '平潭小院', submitterName: '小杨' }
  const approve = approveConfirmText(row)
  for (const word of ['床单', '¥128.50', '平潭小院', '小杨', '不能撤销', '系统不会打款', '标记已打款']) assert.ok(approve.includes(word), word)
  const paid = paidConfirmText(row)
  for (const word of ['¥128.50', '小杨', '系统不会打款', '不能撤销']) assert.ok(paid.includes(word), word)
})

test('缩略图：放得下全放；放不下最后一格写 +N，大图列表还是全部', () => {
  const list = n => Array.from({ length: n }, (_, i) => '/p/' + i + '.jpg')
  assert.deepEqual(receiptThumbs(list(3), 3), { list: list(3), shown: list(3), more: 0 })
  const nine = receiptThumbs(list(9), 3)
  assert.equal(nine.shown.length, 3)
  assert.equal(nine.more, 7, '第 3 格盖住 1 张，后面还有 6 张')
  assert.equal(nine.list.length, 9)
  assert.equal(receiptThumbs(list(4), 3).more, 2)
  assert.deepEqual(receiptThumbs(list(9)).shown, list(9), '详情里全部铺开')
  for (const bad of [undefined, null, 'x', {}]) assert.deepEqual(receiptThumbs(bad, 3), { list: [], shown: [], more: 0 })
  assert.deepEqual(receiptThumbs(['', '/a.jpg', null]).list, ['/a.jpg'])
})

test('导出文件名带日期', () => {
  assert.equal(exportFileName(new Date(2026, 9, 5)), '采购报销_20261005.xlsx')
})

// ---------------------------------------------------------------- 页面真实流程

function pageHarness() {
  const calls = { list: [], approve: [], reject: [], paid: [], get: [], download: [], stores: 0 }
  const pending = { list: [], approve: [], reject: [], paid: [], get: [] }
  const shown = { success: [], confirm: [] }
  const hooks = { activated: [], deactivated: [] }
  const confirmQueue = []
  const proxy = {
    resetForm() {},
    download: (...args) => { calls.download.push(args) },
    $modal: {
      msgSuccess: text => shown.success.push(text),
      confirm: text => { shown.confirm.push(text); const d = deferred(); confirmQueue.push(d); return d.promise }
    }
  }
  const later = (key, args) => { calls[key].push(args); const d = deferred(); pending[key].push(d); return d.promise }
  const ctx = {
    ...logic,
    ref: vue.ref, reactive: vue.reactive, computed: vue.computed,
    onActivated: cb => hooks.activated.push(cb), onDeactivated: cb => hooks.deactivated.push(cb),
    window: { innerWidth: 1280 }, getCurrentInstance: () => ({ proxy }), useAppStore: () => ({ device: 'desktop' }),
    listReimburse: query => later('list', JSON.parse(JSON.stringify(query))), // 沙箱里的对象原型不同，转成这边的再比
    listReimburseStores: async () => { calls.stores++; return { data: [] } },
    getReimburse: id => later('get', id),
    approveReimburse: (id, revision) => later('approve', { id, revision }),
    rejectReimburse: (id, reason, revision) => later('reject', { id, reason, revision }),
    markReimbursePaid: id => later('paid', id),
    REIMBURSE_EXPORT_URL: 'kangaroo/reimburse/export'
  }
  vm.createContext(ctx)
  const source = read(PAGE).match(/<script setup[^>]*>([\s\S]*?)<\/script>/)[1].replace(/^import .*\r?\n/gm, '')
  vm.runInContext(source, ctx)
  const run = code => vm.runInContext(code, ctx)
  /** 回一页列表，等页面处理完 */
  const answer = async (rows = [], total = rows.length, summary = {}) => {
    const d = pending.list.shift()
    d.resolve({ rows, total, summary })
    await tick()
  }
  const yes = async () => { confirmQueue.shift().resolve(); await tick() }
  const no = async () => { confirmQueue.shift().reject('cancel'); await tick() }
  return { ctx, calls, pending, shown, hooks, run, answer, yes, no }
}
const ROW = { reimburseId: 12, status: 'pending', revision: 3, itemName: '床单', amount: '128.50', storeName: '小院', submitterName: '小杨' }

test('打开：取第 1 页，合计和行都来自接口', async () => {
  const h = pageHarness()
  assert.deepEqual(h.calls.list, [{ pageNum: 1, pageSize: 10 }])
  assert.equal(h.calls.stores, 1)
  await h.answer([ROW], 1, { count: 1, validAmount: '128.50', byStatus: { pending: { count: 1, amount: '128.50' } } })
  assert.equal(h.run('rows.value.length'), 1)
  assert.equal(h.run('summary.value.validAmount'), '¥128.50')
  assert.equal(h.run('loading.value'), false)
})

test('筛选点了「搜索」才算；翻页、导出都按点搜索时定下的，框里改了没点不算', async () => {
  const h = pageHarness()
  await h.answer()
  h.run("query.status = 'pending'; query.storeId = 7; purchaseRange.value = ['2026-10-01', '2026-10-31']")
  h.run('handleQuery()')
  assert.deepEqual(h.calls.list.at(-1), { pageNum: 1, pageSize: 10, storeId: 7, status: 'pending', purchaseBegin: '2026-10-01', purchaseEnd: '2026-10-31' })
  await h.answer([ROW], 11)
  h.run("query.storeId = 9; query.pageNum = 2; getList()")
  assert.equal(h.calls.list.at(-1).storeId, 7, '框里改了门店没点搜索')
  assert.equal(h.calls.list.at(-1).pageNum, 2)
  await h.answer([ROW], 11)
  h.run('handleExport()')
  const [url, params, name, config] = h.calls.download[0]
  assert.equal(url, 'kangaroo/reimburse/export')
  assert.deepEqual({ ...params }, { storeId: 7, status: 'pending', purchaseBegin: '2026-10-01', purchaseEnd: '2026-10-31' }, '不带翻页参数，导出全部符合条件的')
  assert.match(name, /^采购报销_\d{8}\.xlsx$/)
  assert.ok(config.timeout >= 60000, '一万行的表格 10 秒不够')
})

test('重置：筛选和日期都清掉，回第 1 页', async () => {
  const h = pageHarness()
  await h.answer()
  h.run("query.pageNum = 3; purchaseRange.value = ['2026-10-01', '2026-10-31']; submitRange.value = ['2026-10-01', '2026-10-31']")
  h.run('handleQuery()')
  await h.answer()
  h.run('resetQuery()')
  const last = h.calls.list.at(-1)
  assert.equal(last.purchaseBegin, undefined)
  assert.equal(last.submitBegin, undefined)
  assert.equal(last.pageNum, 1)
  assert.equal(h.run('purchaseRange.value'), null)
})

test('先发的查询晚回来，不能盖住后发的', async () => {
  const h = pageHarness()
  const first = h.pending.list.shift()
  h.run('getList()')
  const second = h.pending.list.shift()
  second.resolve({ rows: [{ reimburseId: 2 }], total: 1 })
  await tick()
  first.resolve({ rows: [{ reimburseId: 1 }], total: 1 })
  await tick()
  assert.equal(h.run('rows.value[0].reimburseId'), 2)
  assert.equal(h.run('loading.value'), false)
})

test('查询失败：把旧结果清掉，财务数字不能把上一次的当这一次的', async () => {
  const h = pageHarness()
  await h.answer([ROW], 1, { count: 1, validAmount: '128.50' })
  h.run('getList()')
  h.pending.list.shift().reject('error')
  await tick()
  assert.equal(h.run('rows.value.length'), 0)
  assert.equal(h.run('total.value'), 0)
  assert.equal(h.run('summary.value.validAmount'), '¥0.00')
  assert.equal(h.run('loading.value'), false)
})

test('最后一页审完：退回有内容的那一页，只往回退', async () => {
  const h = pageHarness()
  await h.answer()
  h.run('query.pageNum = 2')
  h.run('getList()')
  await h.answer([], 10)
  assert.equal(h.run('query.pageNum'), 1)
  assert.equal(h.calls.list.at(-1).pageNum, 1)
  await h.answer([ROW], 10)
  assert.equal(h.run('rows.value.length'), 1)
  // 接口说一条都没有：不退、不重拉
  const count = h.calls.list.length
  h.run('getList()')
  await h.answer([], 0)
  assert.equal(h.calls.list.length, count + 1)
})

test('通过：先确认；取消什么都不发；确定才发，带 revision；弹接口的话；刷新', async () => {
  const h = pageHarness()
  await h.answer()
  h.ctx.handleApprove(ROW)
  assert.match(h.shown.confirm[0], /床单/)
  await h.no()
  assert.equal(h.calls.approve.length, 0)
  h.ctx.handleApprove(ROW)
  await h.yes()
  assert.deepEqual(h.calls.approve, [{ id: 12, revision: 3 }])
  h.pending.approve.shift().resolve({ msg: '已通过' })
  await tick()
  assert.deepEqual(h.shown.success, ['已通过'])
  assert.equal(h.calls.list.length, 2, '刷新')
})

test('通过失败（对方改过了）：不弹成功，也刷新，让人看到最新内容', async () => {
  const h = pageHarness()
  await h.answer()
  h.ctx.handleApprove(ROW)
  await h.yes()
  h.pending.approve.shift().reject('error')
  await tick()
  assert.deepEqual(h.shown.success, [])
  assert.equal(h.calls.list.length, 2)
  assert.equal(h.run('acting.value'), false, '按钮解锁')
})

test('一笔还在处理时再点别的：不再发第二个', async () => {
  const h = pageHarness()
  await h.answer()
  h.ctx.handleApprove(ROW)
  await h.yes()
  assert.equal(h.run('acting.value'), true)
  h.ctx.handlePaid({ ...ROW, reimburseId: 13, status: 'approved' })
  await h.yes()
  assert.equal(h.calls.paid.length, 0)
  h.pending.approve.shift().resolve({ msg: '已通过' })
  await tick()
})

test('标记已打款：确认后发，不带 revision', async () => {
  const h = pageHarness()
  await h.answer()
  h.ctx.handlePaid({ ...ROW, status: 'approved' })
  assert.match(h.shown.confirm[0], /系统不会打款/)
  await h.yes()
  assert.deepEqual(h.calls.paid, [12])
  h.pending.paid.shift().resolve({ msg: '已标记打款' })
  await tick()
  assert.deepEqual(h.shown.success, ['已标记打款'])
})

test('驳回：没写理由就地报错、不发请求；写了发去空白后的理由和 revision，关框', async () => {
  const h = pageHarness()
  await h.answer()
  h.ctx.openReject(ROW)
  assert.equal(h.run('rejectOpen.value'), true)
  await h.ctx.confirmReject()
  assert.match(h.run('rejectError.value'), /请填写驳回理由/)
  h.run("rejectReason.value = '   '")
  await h.ctx.confirmReject()
  assert.equal(h.calls.reject.length, 0)
  h.run("rejectReason.value = '  小票看不清 '; rejectError.value = ''")
  const done = h.ctx.confirmReject()
  assert.deepEqual(h.calls.reject, [{ id: 12, reason: '小票看不清', revision: 3 }])
  h.pending.reject.shift().resolve({ msg: '已驳回' })
  await done
  assert.equal(h.run('rejectOpen.value'), false)
  assert.deepEqual(h.shown.success, ['已驳回'])
})

test('驳回失败：服务器不让（状态变了）就关框刷新；网络没通留着框，理由不用重写', async () => {
  const h = pageHarness()
  await h.answer()
  h.ctx.openReject(ROW)
  h.run("rejectReason.value = '理由'")
  let done = h.ctx.confirmReject()
  h.pending.reject.shift().reject('error')
  await done
  assert.equal(h.run('rejectOpen.value'), false)
  h.ctx.openReject(ROW)
  h.run("rejectReason.value = '理由'")
  done = h.ctx.confirmReject()
  h.pending.reject.shift().reject(new Error('Network Error'))
  await done
  assert.equal(h.run('rejectOpen.value'), true)
  assert.equal(h.run('rejectReason.value'), '理由')
})

test('重新打开驳回框：上一次的理由和报错都清掉', async () => {
  const h = pageHarness()
  await h.answer()
  h.ctx.openReject(ROW)
  h.run("rejectReason.value = '写了一半'; rejectError.value = 'x'")
  h.ctx.openReject({ ...ROW, reimburseId: 13 })
  assert.equal(h.run('rejectReason.value'), '')
  assert.equal(h.run('rejectError.value'), '')
  assert.equal(h.run('rejectRow.value.reimburseId'), 13)
})

test('详情：先显示表格里的，再换成最新的；审的是最新 revision；晚到的旧详情不盖新的', async () => {
  const h = pageHarness()
  await h.answer()
  h.ctx.openDetail(ROW)
  assert.equal(h.run('detail.value.revision'), 3)
  assert.deepEqual(h.calls.get, [12])
  h.pending.get.shift().resolve({ data: { ...ROW, revision: 4 } })
  await tick()
  assert.equal(h.run('detail.value.revision'), 4)
  // 连着开两个：第一个晚回来
  h.ctx.openDetail({ ...ROW, reimburseId: 20 })
  h.ctx.openDetail({ ...ROW, reimburseId: 21 })
  const [late, now] = [h.pending.get.shift(), h.pending.get.shift()]
  now.resolve({ data: { ...ROW, reimburseId: 21, itemName: '新的' } })
  await tick()
  late.resolve({ data: { ...ROW, reimburseId: 20, itemName: '旧的' } })
  await tick()
  assert.equal(h.run('detail.value.itemName'), '新的')
})

test('详情取不到（对方撤回了）：关掉，刷新表格', async () => {
  const h = pageHarness()
  await h.answer()
  h.ctx.openDetail(ROW)
  h.pending.get.shift().reject('error')
  await tick()
  assert.equal(h.run('detailOpen.value'), false)
  assert.equal(h.calls.list.length, 2)
})

test('在详情里审：成功后关详情', async () => {
  const h = pageHarness()
  await h.answer()
  h.ctx.openDetail(ROW)
  h.ctx.handleApprove(h.run('detail.value'))
  await h.yes()
  assert.equal(h.calls.approve[0].id, 12)
  h.pending.approve.shift().resolve({ msg: '已通过' })
  await tick()
  assert.equal(h.run('detailOpen.value'), false)
})

test('标签页缓存：切走再切回来才重新取；刷新浏览器落在这一页时第一次切回来也要取', async () => {
  const h = pageHarness()
  await h.answer()
  // 从菜单点进来：挂载时触发一次 activated，不用再取
  h.hooks.activated[0]()
  assert.equal(h.calls.list.length, 1)
  // 切走再回来
  h.hooks.deactivated[0]()
  h.hooks.activated[0]()
  assert.equal(h.calls.list.length, 2)
  await h.answer()
  // 刷新浏览器落在这一页：挂载时没有 activated，第一次切回来才有，这一次不能跳过
  const f5 = pageHarness()
  await f5.answer()
  f5.hooks.deactivated[0]()
  f5.hooks.activated[0]()
  assert.equal(f5.calls.list.length, 2)
})

// ---------------------------------------------------------------- 接线

test('模板都能编译；页面只有一个根节点（标签页切换动画要求）', () => {
  for (const rel of [PAGE, ACTIONS, THUMBS]) {
    const { descriptor, errors } = parse(read(rel), { filename: rel })
    assert.deepEqual(errors, [], rel)
    assert.deepEqual(compileTemplate({ source: descriptor.template.content, filename: rel, id: 'x' }).errors, [], rel)
  }
  const { descriptor } = parse(read(PAGE))
  assert.equal(descriptor.template.ast.children.filter(n => n.type === 1).length, 1)
})

test('菜单组件路径、路由名和页面对得上（V66）：标签页缓存靠这个名字', () => {
  const sql = read('../RuoYi-Vue/sql/kangaroo/V66__forms.sql')
  assert.match(sql, /'reimburse', 'kangaroo\/reimburse\/index', '', 'KgReimburse'/)
  assert.match(read(PAGE), /<script setup name="KgReimburse">/)
})

test('三个审核按钮挂 audit，导出挂 list；两个权限后端都在校验', () => {
  const actions = read(ACTIONS)
  for (const label of ['驳回', '通过', '标记已打款']) {
    const line = actions.split('\n').find(text => text.includes('>' + label + '</el-button>'))
    assert.ok(line, label)
    assert.match(line, /v-hasPermi="\['kangaroo:reimburse:audit'\]"/, label)
  }
  const detailLine = actions.split('\n').find(text => text.includes('>详情</el-button>'))
  assert.doesNotMatch(detailLine, /v-hasPermi/, '没有审核权限的账号也能看详情')
  const page = read(PAGE)
  assert.match(page, /@click="handleExport" v-hasPermi="\['kangaroo:reimburse:list'\]"/)
  const java = read(CONTROLLER)
  assert.equal((java.match(/hasPermi\('kangaroo:reimburse:audit'\)/g) || []).length, 3, '通过、驳回、标记已打款')
  assert.equal((java.match(/hasPermi\('kangaroo:reimburse:list'\)/g) || []).length, 4, '列表、门店下拉、详情、导出')
})

test('接口地址和后端一致；通过、驳回带 revision，标记已打款不带', () => {
  const api = read('src/api/kangaroo/reimburse.js')
  const java = read(CONTROLLER)
  assert.match(java, /@RequestMapping\("\/kangaroo\/reimburse"\)/)
  assert.match(api, /const base = '\/kangaroo\/reimburse'/)
  for (const [mapping, client] of [['@GetMapping("/list")', "base + '/list'"], ['@GetMapping("/stores")', "base + '/stores'"], ['@PutMapping("/{id}/approve")', "'/approve'"], ['@PutMapping("/{id}/reject")', "'/reject'"], ['@PutMapping("/{id}/paid")', "'/paid'"], ['@PostMapping("/export")', "REIMBURSE_EXPORT_URL = 'kangaroo/reimburse/export'"]]) {
    assert.ok(java.includes(mapping), mapping)
    assert.ok(api.includes(client), client)
  }
  assert.match(api, /'\/approve', method: 'put', data: \{ revision \}/)
  assert.match(api, /'\/reject', method: 'put', data: \{ reason, revision \}/)
  assert.match(api, /'\/paid', method: 'put' \}/)
})

test('页面写明系统只记账不打款、没提交进表的不报销；金额不做加减', () => {
  const page = read(PAGE)
  assert.match(page, /系统只记账，不打款/)
  assert.match(page, /没提交进表的不报销/)
  assert.match(page, /合计（不含驳回）/)
  for (const rel of [PAGE, 'src/utils/reimburse.js']) assert.doesNotMatch(read(rel), /parseFloat|toFixed|Number\([^)]*amount/i, rel)
})

test('表格：该有的列都在；手机上换成卡片；看大图不被弹窗和表格挡住', () => {
  const page = read(PAGE)
  const heads = [...page.matchAll(/<el-table-column label="([^"]+)"/g)].map(m => m[1])
  assert.deepEqual(heads, ['门店', '提交人', '品名', '数量', '金额', '购买日期', '凭证', '备注', '状态', '提交时间', '操作'])
  assert.match(page, /fixed="right"/)
  assert.match(page, /<div v-if="isMobile" class="reimburse-cards">/)
  assert.match(page, /showSearch = ref\(window\.innerWidth > 768\)/)
  const thumbs = read(THUMBS)
  assert.match(thumbs, /preview-teleported/)
  assert.match(thumbs, /:preview-src-list="urls"/)
  assert.match(thumbs, /:initial-index="index"/)
  assert.match(thumbs, /imageUrl\(src\)/)
  assert.match(page, /row-key="reimburseId"/)
})
