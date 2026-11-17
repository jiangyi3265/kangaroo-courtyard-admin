import request from '@/utils/request'

// 数据看板总览：总数据（不受筛选影响）+ 当日数据 + 按 城市 → 区县 分组的小院列表
// query: { date: 'yyyy-MM-dd', city, district, host, stayId }，空值不传
export function getDashboardOverview(query) {
  return request({
    url: '/kangaroo/dashboard/overview',
    method: 'get',
    params: query
  })
}

// 某个小院当天的房型 / 房间明细
export function getDashboardStay(stayId, query) {
  return request({
    url: '/kangaroo/dashboard/stay/' + stayId,
    method: 'get',
    params: query
  })
}
