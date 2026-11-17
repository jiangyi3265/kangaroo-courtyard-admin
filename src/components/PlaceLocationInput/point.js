export const PICKER_URL = 'https://ditu.amap.com/ssr/coordinate-picker'
export function locationPoint(latitude, longitude) {
  if ([latitude, longitude].some(v => v == null || String(v).trim() === '' || typeof v === 'boolean')) return null
  const lat = Number(latitude), lng = Number(longitude)
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat !== 0 || lng !== 0)
    ? { latitude: lat, longitude: lng } : null
}
// 高德选点器的复制格式固定为“经度,纬度”；不猜测或交换顺序。
export function parsePickedPoint(value) {
  const match = /^\s*(-?\d+(?:\.\d+)?)\s*[,，]\s*(-?\d+(?:\.\d+)?)\s*$/.exec(String(value || ''))
  const point = match ? locationPoint(match[2], match[1]) : null
  return point ? locationPoint(Number(point.latitude.toFixed(6)), Number(point.longitude.toFixed(6))) : null
}
export function pointPreviewUrl(point, name = '') {
  if (!point) return ''
  return 'https://uri.amap.com/marker?position=' + point.longitude + ',' + point.latitude + '&name=' + encodeURIComponent(name) + '&coordinate=gaode&src=daishu'
}
