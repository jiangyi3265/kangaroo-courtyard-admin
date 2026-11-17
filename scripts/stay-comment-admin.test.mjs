// 小院评论审核页（20261031-stay-comment，V65）：页面接线和 ExtCrud 新开关。真点在 Playwright 里跑，这里钉住不要被顺手改掉的部分。
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { compileTemplate, parse } from '@vue/compiler-sfc'

const read = rel => readFileSync(new URL('../' + rel, import.meta.url), 'utf8')
const PAGE = 'src/views/kangaroo/ext/staycomment/index.vue'
const CRUD = 'src/views/kangaroo/ext/ExtCrud.vue'

test('页面模板能编译，只有一个根节点（标签页切换动画要求）', () => {
  for (const rel of [PAGE, CRUD]) {
    const { descriptor, errors } = parse(read(rel))
    assert.deepEqual(errors, [], rel)
    assert.deepEqual(compileTemplate({ source: descriptor.template.content, filename: rel, id: 'x' }).errors, [], rel)
  }
  const { descriptor } = parse(read(PAGE))
  assert.equal(descriptor.template.ast.children.filter(n => n.type === 1).length, 1)
})

test('审核页：实体、默认看待审、切回来刷新，页面名和菜单 route_name 一致', () => {
  const page = read(PAGE)
  assert.deepEqual([...page.matchAll(/\bentity="([^"]+)"/g)].map(m => m[1]), ['staycomment'])
  assert.match(page, /defaultQuery = \{ status: 'pending' \}/)
  assert.match(page, /name="KgExtStayComment"/)
  assert.match(page, /onActivated\(/)
  assert.match(page, /listColumns = \['stayName', 'sourceType', 'riskFlag', 'content'/, '身份、风险、内容排最前，1366 宽不用拖')
  const v65 = read('../RuoYi-Vue/sql/kangaroo/V65__stay_comment.sql')
  assert.match(v65, /KgExtStayComment/)
  assert.match(v65, /kangaroo\/ext\/staycomment\/index/)
})

test('审核页：联系方式标红、状态和身份有颜色；审核说明提到出镜授权', () => {
  const page = read(PAGE)
  assert.match(page, /riskFlag: \{ none: 'info', contact: 'danger', word: 'warning' \}/)
  assert.match(page, /pending: 'warning', online: 'success', rejected: 'danger', offline: 'info'/)
  assert.match(page, /unverified: 'info'/)
  assert.match(page, /不含联系方式/)
  assert.match(page, /已取得本人授权/)
})

test('后端登记：只读；通过带出镜授权确认，驳回和下架要填理由；按钮只对对应状态显示', () => {
  const java = read('../RuoYi-Vue/ruoyi-kangaroo/src/main/java/com/ruoyi/kangaroo/ext/stay/KgStayModule.java')
  const block = java.slice(java.indexOf('new ExtEntity("staycomment"'), java.indexOf('return Arrays.asList(stay, roomType'))
  assert.match(block, /\.readOnly\(\)/)
  assert.match(block, /"approve", "通过"[\s\S]*?已取得出镜人授权[\s\S]*?false, Collections\.singletonMap\("status", Arrays\.asList\("pending"\)\)/)
  assert.match(block, /"reject", "驳回"[\s\S]*?null, true, Collections\.singletonMap\("status", Arrays\.asList\("pending"\)\)/)
  assert.match(block, /"offline", "下架"[\s\S]*?null, true, Collections\.singletonMap\("status", Arrays\.asList\("online"\)\)/)
})

test('ExtCrud 新开关默认关闭：别的页面不传就和原来一样', () => {
  const crud = read(CRUD)
  assert.match(crud, /defaultQuery: \{ type: Object, default: \(\) => \(\{\}\) \}/)
  assert.match(crud, /tagTypes: \{ type: Object, default: \(\) => \(\{\}\) \}/)
  assert.match(crud, /expandImages: \{ type: Array, default: \(\) => \[\] \}/)
  assert.match(crud, /listColumns: \{ type: Array, default: null \}/)
  assert.match(crud, /: meta\.value\.fields\.filter\(f => f\.inList\)\)/, '没传 listColumns 还是后端登记的顺序')
  assert.match(crud, /v-if="!props\.expandImages\.includes\(f\.name\) \|\| imageList\(scope\.row\[f\.name\]\)\.length"/, '没开的字段没图也照旧显示占位，开了的没图不显示，纯文字评论不能看着像有图')
  assert.match(crud, /reactive\(\{ pageNum: 1, pageSize: 10, \.\.\.props\.defaultQuery \}\)/)
  assert.match(crud, /props\.expandImages\.includes\(f\.name\) && form\[f\.name\]/)
  assert.match(crud, /<image-preview v-else-if="\(f\.type === 'image' \|\| f\.type === 'images'\) && form\[f\.name\]"/, '没开的图片字段还是原来的单张预览')
})

test('ExtCrud：重置回到默认筛选，最后一页审完退回有内容的页', () => {
  const crud = read(CRUD)
  assert.match(crud, /Object\.keys\(ranges\)\.forEach\(k => \{ ranges\[k\] = null \}\)\s*Object\.assign\(query, props\.defaultQuery\)\s*handleQuery\(\)/)
  assert.match(crud, /const lastPage = Math\.ceil\(total\.value \/ query\.pageSize\)/)
  // 只往回退，后端万一在有效页返回空列表也不会一直重拉
  assert.match(crud, /!rows\.value\.length && lastPage >= 1 && lastPage < query\.pageNum/)
})
