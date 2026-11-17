import useDictStore from '@/store/modules/dict'
import { getDicts } from '@/api/system/dict/data'

const displayLabel = (dictType, label) => dictType.startsWith('kg_') && typeof label === 'string' ? label.replace(/义工/g, '换工') : label

/**
 * 获取字典数据
 */
export function useDict(...args) {
  const res = ref({})
  return (() => {
    args.forEach((dictType, index) => {
      res.value[dictType] = []
      const dicts = useDictStore().getDict(dictType)
      if (dicts) {
        res.value[dictType] = dicts.map(p => ({ ...p, label: displayLabel(dictType, p.label) }))
      } else {
        getDicts(dictType).then(resp => {
          res.value[dictType] = resp.data.map(p => ({ label: displayLabel(dictType, p.dictLabel), value: p.dictValue, elTagType: p.listClass, elTagClass: p.cssClass }))
          useDictStore().setDict(dictType, res.value[dictType])
        })
      }
    })
    return toRefs(res.value)
  })()
}
