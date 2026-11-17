import request from '@/utils/request'

// 采购报销（V66）。列表不是 TableDataInfo：根上放 rows、total、summary（合计）
const base = '/kangaroo/reimburse'

export function listReimburse(query) {
  return request({ url: base + '/list', method: 'get', params: query })
}

// 门店筛选的下拉：表格里出现过的门店，不用另外要门店管理的权限
export function listReimburseStores() {
  return request({ url: base + '/stores', method: 'get' })
}

export function getReimburse(id) {
  return request({ url: base + '/' + id, method: 'get' })
}

// revision：页面看到的第几次提交。对方驳回后改过再交，旧页面审不到新内容（后端回 409）
export function approveReimburse(id, revision) {
  return request({ url: base + '/' + id + '/approve', method: 'put', data: { revision } })
}

export function rejectReimburse(id, reason, revision) {
  return request({ url: base + '/' + id + '/reject', method: 'put', data: { reason, revision } })
}

export function markReimbursePaid(id) {
  return request({ url: base + '/' + id + '/paid', method: 'put' })
}

// 导出走 proxy.download（表单参数、拿文件流），路径写在这里，页面和测试都认这一个
export const REIMBURSE_EXPORT_URL = 'kangaroo/reimburse/export'
