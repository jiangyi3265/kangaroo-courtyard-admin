<template>
  <div :class="{ 'has-logo': showLogo }" class="sidebar-container">
    <logo v-if="showLogo" :collapse="isCollapse" />
    <el-scrollbar wrap-class="scrollbar-wrapper">
      <div v-if="grouped && !isCollapse" class="nav-search">
        <el-input v-model="search" clearable placeholder="搜功能" aria-label="搜功能"
          @keydown.enter="openFirstResult" />
      </div>
      <el-menu
        ref="menuRef"
        :default-active="activeMenu"
        :collapse="isCollapse"
        :background-color="getMenuBackground"
        :text-color="getMenuTextColor"
        :unique-opened="true"
        :active-text-color="theme"
        :collapse-transition="false"
        mode="vertical"
        :class="sideTheme"
      >
        <template v-if="searching">
          <app-link v-for="item in results" :key="item.id" :to="item.to" @click="onSelect">
            <el-menu-item :index="item.path" class="search-result" :title="item.label">
              <span>{{ item.label }}</span>
              <small>{{ item.groupTitle }}</small>
            </el-menu-item>
          </app-link>
        </template>
        <template v-else-if="grouped">
          <el-sub-menu v-for="group in nav.groups" :key="group.id" :index="group.id" teleported>
            <template #title>
              <svg-icon :icon-class="group.icon" />
              <span class="menu-title">{{ group.title }}</span>
            </template>
            <app-link v-for="item in group.items" :key="item.id" :to="item.to" @click="onSelect">
              <el-menu-item :index="item.path" :title="item.label">
                <span class="menu-title">{{ item.label }}</span>
              </el-menu-item>
            </app-link>
          </el-sub-menu>
        </template>
        <template v-else>
          <sidebar-item v-for="(route, index) in sidebarRouters" :key="route.path + index"
            :item="route" :base-path="route.path" />
        </template>
      </el-menu>
      <p v-if="searching && !results.length" class="search-empty" role="status">没找到？点右上角「操作向导」问问</p>
    </el-scrollbar>
  </div>
</template>

<script setup>
import Logo from './Logo'
import AppLink from './Link.vue'
import { useAdminNav } from '@/layout/nav'
import { searchAdminNav } from '@/layout/nav/buildNav'
import SidebarItem from './SidebarItem'
import variables from '@/assets/styles/variables.module.scss'
import useAppStore from '@/store/modules/app'
import useSettingsStore from '@/store/modules/settings'
import usePermissionStore from '@/store/modules/permission'

const route = useRoute()
const appStore = useAppStore()
const settingsStore = useSettingsStore()
const permissionStore = usePermissionStore()

const sidebarRouters = computed(() => permissionStore.sidebarRouters)
const showLogo = computed(() => settingsStore.sidebarLogo)
const sideTheme = computed(() => settingsStore.sideTheme)
const theme = computed(() => settingsStore.theme)
const isCollapse = computed(() => !appStore.sidebar.opened)

const router = useRouter()
const nav = useAdminNav()
const grouped = computed(() => Number(settingsStore.navType) === 1)
const search = ref('')
const searching = computed(() => grouped.value && !isCollapse.value && !!search.value.trim())
const results = computed(() => searchAdminNav(nav.items, search.value))

function onSelect() {
  search.value = ''
  if (appStore.device === 'mobile') appStore.closeSideBar({ withoutAnimation: false })
}

function openFirstResult(event) {
  if (event.isComposing || event.keyCode === 229 || !searching.value) return
  const item = results.value[0]
  if (!item) return
  event.preventDefault()
  if (item.external) window.open(item.to, '_blank', 'noopener')
  else router.push(item.to)
  onSelect()
}

// 获取菜单背景色
const getMenuBackground = computed(() => {
  if (settingsStore.isDark) {
    return 'var(--sidebar-bg)'
  }
  return sideTheme.value === 'theme-dark' ? variables.menuBg : variables.menuLightBg
})

// 获取菜单文字颜色
const getMenuTextColor = computed(() => {
  if (settingsStore.isDark) {
    return 'var(--sidebar-text)'
  }
  return sideTheme.value === 'theme-dark' ? variables.menuText : variables.menuLightText
})

const activeMenu = computed(() => {
  const { meta, path } = route
  const current = meta.activeMenu || path
  // 书签里多带的末尾「/」去掉，才能和菜单对上
  return String(current || '').replace(/\/+$/, '') || '/'
})

// 从向导「带我去」、标签页、页面内互跳过去时，组件库只换高亮不展开分组，这里补上展开
const menuRef = ref(null)
watch([activeMenu, grouped, searching, isCollapse, () => nav.groups], async () => {
  if (!grouped.value || searching.value || isCollapse.value) return
  const groupId = nav.byPath.get(activeMenu.value)?.groupId
  if (!groupId) return
  await nextTick()
  if (!grouped.value || searching.value || isCollapse.value) return
  if (!nav.groups.some(g => g.id === groupId)) return
  try {
    menuRef.value?.open(groupId)
  } catch {
    // 分组还没渲染出来时忽略，下次路由变化会再展开
  }
}, { immediate: true })
</script>

<style lang="scss" scoped>
.nav-search {
  padding: 12px;
}
.search-result {
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  line-height: 1.4;

  span {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  small {
    font-size: var(--el-font-size-extra-small);
    opacity: .8;
  }
}
.search-empty {
  margin: 12px;
  font-size: var(--el-font-size-small);
  line-height: 1.6;
  color: v-bind(getMenuTextColor);
}
.sidebar-container {
  background-color: v-bind(getMenuBackground);
  
  .scrollbar-wrapper {
    background-color: v-bind(getMenuBackground);
  }

  .el-menu {
    border: none;
    height: 100%;
    width: 100% !important;
    
    .el-menu-item, .el-sub-menu__title {
      &:hover {
        background-color: var(--menu-hover, rgba(0, 0, 0, 0.06)) !important;
      }
    }

    .el-menu-item {
      color: v-bind(getMenuTextColor);
      
      &.is-active {
        color: var(--menu-active-text, #409eff);
        background-color: var(--menu-hover, rgba(0, 0, 0, 0.06)) !important;
      }
    }

    .el-sub-menu__title {
      color: v-bind(getMenuTextColor);
    }
  }
}
</style>
