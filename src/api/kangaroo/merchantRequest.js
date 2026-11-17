import axios from 'axios'
import { getToken } from '@/utils/auth'

/**
 * 等平台处理的条数 count、最近 24 小时派到本地的条数 recent（Navbar 铃铛轮询用）。
 * 故意不走 @/utils/request：那边出错会弹提示、登录过期会弹确认框，后台每分钟默默查一次不该打扰人。出错时抛异常，铃铛保留上一次的数字。
 */
export function getPendingCount() {
  return axios.get(import.meta.env.VITE_APP_BASE_API + '/kangaroo/merchant-request/pending-count', {
    headers: { Authorization: 'Bearer ' + getToken() },
    timeout: 10000
  }).then(res => {
    const body = res.data || {}
    if (body.code !== 200 || !body.data) throw new Error(body.msg || 'pending-count failed')
    return { count: Number(body.data.count) || 0, recent: Number(body.data.recent) || 0 }
  })
}
