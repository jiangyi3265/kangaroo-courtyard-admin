/**
 * 后台「角色切换」页的显示规则。不依赖 Vue 和接口，scripts/merchant-request-admin.test.mjs 直接测。
 */
import { STAFF_ROLE_LABELS } from './staffRoles.js'

// 要手动输入的确认字，和后端 KgRoleSwitchService 校验的一致
export const CONFIRM_WORDS = { switch: '切换', rollback: '退回', routing: '打开派单' }

/** 输入框里是不是正好这几个字（前后多打的空格不算错） */
export function confirmMatches(input, word) {
  return String(input == null ? '' : input).trim() === word
}

const CLIENT_TAG = { new: 'success', old: 'warning', never: 'info' }
const CHANNEL_TEXT = { release: '正式版', trial: '体验版', develop: '开发版', none: '老版本' }

/** 这个人的小程序版本：标签颜色和文字 */
export function clientTag(client) {
  const status = client && client.status
  return { type: CLIENT_TAG[status] || 'info', text: (client && client.statusText) || '没打开过' }
}

/** 标签下面那行小字：哪个渠道、什么版本。老版本不带版本号，只写「老版本」 */
export function clientVersionText(client) {
  if (!client || !client.channel) return ''
  const channel = CHANNEL_TEXT[client.channel] || client.channel
  if (client.channel === 'none') return channel
  return client.version ? channel + ' ' + client.version : channel
}

/** 提醒分两类：红的要老板看一眼（不拦切换），其余是知会。数量是 0 的不显示 */
export function splitWarnings(warnings) {
  const shown = (warnings || []).filter(w => Number(w.count) > 0)
  return { red: shown.filter(w => w.level === 'red'), info: shown.filter(w => w.level !== 'red') }
}

/**
 * 打开派单前写明每个城市几个人收到：人多的城市排前面，没填城市的单独写出来。
 * 按账号去重，不用接口的 routingAudience：那是授权条数，同一个人在同城管两家店会算两个；一条招募他只收一次。
 * total 是一共多少人，跨城的人也只算一个。
 */
export function routingAudience(people) {
  const byCity = new Map()
  const everyone = new Set()
  ;(people || []).forEach(person => {
    const city = person.city || '门店没填城市'
    if (!byCity.has(city)) byCity.set(city, new Set())
    byCity.get(city).add(person.appUserId)
    everyone.add(person.appUserId)
  })
  const rows = [...byCity].map(([city, users]) => ({ city, count: users.size }))
    .sort((a, b) => b.count - a.count || a.city.localeCompare(b.city, 'zh'))
  return { rows, total: everyone.size }
}

/** 派单开关：off、on 说人话，别的值（有人手改了参数）原样显示 */
export function routingText(routing) {
  const value = String(routing == null ? '' : routing).trim().toLowerCase()
  if (value === 'off') return '关着'
  if (value === 'on') return '开着'
  return value ? '「' + routing + '」' : '没有这个参数'
}

/** 操作失败时写在页面上的话。服务器回了话就原样显示；没回话是不知道成没成，不能说失败 */
export function actionFailureText(err) {
  if (err && err.answered) return err.message
  return '没有收到服务器的回复，不确定刚才的操作有没有成功。页面已重新读取，请以上面的「现在的阶段」为准，不要连着再点。'
}

/** 退回时列出来的角色：显示中文，认不出来的原样显示 */
export function roleText(code) {
  return STAFF_ROLE_LABELS[code] || code || '（空）'
}

/**
 * 退回之前要老板看的行：退回后是老主理人的标红放前面（attention），其余的一句话带过。
 * 接口在不能退回时给 null（比如已经打开过派单）。
 */
export function rollbackPlanRows(plan) {
  const rows = [...((plan && plan.converted) || []), ...((plan && plan.skipped) || [])]
  return { attention: rows.filter(row => row.attention), others: rows.filter(row => !row.attention) }
}

/** 没标红的那些行：授权编号，以及它退回时会怎样 */
export function planRowText(row) {
  const what = row.afterRole ? roleText(row.currentRole) + ' 倒成 ' + roleText(row.afterRole) : roleText(row.currentRole) + ' 不动'
  return '授权编号 ' + row.grantId + ' ' + what
}
