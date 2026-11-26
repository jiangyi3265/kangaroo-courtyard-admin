// 客服聊天里的时间显示：今天只显示时:分，今年显示月-日 时:分，更早显示年-月-日
function pad(n) {
  return String(n).padStart(2, '0')
}

export function shortTime(value, now = new Date()) {
  const s = String(value || '')
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/)
  if (!m) return s
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  if (`${m[1]}-${m[2]}-${m[3]}` === today) return `${m[4]}:${m[5]}`
  if (Number(m[1]) === now.getFullYear()) return `${m[2]}-${m[3]} ${m[4]}:${m[5]}`
  return `${m[1]}-${m[2]}-${m[3]}`
}

/** 现在的时间，格式和服务器一致：yyyy-MM-dd HH:mm:ss */
export function nowText(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}
