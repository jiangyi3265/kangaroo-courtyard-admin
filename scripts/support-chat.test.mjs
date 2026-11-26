// 客服工作台（2026-11-24）：纯逻辑 + 页面接线检查
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  canRetry, displayName, imageProblem, lastServerId, mergeMessages, orderMessages, pendingIsStale, pollCursor, prependMessages, searchParams, wechatReplyState, IMAGE_MAX_BYTES
} from '../src/components/SupportChat/chat-state.js'
import { nowText, shortTime } from '../src/components/SupportChat/time.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('时间：今天只显示时分，今年显示月日，更早显示年月日', () => {
  const now = new Date(2026, 10, 24, 15, 0, 0)
  assert.equal(shortTime('2026-11-24 09:05:33', now), '09:05')
  assert.equal(shortTime('2026-11-24T09:05:33', now), '09:05')
  assert.equal(shortTime('2026-03-02 18:40:00', now), '03-02 18:40')
  assert.equal(shortTime('2025-12-31 23:59:00', now), '2025-12-31')
  assert.equal(shortTime('', now), '')
  assert.equal(shortTime(null, now), '')
  assert.equal(shortTime('乱写的', now), '乱写的')
  assert.equal(nowText(new Date(2026, 0, 2, 3, 4, 5)), '2026-01-02 03:04:05')
})

test('搜索框：纯数字按用户ID，其他按关键词，空的不传', () => {
  assert.deepEqual(searchParams(' 123 '), { appUserId: '123' })
  assert.deepEqual(searchParams('退款'), { keyword: '退款' })
  assert.deepEqual(searchParams('12a'), { keyword: '12a' })
  assert.deepEqual(searchParams(''), {})
  assert.deepEqual(searchParams(null), {})
  assert.deepEqual(searchParams('1234567890123456789'), { keyword: '1234567890123456789' })
})

test('轮询只要比已有服务器消息更新的，本地发送中的不算', () => {
  assert.equal(lastServerId([]), 0)
  assert.equal(lastServerId([{ id: 3 }, { id: 10 }, { id: 'local-1', local: true }, { id: 7 }]), 10)
  assert.equal(lastServerId([{ id: 99, local: true }, { id: 5 }]), 5)
  assert.equal(lastServerId(null), 0)
})

test('合并新消息：按编号去重，同 clientId 的本地消息被服务器消息替换', () => {
  const local = { id: 'local-1', clientId: 'c1', local: true, sendStatus: 'pending', text: '好的' }
  const current = [{ id: 1, text: 'a' }, local]
  const merged = mergeMessages(current, [{ id: 1, text: 'a' }, { id: 2, text: 'b' }, { id: 3, clientId: 'c1', text: '好的', sendStatus: 'ok' }])
  assert.deepEqual(merged.map(m => m.id), [1, 2, 3], '按编号排好顺序')
  assert.ok(merged.some(m => m.id === 3 && !m.local))
  assert.ok(!merged.some(m => m.local))
  assert.equal(current.length, 2, '不改入参')
  // 同一批里重复的也只留一条
  assert.equal(mergeMessages([], [{ id: 5 }, { id: 5 }]).length, 1)
  // 已有的消息状态变了（发送中 → 成功）用新的替换
  const updated = mergeMessages([{ id: 7, sendStatus: 'pending' }], [{ id: 7, sendStatus: 'ok' }])
  assert.equal(updated.length, 1)
  assert.equal(updated[0].sendStatus, 'ok')
})

test('自己发的消息：自动刷新先拿到「发送中」也只显示一条，图片文件留着', () => {
  const file = { name: 'a.png' }
  const local = { id: 'local-1', clientId: 'cA', local: true, kind: 'image', file, localSrc: 'blob:x', sendStatus: 'pending' }
  const polled = mergeMessages([{ id: 5 }, local], [{ id: 9, clientId: 'cA', kind: 'image', sendStatus: 'pending' }])
  assert.equal(polled.length, 2)
  assert.equal(polled[1].id, 9)
  assert.equal(polled[1].file, file, '保留本地文件，失败时还能重发')
  assert.equal(polled[1].localSrc, 'blob:x')
  const done = mergeMessages(polled, [{ id: 9, clientId: 'cA', kind: 'image', sendStatus: 'ok' }])
  assert.equal(done.length, 2)
  assert.equal(done[1].sendStatus, 'ok')
  // 点过重发的旧失败消息，刷新时不再显示回来
  assert.equal(mergeMessages([{ id: 5 }], [{ id: 6, clientId: 'old', sendStatus: 'failed' }], new Set(['old'])).length, 1)
})

test('重发：只限微信会话里失败、还有内容的消息', () => {
  const wx = { type: 'wechat' }
  assert.equal(canRetry(wx, { sendStatus: 'failed', clientId: 'c', kind: 'text', text: 'hi' }), true)
  assert.equal(canRetry(wx, { sendStatus: 'failed', clientId: 'c', kind: 'image' }), false, '图片没留本地文件不能重发')
  assert.equal(canRetry(wx, { sendStatus: 'failed', clientId: 'c', kind: 'image', file: {} }), true)
  assert.equal(canRetry(wx, { sendStatus: 'ok', clientId: 'c', kind: 'text', text: 'hi' }), false)
  assert.equal(canRetry(wx, { sendStatus: 'failed', kind: 'text', text: 'hi' }), false, '别人发的（没有 clientId）不能替他重发')
  assert.equal(canRetry({ type: 'ticket' }, { sendStatus: 'failed', clientId: 'c', kind: 'text', text: 'hi' }), false)
})

test('轮询游标：按上次读到的位置取，自己发送的回包不推进；还在发送中的回头再看一次', () => {
  const now = new Date(2026, 10, 24, 12, 0, 0).getTime()
  const t = '2026-11-24 11:58:00'
  // 读到 100；客服刚发出的 102 是发送回包放进来的 → 仍从 100 往后取，客户的 101 不会漏
  assert.equal(pollCursor([{ id: 100, time: t }, { id: 102, time: t, clientId: 'c' }], 100, now), 100)
  // 已读到的里面有还在发送中的 → 从它前面取
  assert.equal(pollCursor([{ id: 3, time: t }, { id: 8, time: t, sendStatus: 'pending' }, { id: 9, time: t }], 9, now), 7)
  // 发送中超过 10 分钟的不再等
  assert.equal(pollCursor([{ id: 8, time: '2026-11-24 11:40:00', sendStatus: 'pending' }, { id: 9, time: t }], 9, now), 9)
  // 本地还没发完的不影响
  assert.equal(pollCursor([{ id: 9, time: t }, { id: 'local-x', local: true, sendStatus: 'pending' }], 9, now), 9)
  assert.equal(pollCursor([], 0, now), 0)
  assert.equal(pollCursor([{ id: 4 }, { id: 6 }]), 6, '不传位置时用已有的最大编号')
})

test('发送中超过 10 分钟算「待核实」', () => {
  const now = new Date(2026, 10, 24, 12, 0, 0).getTime()
  assert.equal(pendingIsStale({ sendStatus: 'pending', time: '2026-11-24 11:49:00' }, now), true)
  assert.equal(pendingIsStale({ sendStatus: 'pending', time: '2026-11-24 11:55:00' }, now), false)
  assert.equal(pendingIsStale({ sendStatus: 'ok', time: '2026-11-24 10:00:00' }, now), false)
  assert.equal(pendingIsStale({ sendStatus: 'pending', local: true, time: '2026-11-24 10:00:00' }, now), false)
})

test('排顺序：服务器消息按编号，没发出去的放最后', () => {
  const out = orderMessages([{ id: 'local-a', local: true }, { id: 9 }, { id: 4 }])
  assert.deepEqual(out.map(m => m.id), [4, 9, 'local-a'])
  // 编号不是数字（工单的虚拟消息）就保持原顺序
  assert.deepEqual(orderMessages([{ id: 't-b' }, { id: 't-a' }]).map(m => m.id), ['t-b', 't-a'])
})

test('往前翻页：更早的放前面并去重', () => {
  const out = prependMessages([{ id: 5 }, { id: 6 }], [{ id: 3 }, { id: 4 }, { id: 5 }])
  assert.deepEqual(out.map(m => m.id), [3, 4, 5, 6])
})

test('显示名：昵称 > 用户ID > 未关联', () => {
  assert.equal(displayName({ nickname: '小明', appUserId: 1 }), '小明')
  assert.equal(displayName({ appUserId: 12 }), '用户 12')
  assert.equal(displayName({ type: 'wechat' }), '未关联账号的微信用户')
  assert.equal(displayName(null), '')
})

test('微信回复窗口：把服务器给的状态说成人话', () => {
  const closed = wechatReplyState({ type: 'wechat', canReply: false })
  assert.equal(closed.canReply, false)
  assert.match(closed.text, /48 小时/)
  assert.equal(wechatReplyState({ type: 'wechat', canReply: false, replyHint: '自定义' }).text, '自定义')
  const open = wechatReplyState({ type: 'wechat', canReply: true, replyRemaining: 4, replyDeadline: '2020-01-02 10:00:00' })
  assert.equal(open.canReply, true)
  assert.match(open.text, /还能回复 4 条/)
  assert.match(open.text, /2020-01-02 前有效/)
  assert.equal(wechatReplyState({ type: 'ticket' }).canReply, false)
})

test('图片：只收常见格式、10MB 以内', () => {
  assert.equal(imageProblem({ type: 'image/png', size: 100 }), '')
  assert.equal(imageProblem({ type: 'image/webp', size: IMAGE_MAX_BYTES }), '')
  assert.match(imageProblem({ type: 'image/png', size: IMAGE_MAX_BYTES + 1 }), /10MB/)
  assert.match(imageProblem({ type: 'image/svg+xml', size: 10 }), /只能发/)
  assert.match(imageProblem({ type: 'application/pdf', size: 10 }), /只能发/)
  assert.match(imageProblem(null), /没有选到/)
})

test('接口：路径和后端约定一致，发送不被「重复提交」拦住，图片按受保护方式下载', () => {
  const api = read('src/api/kangaroo/support.js')
  assert.match(api, /const BASE = '\/kangaroo\/usersvc\/support'/)
  for (const path of [
    "BASE + '/conversations'",
    '${BASE}/conversations/${type}/${id}',
    '${BASE}/wechat/${convId}/text',
    '${BASE}/wechat/${convId}/image',
    '${BASE}/wechat/${convId}/status',
    '/kangaroo/usersvc/ticket/${ticketId}/reply',
    "BASE + '/ai/users'",
    '${BASE}/ai/users/${appUserId}/messages'
  ]) assert.ok(api.includes(path), path)
  assert.match(api, /repeatSubmit:\s*false/)
  assert.match(api, /'Content-Type': 'multipart\/form-data'/, '发图要盖掉全局的 JSON 请求头，否则图片内容会被丢掉')
  assert.match(api, /responseType:\s*'blob'/)
  assert.match(api, /reason:\s*reply/, '工单回复沿用原来的 reason 字段')
})

test('页面接线：原来的表格视图都还在，组件名不变（标签页缓存靠它）', () => {
  const ticket = read('src/views/kangaroo/ext/ticket/index.vue')
  assert.match(ticket, /<ext-crud entity="ticket" \/>/)
  assert.match(ticket, /name="KgExtTicket"/)
  assert.match(ticket, /<conversation-list/)
  assert.match(ticket, /<chat-panel/)
  assert.match(ticket, /onDeactivated\(\(\) => \{\s*pageActive = false\s*stop\(\)/, '切到别的页面要停掉定时刷新')
  assert.match(ticket, /document\.hidden \|\| !pageActive/, '页面在缓存里时，浏览器标签页切回来也不能替客服读消息')
  assert.match(ticket, /kangaroo:ticket:query/, '没有查询权限不让点开详情')
  assert.match(ticket, /@filter="active = null"/, '改了筛选要关掉旧会话，免得发错人')
  assert.match(ticket, /document\.hidden/)
  const ai = read('src/views/kangaroo/ext/supportchat/index.vue')
  assert.match(ai, /<ext-crud entity="supportchat" \/>/)
  assert.match(ai, /name="KgExtSupportChat"/)
  assert.match(ai, /<ai-transcript/)
  assert.match(ai, /' 23:59:59'/, '结束日期整天都算')
  assert.match(ai, /p\.role = role\.value/, '能按谁说的筛')
  assert.match(ai, /_: String\(Date\.now\(\)\)/, '跳转带记号，工作台只处理一次')
  assert.doesNotMatch(ai, /method:\s*'delete'|\bdel[A-Z]\w*\(|删除记录/, 'AI 聊天记录只读')
})

test('聊天窗口：权限、回复限制、图片入口、输入法回车都处理了', () => {
  const chat = read('src/views/kangaroo/ext/ticket/ChatPanel.vue')
  assert.match(chat, /kangaroo:ticket:audit/)
  assert.match(chat, /kangaroo:supportchat:query/)
  assert.match(chat, /isComposing/, '中文输入法选字时按回车不能直接发出去')
  assert.match(chat, /@paste="onPaste"/)
  assert.match(chat, /@drop\.prevent="onDrop"/)
  assert.match(chat, /客服小助手/, '要告诉客服：在小助手里回的这里看不到')
  assert.match(chat, /会更新工单里的回复，并给用户再发一条通知/, '工单只有一条回复、但每次都会通知，要说清楚')
  assert.match(chat, /:maxlength="conv\.type === 'ticket' \? 1000/)
  assert.doesNotMatch(chat, /setInterval/, '定时刷新统一由外层页面管')
  const bubble = read('src/components/SupportChat/MessageBubble.vue')
  assert.doesNotMatch(bubble, /v-html/, '用户发的内容不能当网页代码显示')
  const img = read('src/components/SupportChat/AuthImage.vue')
  assert.match(img, /revokeObjectURL/)
})
