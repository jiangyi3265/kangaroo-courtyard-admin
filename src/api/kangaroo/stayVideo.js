import request from '@/utils/request'
import { uploadStoreVideoPart } from './store'
const base = '/kangaroo/stay-media/video/parts'
export function stayVideoApi(kind) {
  return {
    begin: data => request({ url: base, method: 'post', data: { ...data, kind }, headers: { repeatSubmit: false } }),
    append: (id, index, blob, progress, signal) => uploadStoreVideoPart(id, index, blob, progress, signal, base),
    finish: id => request({ url: `${base}/${id}/finish`, method: 'post', timeout: 120000, headers: { repeatSubmit: false } }),
    abort: id => request({ url: `${base}/${id}`, method: 'delete' })
  }
}
