// 后台岗位管理的「年龄」「性格」（V67，2026-11-03 主人：「年龄选择年龄段，在后台管理配置」「加一个性格」）：真跑页面脚本（换掉接口和弹窗）。
// 年龄、性格从字典 kg_job_age / kg_job_personality 选（后台「袋鼠小院 → 岗位要求选项」维护），保存时和小程序一样写成要求的前两行。
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import vm from 'node:vm'
import * as vue from 'vue'
import * as interviewVideo from '../src/utils/interviewVideo.js'

const read = rel => readFileSync(new URL('../' + rel, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const PAGE = 'src/views/kangaroo/job/index.vue'
const tick = () => new Promise(resolve => setImmediate(resolve))
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
const plain = v => JSON.parse(JSON.stringify(v))
const dict = (...labels) => vue.ref(labels.map(l => ({ label: l, value: l })))
const DICTS = () => ({ kg_job_age: dict('不限', '18-25岁', '18-30岁', '18岁以上'), kg_job_personality: dict('活泼开朗', '善于沟通', '有责任心', '细心耐心') })
const NL = '\n'

// 和 job-extras-admin.test.mjs 同一个页面脚本沙盒，只是 useDict 给出年龄、性格两个字典
function harness() {
  const writes = [], validations = [], reads = []
  const dicts = DICTS()
  const proxy = {
    useDict: () => dicts, resetForm() {}, addDateRange: v => v,
    $refs: { jobRef: { validate: cb => validations.push(cb) } },
    $auth: { hasPermi: () => true },
    $modal: { msgSuccess() {}, msgWarning() {}, msgError() {}, confirm: async () => {} }
  }
  const ctx = {
    ref: vue.ref, reactive: vue.reactive, computed: vue.computed, toRefs: vue.toRefs, watch() {},
    window: { innerWidth: 1280 }, getCurrentInstance: () => ({ proxy }),
    listJob: async () => ({ rows: [], total: 0 }), listStoreOptions: async () => ({ rows: [] }),
    getJob: id => { const d = deferred(); reads.push({ id, ...d }); return d.promise },
    updateJob: body => { const d = deferred(); writes.push({ kind: 'update', body: plain(body), ...d }); return d.promise },
    addJob: body => { const d = deferred(); writes.push({ kind: 'add', body: plain(body), ...d }); return d.promise },
    useRoute: () => ({ query: {} }), useRouter: () => ({}), parseJobFocus: () => null,
    ...interviewVideo, revealFirstFormError() {}
  }
  vm.createContext(ctx)
  vm.runInContext(read(PAGE).match(/<script setup[^>]*>([\s\S]*?)<\/script>/)[1].replace(/^import .*\n/gm, ''), ctx)
  const run = code => vm.runInContext(code, ctx)
  const set = fields => { Object.assign(run('form.value'), fields) }
  const openJob = async data => {
    ctx.handleUpdate({ jobId: data.jobId })
    reads.shift().resolve({ data: { title: 't', storeId: 1, imageList: '', images: '["/profile/upload/a.jpg"]', ...data } })
    await tick()
    assert.equal(run('open.value'), true)
  }
  const save = async () => {
    ctx.submitForm()
    const pending = validations.shift()(true)
    await tick()
    const write = writes.shift()
    assert.ok(write, '要发出请求')
    write.resolve({})
    await pending
    return write
  }
  return { ctx, run, set, openJob, save }
}

test('打开老岗位：年龄、性格从要求里拆出来，框里只剩其他要求；手写的年龄也列进选项', async () => {
  const h = harness()
  await h.openJob({ jobId: 1, jobType: 'volunteer', requirement: ['年龄：18周岁以上', '性格：活泼开朗、爱干净', '技能：拍摄', '能待满一个月'].join(NL) })
  const f = plain(h.run('form.value'))
  assert.equal(f.reqAge, '18周岁以上')
  assert.deepEqual(f.reqPersonality, ['活泼开朗', '爱干净'])
  assert.equal(f.requirement, '技能：拍摄' + NL + '能待满一个月')
  assert.deepEqual(plain(h.run('ageOptions.value')), ['18-25岁', '18-30岁', '18岁以上', '18周岁以上'], '「不限」= 清空，不放进下拉')
  assert.deepEqual(plain(h.run('personalityOptions.value')), ['活泼开朗', '善于沟通', '有责任心', '细心耐心', '爱干净'])
  assert.equal(h.run('REQ_PERSONALITY_MAX'), 3)
})

test('保存：年龄、性格合回要求的前两行；不写回表单', async () => {
  const h = harness()
  await h.openJob({ jobId: 2, jobType: 'volunteer', requirement: '能待满一个月' })
  h.set({ reqAge: '18-30岁', reqPersonality: ['活泼开朗', '善于沟通'] })
  const w = await h.save()
  assert.equal(w.body.requirement, ['年龄：18-30岁', '性格：活泼开朗、善于沟通', '能待满一个月'].join(NL))
  assert.equal('reqAge' in w.body || 'reqPersonality' in w.body, false, '这两个只是表单里的')
  assert.equal(h.run('form.value.requirement'), '能待满一个月')
})

test('不限、没选性格：不写这两行；老岗位写的「年龄：不限」按不限', async () => {
  const h = harness()
  await h.openJob({ jobId: 3, jobType: 'parttime', requirement: '年龄：不限' + NL + '会收银' })
  assert.equal(h.run('form.value.reqAge'), '')
  const w = await h.save()
  assert.equal(w.body.requirement, '会收银')
})

test('线上任务：不拆不合，要求原样', async () => {
  const h = harness()
  const text = '年龄：18岁以上' + NL + '会剪辑'
  await h.openJob({ jobId: 4, jobType: 'online', salaryMin: 10, requirement: text })
  assert.equal(h.run('form.value.requirement'), text)
  const w = await h.save()
  assert.equal(w.body.requirement, text)
})

test('新增：默认不限、没选性格', () => {
  const h = harness()
  h.ctx.handleAdd()
  assert.equal(h.run('form.value.reqAge'), '')
  assert.deepEqual(plain(h.run('form.value.reqPersonality')), [])
})

test('模板：两个下拉框只给线下岗位，性格多选最多 3 个；选项页存在', () => {
  const page = read(PAGE)
  assert.match(page, /<el-col :span="12" v-if="!isOnline">\s*<el-form-item label="年龄" prop="reqAge">/)
  assert.match(page, /v-model="form.reqPersonality" multiple :multiple-limit="REQ_PERSONALITY_MAX"/)
  assert.match(page, /proxy\.useDict\([^)]*"kg_job_age", "kg_job_personality"\)/)
  assert.ok(existsSync(new URL('../src/views/kangaroo/ext/jobopt/index.vue', import.meta.url)))
  assert.match(read('src/views/kangaroo/ext/jobopt/index.vue'), /<ext-crud entity="jobopt" \/>/)
})
