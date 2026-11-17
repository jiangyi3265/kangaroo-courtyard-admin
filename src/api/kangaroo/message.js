import request from '@/utils/request'

// 查询站内消息列表
export function listMessage(query) {
  return request({
    url: '/kangaroo/message/list',
    method: 'get',
    params: query
  })
}

// 查询站内消息详细
export function getMessage(msgId) {
  return request({
    url: '/kangaroo/message/' + msgId,
    method: 'get'
  })
}

// 站内消息由报名、面试、签约等业务流程产生，后端只开放了 list 与 query 两个接口，
// 所以这里没有新增/修改/删除方法：手工造消息会让消息内容和业务状态对不上。
