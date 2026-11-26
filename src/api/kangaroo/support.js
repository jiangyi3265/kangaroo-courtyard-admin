import request from '@/utils/request'

// 客服工作台：微信客服会话 + AI 聊天「转人工」工单（接口约定见 .dev/support-chat-20261124/方案定稿.md 第 2.2 节）
const BASE = '/kangaroo/usersvc/support'

/** 会话列表：type=all|wechat|ticket，status=all|open|replied|closed，keyword、appUserId、pageNum、pageSize */
export function listConversations(params) {
  return request({ url: BASE + '/conversations', method: 'get', params })
}

/** 会话详情 + 消息：before=往前翻，after=只取新消息（轮询用） */
export function getConversation(type, id, params) {
  return request({ url: `${BASE}/conversations/${type}/${id}`, method: 'get', params })
}

/** 微信会话发文字 */
export function sendWechatText(convId, text, clientId) {
  return request({
    url: `${BASE}/wechat/${convId}/text`,
    method: 'post',
    data: { text, clientId },
    headers: { repeatSubmit: false }
  })
}

/** 微信会话发图片（≤10MB），服务器压缩后再发给用户 */
export function sendWechatImage(convId, file, clientId) {
  const form = new FormData()
  form.append('file', file)
  if (clientId) form.append('clientId', clientId)
  return request({
    url: `${BASE}/wechat/${convId}/image`,
    method: 'post',
    data: form,
    timeout: 60000,
    // 全局默认是 JSON，不盖掉的话 axios 会把 FormData 转成 JSON、图片内容丢失；写 multipart 后浏览器会自己补上分隔符
    headers: { 'Content-Type': 'multipart/form-data', repeatSubmit: false }
  })
}

/** 关闭 / 重新打开微信会话：status=closed|open */
export function setWechatStatus(convId, status) {
  return request({ url: `${BASE}/wechat/${convId}/status`, method: 'put', data: { status } })
}

/** 取微信会话里的图片（要带登录凭证，返回 Blob） */
export function getSupportImage(url) {
  return request({ url, method: 'get', responseType: 'blob', timeout: 30000 })
}

/** 转人工工单回复（老接口，只能发文字，会发到用户的消息中心） */
export function replyTicket(ticketId, reply) {
  return request({ url: `/kangaroo/usersvc/ticket/${ticketId}/reply`, method: 'put', data: { reason: reply } })
}

/** AI 客服记录：按用户列出 */
export function listAiUsers(params) {
  return request({ url: BASE + '/ai/users', method: 'get', params })
}

/** AI 客服记录：某个用户的整段对话，before=往前翻 */
export function getAiMessages(appUserId, params) {
  return request({ url: `${BASE}/ai/users/${appUserId}/messages`, method: 'get', params })
}
