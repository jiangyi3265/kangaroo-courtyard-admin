import { nextTick } from 'vue'

export function firstErrorMessage(invalidFields) {
  for (const list of Object.values(invalidFields || {})) {
    if (list && list[0] && list[0].message) return list[0].message
  }
  return ''
}

/**
 * 表单校验失败：滚到第一处错误并弹提示。
 * 长弹窗里错误文字常在视口外，只标红的话看起来像按钮没反应。
 * 按页面顺序取第一处，比 invalidFields 的键顺序可靠。
 */
export async function revealFirstFormError(form, invalidFields, notify, suffix = '') {
  await nextTick()
  const root = form && form.$el ? form.$el : form
  const target = root && root.querySelector ? root.querySelector('.el-form-item.is-error') : null
  if (target) target.scrollIntoView({ block: 'center', behavior: 'smooth' })
  const shown = target && target.querySelector('.el-form-item__error')
  const text = (shown && shown.textContent.trim()) || firstErrorMessage(invalidFields) || '还有内容没填好，请检查标红的项'
  notify(text + suffix)
  return text
}
