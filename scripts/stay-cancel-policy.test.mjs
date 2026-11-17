import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'
import { defaultStayPolicy, stayPolicyError, stayPolicyPreview } from '../src/utils/stayCancelPolicy.js'
test('blank policy preserves preset and default mirrors existing moderate policy', () => {
  assert.equal(stayPolicyError(null), '')
  assert.match(stayPolicyPreview(null), /上方选择/)
  assert.match(stayPolicyPreview(defaultStayPolicy()), /入住前7天可免费取消，之后扣首晚房费/)
})
test('invalid rules are blocked before saving', () => {
  for (const p of ['bad', {}, { ...defaultStayPolicy(), freeDays: null }, { ...defaultStayPolicy(), freeDays: 1.5 }, { ...defaultStayPolicy(), freeDays: -1 }, { ...defaultStayPolicy(), freeDays: 181 }, { ...defaultStayPolicy(), latePercent: 101 }, { ...defaultStayPolicy(), lateMode: 'other' }]) assert.ok(stayPolicyError(p))
})
test('preview covers all supported cancellation choices', () => {
  assert.match(stayPolicyPreview({ ...defaultStayPolicy(), freeDays: 0 }), /^入住前可免费取消/)
  assert.match(stayPolicyPreview({ ...defaultStayPolicy(), freeDays: 3, lateMode: 'percent', latePercent: 25 }), /入住前3天可免费取消，之后扣25%房费/)
  assert.match(stayPolicyPreview({ ...defaultStayPolicy(), lateMode: 'nonrefundable' }), /之后不可退款/)
})
test('policy editor and actual admin dialog compile', () => {
  for (const file of ['src/views/kangaroo/ext/stay/StayCancelPolicyEditor.vue', 'src/views/kangaroo/ext/ExtCrud.vue']) {
    const { descriptor } = parse(readFileSync(new URL('../' + file, import.meta.url), 'utf8'))
    const script = compileScript(descriptor, { id: 'stay-policy' })
    const compiled = compileTemplate({ source: descriptor.template.content, filename: file, id: 'stay-policy', compilerOptions: { bindingMetadata: script.bindings } })
    assert.deepEqual(compiled.errors, [])
  }
})
