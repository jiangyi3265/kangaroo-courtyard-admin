/**
 * 后台「员工授权」页的角色显示。不依赖 Vue 和接口，scripts/merchant-request-admin.test.mjs 直接测。
 */

// 字典里的旧名字或没有这一行时，以这里为准
export const STAFF_ROLE_LABELS = {
  manager: '换工主理人',
  keeper: '小院主理人',
  merchant_service: '商家服务人',
  city_lead: '城市负责人',
  online_staff: '线上任务专员',
  merchant: '合作商家',
  staff: '员工'
}

// 这两个角色按「所选门店所在城市」生效，不是只管这一家店
export const CITY_ROLE_HINTS = {
  merchant_service: '负责代运营、抖音卖房和线上任务派发：按所选门店所在城市接单，换工主理人核实后转给他，由他在小程序上架和派发。只能由平台在这里开通。',
  city_lead: '收本城通知，只读看本城商家需求和各店概况，不能改内容。只能由平台在这里开通。'
}

// 角色切换之后（阶段 new）的职责说明。切换之前还用上面那份，一字不变
export const SWITCHED_ROLE_HINTS = {
  manager: '负责门店的报名、面试、岗位和活动日常；还按所选门店所在城市接商家需求（要等打开派单）。退款和取消收费活动归城市负责人。只能由平台在这里开通。',
  merchant_service: CITY_ROLE_HINTS.merchant_service,
  city_lead: '管所选门店所在城市的全部门店（门店没设城市时只管这一家）：小院主理人、换工主理人、线上任务专员、商家服务人能做的都能做，平时不做日常，下级不在时顶上。还看本城数字，负责活动退款审批、取消收费活动。在他自己是合作商家的门店上不算。不能加人、撤人。只能由平台在这里开通。'
}

/** 角色说明：跟着阶段走，阶段只认接口 /kangaroo/grant/roles 给的 phase */
export function roleHint(roleCode, phase) {
  const hints = phase === 'new' ? SWITCHED_ROLE_HINTS : CITY_ROLE_HINTS
  return hints[roleCode] || ''
}

// 兼任：一条小院主理人授权上的开关（kg_staff_grant.also_service）。同一账号同一门店只能有一条授权，所以不是再加一条商家服务人授权
export const ALSO_SERVICE_ROLE = 'keeper'
export const ALSO_SERVICE_LABEL = '同时担任商家服务人'
export const ALSO_SERVICE_HINT = '勾上后，他在小程序的小院工作台里多出商家需求和线上任务概况，按这家门店所在城市接单'

/** 提交给后端的值：只有小院主理人才可能是 '1'，切到别的角色一律清掉 */
export function alsoServiceValue(roleCode, checked) {
  return roleCode === ALSO_SERVICE_ROLE && checked === '1' ? '1' : '0'
}

/** 这条授权是否开了兼任（列表、编辑框共用） */
export function isAlsoService(grant) {
  return !!grant && alsoServiceValue(grant.roleCode, grant.alsoService) === '1'
}

/**
 * 显示用的角色（列表标签）：字典在前（顺序、颜色都听字典），接口 /kangaroo/grant/roles 有而字典没有的补在后面。
 * 字典靠迁移写入，又有 Redis 缓存；缺了一行时不能让这个角色在后台显示英文编码。
 * labels 是接口给的 {编码: 中文}，含已停用的「员工」：切换后字典里没有它了，老记录还要能显示中文。
 */
export function mergeStaffRoles(dictRoles, apiRoles, labels) {
  const merged = (dictRoles || []).map(role => ({ ...role, label: STAFF_ROLE_LABELS[role.value] || role.label }))
  const seen = new Set(merged.map(role => role.value))
  const add = (value, label) => {
    if (seen.has(value)) return
    seen.add(value)
    merged.push({ value, label: STAFF_ROLE_LABELS[value] || label, elTagType: 'primary', elTagClass: '' })
  }
  ;(apiRoles || []).forEach(role => add(role.value, role.label))
  Object.keys(labels || {}).forEach(value => add(value, labels[value]))
  return merged
}

/** 能选的角色（单选、搜索）：只认接口给的 selectable，切换前后不同。排序跟显示列表 */
export function selectableStaffRoles(displayRoles, selectable) {
  const codes = new Set(selectable || [])
  return (displayRoles || []).filter(role => codes.has(role.value))
}

/**
 * 权限说明标题右边那句：这个角色在多大范围内生效。
 * 门店的事限这家店、商家需求按城市的有两种：小院主理人兼任商家服务人（alsoService）；切换之后的换工主理人（phase）
 */
export function roleScopeText(roleCode, store, alsoService = false, phase = 'legacy') {
  if (alsoServiceValue(roleCode, alsoService ? '1' : '0') === '1' || (phase === 'new' && roleCode === 'manager')) {
    if (!store) return '门店业务限当前授权门店；商家需求按所选门店所在城市'
    return store.city ? '门店业务限当前授权门店；商家需求按所在城市：' + store.city : '这家门店还没填城市，接不了商家需求，请先在门店管理补上'
  }
  if (!CITY_ROLE_HINTS[roleCode]) return '限当前授权门店'
  if (!store) return '按所选门店所在城市生效'
  return store.city ? '按所选门店所在城市生效：' + store.city : '这家门店还没填城市，请先在门店管理补上'
}
