// 客服工作台的纯逻辑（不 import vue / @/，可直接被 node --test 加载）
import { shortTime } from './time.js'

export const STATUS_LABELS = { open: '待处理', replied: '已回复', closed: '已关闭' }
export const TYPE_LABELS = { wechat: '微信客服', ticket: '转人工工单' }

/** 搜索框：纯数字当用户ID，其余当关键词 */
export function searchParams(text) {
  const s = String(text || '').trim()
  if (!s) return {}
  return /^\d{1,18}$/.test(s) ? { appUserId: s } : { keyword: s }
}

/** 服务器消息里最大的数字编号（轮询时只要比它新的） */
export function lastServerId(messages) {
  let max = 0
  for (const m of messages || []) {
    const id = Number(m && m.id)
    if (Number.isFinite(id) && id > max && !(m && m.local)) max = id
  }
  return max
}

/** 「发送中」超过 10 分钟还没结果，就不再等了，改成提示人工核实 */
export const PENDING_STALE_MS = 10 * 60 * 1000
export function pendingIsStale(m, now = Date.now()) {
  if (!m || m.local || m.sendStatus !== 'pending') return false
  const t = parseTime(m.time)
  return t > 0 && now - t > PENDING_STALE_MS
}

function parseTime(value) {
  const s = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):?(\d{2})?/)
  if (!s) return 0
  return new Date(+s[1], +s[2] - 1, +s[3], +s[4], +s[5], +(s[6] || 0)).getTime()
}

/**
 * 轮询游标。seen = 上次从「读消息」接口拿到的最大编号（自己发送的回包不算，
 * 否则客户在两次刷新之间发的消息会被跳过）。
 * 已拿到的消息里有服务器标着「发送中」、还没超过 10 分钟的，就从它前面开始取，好拿到它的最终结果。
 */
export function pollCursor(messages, seen, now = Date.now()) {
  const max = seen == null ? lastServerId(messages) : Number(seen) || 0
  const waiting = (messages || [])
    .filter(m => m && !m.local && m.sendStatus === 'pending' && Number(m.id) <= max && !pendingIsStale(m, now))
    .map(m => Number(m.id))
    .filter(Number.isFinite)
  return waiting.length ? Math.min(max, Math.min(...waiting) - 1) : max
}

/**
 * 排顺序：服务器消息按编号从旧到新（编号是数字时），本地还没发成功的放最后。
 * 返回新数组，不改入参。
 */
export function orderMessages(list) {
  const server = (list || []).filter(m => m && !m.local)
  const locals = (list || []).filter(m => m && m.local)
  if (server.every(m => Number.isFinite(Number(m.id)))) {
    server.sort((a, b) => Number(a.id) - Number(b.id))
  }
  return [...server, ...locals]
}

/**
 * 把服务器返回的消息合进当前列表，返回新数组，不改入参：
 * - 同一次发送（clientId 相同）认成同一条：用服务器的替换，保留本地的图片文件和预览（重发、显示要用）；
 * - 同编号的用新的替换（发送状态可能从「发送中」变成功/失败）；
 * - ignore 里的 clientId（已经点了重发的旧失败消息）不再显示。
 */
export function mergeMessages(current, incoming, ignore) {
  const list = [...(current || [])]
  for (const m of incoming || []) {
    if (!m) continue
    if (m.clientId && ignore && ignore.has(m.clientId)) continue
    let idx = m.clientId ? list.findIndex(x => x.clientId === m.clientId) : -1
    if (idx < 0) idx = list.findIndex(x => !x.local && String(x.id) === String(m.id))
    if (idx >= 0) {
      const old = list[idx]
      list.splice(idx, 1, old.file || old.localSrc ? { ...m, file: old.file, localSrc: old.localSrc } : m)
    } else {
      list.push(m)
    }
  }
  return orderMessages(list)
}

/** 失败的消息能不能「重发」：只限微信会话；文字要有内容，图片要还留着本地文件 */
export function canRetry(conv, m) {
  if (!conv || conv.type !== 'wechat' || !m || m.sendStatus !== 'failed' || !m.clientId) return false
  return m.kind === 'image' ? !!m.file : !!m.text
}

/** 往前翻页拿到的更早消息放到最前面（去重） */
export function prependMessages(current, older) {
  const seen = new Set((current || []).map(m => String(m.id)))
  return [...(older || []).filter(m => m && !seen.has(String(m.id))), ...(current || [])]
}

/** 会话显示名：昵称 > 用户ID > 未关联 */
export function displayName(conv) {
  if (!conv) return ''
  if (conv.nickname) return conv.nickname
  if (conv.appUserId) return '用户 ' + conv.appUserId
  return conv.type === 'wechat' ? '未关联账号的微信用户' : '用户'
}

/** 微信会话还能不能回、还能回几条（以服务器给的为准，只负责把话说清楚） */
export function wechatReplyState(conv) {
  if (!conv || conv.type !== 'wechat') return { canReply: false, text: '' }
  if (conv.canReply === false) {
    return { canReply: false, text: conv.replyHint || '用户 48 小时内没发消息，微信不允许主动回复，等用户再发消息后才能回。' }
  }
  const parts = []
  if (conv.replyRemaining != null) parts.push(`还能回复 ${conv.replyRemaining} 条`)
  if (conv.replyDeadline) parts.push(`${shortTime(conv.replyDeadline)} 前有效`)
  const tail = '用户每发一条消息会重新计算。'
  return { canReply: true, text: parts.length ? parts.join('，') + '（微信规定）。' + tail : (conv.replyHint || '') }
}

/** 图片检查：只收常见图片、10MB 以内 */
export const IMAGE_MAX_BYTES = 10 * 1024 * 1024
export function imageProblem(file) {
  if (!file) return '没有选到图片'
  if (!/^image\/(jpeg|png|gif|webp)$/i.test(file.type || '')) return '只能发 JPG、PNG、GIF、WEBP 图片'
  if (file.size > IMAGE_MAX_BYTES) return '图片不能超过 10MB'
  return ''
}
