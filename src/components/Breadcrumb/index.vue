<template>
  <el-breadcrumb class="app-breadcrumb" separator="/">
    <el-breadcrumb-item v-for="(item, index) in levelList" :key="item.key">
      <router-link v-if="item.to && index < levelList.length - 1" :to="item.to">{{ item.title }}</router-link>
      <span v-else class="no-redirect">{{ item.title }}</span>
    </el-breadcrumb-item>
  </el-breadcrumb>
</template>

<script setup>
import { useAdminNav } from '@/layout/nav'

const route = useRoute()
const router = useRouter()
const nav = useAdminNav()
const levelList = ref([])
const home = { key: '/index', title: '首页', to: '/index' }

// 书签里多带的末尾「/」去掉，才能和菜单对上
const norm = path => String(path || '').replace(/\/+$/, '') || '/'

// 「noRedirect」（大小写都认）和写成函数的跳转不做成链接
function crumbLink(record) {
  if (typeof record.redirect === 'string') {
    return record.redirect.toLowerCase() === 'noredirect' ? undefined : record.redirect
  }
  return record.redirect ? undefined : record.path
}

watchEffect(() => {
  if (route.path.startsWith('/redirect/')) return
  if (route.path === '/index') {
    levelList.value = route.meta.breadcrumb === false ? [] : [home]
    return
  }

  const currentPath = norm(route.path)
  const item = nav.byPath.get(norm(route.meta.activeMenu || route.path))
  const crumbs = [home]
  if (item && item.groupId !== 'other') {
    crumbs.push({ key: item.groupId, title: item.groupTitle })
    if (!item.external && router.resolve(item.to).meta.breadcrumb !== false) {
      crumbs.push({ key: item.path, title: item.label, to: item.to })
    }
    if (item.path !== currentPath && route.meta.title && route.meta.breadcrumb !== false) {
      crumbs.push({ key: route.path, title: route.meta.title })
    }
  } else {
    for (const record of route.matched) {
      if (!record.meta.title || record.meta.breadcrumb === false || record.path === home.key) continue
      crumbs.push({
        key: record.name || record.path, title: record.meta.title,
        to: crumbLink(record)
      })
    }
  }
  levelList.value = crumbs
})
</script>

<style lang='scss' scoped>
.app-breadcrumb.el-breadcrumb {
  display: inline-block;
  font-size: 14px;
  line-height: 50px;

  .no-redirect {
    color: var(--el-text-color-secondary);
    cursor: text;
  }
}
</style>
