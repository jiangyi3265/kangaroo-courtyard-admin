import request from '@/utils/request'

// 查询岗位列表
export function listJob(query) {
  return request({
    url: '/kangaroo/job/list',
    method: 'get',
    params: query
  })
}

// 查询岗位详细
export function getJob(jobId) {
  return request({
    url: '/kangaroo/job/' + jobId,
    method: 'get'
  })
}

// 新增岗位
export function addJob(data) {
  return request({
    url: '/kangaroo/job',
    method: 'post',
    data: data
  })
}

// 修改岗位
export function updateJob(data) {
  return request({
    url: '/kangaroo/job',
    method: 'put',
    data: data
  })
}

// 删除岗位
export function delJob(jobId) {
  return request({
    url: '/kangaroo/job/' + jobId,
    method: 'delete'
  })
}

// 岗位上下架（发布/暂停/关闭）。审核不通过时 reason 必填，放在 remark 里传（后端写进给门店的通知和岗位备注）；
// 返回的 endedApps 是随岗位关闭一起结束的报名条数
export function changeJobStatus(jobId, status, reason) {
  const data = {
    jobId,
    status
  }
  if (reason) {
    data.remark = reason
  }
  return request({
    url: '/kangaroo/job/changeStatus',
    method: 'put',
    // 运营常常连着点几行的发布/暂停，request.js 的 1 秒重复提交拦截只比对 url+body，
    // 同一行来回切换状态时 body 会重复，关掉拦截才不会把第二次点击吞掉
    headers: { repeatSubmit: false },
    data: data
  })
}

// 按报名明细重算岗位的已报名 / 已录用计数。不传 jobId 即全量重算。
// 后端早就有这个接口和 kangaroo:job:recalc 权限，页面上却没有任何入口 ——
// 计数一旦漂移，运营在后台没有办法纠正，只能连数据库。
export function recalcJobCounters(jobId) {
  return request({
    url: '/kangaroo/job/recalc',
    method: 'put',
    params: jobId ? { jobId: jobId } : {}
  })
}

// 门店下拉选项。刻意不复用 api/kangaroo/store.js：
// 岗位页只需要 storeId/storeName 两个字段，单独一个函数可以让两个页面各自演进互不牵连
export function listStoreOptions() {
  return request({
    url: '/kangaroo/store/list',
    method: 'get',
    params: { pageNum: 1, pageSize: 200 }
  })
}

// 2026-11-03 主人：到期关闭的线上任务「继续开启」，deadline = 新的预计完成时间（yyyy-MM-dd HH:mm）
export function reopenOnlineTask(jobId, deadline) {
  return request({
    url: '/kangaroo/online-task/' + jobId + '/reopen',
    method: 'post',
    data: { deadline }
  })
}
