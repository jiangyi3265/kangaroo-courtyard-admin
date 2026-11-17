import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'
import { readStayNotice, stayNoticeError } from '../src/utils/stayBookingNotice.js'
const config = (title = '测试小院预订须知', content = '1. 请带好身份证。\n2. 晚到请提前联系。') => ({ version: 1, title, content })
test('empty config restores default and valid multiline content round trips unchanged', () => {
  assert.equal(readStayNotice(null), null)
  assert.equal(stayNoticeError(''), '')
  assert.equal(stayNoticeError(JSON.stringify(config())), '')
  assert.deepEqual(readStayNotice(JSON.stringify(config())), config())
})
test('blank, malformed and excessive fields fail validation', () => {
  for (const value of ['bad', 'null', '{}', config('', '正文'), config('标题', '\n '), config('多\n行', '正文'), config('x'.repeat(81)), config('标题', '文'.repeat(6001)), { ...config(), version: 2 }, { ...config(), unexpected: 'value' }, config('标题', '\x00正文')]) assert.ok(stayNoticeError(value), JSON.stringify(value).slice(0,100))
  assert.equal(stayNoticeError(config('标'.repeat(80), '文'.repeat(6000))), '')
})
test('titles and content are plain text; renderer has no raw HTML insertion', () => {
  const source = readFileSync(new URL('../src/views/kangaroo/ext/stay/StayBookingNoticeEditor.vue', import.meta.url), 'utf8')
  assert.equal(stayNoticeError(config('<b>标题</b>', '<script>文本</script>')), '')
  assert.doesNotMatch(source, /v-html/)
})
test('notice editor and the real admin dialog compile', () => {
  for (const file of ['src/views/kangaroo/ext/stay/StayBookingNoticeEditor.vue', 'src/views/kangaroo/ext/ExtCrud.vue']) {
    const { descriptor } = parse(readFileSync(new URL('../' + file, import.meta.url), 'utf8'))
    const script = compileScript(descriptor, { id: 'notice-test' })
    assert.deepEqual(compileTemplate({ source: descriptor.template.content, filename: file, id: 'notice-test', compilerOptions: { bindingMetadata: script.bindings } }).errors, [])
  }
})
