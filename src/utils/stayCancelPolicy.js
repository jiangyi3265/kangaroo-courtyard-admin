export const defaultStayPolicy = () => ({ version: 1, freeDays: 7, lateMode: 'first_night', latePercent: 0 })
export function readStayPolicy(value) {
  if (value == null || value === '') return null
  return typeof value === 'string' ? JSON.parse(value) : value
}
export function stayPolicyError(value) {
  if (value == null || value === '') return ''
  try {
    const p = readStayPolicy(value)
    if (!p || p.version !== 1 || !Number.isInteger(p.freeDays) || p.freeDays < 0 || p.freeDays > 180) return '免费取消提前天数需为 0～180 的整数'
    if (!['first_night', 'percent', 'nonrefundable'].includes(p.lateMode)) return '请选择超时后的扣费方式'
    if (!Number.isInteger(p.latePercent) || p.latePercent < 0 || p.latePercent > 100) return '扣费比例需为 0～100 的整数'
    return ''
  } catch { return '取消退款规则格式有误，请重新设置' }
}
export function stayPolicyPreview(value) {
  if (stayPolicyError(value)) return '请完善上面的规则后查看预览'
  const p = readStayPolicy(value)
  if (!p) return '使用上方选择的取消政策'
  const deduction = p.lateMode === 'first_night' ? '扣首晚房费' : p.lateMode === 'nonrefundable' ? '不可退款' : p.latePercent === 0 ? '全额退款' : `扣${p.latePercent}%房费`
  return (p.freeDays === 0 ? '入住前可免费取消' : `入住前${p.freeDays}天可免费取消，之后${deduction}`) + '；入住时刻及之后不可退款。'
}
