import request from '@/utils/request'

export const getGrantRoles = () => request({ url: '/kangaroo/grant/roles', method: 'get' })
export const listGrantCityOption = () => request({ url: '/kangaroo/grant/cities', method: 'get' })

// 查询员工授权列表
export function listGrant(query) {
  return request({
    url: '/kangaroo/grant/list',
    method: 'get',
    params: query
  })
}

// 查询员工授权详细
export function getGrant(grantId) {
  return request({
    url: '/kangaroo/grant/' + grantId,
    method: 'get'
  })
}

// 授予员工身份（同一账号同一门店只会有一条授权，后端对历史记录走重新激活）
export function addGrant(data) {
  return request({
    url: '/kangaroo/grant',
    method: 'post',
    data: data
  })
}

// 修改员工角色（账号与门店不可改，后端只认 grantId + roleCode）
export function updateGrant(data) {
  return request({
    url: '/kangaroo/grant',
    method: 'put',
    data: data
  })
}

// 撤销授权，grantIds 逗号分隔；用 PUT 而非 DELETE，授权记录要留档备查
export function revokeGrant(grantIds) {
  return request({
    url: '/kangaroo/grant/revoke/' + grantIds,
    method: 'put',
    // 撤销按钮支持批量、也可能在列表里连着点几行，
    // PUT 且 body 为空时几次请求完全一致，必须绕开重复提交拦截
    headers: { repeatSubmit: false }
  })
}

// 授权表单的账号下拉数据源（远程按昵称/手机号搜索，避免一次拉全量账号）
export function listGrantAppUserOption(query) {
  return request({
    url: '/kangaroo/appuser/list',
    method: 'get',
    params: query
  })
}

// 授权表单的门店下拉数据源
export function listGrantStoreOption(query) {
  return request({
    url: '/kangaroo/store/list',
    method: 'get',
    params: query
  })
}
