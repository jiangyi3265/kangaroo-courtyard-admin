import request from '@/utils/request'

const base = '/kangaroo/undercover'
export const listWords = params => request({ url: base + '/words', params })
export const saveWord = data => request({
  url: base + '/words' + (data.wordId ? '/' + data.wordId : ''),
  method: data.wordId ? 'put' : 'post', data
})
export const listRooms = params => request({ url: base + '/rooms', params })
export const roomDetail = (code, gameId) => request({ url: base + '/rooms/' + code, params: { gameId } })
export const closeRoom = (code, data) => request({ url: base + '/rooms/' + code + '/close', method: 'post', data })
