const PRICE_ERROR = '7天总价请填写7–700000元，最多两位小数'

export const ROOM_PERIOD_PRICES = [
  { key: 'halfMonthTotalFen', nights: 15, label: '半个月总价（15晚）' },
  { key: 'monthTotalFen', nights: 30, label: '一个月总价（30晚）' }
]

export function roomPeriodInputFen(value, nights) {
  const text = String(value ?? '').trim()
  if (!text) return null
  const period = ROOM_PERIOD_PRICES.find(item => item.nights === nights)
  if (!period) throw new Error('不支持的房费周期')
  const invalid = () => new Error(`${period.label}请填写${nights}–${nights * 100000}元，最多两位小数；不设置请留空`)
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw invalid()
  const [whole, decimal = ''] = text.split('.')
  const fen = Number(whole) * 100 + Number(decimal.padEnd(2, '0'))
  if (!Number.isSafeInteger(fen) || fen < nights * 100 || fen > nights * 10000000) throw invalid()
  return fen
}

export function roomPeriodPayload(data, original, values, editing) {
  const result = { ...data }
  for (const period of ROOM_PERIOD_PRICES) {
    if (!Object.hasOwn(values, period.key)) continue
    const total = roomPeriodInputFen(values[period.key], period.nights)
    const previous = original[period.key] == null ? null : Number(original[period.key])
    if (editing && total === previous) delete result[period.key]
    else result[period.key] = total
  }
  return result
}

// 老房型保留周一至周日的价格；没有周价格时才回退到原每晚价格。
export function roomWeekTotalFen(room = {}) {
  const explicit = Number(room.weekTotalFen)
  if (room.weekTotalFen != null && Number.isSafeInteger(explicit) && explicit >= 700 && explicit <= 70000000) return explicit
  const nights = String(room.weekPriceFen || '').split(',').map(value => Number(value.trim()))
  if (nights.length === 7 && nights.every(value => Number.isSafeInteger(value) && value >= 100 && value <= 10000000)) return nights.reduce((sum, value) => sum + value, 0)
  const base = Number(room.basePriceFen)
  return Number.isSafeInteger(base) && base >= 100 && base <= 10000000 ? base * 7 : null
}

export function roomWeekInputFen(value) {
  const text = String(value ?? '').trim()
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new Error(PRICE_ERROR)
  const [whole, decimal = ''] = text.split('.')
  const fen = Number(whole) * 100 + Number(decimal.padEnd(2, '0'))
  if (!Number.isSafeInteger(fen) || fen < 700 || fen > 70000000) throw new Error(PRICE_ERROR)
  return fen
}

export function roomWeekPayload(data, original, value, editing) {
  const result = { ...data }
  delete result.basePriceFen
  delete result.weekPriceFen
  const total = roomWeekInputFen(value)
  // 只改名称、库存等资料时，连旧价格字段都不回写，避免改变历史周末差价。
  if (editing && roomWeekTotalFen(original) === total) delete result.weekTotalFen
  else result.weekTotalFen = total
  return result
}
