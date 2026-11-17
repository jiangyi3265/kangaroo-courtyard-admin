import request from '@/utils/request'

// 扩展模块的后台通用增删改查（后端 KgExtAdminController，由实体登记驱动）

export function getExtMeta(entity) {
  return request({ url: '/kangaroo/ext/' + entity + '/meta', method: 'get' })
}

export function listExt(entity, query) {
  return request({ url: '/kangaroo/ext/' + entity + '/list', method: 'get', params: query })
}

export function getExt(entity, id) {
  return request({ url: '/kangaroo/ext/' + entity + '/' + id, method: 'get' })
}

export function addExt(entity, data) {
  return request({ url: '/kangaroo/ext/' + entity, method: 'post', data })
}

export function updateExt(entity, data) {
  return request({ url: '/kangaroo/ext/' + entity, method: 'put', data })
}

export function delExt(entity, ids) {
  return request({ url: '/kangaroo/ext/' + entity + '/' + ids, method: 'delete' })
}

// 登记里的自定义动作（退款、审核、处理举报……）：url 已由调用方把 {字段} 替换成行里的值
export function runExtAction(method, url, data) {
  return request({ url, method, data })
}
