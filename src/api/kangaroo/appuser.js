import request from '@/utils/request'

// 查询小程序账号列表（出于隐私，该接口不下发 openid/unionid）
export function listAppUser(query) {
  return request({
    url: '/kangaroo/appuser/list',
    method: 'get',
    params: query
  })
}

// 查询小程序账号详细（详情才带出 openid/unionid，供客服核对身份）
export function getAppUser(userId) {
  return request({
    url: '/kangaroo/appuser/' + userId,
    method: 'get'
  })
}

// 小程序账号状态修改（0启用 1停用）
export function changeAppUserStatus(userId, status) {
  const data = {
    userId,
    status
  }
  return request({
    url: '/kangaroo/appuser/changeStatus',
    method: 'put',
    // 列表里一行行连续拨开关时 url 相同、body 只差一个 userId，
    // 很容易撞上 request.js 的 1 秒重复提交拦截，这里显式关掉
    headers: { repeatSubmit: false },
    data: data
  })
}
