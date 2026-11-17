export function readStayNotice(value) {
  if (value == null || value === '') return null
  return typeof value === 'string' ? JSON.parse(value) : value
}
export function stayNoticeError(value) {
  if (value == null || value === '') return ''
  try {
    const p = readStayNotice(value)
    if (!p || p.version !== 1 || Object.keys(p).sort().join(',') !== 'content,title,version') return '预订须知格式有误，请重新设置'
    if (typeof p.title !== 'string' || !p.title.trim() || p.title.trim().length > 80 || /[\r\n]/.test(p.title.trim())) return '请填写1～80字的标题，标题不能换行'
    if (typeof p.content !== 'string' || !p.content.trim() || p.content.replace(/\r\n?/g, '\n').trim().length > 6000) return '请填写1～6000字的正文'
    if (/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(p.title + p.content)) return '须知不能包含不可见控制字符'
    return ''
  } catch { return '预订须知格式有误，请重新设置' }
}
