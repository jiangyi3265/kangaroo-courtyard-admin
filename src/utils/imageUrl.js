import { isExternal } from '@/utils/validate'

/**
 * 后台显示图片时，把库里存的路径换成浏览器能打开的地址：
 * · http(s) 开头的完整地址原样用；
 * · /static/ 开头的是小程序包内图片（种子数据里的荣誉徽章、生日礼物选项图等），后端没有这些文件，
 *   要从小程序 H5 站点取：站点地址看 VITE_APP_H5_ORIGIN（.env.production 里配线上 H5），没配时用后台同源；
 * · 其余（上传文件 /profile/...、后端私有文件等）照旧走后端接口前缀。
 */
const API_BASE = import.meta.env.VITE_APP_BASE_API
const H5_ORIGIN = String(import.meta.env.VITE_APP_H5_ORIGIN || '').replace(/\/+$/, '')

export function imageUrl(path) {
  if (!path || isExternal(path)) return path
  if (path.startsWith('/static/')) return H5_ORIGIN + path
  return API_BASE + path
}

/** imageUrl 反过来：表单保存前把显示用的地址还原成库里存的路径（小程序包内图片仍存 /static/...，不变成线上完整地址） */
export function imagePath(url) {
  if (H5_ORIGIN && url && url.startsWith(H5_ORIGIN + '/static/')) return url.slice(H5_ORIGIN.length)
  return url
}
