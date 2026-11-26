import request from '@/utils/request'

const base = '/kangaroo/insurance-finance'
export const listInsuranceApplies = params => request({ url: `${base}/applies`, params })
export const getInsuranceApply = id => request({ url: `${base}/applies/${id}` })
export const registerInsurancePolicy = (id, data) => request({ url: `${base}/applies/${id}/policy`, method: 'post', data })
export const rejectInsuranceApply = (id, data) => request({ url: `${base}/applies/${id}/reject`, method: 'post', data })
export const listInsuranceRefunds = params => request({ url: `${base}/refunds`, params })
export const auditInsuranceRefund = (id, data) => request({ url: `${base}/refunds/${id}/audit`, method: 'post', data })
export const previewInsuranceRefund = (id, data) => request({ url: `${base}/refunds/${id}/preview`, method: 'post', data })
export const recheckInsuranceRefund = id => request({ url: `${base}/refunds/${id}/recheck`, method: 'post' })
