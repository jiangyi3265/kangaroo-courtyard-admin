// Pure form-contract regression; no browser, backend or database.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse } from '@vue/compiler-sfc'
import AsyncValidator from 'async-validator'

const source = readFileSync(new URL('../src/views/system/user/index.vue', import.meta.url), 'utf8')
const { descriptor, errors } = parse(source)
assert.deepEqual(errors, [])
const field = descriptor.template.content.match(/<el-input\b[^>]*v-model="form\.userName"[^>]*>/)?.[0]
assert.ok(field, 'Create-user input must exist')
const ruleText = descriptor.scriptSetup.content.match(/userName:\s*(\[\{ required:[^\n]+\]),\s*\n\s*nickName:/)?.[1]
assert.ok(ruleText, 'Validate actual username rules from the user form')
const rules = new Function('return (' + ruleText + ')')()
const Schema = AsyncValidator.default || AsyncValidator
const schema = new Schema({ userName: rules })

test('username input maxlength agrees with the actual 2–20 login-compatible form rules', () => {
  const maximum = Number(field.match(/maxlength="(\d+)"/)?.[1])
  const range = rules.find(rule => rule.max !== undefined)
  assert.equal(range.min, 2)
  assert.equal(range.max, 20)
  assert.equal(maximum, range.max)
})

test('actual form validator accepts 2/20 and rejects blank/1/21 characters', async () => {
  for (const name of ['ab', 'abcdefghijklmnopqrst']) await schema.validate({ userName: name })
  for (const name of ['', 'a', 'abcdefghijklmnopqrstu']) {
    await assert.rejects(() => schema.validate({ userName: name }))
  }
})
