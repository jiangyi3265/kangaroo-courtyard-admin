import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const file = new URL('../src/views/kangaroo/ext/ExtCrud.vue', import.meta.url)
const source = readFileSync(file, 'utf8')
const start = source.indexOf('function runAction(a, row) {')
const end = source.indexOf('\nasync function initialize()', start)
assert(start >= 0 && end > start, 'test must execute the actual ExtCrud action handler')
const handler = source.slice(start, end).replaceAll('import.meta.env.VITE_APP_BASE_API', JSON.stringify('/api'))

// Isolate genuine rejected Promises so a regression can be observed without
// leaving an unhandled rejection in node:test's own process.
function runCase(options = {}) {
  const script = `
    const options = ${JSON.stringify(options)};
    const state = { api: [], success: [], error: [], emitted: [], opened: [], refreshed: 0, unhandled: [] };
    process.on('unhandledRejection', err => state.unhandled.push(String(err)));
    const reviewContext = { value: null }, contextOpen = { value: false };
    const proxy = { $modal: {
      msgSuccess: text => state.success.push(text), msgError: text => state.error.push(text),
      confirm: text => { state.confirms = (state.confirms || []).concat(text); return options.cancel || options.cancelConfirm ? Promise.reject('cancel') : Promise.resolve() },
      prompt: () => options.cancel ? Promise.reject('cancel') : Promise.resolve({ value: options.reason ?? ' 原因 ' })
    }};
    function runExtAction(method, url, data) {
      state.api.push({ method, url, data });
      if (options.businessFailure) { const e = new Error('余额不足'); e.isBusinessError = true; return Promise.reject(e); }
      return options.failure ? Promise.reject(new Error('接口失败，统一拦截器已提示')) : Promise.resolve(options.response || { code: 200 });
    }
    function getList() { state.refreshed++; return Promise.resolve(); }
    function emit(event) { state.emitted.push(event); }
    const window = { open: (...args) => state.opened.push(args) };
    function openRooms(id) { state.route = id; }
    ${handler}
    const result = runAction({ label: '查看原文', method: 'get', url: '/context/{id}', ...options.action }, { id: 'a / b', stayId: 8, ...options.row });
    state.returnedPromise = !!result && typeof result.then === 'function';
    if (state.returnedPromise) { try { await result; } catch (error) { state.escaped = String(error); } }
    await new Promise(resolve => setImmediate(resolve));
    await new Promise(resolve => setImmediate(resolve));
    state.reviewContext = reviewContext.value; state.contextOpen = contextOpen.value;
    process.stdout.write(JSON.stringify(state));
  `
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
  return JSON.parse(result.stdout)
}

function noFalseSuccess(result) {
  assert.deepEqual(result.success, [])
  assert.equal(result.refreshed, 0)
  assert.deepEqual(result.emitted, [])
  assert.deepEqual(result.unhandled, [])
  assert.equal(result.escaped, undefined)
}

test('read action API rejection is handled, awaitable and never reported as success', () => {
  const result = runCase({ failure: true })
  noFalseSuccess(result)
  assert.equal(result.api.length, 1)
  assert.equal(result.returnedPromise, true)
  assert.deepEqual(result.error, [], 'do not duplicate the shared HTTP error toast')
})

for (const kind of ['confirm', 'prompt']) {
  test(`${kind} cancellation stays silent and does not call the API`, () => {
    const result = runCase({ action: { [kind]: kind === 'confirm' ? '确定操作？' : true }, cancel: true })
    noFalseSuccess(result)
    assert.equal(result.api.length, 0)
    assert.equal(result.returnedPromise, true)
    assert.deepEqual(result.error, [])
  })
  test(`${kind} accepted but API rejected never emits a success or reload`, () => {
    const result = runCase({ action: { [kind]: kind === 'confirm' ? '确定操作？' : true }, failure: true })
    noFalseSuccess(result)
    assert.equal(result.api.length, 1)
    assert.equal(result.returnedPromise, true)
    assert.deepEqual(result.error, [])
  })
}

test('prompt validation still blocks blank reasons locally', () => {
  const result = runCase({ action: { prompt: true }, reason: '   ' })
  noFalseSuccess(result)
  assert.equal(result.api.length, 0)
  assert.deepEqual(result.error, ['必须填写原因'])
})

test('success still passes the trimmed reason and encoded row ID, then refreshes', () => {
  const result = runCase({ action: { prompt: true, method: 'put' } })
  assert.equal(result.returnedPromise, true)
  assert.deepEqual(result.api, [{ method: 'put', url: '/context/a%20%2F%20b', data: { reason: '原因' } }])
  assert.deepEqual(result.success, ['查看原文成功'])
  assert.equal(result.refreshed, 1)
  assert.deepEqual(result.emitted, ['changed'])
  assert.deepEqual(result.unhandled, [])
})

test('review context opens without falsely recording a mutation', () => {
  const result = runCase({ response: { data: { reviewContext: { title: '原文', content: '待审核内容' } } } })
  noFalseSuccess(result)
  assert.equal(result.contextOpen, true)
  assert.deepEqual(result.reviewContext, { title: '原文', content: '待审核内容' })
})

// 结算申请余额不足：后端给行补 extConfirm，「登记打款」填完凭证后再弹一次确认框写清差额，确认后才带 confirmShortfall=true 提交
const shortfallRow = { extConfirm: { paid: { text: '申请人当前余额 -97.00，确认仍要登记打款？', param: 'confirmShortfall' } } }
test('row-level extra confirm adds its flag only after the admin confirms', () => {
  const result = runCase({ action: { key: 'paid', prompt: true, method: 'put' }, row: shortfallRow })
  assert.deepEqual(result.confirms, ['申请人当前余额 -97.00，确认仍要登记打款？'])
  assert.deepEqual(result.api, [{ method: 'put', url: '/context/a%20%2F%20b', data: { reason: '原因', confirmShortfall: true } }])
  assert.equal(result.refreshed, 1)
  const cancelled = runCase({ action: { key: 'paid', prompt: true, method: 'put' }, row: shortfallRow, cancelConfirm: true })
  noFalseSuccess(cancelled)
  assert.deepEqual(cancelled.api, [])
  const other = runCase({ action: { key: 'revoke', prompt: true, method: 'put' }, row: shortfallRow })
  assert.deepEqual(other.api[0].data, { reason: '原因' })
  assert.equal(other.confirms, undefined)
})

test('business rejection refreshes the list once so row notes catch up, without a success toast', () => {
  const result = runCase({ action: { key: 'paid', prompt: true, method: 'put' }, businessFailure: true })
  assert.deepEqual(result.success, [])
  assert.deepEqual(result.emitted, [])
  assert.equal(result.refreshed, 1)
  assert.deepEqual(result.unhandled, [])
  assert.equal(result.escaped, undefined)
})

test('signed file action preserves its actual URL and room navigation still routes', () => {
  const file = runCase({ response: { data: { openUrl: '/private/signed-example' } } })
  assert.deepEqual(file.opened, [['/api/private/signed-example', '_blank']])
  assert.deepEqual(file.unhandled, [])
  const route = runCase({ action: { method: 'route' } })
  assert.equal(route.route, 8)
  assert.deepEqual(route.api, [])
})
