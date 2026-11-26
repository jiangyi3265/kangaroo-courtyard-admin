import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildAdminNav, searchAdminNav } from '../src/layout/nav/buildNav.js'

const inventory = JSON.parse(readFileSync(new URL('./fixtures/admin-menu-inventory.json', import.meta.url)))
const expectedOrder = {
  '首页与经营报表': '数据看板 日报与月度任务 周报 日报明细',
  '岗位与招聘': '岗位管理 报名管理 换工审核 面试时段 责任书签署 到店信息 岗位要求选项 人才邀请 简历转发记录 新机会订阅 分享追踪',
  '线上任务': '线上任务 线上任务审核 成果提交 线下结算',
  '门店与商家': '门店管理 商家入驻申请 商家需求 门店任务 任务执行记录',
  '旅居住宿': '房源管理 房型管理 房态价格 早鸟特价 旅居订单 增值服务 服务订单 房源资质 Vlog审核 生活碎片 小院评论审核',
  '社区与活动': '社区动态 动态评论 社区活动 活动报名 公开行程 私信群聊 城市字典 心愿互助 谁是卧底管理 体验官申请',
  '用户与会员': '小程序账号 会员等级设置 会员店铺权益 积分商品与兑换 技能证书 账号注销记录',
  '财务与保险': '支付单 结算申请 订单分账与招聘费用 商家分成结算 采购报销 商家任务发布费用 分佣规则 钱包流水 收款账户 保险方案 投保申请',
  '客服与审核': '客服工单 AI客服聊天记录 常见问题 举报处理 评价管理 敏感词库 调解与徽章 申报处理',
  '员工与主理人': '员工授权 员工任务派发 荣誉定义 荣誉授予 成长里程碑 生日礼物 礼物领取 调度日志 员工操作日志 角色切换',
  '小程序内容与通知': '首页内容管理 小程序公告 站内消息 订阅消息模板 订阅发送记录 通知送达记录',
  '后台账号与系统管理': '用户管理 角色管理 菜单管理 部门管理 岗位管理 字典管理 参数设置 通知公告 操作日志 登录日志 在线用户 服务监控 缓存监控 缓存列表 数据监控'
}

function routeTree(rows) {
  const root = []
  for (const row of rows) {
    const parts = row.path.slice(1).split('/')
    const leaf = parts.pop()
    let siblings = root
    for (const [index, part] of parts.entries()) {
      const path = index === 0 ? '/' + part : part
      let parent = siblings.find(node => node.path === path)
      if (!parent) {
        parent = { path, meta: { title: index ? part : row.oldGroup }, children: [] }
        siblings.push(parent)
      }
      siblings = parent.children
    }
    siblings.push({ path: leaf, meta: { title: row.name }, hidden: row.hidden })
  }
  return root
}

test('清单 101 项各有唯一归属，并按定稿排序', () => {
  const routes = routeTree(inventory.map(row => ({ ...row, hidden: false }))).reverse()
  const before = structuredClone(routes)
  const { groups, items, byPath } = buildAdminNav(routes)
  assert.deepEqual(routes, before)
  assert.equal(items.length, 101)
  assert.equal(byPath.size, 101)
  assert.deepEqual(groups.map(g => g.title), Object.keys(expectedOrder))
  for (const group of groups) {
    assert.deepEqual(group.items.map(i => i.title.replaceAll(' ', '')), expectedOrder[group.title].split(' '))
  }
  for (const row of inventory) {
    assert.equal(byPath.get(row.path).to, row.path)
    assert.equal(byPath.get(row.path).title, row.name)
  }
  assert.equal(byPath.get('/system/post').groupTitle, '后台账号与系统管理')
  assert.equal(byPath.get('/kangaroo/job').groupTitle, '岗位与招聘')
})

test('隐藏祖先和叶子都不可见，权限子集不补菜单、空组消失', () => {
  const all = buildAdminNav(routeTree(inventory))
  assert.equal(all.items.length, 100)
  assert.ok(!all.byPath.has('/monitor/druid'))
  const routes = routeTree(inventory.filter(row => ['/system/user', '/kgstays/stay', '/system/log/operlog'].includes(row.path)))
  routes.find(r => r.path === '/system').hidden = true
  const subset = buildAdminNav(routes)
  assert.deepEqual(subset.items.map(i => i.path), ['/kgstays/stay'])
  assert.deepEqual(subset.groups.map(g => g.title), ['旅居住宿'])
  assert.deepEqual(buildAdminNav([]).groups, [])
})

test('首页开关入口只由配置编辑权限决定，排在报表之前', () => {
  const routes = [{ path: '', hidden: true, children: [{ path: '/index', meta: { title: '首页' } }] },
    ...routeTree(inventory)]
  assert.ok(!buildAdminNav(routes).byPath.has('/index'))
  const { items } = buildAdminNav(routes, { canEditConfig: true })
  assert.equal(items[0].to, '/index')
  assert.equal(items[0].label, '首页·小程序功能开关')
})

test('其他组保留真实地址、默认参数、单页包装、外链和内嵌页', () => {
  const routes = [{ path: '/wrapper', children: [
    { path: 'custom', meta: { title: '新菜单' }, query: '{"page":"2"}' },
    { path: '/absolute', meta: { title: '绝对路径' } },
    { path: 'https://example.com/docs', meta: { title: '外链' } },
    { path: 'embedded', meta: { title: '内嵌页', link: 'https://example.com' } }
  ] }]
  const { groups, byPath, items } = buildAdminNav(routes)
  assert.deepEqual(groups.map(g => g.title), ['其他'])
  assert.deepEqual(byPath.get('/wrapper/custom').to, { path: '/wrapper/custom', query: { page: '2' } })
  assert.equal(byPath.get('/absolute').label, '绝对路径')
  assert.equal(byPath.get('https://example.com/docs').external, true)
  assert.equal(byPath.get('/wrapper/embedded').to, '/wrapper/embedded')
  assert.equal(byPath.get('/wrapper/embedded').external, false)
  assert.equal(searchAdminNav(items, '新菜单')[0].path, '/wrapper/custom')
})

test('按日常说法搜索实际可见的页面', () => {
  const { items } = buildAdminNav(routeTree(inventory))
  for (const [term, path] of [
    ['退款', '/kgstays/stayorder'], ['保险', '/kgstaff/insapply'],
    ['权限', '/kangaroo/grant'], ['群码', '/kgusersvc/city']
  ]) {
    assert.ok(searchAdminNav(items, term).some(item => item.path === path))
  }
  assert.equal(searchAdminNav(items, '保险')[0].path, '/kgstaff/insplan')
  assert.deepEqual(searchAdminNav(items, '没有这个功能'), [])
})

test('只勾了目录没勾页面的空目录不进菜单；顶层外链和怪参数不出错', () => {
  const LAYOUT = { name: 'Layout' }
  const PARENT = { name: 'ParentView' }
  const isContainer = node => node.component === LAYOUT || node.component === PARENT
  const routes = [
    { path: '/emptydir', component: LAYOUT, meta: { title: '空目录' } },
    { path: '/wrap', component: LAYOUT, meta: { title: '外壳' }, children: [
      { path: 'sub', component: PARENT, meta: { title: '空二级目录' } },
      { path: 'page', meta: { title: '真页面' }, query: '[1,2]' },
      { path: 'page2', meta: { title: '真页面2' }, query: 'null' }
    ] },
    { path: 'https://example.com/help', component: LAYOUT, meta: { title: '帮助外链' } },
    null
  ]
  const { byPath } = buildAdminNav(routes, { isContainer })
  assert.equal(byPath.has('/emptydir'), false)
  assert.equal(byPath.has('/wrap/sub'), false)
  assert.equal(byPath.get('/wrap/page').to, '/wrap/page')
  assert.equal(byPath.get('/wrap/page2').to, '/wrap/page2')
  assert.equal(byPath.get('https://example.com/help').external, true)

  // 不传判断函数时保持原样（纯函数测试用）
  assert.equal(buildAdminNav(routes).byPath.has('/emptydir'), true)
  assert.deepEqual(buildAdminNav().groups, [])

  const items = [...byPath.values()]
  assert.deepEqual(searchAdminNav(items, ''), [])
  assert.deepEqual(searchAdminNav(items, '   '), [])
  assert.deepEqual(searchAdminNav(items, undefined), [])
})
