// 门店来源类型加「合作」（2026-11-03 主人拍板）：线上旧版门店服务（V61 挡着不能发）只认 直营 / 加盟 / 代运营，
// 所以后台「门店管理」选「合作」要绕开通用保存接口，走单独的 PUT /kangaroo/store/{id}/op-type。这里钉住页面的接线和后端接口的约束。
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { compileTemplate, parse } from '@vue/compiler-sfc'

const read = rel => readFileSync(new URL('../' + rel, import.meta.url), 'utf8')
const PAGE = 'src/views/kangaroo/store/index.vue'
const API = 'src/api/kangaroo/store.js'
const JAVA = '../RuoYi-Vue/ruoyi-kangaroo/src/main/java/com/ruoyi/kangaroo/'

test('门店管理页模板能编译', () => {
  const { descriptor, errors } = parse(read(PAGE))
  assert.deepEqual(errors, [])
  assert.deepEqual(compileTemplate({ source: descriptor.template.content, filename: PAGE, id: 'x' }).errors, [])
})

test('api：setStoreOpType 打到单独的来源类型接口，关掉防重复提交', () => {
  const api = read(API)
  const fn = api.slice(api.indexOf('export function setStoreOpType'), api.indexOf('// ---------- 门店资料'))
  assert.match(fn, /url: '\/kangaroo\/store\/' \+ storeId \+ '\/op-type'/)
  assert.match(fn, /method: 'put'/)
  assert.match(fn, /data: \{ opType: opType \}/)
  assert.match(fn, /repeatSubmit: false/)
})

test('页面：选「合作」时主表单不带 partner（改门店不传、新门店按直营建），保存后再调来源类型接口，失败只提醒一次', () => {
  const page = read(PAGE)
  assert.match(page, /certStore, setStoreOpType,/, '从 api 引入')
  const submit = page.slice(page.indexOf('function submitForm()'), page.indexOf('onBeforeUnmount'))
  assert.match(submit, /const wantPartner = payload\.opType === 'partner'/)
  assert.match(submit, /if \(isUpdate\) delete payload\.opType\s*else payload\.opType = 'direct'/)
  assert.match(submit, /else storeId = \(await addStore\(payload\)\)\.data/, '新门店用后端返回的编号')
  assert.match(submit, /if \(wantPartner\) \{\s*try \{ await setStoreOpType\(storeId, 'partner'\) \}/)
  assert.equal((submit.match(/alertWarning\(/g) || []).length, 1)
  assert.match(submit, /门店已按「直营」新建，但来源类型没能改成「合作」/)
  // 字典选项照旧来自 kg_store_op_type，不写死
  assert.match(page, /<el-option v-for="d in kg_store_op_type"/)
})

test('后端：新接口只改 op_type 三列、不碰 images，带编辑权限和操作日志；直营口径不变', () => {
  const ctrl = read(JAVA + 'controller/admin/KgStoreOpTypeAdminController.java')
  assert.match(ctrl, /@PreAuthorize\("@ss\.hasPermi\('kangaroo:store:edit'\)"\)/)
  assert.match(ctrl, /@Log\(title = "门店来源类型", businessType = BusinessType\.UPDATE\)/)
  assert.match(ctrl, /@PutMapping\("\/\{storeId:\[0-9\]\+\}\/op-type"\)/)
  assert.match(ctrl, /@RequestMapping\("\/kangaroo\/store"\)/)
  const svc = read(JAVA + 'ext/core/KgStoreOpTypes.java')
  assert.match(svc, /Arrays\.asList\("direct", "franchise", "managed", "partner"\)/)
  assert.match(svc, /update kg_store set op_type = :op, update_by = :by, update_time = now\(\) where store_id = :id and del_flag = '0'/)
  // 注释里可以提到为什么绕开，代码本身不能引用 V61 挡住的那几个类或 images 列（发布脚本按 class 字节查 StoreImages）
  const code = svc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
  assert.doesNotMatch(code, /images|KgStoreMapper|KgStoreServiceImpl|StoreImages|domain\.KgStore/, '不能牵连 V61 挡住的那几个类')
  // 字典里确实有 partner，顺序 直营、加盟、代运营、合作
  const v70 = read('../RuoYi-Vue/sql/kangaroo/V70__stay_week_price_options.sql')
  assert.match(v70, /'合作', 'partner', 'kg_store_op_type'/)
})
