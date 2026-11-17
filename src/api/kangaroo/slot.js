import request from '@/utils/request'

// 查询面试时段列表
export function listSlot(query) {
  return request({
    url: '/kangaroo/slot/list',
    method: 'get',
    params: query
  })
}

// 查询面试时段详细
export function getSlot(slotId) {
  return request({
    url: '/kangaroo/slot/' + slotId,
    method: 'get'
  })
}

// 新增面试时段
export function addSlot(data) {
  return request({
    url: '/kangaroo/slot',
    method: 'post',
    data: data
  })
}

// 修改面试时段（已被报名占用的时段后端会拒绝）
export function updateSlot(data) {
  return request({
    url: '/kangaroo/slot',
    method: 'put',
    data: data
  })
}

// 删除面试时段（已被报名占用的时段后端会拒绝）
export function delSlot(slotId) {
  return request({
    url: '/kangaroo/slot/' + slotId,
    method: 'delete'
  })
}

// 门店下拉数据。时段必须挂在门店上，筛选和表单都要用；门店是量级很小的基础数据，一次取全量比分页更省事
export function listStoreOption() {
  return request({
    url: '/kangaroo/store/list',
    method: 'get',
    params: { pageNum: 1, pageSize: 200 }
  })
}

// 岗位下拉数据。时段可以限定到某个岗位，也可以不限定（门店通用）；
// 列表里的 job_id 只是个数字，靠这份数据把它还原成岗位标题
export function listJobOption() {
  return request({
    url: '/kangaroo/job/list',
    method: 'get',
    params: { pageNum: 1, pageSize: 200 }
  })
}
