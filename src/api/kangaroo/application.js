import request from '@/utils/request'

// 查询报名列表
export function listApplication(query) {
  return request({
    url: '/kangaroo/application/list',
    method: 'get',
    params: query
  })
}

// 查询报名详情（返回 application / statusLabel / logs / interview）
export function getApplication(appId) {
  return request({
    url: '/kangaroo/application/' + appId,
    method: 'get'
  })
}

// 审核报名：pass=true 通过，false 驳回（驳回必须带 reason）
// 这些状态操作都是"选中一行点一下"，运营连着处理多条时 url 相同、body 只差一个 appId，
// 极易落进 request.js 的 1 秒防重放窗口而被静默拦截，所以统一关掉重复提交校验。
// 幂等由后端状态机兜底：同一状态不可重复流转，重复请求会被 assertCanTransfer 拒绝。
export function auditApplication(data) {
  return request({
    url: '/kangaroo/application/audit',
    method: 'put',
    headers: { repeatSubmit: false },
    data: data
  })
}

// 商家确认录用
export function confirmApplication(appId) {
  return request({
    url: '/kangaroo/application/confirm/' + appId,
    method: 'put',
    headers: { repeatSubmit: false }
  })
}

// 标记入职
export function onboardApplication(appId) {
  return request({
    url: '/kangaroo/application/onboard/' + appId,
    method: 'put',
    headers: { repeatSubmit: false }
  })
}

export function finishApplicationWork(appId, reason) {
  return request({ url: '/kangaroo/application/work-end/' + appId, method: 'put', data: { reason } })
}

// 终止申请（必须带 reason）
export function terminateApplication(data) {
  return request({
    url: '/kangaroo/application/terminate',
    method: 'put',
    headers: { repeatSubmit: false },
    data: data
  })
}

// 门店 / 岗位下拉选项。
// 报名列表要按门店和岗位筛选，而这两个 id 对运营来说不可读，必须给可选列表。
// 放在本文件而不是 api/kangaroo/store.js：它们只服务于报名页的筛选框，
// 取的字段也只有 id 与名称；门店/岗位管理页落地后各自有完整的 api 文件，互不影响。
// pageSize 取 200 是刻意的上限——门店是实体门店、岗位按门店收敛，量级远小于此；
// 真到了翻页的规模，应该换成 remote 搜索而不是把上限继续往上调。
export function listStoreOptions() {
  return request({
    url: '/kangaroo/store/list',
    method: 'get',
    params: { pageNum: 1, pageSize: 200 }
  })
}

export function listJobOptions(storeId) {
  return request({
    url: '/kangaroo/job/list',
    method: 'get',
    params: { pageNum: 1, pageSize: 200, storeId: storeId }
  })
}
