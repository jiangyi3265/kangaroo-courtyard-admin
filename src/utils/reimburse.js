/**
 * 后台「采购报销」（V66）的纯逻辑：状态显示、金额写法、筛选参数、驳回理由校验。不依赖 Vue 和接口，scripts/reimburse-admin.test.mjs 直接测。
 * 接口给的金额一律是两位小数的字符串，这里只排版、不做加减（财务数字不过浮点数），合计用接口算好的 summary。
 */

export const STATUS_ORDER = ['pending', 'approved', 'paid', 'rejected']

// tile 是合计格子上写的话：已通过就是在等打款，给老板看「待打款」更直接
export const STATUS_META = {
  pending: { text: '待审核', tile: '待审核', tag: 'warning' },
  approved: { text: '已通过', tile: '已通过，待打款', tag: 'primary' },
  paid: { text: '已打款', tile: '已打款', tag: 'success' },
  rejected: { text: '已驳回', tile: '已驳回（不计入合计）', tag: 'danger' }
}

export const REASON_MAX = 255

/** '1234.50' → '¥1,234.50'。按字符串加逗号，不转数字；不是金额的写法原样带上 ¥ */
export function moneyText(value) {
  const text = String(value ?? '').trim()
  if (!text) return '¥0.00'
  const match = /^(-?)(\d+)(\.\d+)?$/.exec(text)
  if (!match) return '¥' + text
  return '¥' + match[1] + match[2].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (match[3] || '')
}

/** 表头合计：去掉驳回的笔数和金额（驳回的不用付钱）。接口没回 summary 时都是 0，不能显示 undefined */
export function summaryView(summary) {
  const raw = summary || {}
  const by = raw.byStatus || {}
  const statuses = STATUS_ORDER.map(status => {
    const one = by[status] || {}
    return { status, count: Number(one.count) || 0, amount: moneyText(one.amount), ...STATUS_META[status] }
  })
  const rejected = statuses.find(s => s.status === 'rejected').count
  return { validCount: Math.max(0, (Number(raw.count) || 0) - rejected), validAmount: moneyText(raw.validAmount), statuses }
}

/** 筛选 → 接口参数（列表、导出共用一份）。日期范围是 [开始, 结束]，都含当天；空的不带 */
export function filterParams(query, purchaseRange, submitRange) {
  const q = query || {}
  const out = {}
  for (const key of ['storeId', 'status']) {
    if (q[key] !== undefined && q[key] !== null && q[key] !== '') out[key] = q[key]
  }
  const submitter = String(q.submitter ?? '').trim()
  if (submitter) out.submitter = submitter
  if (purchaseRange && purchaseRange.length === 2) {
    out.purchaseBegin = purchaseRange[0]
    out.purchaseEnd = purchaseRange[1]
  }
  if (submitRange && submitRange.length === 2) {
    out.submitBegin = submitRange[0]
    out.submitEnd = submitRange[1]
  }
  return out
}

/** 驳回理由：必填、有看得见的字、不超过 255 字（按字算，一个表情一个字），和后端同一条规则。没问题返回 '' */
export function rejectReasonProblem(reason) {
  const text = String(reason ?? '').trim()
  if (!/[^\s\p{C}]/u.test(text)) return '请填写驳回理由，提交人能看到'
  if ([...text].length > REASON_MAX) return '驳回理由最多 ' + REASON_MAX + ' 字'
  return ''
}

/** 这一行现在能做什么：待审核能通过、驳回；已通过能标记已打款；已驳回、已打款没有动作（驳回的等本人改好再交） */
export function canApprove(row) { return !!row && row.status === 'pending' }
export function canReject(row) { return !!row && row.status === 'pending' }
export function canMarkPaid(row) { return !!row && row.status === 'approved' }

export function approveConfirmText(row) {
  return '确认通过「' + row.itemName + '」' + moneyText(row.amount) + '（' + row.storeName + ' · ' + row.submitterName + '）？通过后不能撤销。系统不会打款，钱要另外转给提交人，转完再回来点「标记已打款」。'
}

export function paidConfirmText(row) {
  return '确认已经把 ' + moneyText(row.amount) + ' 转给「' + row.submitterName + '」了吗？这里只是记一笔，系统不会打款。标记后提交人会收到通知，不能撤销。'
}

/** 导出文件名：采购报销_20261031.xlsx */
export function exportFileName(now = new Date()) {
  const pad = n => String(n).padStart(2, '0')
  return '采购报销_' + now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + '.xlsx'
}

/**
 * 缩略图：max 张放得下就全放；放不下时最后一格写「+N」（N 是这一格盖住的这张加上没放出来的），点开大图能翻全部。max 是 0 时全部铺开
 */
export function receiptThumbs(receipts, max = 0) {
  const list = Array.isArray(receipts) ? receipts.filter(Boolean) : []
  if (!max || list.length <= max) return { list, shown: list, more: 0 }
  return { list, shown: list.slice(0, max), more: list.length - max + 1 }
}
