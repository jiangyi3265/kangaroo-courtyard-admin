import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { setImmediate as flush } from 'node:timers/promises'
import { runInNewContext } from 'node:vm'

test('面试时段：第二个时段已打开后，较慢的第一条详情不能覆盖表单', async () => {
  const source = readFileSync(new URL('../src/views/kangaroo/slot/index.vue', import.meta.url), 'utf8')
  const handler = source.match(/^function handleUpdate\(row\) \{[\s\S]*?^\}/m)[0]
  const pending = new Map()
  const form = { value: {} }
  const edit = runInNewContext(`let editorRequest = 0; ${handler}; handleUpdate`, {
    saving: { value: false }, reset: () => {}, form, ids: { value: [] }, open: {}, title: {},
    getSlot: id => new Promise(resolve => pending.set(id, resolve))
  })
  edit({ slotId: 101 })
  edit({ slotId: 102 })
  pending.get(102)({ data: { slotId: 102 } })
  await flush()
  pending.get(101)({ data: { slotId: 101 } })
  await flush()
  assert.equal(form.value.slotId, 102)
})

for (const [page, entity] of Object.entries({
  appuser: 'AppUser', application: 'Application', job: 'Job',
  message: 'Message', slot: 'Slot', store: 'Store'
})) {
  test(`${page}: late success or failure must not replace the most recent search`, async () => {
    const source = readFileSync(new URL(`../src/views/kangaroo/${page}/index.vue`, import.meta.url), 'utf8')
    const handler = source.match(/^function getList\(\) \{[\s\S]*?^\}/m)[0]
    const requests = []
    const rows = { value: [] }, loading = { value: false }, total = { value: 0 }
    const load = runInNewContext(`let listRequest = 0; ${handler}; getList`, {
      loading, total, props: {}, queryParams: { value: {} }, dateRange: { value: [] },
      proxy: { addDateRange: query => query },
      [entity[0].toLowerCase() + entity.slice(1) + 'List']: rows,
      ['list' + entity]: () => new Promise((resolve, reject) => requests.push({ resolve, reject }))
    })
    load()
    load()
    load()
    requests[0].resolve({ rows: ['old'], total: 4 })
    await flush()
    assert.equal(loading.value, true)
    requests[2].resolve({ rows: ['latest'], total: 1 })
    await flush()
    requests[1].reject(new Error('an earlier request failed late'))
    await flush()
    assert.deepEqual(rows.value, ['latest'])
    assert.equal(total.value, 1)
    assert.equal(loading.value, false)
    load()
    load()
    requests[4].reject(new Error('the latest request failed'))
    await flush()
    requests[3].resolve({ rows: ['obsolete'], total: 99 })
    await flush()
    assert.equal(rows.value.length, 0)
    assert.equal(total.value, 0)
  })
}
