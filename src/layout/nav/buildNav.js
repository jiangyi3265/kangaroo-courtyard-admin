import { navGroups, labels, keywords } from './navMap.js'

const externalPath = /^(https?:|mailto:|tel:)/
const groupForPath = new Map(navGroups.flatMap(group => group.paths.map(path => [path, group.id])))

function resolvePath(parent, child = '') {
  child = child || ''
  if (externalPath.test(child)) return child
  if (externalPath.test(parent)) return parent
  const path = child.startsWith('/') ? child : parent + '/' + child
  return path.replace(/\/+/g, '/').replace(/\/$/, '') || '/'
}

function target(path, query) {
  if (!query || externalPath.test(path)) return path
  try {
    const parsed = typeof query === 'string' ? JSON.parse(query) : query
    // 只有「键=值」形式的参数才带上，其他写法（数字、数组、null）当没填
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return path
    return { path, query: { ...parsed } }
  } catch {
    // Invalid legacy query data must not prevent the remaining menus from rendering.
    return path
  }
}

// isContainer：判断是不是「目录」壳子（Layout / ParentView）。由调用方传入，这个文件不依赖 .vue
export function buildAdminNav(routes = [], { canEditConfig = false, isContainer } = {}) {
  const groups = navGroups.map(({ id, title, icon }) => ({ id, title, icon, items: [] }))
  const byGroup = new Map(groups.map(group => [group.id, group]))
  const byPath = new Map()

  function add(path, title, query, oldGroup) {
    if (byPath.has(path)) return
    const group = byGroup.get(groupForPath.get(path) || 'other')
    const item = {
      id: path, path, to: target(path, query), title, label: labels[path] || title,
      groupId: group.id, groupTitle: group.title, oldGroup,
      keywords: [...(keywords[path] || [])], external: externalPath.test(path)
    }
    group.items.push(item)
    byPath.set(path, item)
  }

  function visit(nodes, parent, oldGroup) {
    for (const node of nodes || []) {
      if (!node || node.hidden) continue
      const path = resolvePath(parent, node.path)
      const title = node.meta?.title
      if (node.children?.length) {
        visit(node.children, path, oldGroup || title || '')
      } else if (!externalPath.test(path) && isContainer?.(node)) {
        // 角色只勾了目录、没勾里面的页面：目录点进去是空白，不放进菜单
        continue
      } else if (title && path !== '/index') {
        add(path, title, node.query, oldGroup)
      }
    }
  }

  if (canEditConfig) add('/index', '首页', undefined, '')
  visit(routes, '', '')
  for (const { id, paths } of navGroups) {
    if (paths.length) byGroup.get(id).items = paths.map(path => byPath.get(path)).filter(Boolean)
  }
  return {
    groups: groups.filter(group => group.items.length),
    items: groups.flatMap(group => group.items),
    byPath
  }
}

export function searchAdminNav(items, text) {
  const term = String(text || '').trim().toLowerCase()
  if (!term) return []
  const pages = []
  const groups = []
  const matches = value => typeof value === 'string' && value.toLowerCase().includes(term)
  for (const item of items) {
    if ([item.label, item.title, ...item.keywords].some(matches)) pages.push(item)
    else if ([item.groupTitle, item.oldGroup].some(matches)) groups.push(item)
  }
  return pages.concat(groups)
}
