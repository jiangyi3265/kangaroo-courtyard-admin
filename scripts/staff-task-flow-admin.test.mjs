// 后台「员工任务派发」（V74，2026-11-03 主人：「任务派发，需要有个流转过程，不能只单向发送，派发任务，可以一键发送给所有全体员工。我还可以给某一个岗位，单独的发布任务」）。
// 页面能编译；三种派发方式、按批次看、时间线和处理动作都接到了对应接口；文件保持 CRLF。
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse, compileTemplate, compileScript } from '@vue/compiler-sfc'

const raw = readFileSync(new URL('../src/views/kangaroo/stafftask/index.vue', import.meta.url), 'utf8')
const page = raw.replace(/\r\n/g, '\n')
const api = readFileSync(new URL('../src/api/kangaroo/stafftask.js', import.meta.url), 'utf8')

test('页面能编译，保持原来的 CRLF', () => {
  const { descriptor, errors } = parse(page, { filename: 'index.vue' })
  assert.deepEqual(errors, [])
  const t = compileTemplate({ source: descriptor.template.content, filename: 'index.vue', id: 'x' })
  assert.deepEqual(t.errors, [])
  assert.ok(compileScript(descriptor, { id: 'x' }).content.length > 0)
  assert.equal(raw.split('\r\n').length, raw.split('\n').length, '整文件 CRLF，没有混进单独的 LF')
})

test('派发：点名 / 全体员工 / 按岗位，先看会发给多少人', () => {
  for (const mode of ['pick', 'all', 'role']) assert.match(page, new RegExp(`<el-radio-button value="${mode}">`))
  assert.match(page, /taskAudience\(\{mode:form\.mode/)
  assert.match(page, /将给 '\+audience\.value\.count\+' 位员工每人派一条/)
  assert.match(page, /audience\.value\.count>audience\.value\.max/)
  for (const role of ['manager', 'keeper', 'online_staff', 'merchant_service', 'city_lead']) assert.ok(page.includes(`value:'${role}'`), role)
  assert.ok(!page.includes("value:'merchant'"), '合作商家不算员工')
})

test('按批次看：完成 x/y，点进去按批次筛每个人', () => {
  assert.match(page, /\{\{ row\.done \}\}\/\{\{ row\.tasks \}\}/)
  assert.match(page, /function openBatch\(row\)\{query\.batchId=row\.batchId/)
})

test('时间线和处理动作接到 handle 接口，带版本号', () => {
  assert.match(page, /v-for="e in detail\.events"/)
  for (const a of ['reply', 'extend', 'reassign', 'reopen', 'close']) assert.ok(page.includes(`value:'${a}'`), a)
  assert.match(page, /handleStaffTask\(target\.taskId,\{version:target\.version,action:a/)
  assert.match(page, /v-hasPermi="\['kangaroo:stafftask:handle'\]"/)
  for (const fn of ['listTaskBatches', 'taskRoles', 'taskAudience', 'handleStaffTask']) assert.match(api, new RegExp(`export const ${fn} =`))
  assert.match(api, /'\/' \+ id \+ '\/handle'/)
})
