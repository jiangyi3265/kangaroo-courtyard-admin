import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'

const guard = readFileSync(new URL('../src/permission.js', import.meta.url), 'utf8')
const initialize = guard.match(/^async function initializeRoutes\(\) \{[\s\S]*?^\}/m)[0]

function harness(menu, prompt) {
  const added = [], loginPrompt = { show: false }
  const user = {
    getInfo: async () => {},
    logOut: async () => { throw new Error('offline') },
    clearSession() { this.cleared = true }
  }
  const run = runInNewContext(initialize + '\ninitializeRoutes', {
    useUserStore: () => user, usePermissionStore: () => ({ generateRoutes: menu }),
    ElMessageBox: { confirm: prompt }, isRelogin: loginPrompt,
    router: { addRoute: route => added.push(route.path) }, isHttp: () => false
  })
  return { run, user, added, loginPrompt }
}

test('retrying a failed menu request installs the routes once and keeps the session', async () => {
  let calls = 0, retries = 0
  const app = harness(async () => {
    if (++calls === 1) throw new Error('network unavailable')
    return [{ path: '/stores' }]
  }, async () => { retries++ })
  assert.equal(await app.run(), true)
  assert.equal(retries, 1)
  assert.deepEqual(app.added, ['/stores'])
  assert.equal(app.user.cleared, undefined)
  assert.equal(app.loginPrompt.show, false)
})

test('choosing the login page also clears the local session if logout is offline', async () => {
  const app = harness(async () => { throw new Error('network unavailable') }, async () => { throw 'cancel' })
  assert.equal(await app.run(), false)
  assert.equal(app.user.cleared, true)
  assert.equal(app.loginPrompt.show, false)
  assert.deepEqual(app.added, [])
})
