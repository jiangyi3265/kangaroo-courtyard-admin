export const insuranceStatus = {
  pending_payment: '待缴费', pending: '待登记保单', effective: '已出单',
  refunding: '退费处理中', refunded: '已退费', rejected: '已驳回', closed: '已关闭'
}
export const refundStatus = { pending: '待审核', processing: '渠道处理中', success: '已到账', rejected: '未通过', failed: '退费未完成', closed: '渠道已关闭，可重新申请' }
export function refundLabel(row, policyNo = row.policyNo) {
  if (row.hqDeparture && row.status === 'pending') return '待总部核实离店日期并办理'
  if (row.verifiedDepartureDate) {
    if (row.status === 'rejected') return '可退为零，已结案'
    if (row.status === 'pending' && row.amountFen != null && Number(row.amountFen) === 0) return '可退为零，待城市负责人确认'
  }
  if (row.status === 'pending' && policyNo)
    return row.verifiedDepartureDate ? '待城市负责人办理退款' : row.departureDate ? '待换工主理人或城市负责人核实离店日期' : '待店家补充离店日期'
  return refundStatus[row.status] || row.status
}
export const destinationLabel = value => value === 'balance' ? '预存保险余额' : value === 'original' ? '原路退回' : '未记录'
export const money = fen => fen != null && fen !== '' && Number.isSafeInteger(Number(fen)) ? (Number(fen) / 100).toFixed(2) : '—'
export const amountToFen = value => {
  const text = String(value ?? '').trim()
  if (!/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(text)) return null
  const [whole, fraction = ''] = text.split('.')
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
}
export const validPolicyDates = (start, end) => {
  const valid = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false
    const d = new Date(`${value}T00:00:00Z`)
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value
  }
  return valid(start) && valid(end) && start <= end
}
