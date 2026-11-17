const text = value => String(value ?? '').trim()
const has = value => !!text(value)
const media = value => {
  if (Array.isArray(value)) return value.some(has)
  const raw = text(value)
  if (raw.startsWith('[')) {
    try { return media(JSON.parse(raw)) } catch (_) { return false }
  }
  return raw.split(',').some(has)
}
const item = (field, label, present, inherited = false, hint = '') => ({
  field, label, state: present ? 'filled' : inherited ? 'inherited' : 'missing', hint
})

export function storeDisplayMaterials(profile = {}) {
  const fallback = profile.fallback || {}
  const named = has(profile.managerName)
  const rows = [
    item(!['online', 'onsite'].includes(profile.interviewMode) ? 'interviewMode' : 'interviewVideo', '采访视频与方式',
      ['online', 'onsite'].includes(profile.interviewMode) && media(profile.interviewVideo) && Number(profile.interviewSeconds) > 0,
      false, '选择采访方式，上传视频'),
    item('interviewCover', '采访视频封面', media(profile.interviewCover)),
    item('managerName', '店长称呼', named, has(fallback.managerName)),
    item('travelRail', '高铁交通参考', has(profile.travelRail), has(fallback.travelRail)),
    item('travelAirport', '机场交通参考', has(profile.travelAirport), has(fallback.travelAirport)),
    item('licenseImage', '营业执照', media(profile.licenseImage)),
    item('dailyImages', '店内日常照片', media(profile.dailyImages), Number(fallback.dailyCount) > 0)
  ]
  // 只提供 fallback 称呼的接口不能证明头像、介绍齐全，也不能要求重复填写沿用的资料。
  if (named || !has(fallback.managerName)) rows.splice(3, 0,
    item('managerAvatar', '店长头像', media(profile.managerAvatar)),
    item('managerQuote', '店长介绍', has(profile.managerQuote)))
  return rows
}

export function stayDisplayMaterials(stay = {}) {
  const latitude = Number(stay.latitude), longitude = Number(stay.longitude)
  const positioned = has(stay.latitude) && has(stay.longitude) && Number.isFinite(latitude) && Number.isFinite(longitude)
    && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 && (latitude !== 0 || longitude !== 0)
  return [
    item('cover', '房源封面', media(stay.cover)),
    item('introVideo', '小院视频', media(stay.introVideo)),
    item('introVideoCover', '视频封面', media(stay.introVideoCover), media(stay.cover)),
    item('hostName', '主理人称呼', has(stay.hostName)),
    item('hostAvatar', '主理人头像', media(stay.hostAvatar)),
    item('hostIntro', '主理人介绍', has(stay.hostIntro)),
    item('address', '详细地址', has(stay.address)),
    item(!has(stay.latitude) ? 'latitude' : !has(stay.longitude) ? 'longitude' : 'latitude', '地图坐标', positioned, false, '填写真实经纬度后，用户可直接打开门店位置'),
    item('travelRail', '高铁交通参考', has(stay.travelRail)),
    item('travelAirport', '机场交通参考', has(stay.travelAirport))
  ]
}

export function focusDisplayField(formElement, field) {
  const target = Array.from(formElement?.querySelectorAll('[data-display-field]') || [])
    .find(element => element.dataset.displayField === field)
  if (!target) return false
  target.scrollIntoView({ block: 'center', behavior: 'smooth' })
  target.querySelector('input:not([type="hidden"]):not(:disabled),textarea:not(:disabled),button:not(:disabled),[tabindex="0"]')?.focus({ preventScroll: true })
  return true
}
