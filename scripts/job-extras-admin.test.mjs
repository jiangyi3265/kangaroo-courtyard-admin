// 后台岗位管理的餐补、宠物、住宿照片和视频（R1–R4，20261031-forms，V66）：真跑页面脚本（换掉接口和弹窗）、住宿视频规则、接线。真点在 Playwright 里跑过。
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { compileTemplate, parse } from '@vue/compiler-sfc'
import * as vue from 'vue'
import * as interviewVideo from '../src/utils/interviewVideo.js'

const read = rel => readFileSync(new URL('../' + rel, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const PAGE = 'src/views/kangaroo/job/index.vue'
const UPLOAD = 'src/components/AdminVideoUpload/index.vue'
const JAVA = '../RuoYi-Vue/ruoyi-kangaroo/src/main/java/com/ruoyi/kangaroo/'
const tick = () => new Promise(resolve => setImmediate(resolve))
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
const plain = v => JSON.parse(JSON.stringify(v))

function harness() {
  const writes = [], validations = [], reads = [], confirms = [], warnings = []
  const proxy = {
    useDict: () => ({}), resetForm() {}, addDateRange: v => v,
    $refs: { jobRef: { validate: cb => validations.push(cb) } },
    $auth: { hasPermi: () => true },
    $modal: { msgSuccess() {}, msgWarning: v => warnings.push(v), msgError: v => warnings.push(v), confirm: text => { const d = deferred(); confirms.push({ text, ...d }); return d.promise } }
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
  /** 打开一个已有岗位 */
  const openJob = async data => {
    ctx.handleUpdate({ jobId: data.jobId })
    reads.shift().resolve({ data: { title: 't', storeId: 1, imageList: '', images: '["/profile/upload/a.jpg"]', ...data } })
    await tick()
    assert.equal(run('open.value'), true)
  }
  /** 点确定、校验通过，返回发出去的请求体 */
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
  return { ctx, run, set, openJob, save, reads, writes, validations, confirms, warnings }
}

// ---------------------------------------------------------------- 什么时候出现

test('餐补：只要不包吃就出现；和后端 JobExtras.mealShown 同一条规则', () => {
  const h = harness()
  h.ctx.handleAdd()
  const shown = (jobType, boardType) => { h.set({ jobType, boardType }); return h.run('hasMealAllowance.value') }
  for (const type of ['volunteer', 'parttime', 'fulltime']) {
    assert.equal(shown(type, 'room'), true, type + ' 只包住')
    assert.equal(shown(type, 'none'), true, type + ' 不包')
    assert.equal(shown(type, ''), true, type + ' 老数据没写')
    assert.equal(shown(type, null), true, type)
    assert.equal(shown(type, 'all'), false, type + ' 包吃包住')
    assert.equal(shown(type, 'meal'), false, type + ' 只包吃')
    assert.equal(shown(type, 'part'), false, type + ' 包部分')
  }
  for (const board of ['room', 'none', 'all']) assert.equal(shown('online', board), false, '线上任务没有')
  const java = read(JAVA + 'domain/JobExtras.java')
  assert.match(java, /return b\.isEmpty\(\) \|\| "room"\.equals\(b\) \|\| "none"\.equals\(b\);/)
})

test('模板：餐补、宠物、住宿媒体的条件和控件', () => {
  const page = read(PAGE)
  assert.match(page, /<el-col :span="12" v-if="hasMealAllowance">\s*<el-form-item label="餐补" prop="mealAllowance">/)
  assert.match(page, /<template v-if="form\.jobType === 'volunteer'">\s*<el-col :span="12">\s*<el-form-item label="宠物">/)
  assert.match(page, /<el-col v-if="form\.petStatus === 'yes'" :span="24">\s*<el-form-item label="宠物照片">\s*<image-upload v-model="form\.petImageList" :disabled="jobSaving" :limit="6"/)
  assert.match(page, /<template v-if="hasHousing">\s*<el-col :span="24">\s*<el-form-item label="住宿照片">\s*<image-upload v-model="form\.lodgingImageList" :disabled="jobSaving" :limit="9"/)
  assert.match(page, /<admin-video-upload v-if="open" :key="'lodging:' \+ \(form\.jobId \|\| 'new'\)" v-model="form\.lodgingVideo" kind="lodging" :active="open" :cover="form\.lodgingVideoCover \|\| ''"/)
  assert.match(page, /<el-col v-if="form\.lodgingVideo" :span="24">\s*<el-form-item label="住宿视频封面">/)
  // 房型选项保留（用户筛选靠它）
  assert.match(page, /<el-col :span="12" v-if="hasHousing">\s*<el-form-item label="住宿条件" prop="roomType">/)
  const { descriptor, errors } = parse(readFileSync(new URL('../' + PAGE, import.meta.url), 'utf8'), { filename: PAGE })
  assert.deepEqual(errors, [])
  assert.deepEqual(compileTemplate({ source: descriptor.template.content, filename: PAGE, id: 'x' }).errors, [])
})

test('单位和宠物的取值和后端一样', () => {
  const h = harness()
  assert.deepEqual(plain(h.run('MEAL_UNIT_OPTIONS')), [{ value: 'day', label: '元/天' }, { value: 'month', label: '元/月' }])
  assert.deepEqual(plain(h.run('PET_STATUS_OPTIONS')), [{ value: 'none', label: '没有' }, { value: 'yes', label: '有' }])
  const java = read(JAVA + 'domain/JobExtras.java')
  assert.match(java, /UNIT_DAY = "day"/)
  assert.match(java, /UNIT_MONTH = "month"/)
  assert.match(java, /PET_NONE = "none"/)
  assert.match(java, /PET_YES = "yes"/)
})

// ---------------------------------------------------------------- R1 工时

test('每日工时：还是自由文本；常用值只有 2、4、6、8 小时，和小程序提交的写法一样', () => {
  const h = harness()
  const options = plain(h.run('DAILY_HOUR_OPTIONS'))
  assert.deepEqual(options, ['每天 2 小时', '每天 4 小时', '每天 6 小时', '每天 8 小时'])
  assert.doesNotMatch(options.join(), /10|弹性|自定义/)
  const page = read(PAGE)
  assert.match(page, /<el-autocomplete v-model="form\.dailyHours" :fetch-suggestions="dailyHourSuggestions" placeholder="如：每天 4 小时" maxlength="32"/)
  assert.doesNotMatch(page, /每日4-6小时/)
  // 老值在框里时也给全部四个：按字面过滤一个都不出，就没法点选了
  let given
  h.ctx.dailyHourSuggestions('每天 10 小时', list => { given = list })
  assert.deepEqual(plain(given), options.map(value => ({ value })))
})

test('老岗位的工时不会被悄悄改掉', async () => {
  for (const old of ['弹性时间', '每天 10 小时']) {
    const h = harness()
    await h.openJob({ jobId: 1, jobType: 'volunteer', boardType: 'room', dailyHours: old })
    assert.equal(h.run('form.value.dailyHours'), old)
    const { body } = await h.save()
    assert.equal(body.dailyHours, old)
  }
})

// ---------------------------------------------------------------- R2 餐补

test('餐补金额校验：和后端 JobExtras.amount 同一条规则', () => {
  const h = harness()
  const check = value => { let out; h.run('rules.value.mealAllowance[0]').validator(null, value, error => { out = error ? error.message : '' }); return out }
  for (const ok of ['', null, undefined, ' ', '15', '15.5', '15.50', '99999', '99999.99', '0.01', ' 15 ', 15]) assert.equal(check(ok), '', JSON.stringify(ok))
  for (const bad of ['abc', '15元', '-5', '1.234', '100000', '1e3', '.5', '5.', '１５', '1,000']) assert.match(check(bad), /餐补金额要是数字/, bad)
  for (const zero of ['0', '0.0', '0.00', '00']) assert.match(check(zero), /餐补金额要大于 0/, zero)
  const java = read(JAVA + 'domain/JobExtras.java')
  assert.match(java, /\[0-9\]\{1,5\}\(\\\\\.\[0-9\]\{1,2\}\)\?/)
})

test('餐补：不包吃才提交；包吃、线上传空串（null 是保持原值，清不掉）；没填金额单位也空', async () => {
  let h = harness()
  await h.openJob({ jobId: 1, jobType: 'volunteer', boardType: 'room', mealAllowance: '15', mealAllowanceUnit: 'month' })
  let { body } = await h.save()
  assert.equal(body.mealAllowance, '15')
  assert.equal(body.mealAllowanceUnit, 'month')

  h = harness()
  await h.openJob({ jobId: 1, jobType: 'volunteer', boardType: 'room', mealAllowance: ' 18.50 ', mealAllowanceUnit: null })
  ;({ body } = await h.save())
  assert.equal(body.mealAllowance, '18.50', '去空白；去多余的 0 是后端的事')
  assert.equal(body.mealAllowanceUnit, 'day', '老数据没单位，默认元/天')

  h = harness()
  await h.openJob({ jobId: 1, jobType: 'volunteer', boardType: 'all', mealAllowance: '15', mealAllowanceUnit: 'day' })
  ;({ body } = await h.save())
  assert.strictEqual(body.mealAllowance, '', '包吃：库里的老值要清掉')
  assert.strictEqual(body.mealAllowanceUnit, '')

  h = harness()
  await h.openJob({ jobId: 1, jobType: 'parttime', boardType: 'none', mealAllowance: '', mealAllowanceUnit: 'month' })
  ;({ body } = await h.save())
  assert.strictEqual(body.mealAllowance, '')
  assert.strictEqual(body.mealAllowanceUnit, '', '清空金额时单位一起清')

  h = harness()
  await h.openJob({ jobId: 1, jobType: 'online', boardType: 'none', salaryMin: 10, mealAllowance: '15', mealAllowanceUnit: 'day' })
  ;({ body } = await h.save())
  assert.strictEqual(body.mealAllowance, '')
})

test('打开时：没填过的是 null，统一成空串，单位默认元/天', async () => {
  const h = harness()
  await h.openJob({ jobId: 1, jobType: 'volunteer', boardType: 'room', mealAllowance: null, mealAllowanceUnit: null, petStatus: null, petImages: null, lodgingImages: null, lodgingVideo: null, lodgingVideoCover: null })
  const f = plain(h.run('form.value'))
  assert.strictEqual(f.mealAllowance, '')
  assert.strictEqual(f.mealAllowanceUnit, 'day')
  assert.strictEqual(f.petStatus, '')
  assert.strictEqual(f.petImageList, '')
  assert.strictEqual(f.lodgingImageList, '')
  assert.strictEqual(f.lodgingVideo, '')
  assert.strictEqual(f.lodgingVideoCover, '')
})

test('新增：默认值', () => {
  const h = harness()
  h.ctx.handleAdd()
  const f = plain(h.run('form.value'))
  for (const key of ['mealAllowance', 'petStatus', 'petImageList', 'lodgingImageList', 'lodgingVideo', 'lodgingVideoCover']) assert.strictEqual(f[key], '', key)
  assert.strictEqual(f.mealAllowanceUnit, 'day')
})

// ---------------------------------------------------------------- R3 宠物

test('宠物：有才带照片；没有、没填都清；非换工一律空', async () => {
  let h = harness()
  await h.openJob({ jobId: 1, jobType: 'volunteer', boardType: 'room', petStatus: 'yes', petImages: '["/profile/upload/p1.jpg","/profile/upload/p2.jpg"]' })
  assert.equal(h.run('form.value.petImageList'), '/profile/upload/p1.jpg,/profile/upload/p2.jpg', '库里 JSON → 组件逗号分隔')
  let { body } = await h.save()
  assert.equal(body.petStatus, 'yes')
  assert.strictEqual(typeof body.petImages, 'string', '接口字段是字符串，传数组会报错')
  assert.deepEqual(JSON.parse(body.petImages), ['/profile/upload/p1.jpg', '/profile/upload/p2.jpg'])

  h = harness()
  await h.openJob({ jobId: 1, jobType: 'volunteer', boardType: 'room', petStatus: 'yes', petImages: '["/profile/upload/p1.jpg"]' })
  h.set({ petStatus: 'none' })
  ;({ body } = await h.save())
  assert.equal(body.petStatus, 'none')
  assert.equal(body.petImages, '[]')

  h = harness()
  await h.openJob({ jobId: 1, jobType: 'volunteer', boardType: 'room', petStatus: 'none' })
  h.set({ petStatus: undefined }) // 下拉点清空给的是 undefined：提交时会被省略、后端保持原值，要统一成空串
  ;({ body } = await h.save())
  assert.strictEqual(body.petStatus, '')

  h = harness()
  await h.openJob({ jobId: 1, jobType: 'parttime', boardType: 'room', petStatus: 'yes', petImages: '["/profile/upload/p1.jpg"]' })
  ;({ body } = await h.save())
  assert.strictEqual(body.petStatus, '')
  assert.equal(body.petImages, '[]')
})

// ---------------------------------------------------------------- R4 住宿媒体

test('住宿照片和视频：包住才带；不包住传空', async () => {
  let h = harness()
  await h.openJob({ jobId: 1, jobType: 'volunteer', boardType: 'none', lodgingImages: '["/profile/upload/l1.jpg"]', lodgingVideo: '/profile/upload/videos/v.mp4', lodgingVideoCover: '/profile/upload/c.jpg' })
  let { body } = await h.save()
  assert.deepEqual(JSON.parse(body.lodgingImages), ['/profile/upload/l1.jpg'], '换工一律算包住')
  assert.equal(body.lodgingVideo, '/profile/upload/videos/v.mp4')
  assert.equal(body.lodgingVideoCover, '/profile/upload/c.jpg')

  h = harness()
  await h.openJob({ jobId: 1, jobType: 'parttime', boardType: 'room', lodgingImages: '["/profile/upload/l1.jpg"]' })
  ;({ body } = await h.save())
  assert.deepEqual(JSON.parse(body.lodgingImages), ['/profile/upload/l1.jpg'])

  h = harness()
  await h.openJob({ jobId: 1, jobType: 'parttime', boardType: 'none', lodgingImages: '["/profile/upload/l1.jpg"]', lodgingVideo: '/profile/upload/videos/v.mp4', lodgingVideoCover: '/profile/upload/c.jpg' })
  ;({ body } = await h.save())
  assert.equal(body.lodgingImages, '[]')
  assert.strictEqual(body.lodgingVideo, '')
  assert.strictEqual(body.lodgingVideoCover, '')
})

test('去掉视频：封面一起清（旧封面是上一个视频的画面）', async () => {
  const h = harness()
  await h.openJob({ jobId: 1, jobType: 'volunteer', boardType: 'room', lodgingVideo: '/profile/upload/videos/v.mp4', lodgingVideoCover: '/profile/upload/c.jpg' })
  h.set({ lodgingVideo: '' })
  const { body } = await h.save()
  assert.strictEqual(body.lodgingVideo, '')
  assert.strictEqual(body.lodgingVideoCover, '')
})

test('上传组件的逗号分隔转 JSON：去空白、去重', async () => {
  const h = harness()
  await h.openJob({ jobId: 1, jobType: 'volunteer', boardType: 'room' })
  h.set({ lodgingImageList: ' /profile/upload/a.jpg, /profile/upload/b.jpg,/profile/upload/a.jpg,' })
  const { body } = await h.save()
  assert.deepEqual(JSON.parse(body.lodgingImages), ['/profile/upload/a.jpg', '/profile/upload/b.jpg'])
})

test('算提交的值不写回表单：保存失败时切回只包住，金额和单位都还在', async () => {
  const h = harness()
  await h.openJob({ jobId: 1, jobType: 'volunteer', boardType: 'room', mealAllowance: '15', mealAllowanceUnit: 'month' })
  h.set({ boardType: 'all' })
  h.ctx.submitForm()
  const pending = h.validations.shift()(true)
  await tick()
  const write = h.writes.shift()
  assert.strictEqual(write.body.mealAllowance, '')
  write.reject(new Error('422'))
  await pending
  assert.equal(h.run('open.value'), true, '失败不关弹窗')
  assert.equal(h.run('form.value.mealAllowance'), '15')
  assert.equal(h.run('form.value.mealAllowanceUnit'), 'month')
  assert.equal(h.run('jobSaving.value'), false)
})

test('新增也走同一套：addJob 带这些字段', async () => {
  const h = harness()
  h.ctx.handleAdd()
  h.set({ storeId: 1, jobType: 'volunteer', boardType: 'room', imageList: '/profile/upload/a.jpg', title: 'x', mealAllowance: '20', petStatus: 'yes', petImageList: '/profile/upload/p.jpg' })
  const write = await h.save()
  assert.equal(write.kind, 'add')
  assert.equal(write.body.mealAllowance, '20')
  assert.equal(write.body.mealAllowanceUnit, 'day')
  assert.deepEqual(JSON.parse(write.body.petImages), ['/profile/upload/p.jpg'])
  assert.equal(write.body.lodgingImages, '[]')
})

test('这些字段后端都是字符串：KgJob 上的类型', () => {
  const java = read(JAVA + 'domain/KgJob.java')
  for (const field of ['mealAllowance', 'mealAllowanceUnit', 'petStatus', 'petImages', 'lodgingImages', 'lodgingVideo', 'lodgingVideoCover']) assert.match(java, new RegExp('private String ' + field + ';'), field)
})

test('还在传就不能保存、不能关：住宿照片、住宿视频、封面、宠物照片都算', async () => {
  for (const key of ['lodgingImages', 'lodgingVideo', 'lodgingCover', 'petImages']) {
    const h = harness()
    await h.openJob({ jobId: 1, jobType: 'volunteer', boardType: 'room' })
    h.run('extrasBusy.' + key + ' = true')
    h.ctx.submitForm()
    assert.equal(h.validations.length, 0, key)
    await h.ctx.cancel()
    assert.equal(h.run('open.value'), true, key)
    assert.match(h.warnings[0], /正在上传/, key)
    h.run('extrasBusy.' + key + ' = false')
    h.ctx.submitForm()
    assert.equal(h.validations.length, 1, key)
  }
  const page = read(PAGE)
  for (const key of ['lodgingImages', 'lodgingVideo', 'lodgingCover', 'petImages']) assert.ok(page.includes('@busy="extrasBusy.' + key + ' = $event"'), key)
})

test('住宿视频传完没保存就关：问一句；没改不问；不包住时不问', async () => {
  let h = harness()
  await h.openJob({ jobId: 1, jobType: 'volunteer', boardType: 'room', lodgingVideo: '/profile/upload/videos/old.mp4' })
  h.set({ lodgingVideo: '/profile/upload/videos/new.mp4' })
  let closing = h.ctx.cancel()
  await tick()
  assert.equal(h.confirms.length, 1)
  assert.equal(h.confirms[0].text, interviewVideo.VIDEO_UNSAVED_CONFIRM)
  h.confirms[0].reject('cancel')
  await closing
  assert.equal(h.run('open.value'), true, '选取消：还开着')
  closing = h.ctx.cancel()
  await tick()
  h.confirms[1].resolve()
  await closing
  assert.equal(h.run('open.value'), false, '选确定：关掉')

  h = harness()
  await h.openJob({ jobId: 1, jobType: 'volunteer', boardType: 'room', lodgingVideo: '/profile/upload/videos/old.mp4' })
  await h.ctx.cancel()
  assert.equal(h.confirms.length, 0, '没改不问')
  assert.equal(h.run('open.value'), false)

  h = harness()
  await h.openJob({ jobId: 1, jobType: 'parttime', boardType: 'none', lodgingVideo: '' })
  h.set({ lodgingVideo: '/profile/upload/videos/new.mp4' })
  await h.ctx.cancel()
  assert.equal(h.confirms.length, 0, '不包住时这个视频本来就不会存')
})

test('住宿视频没保存时，校验失败的提示说清楚', async () => {
  const h = harness()
  await h.openJob({ jobId: 1, jobType: 'volunteer', boardType: 'room', lodgingVideo: '' })
  h.set({ lodgingVideo: '/profile/upload/videos/new.mp4' })
  const notes = []
  h.ctx.revealFirstFormError = (_form, _fields, notify, suffix) => notes.push(suffix)
  h.ctx.submitForm()
  await h.validations.shift()(false, {})
  assert.match(notes[0], /视频才会一起保存/)
})

// ---------------------------------------------------------------- 住宿视频组件

async function uploadLimits(kind) {
  const captured = {}
  const source = read(UPLOAD).match(/<script setup[^>]*>([\s\S]*?)<\/script>/)[1].replace(/^import .*\n/gm, '')
  const ctx = {
    ref: vue.ref, computed: vue.computed, watch() {}, onBeforeUnmount() {}, getCurrentInstance: () => ({ proxy: {} }),
    defineProps: () => ({ kind, modelValue: '', active: true, cover: '' }), defineEmits: () => () => {},
    imageUrl: v => v, useStoreInterviewVideo: args => { Object.assign(captured, args); return { videoInput: {}, videoUi: { running: false }, pickVideo() {}, removeVideo() {}, onVideoChosen() {}, cancelVideoUpload() {} } },
    stayVideoApi: value => { captured.apiKind = value; return {} }, ...interviewVideo
  }
  vm.createContext(ctx)
  vm.runInContext(source, ctx)
  return { ...captured.limits, apiKind: captured.apiKind }
}

test('住宿和小院视频限 3 分钟、短视频限 1 分钟，文件上限均为 200MB', async () => {
  const mb = 1024 * 1024
  assert.deepEqual(await uploadLimits('lodging'), { maxSeconds: 180, maxBytes: 200 * mb, label: '住宿视频', apiKind: 'lodging' })
  assert.deepEqual(await uploadLimits('intro'), { maxSeconds: 180, maxBytes: 200 * mb, label: '小院视频', apiKind: 'intro' })
  for (const kind of ['room', 'diary']) assert.deepEqual(await uploadLimits(kind), { maxSeconds: 60, maxBytes: 200 * mb, label: '短视频', apiKind: kind })
  const source = read(UPLOAD)
  assert.match(source, /\{\{ longVideo \? '最长 3 分钟，最大 200MB' : '最长 1 分钟，最大 200MB' \}\}/)
  assert.match(source, /<p v-if="kind === 'intro'">\{\{ STAY_VIDEO_TEXT \}\}/, '「旅居详情页的视频就是这个」只给小院视频')
  const java = read(JAVA + 'controller/admin/KgStayVideoController.java')
  assert.match(java, /"lodging"\.equals\(kind\) \? "job"/, '后端认这个 kind，岗位权限能传')
  assert.match(java, /"intro"\.equals\(kind\) \|\| "lodging"\.equals\(kind\)\)\)/, '后端也是这条规则')
})
