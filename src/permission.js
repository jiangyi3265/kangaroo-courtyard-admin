import router from './router'
import { ElMessageBox } from 'element-plus'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import { getToken } from '@/utils/auth'
import { isHttp, isPathMatch } from '@/utils/validate'
import { isRelogin } from '@/utils/request'
import useUserStore from '@/store/modules/user'
import useSettingsStore from '@/store/modules/settings'
import usePermissionStore from '@/store/modules/permission'

NProgress.configure({ showSpinner: false })

const whiteList = ['/login', '/register']

const isWhiteList = (path) => {
  return whiteList.some(pattern => isPathMatch(pattern, path))
}

// 多个受保护的地址在首屏同时触发导航时，共用一次初始化和重试提示。
let initializingRoutes

async function initializeRoutes() {
  const user = useUserStore()
  isRelogin.show = true
  try {
    while (true) {
      try {
        await user.getInfo()
        const routes = await usePermissionStore().generateRoutes()
        routes.filter(route => !isHttp(route.path)).forEach(route => router.addRoute(route))
        return true
      } catch {
        try {
          await ElMessageBox.confirm('未能加载账号或菜单。可以重试，也可以返回登录。', '后台加载失败', {
            confirmButtonText: '重试', cancelButtonText: '返回登录',
            showClose: false, closeOnClickModal: false, closeOnPressEscape: false
          })
        } catch {
          // 网络断开时也允许退出当前浏览器里的账号。
          await user.logOut().catch(() => user.clearSession())
          return false
        }
      }
    }
  } finally {
    isRelogin.show = false
  }
}

router.beforeEach(async (to, from, next) => {
  NProgress.start()
  if (getToken()) {
    to.meta.title && useSettingsStore().setTitle(to.meta.title)
    /* has token*/
    if (to.path === '/login') {
      next({ path: '/' })
      NProgress.done()
    } else if (isWhiteList(to.path)) {
      next()
    } else {
      if (initializingRoutes || useUserStore().roles.length === 0) {
        if (!initializingRoutes) {
          initializingRoutes = initializeRoutes().finally(() => { initializingRoutes = undefined })
        }
        const ready = await initializingRoutes
        next(ready ? { ...to, replace: true } : { path: '/login', query: { redirect: to.fullPath }, replace: true })
      } else {
        next()
      }
    }
  } else {
    // 没有token
    if (isWhiteList(to.path)) {
      // 在免登录白名单，直接进入
      next()
    } else {
      next(`/login?redirect=${to.fullPath}`) // 否则全部重定向到登录页
      NProgress.done()
    }
  }
})

router.afterEach(() => {
  NProgress.done()
})
