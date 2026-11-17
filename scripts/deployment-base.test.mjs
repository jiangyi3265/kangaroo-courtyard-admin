import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveConfig } from 'vite'

test('production admin defaults to its deployed URL prefix', async () => {
  const config = await resolveConfig({ mode: 'production' }, 'build')
  assert.equal(config.base, '/admin/')
})

test('rejects Git Bash path rewriting before writing a production bundle', async () => {
  await assert.rejects(resolveConfig({ mode: 'production', base: '/Git/admin/' }, 'build'), /生产部署路径必须是/)
})
