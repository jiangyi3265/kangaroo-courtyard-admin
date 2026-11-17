import request from '@/utils/request'
const base = '/kangaroo/staff-task'
export const listStaffTasks = params => request({ url: base + '/list', method: 'get', params })
export const taskRecipients = params => request({ url: base + '/recipients', method: 'get', params })
export const getStaffTask = id => request({ url: base + '/' + id, method: 'get' })
export const assignStaffTask = data => request({ url: base, method: 'post', data })
export const reviewStaffTask = (id, data) => request({ url: base + '/' + id + '/review', method: 'post', data })
// 2026-11-03（V74）主人：任务要来回流转、能一键发全体员工、能按岗位发
export const listTaskBatches = params => request({ url: base + '/batches', method: 'get', params })
export const taskRoles = () => request({ url: base + '/roles', method: 'get' })
export const taskAudience = params => request({ url: base + '/audience', method: 'get', params })
export const handleStaffTask = (id, data) => request({ url: base + '/' + id + '/handle', method: 'post', data })
