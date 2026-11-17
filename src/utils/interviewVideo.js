// 门店采访视频 / 小院视频的提示文字和小判断：页面和组合函数共用，这里不依赖 Vue，能直接单测。
export const VIDEO_SHARED_TEXT = '同一门店的所有岗位共用，换一次全部生效，已上架也能换，不用下架'
export const VIDEO_NOT_SHARED_TEXT = '这是门店采访视频，和旅居房源的小院视频不互通，要单独传'
export const STAY_VIDEO_TEXT = '旅居详情页的视频就是这个，已上线也能换，不用下架。小院视频和门店采访视频不互通：门店管理里的采访视频不会显示在这里，要单独传'
export const VIDEO_UPLOADED_TEXT = '视频已上传，点保存才生效'
export const VIDEO_COVER_REMINDER = '封面还是旧的，记得换封面'
export const VIDEO_UNREADABLE_TEXT = '浏览器读不出这个视频的时长（可能是编码不常见）。手机视频可能是 HEVC，请转成 H.264 的 mp4 再传'
export const VIDEO_UNSAVED_TEXT = '视频改动还没保存'
export const VIDEO_UNSAVED_CONFIRM = '视频改动还没保存，关掉后这次改动不生效，用户看到的还是原来的视频。确定关闭？'
export const VIDEO_HIDDEN_TEXT = '已有采访视频，但采访方式是「未采访」，这个视频不会展示'
export const VIDEO_HIDDEN_CONFIRM = '采访方式是「未采访」，这个视频不会在小程序展示。要展示请先选实地探访或线上采访。确定这样保存？'

export function formatVideoSeconds(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0))
  const m = Math.floor(s / 60)
  return m ? m + ' 分 ' + (s % 60) + ' 秒' : s + ' 秒'
}

/** 岗位弹窗概要里的「采访视频：」后半句 */
export function interviewVideoSummary(video, seconds) {
  if (!video) return '待补充'
  return Number(seconds) > 0 ? '已上传（' + formatVideoSeconds(seconds) + '）' : '已上传'
}

export function videoChanged(origin, current) {
  return String(origin || '') !== String(current || '')
}

/**
 * 门店资料页保存时和视频有关的字段：视频没变就两个都不发。
 * 后端只要收到 interviewSeconds 就要求是有效正数，老视频没存时长时只改别的项也会存不上；
 * 不发 interviewVideo 还能避免把别人刚换的视频盖回去。
 */
export function interviewVideoBody(originVideo, video, seconds) {
  if (!videoChanged(originVideo, video)) return {}
  return { interviewVideo: video || '', interviewSeconds: video ? seconds : null }
}

/** 传了视频、采访方式却是「未采访」：公开接口不给 interview，小程序不展示这个视频。门店页用 'none'，岗位弹窗用 '' */
export function videoHiddenByMode(mode, video) {
  return !!video && (!mode || mode === 'none')
}
