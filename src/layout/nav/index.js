import { computed } from 'vue'
import { defineStore, storeToRefs } from 'pinia'
import usePermissionStore from '@/store/modules/permission'
import { checkPermi } from '@/utils/permission'
import Layout from '@/layout/index'
import ParentView from '@/components/ParentView'
import { buildAdminNav } from './buildNav.js'

const useNavStore = defineStore('adminNav', () => {
  const permission = usePermissionStore()
  const nav = computed(() => buildAdminNav(permission.defaultRoutes, {
    canEditConfig: checkPermi(['system:config:edit']),
    isContainer: node => node.component === Layout || node.component === ParentView
  }))
  return { nav }
})

export function useAdminNav() {
  const { nav } = storeToRefs(useNavStore())
  return {
    get groups() { return nav.value.groups },
    get items() { return nav.value.items },
    get byPath() { return nav.value.byPath }
  }
}
