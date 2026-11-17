import request from '@/utils/request'
import axios from 'axios'
import { getToken } from '@/utils/auth'

// 查询门店列表
export function listStore(query) {
  return request({
    url: '/kangaroo/store/list',
    method: 'get',
    params: query
  })
}

// 查询门店详细
export function getStore(storeId) {
  return request({
    url: '/kangaroo/store/' + storeId,
    method: 'get'
  })
}

// 新增门店
export function addStore(data) {
  return request({
    url: '/kangaroo/store',
    method: 'post',
    data: data
  })
}

// 修改门店
export function updateStore(data) {
  return request({
    url: '/kangaroo/store',
    method: 'put',
    data: data
  })
}

// 删除门店
export function delStore(storeId) {
  return request({
    url: '/kangaroo/store/' + storeId,
    method: 'delete'
  })
}

// 安心认证 / 撤销认证
// certified 走 query 参数（后端是 @RequestParam boolean certified）。
// 这是个无 body 的 put，连着点两次同一门店时 url+body 完全一致，
// 会被 request.js 的 1 秒防重复提交拦掉，所以显式关掉该拦截。
export function certStore(storeId, certified) {
  return request({
    url: '/kangaroo/store/cert/' + storeId,
    method: 'put',
    params: { certified: certified },
    headers: { repeatSubmit: false }
  })
}

// 单独改门店来源类型（2026-11-03 主人：来源类型加「合作」）。opType 取 direct / franchise / managed / partner。
// 线上旧版门店保存接口（PUT /kangaroo/store）只认前三种，所以选「合作」时页面先照常保存门店、再调这个接口；
// 后端 KgStoreOpTypeAdminController 只改 op_type 一列，不经过旧校验。无 body 差异的 put 连点两次会被防重复提交拦，显式关掉
export function setStoreOpType(storeId, opType) {
  return request({
    url: '/kangaroo/store/' + storeId + '/op-type',
    method: 'put',
    data: { opType: opType },
    headers: { repeatSubmit: false }
  })
}

// ---------- 门店资料（小程序岗位详情页用：采访方式 / 采访视频 / 店长介绍 / 该店亮点 / 交通参考 / 营业执照 / 店里日常） ----------

// 取门店资料（含可选的亮点清单 facilityOptions、没填时小程序会借用的小院资料 fallback）
export function getStoreProfile(storeId) {
  return request({
    url: '/kangaroo/store/profile/' + storeId,
    method: 'get'
  })
}

// 保存门店资料。改成或改掉「实地探访」等同于认证 / 撤销认证，后端还要求有 kangaroo:store:cert 权限
export function updateStoreProfile(storeId, data) {
  return request({
    url: '/kangaroo/store/profile/' + storeId,
    method: 'put',
    data: data
  })
}

// 采访视频分段上传：开始。body {name, size, duration} → {uploadId, partBytes, parts}
export function beginStoreVideoUpload(data) {
  return request({
    url: '/kangaroo/store/profile/video/parts',
    method: 'post',
    data: data,
    headers: { repeatSubmit: false }
  })
}

// 采访视频分段上传：收尾，后端拼好文件 → {url: /profile/upload/videos/…, size}
// 300MB 的文件后端要校验并挪位置，给足时间
export function finishStoreVideoUpload(uploadId) {
  return request({
    url: '/kangaroo/store/profile/video/parts/' + uploadId + '/finish',
    method: 'post',
    timeout: 120000,
    headers: { repeatSubmit: false }
  })
}

// 采访视频分段上传：放弃（没有也算成功）
export function abortStoreVideoUpload(uploadId) {
  return request({
    url: '/kangaroo/store/profile/video/parts/' + uploadId,
    method: 'delete'
  })
}

// 分段本身（请求体是原始字节）不走 request.js：那边每次失败都会弹一次错，重试 3 次就会连弹 3 次；
// 这里自己带上同样的 token 与接口前缀，失败交给调用方决定重试还是提示。
// 返回 Promise：成功 resolve 后端的 data；失败 reject 一个 Error，带 retriable（网络/超时/5xx/「请重试」类可以再试）、
// show（需要调用方弹出）、canceled（是自己点了取消）
export function uploadStoreVideoPart(uploadId, index, blob, onProgress, signal, basePath = '/kangaroo/store/profile/video/parts') {
  return axios.post(import.meta.env.VITE_APP_BASE_API + basePath + '/' + uploadId + '/' + index, blob, {
    headers: { 'Content-Type': 'application/octet-stream', Authorization: 'Bearer ' + getToken() },
    timeout: 5 * 60 * 1000,
    signal: signal,
    onUploadProgress: onProgress
  }).then(res => {
    const body = res.data || {}
    const code = body.code || 200
    if (code === 200) {
      return body.data
    }
    const err = new Error(body.msg || '视频这一段上传失败')
    err.show = true
    // 401 登录过期、403 没权限、404 这次上传已失效、409 顺序乱了：再试也没用
    err.retriable = ![401, 403, 404, 409].includes(code) && (code >= 500 || String(body.msg || '').includes('请重试'))
    err.code = code
    throw err
  }, error => {
    if (axios.isCancel(error) || (error && error.name === 'CanceledError')) {
      const err = new Error('已取消上传')
      err.canceled = true
      throw err
    }
    const status = error && error.response ? error.response.status : 0
    const err = new Error(status ? '视频这一段上传失败（接口 ' + status + ' 异常）' : '网络不稳，视频这一段没传上去，请重新上传')
    err.show = true
    err.retriable = !status || status >= 500
    throw err
  })
}
