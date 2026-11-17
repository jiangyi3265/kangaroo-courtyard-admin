import request from '@/utils/request'
export const listNoticeReplies = params => request({ url: '/kangaroo/notice-replies', method: 'get', params })
export const getNoticeReplies = (id, before) => request({ url: '/kangaroo/notice-replies/' + id, method: 'get', params: { before } })
export const sendNoticeReply = (id, data) => request({ url: '/kangaroo/notice-replies/' + id, method: 'post', data })
