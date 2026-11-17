import axios from 'axios'
import request from '@/utils/request'
import { getToken } from '@/utils/auth'

// 名单和状态（手机号打码）
export const getRoleSwitchPreview = () => request({ url: '/kangaroo/roleswitch/preview', method: 'get' })

/**
 * 切换、退回、打开派单。
 * 故意不走 @/utils/request：那边出错只弹一个几秒就消失的提示，这三个操作的失败原因要一直留在页面上给老板看；
 * 超时也放长到 60 秒，一个事务改完全部授权，不能因为慢一点就报失败。
 * 服务器回了话（err.answered）就是有明确结果；没回话（断网、超时）是不知道成没成，页面要重新读状态。
 */
function action(path, body) {
  return axios.post(import.meta.env.VITE_APP_BASE_API + '/kangaroo/roleswitch/' + path, body, {
    headers: { Authorization: 'Bearer ' + getToken() },
    timeout: 60000
  }).then(res => {
    const result = res.data || {}
    if (result.code !== 200) {
      const err = new Error(result.msg || '操作没有成功')
      err.answered = true
      throw err
    }
    return result.data
  })
}

export const switchRoles = (fingerprint, confirm) => action('switch', { fingerprint, confirm })
export const rollbackRoles = confirm => action('rollback', { confirm })
export const openRouting = confirm => action('open-routing', { confirm })
