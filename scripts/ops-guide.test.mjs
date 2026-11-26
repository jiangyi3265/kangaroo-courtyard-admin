import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { GUIDES, GUIDE_GROUPS, QUICK_QUERIES, guideAdminPaths } from '../src/components/OpsGuide/guides.js'
import { labels as navLabels } from '../src/layout/nav/navMap.js'
import {
  directMenuHits,
  matchGuides,
  normalizeQuery,
  searchFallbackMenus,
  guideMatchesPath,
  partitionGuidesByAccess
} from '../src/components/OpsGuide/match.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')
const inventory = JSON.parse(
  readFileSync(resolve(__dirname, 'fixtures/admin-menu-inventory.json'), 'utf8')
)
const validPaths = new Set(['/index', ...inventory.map(item => item.path)])

test('guides.js 基本完整性：23 条流程、ID 唯一、每条至少一步、不收录角色切换', () => {
  assert.equal(GUIDES.length, 23)
  assert.equal(QUICK_QUERIES.length, 6)

  const ids = new Set()
  const groupMap = new Map(GUIDE_GROUPS.map(g => [g.id, g.title]))

  for (const guide of GUIDES) {
    assert.ok(guide.id && typeof guide.id === 'string', '缺少 id')
    assert.ok(!ids.has(guide.id), `重复的流程 id: ${guide.id}`)
    ids.add(guide.id)

    assert.equal(groupMap.get(guide.groupId), guide.groupTitle, `分组不匹配: ${guide.id}`)
    assert.ok(guide.title && guide.summary, `缺少标题或摘要: ${guide.id}`)
    assert.ok(Array.isArray(guide.steps) && guide.steps.length >= 1, `至少一步: ${guide.id}`)

    const allPaths = guideAdminPaths(guide)
    assert.ok(allPaths.length >= 1, `流程 ${guide.id} 至少关联一个后台页面`)
    assert.ok(!allPaths.includes('/kangaroo/roleswitch'), '不应收录角色切换')

    for (const p of allPaths) {
      assert.ok(validPaths.has(p), `流程 ${guide.id} 包含未在清单里的路径: ${p}`)
    }

    for (const step of guide.steps) {
      assert.ok(step.where === 'admin' || step.where === 'miniprogram', `非法步骤类型: ${guide.id}`)
      assert.ok(step.text && step.text.trim().length > 0, `步骤文案不能为空: ${guide.id}`)
      if (step.where === 'admin') {
        assert.ok(step.path && validPaths.has(step.path), `后台步骤路径非法: ${guide.id} -> ${step.path}`)
        assert.ok(step.pageName, `后台步骤缺少页面名: ${guide.id}`)
      } else {
        assert.equal(step.path, undefined, `小程序步骤不应有后台跳转路径: ${guide.id}`)
      }
    }
  }
})

test('快捷词与常见口语问法第一名精准命中预期流程', () => {
  const cases = [
    // 6 个快捷词
    ['发布岗位', 'publish-job'],
    ['上架房源', 'publish-stay'],
    ['开员工权限', 'staff-permissions'],
    ['处理退款', 'stay-refund'],
    ['换地区群码', 'city-group-qr'],
    ['发日报催报', 'reports-and-reminders'],
    // 方案定稿列举的常见问法
    ['怎么上架房子', 'publish-stay'],
    ['员工怎么开权限', 'staff-permissions'],
    ['客人要退钱', 'stay-refund'],
    ['群二维码过期了', 'city-group-qr'],
    ['怎么发公告', 'notice-and-homepick'],
    ['怎么关掉心愿功能', 'feature-switches'],
    // 其余核心业务问法
    ['怎么新增门店传采访视频', 'create-store'],
    ['义工报名怎么审核录用', 'application-flow'],
    ['怎么设置面试时段', 'interview-slots'],
    ['怎么发布线上任务', 'online-task'],
    ['社区动态怎么审核加敏感词', 'community-moderation'],
    ['怎么创建社区活动看报名', 'community-activity'],
    ['怎么改会员等级和积分商品', 'member-and-points'],
    ['商家入驻和商家需求怎么处理', 'merchant-onboarding'],
    ['怎么登记保单和保险退费', 'insurance-flow'],
    ['提现结算怎么打款', 'withdraw-settlement'],
    ['怎么回复客服工单', 'support-ticket-faq'],
    ['纠纷调解申诉怎么复核', 'dispute-mediation'],
    ['小院采购报销怎么审核', 'reimburse-audit'],
    ['怎么给全体员工派发任务', 'staff-task'],
    ['心愿互助怎么审核打款', 'wish-audit']
  ]

  for (const [query, expectedId] of cases) {
    const hits = matchGuides(query, GUIDES)
    assert.ok(hits.length > 0, `问法「${query}」没有命中任何流程`)
    assert.equal(
      hits[0].id,
      expectedId,
      `问法「${query}」第一名期望 ${expectedId}，实际为 ${hits[0].id}（前3：${hits.slice(0, 3).map(g => g.id).join(', ')}）`
    )
  }
})

test('口语词清理与同义词归一正常工作', () => {
  assert.equal(normalizeQuery('请问一下怎么上架房子？').normalized, '上架房源')
  assert.equal(normalizeQuery('客人要退钱怎么办').normalized, '客人要退款')
  assert.equal(normalizeQuery('群二维码过期了').normalized, '地区群码过期')
})

test('未命中流程时，兜底菜单搜索能找到对应页面', () => {
  assert.deepEqual(matchGuides('缓存监控', GUIDES), [])
  assert.deepEqual(matchGuides('谁是卧底', GUIDES), [])

  const navItems = inventory.map(m => ({
    path: m.path,
    label: m.name,
    title: m.name,
    groupTitle: m.oldGroup,
    oldGroup: m.oldGroup,
    keywords: []
  }))

  const cacheHits = searchFallbackMenus('缓存监控', navItems)
  assert.ok(cacheHits.some(i => i.path === '/monitor/cache'), '兜底应找到缓存监控')

  const undercoverHits = searchFallbackMenus('谁是卧底', navItems)
  assert.ok(undercoverHits.some(i => i.path === '/kangaroo/undercover'), '兜底应找到谁是卧底管理')
})

test('问法直接点了菜单名时，就算命中了流程也给「直接打开」', () => {
  const navItems = [
    { path: '/index', label: navLabels['/index'], title: '首页', groupTitle: '首页与经营报表', keywords: [] },
    ...inventory.map(m => ({
      path: m.path,
      label: navLabels[m.path] || m.name,
      title: m.name,
      groupTitle: m.oldGroup,
      keywords: []
    }))
  ]
  const first = q => directMenuHits(q, navItems)[0]?.path

  assert.equal(first('通知送达记录'), '/kangaroo/deliveries')
  assert.equal(first('岗位管理（系统职务）'), '/system/post')
  assert.equal(first('怎么新增菜单'), '/system/menu')
  assert.equal(first('打开用户管理'), '/system/user')
  assert.equal(first('小程序功能开关'), '/index')
  assert.ok(directMenuHits('岗位管理', navItems).some(i => i.path === '/kangaroo/job'))

  // 普通业务问法不乱给页面
  assert.deepEqual(directMenuHits('客人要退钱', navItems), [])
  assert.deepEqual(directMenuHits('群二维码过期了', navItems), [])
  assert.deepEqual(directMenuHits('上架房源', navItems), [])
})

test('当前页面匹配与权限分组：全部页面无权限的流程折叠收底', () => {
  const stayMatched = GUIDES.filter(g => guideMatchesPath(g, '/kgstays/stay'))
  assert.ok(stayMatched.some(g => g.id === 'publish-stay'))

  // 仅有岗位管理权限的账号
  const onlyJob = partitionGuidesByAccess(GUIDES, path => path === '/kangaroo/job')
  assert.ok(onlyJob.accessible.some(g => g.id === 'publish-job'))
  assert.ok(onlyJob.locked.some(g => g.id === 'publish-stay'))
  assert.ok(onlyJob.locked.some(g => g.id === 'feature-switches'))

  // 仅有 system:config:edit（只能打开 /index）的账号
  const onlySwitch = partitionGuidesByAccess(GUIDES, path => path === '/index')
  assert.deepEqual(onlySwitch.accessible.map(g => g.id), ['feature-switches'])
  assert.equal(onlySwitch.locked.length, 22)
})

test('OpsGuide 组件与 Navbar 接线满足硬要求（电脑不遮罩可穿透、手机自动收起、使用 CSS 变量）', () => {
  // 按钮和抽屉在 index.vue；面板内容拆到 GuidePanel.vue，第一次点开才加载
  const shellSrc = readFileSync(resolve(rootDir, 'src/components/OpsGuide/index.vue'), 'utf8')
  const panelSrc = readFileSync(resolve(rootDir, 'src/components/OpsGuide/GuidePanel.vue'), 'utf8')
  const vueSrc = shellSrc + '\n' + panelSrc
  assert.ok(shellSrc.includes("await import('./GuidePanel.vue')"), '面板应按需加载')
  assert.ok(shellSrc.includes('loadFailed') && shellSrc.includes('重试'), '面板没下载下来时应能重试')
  assert.ok(shellSrc.includes('关闭操作向导'), '加载中/失败时也要能关掉抽屉')
  assert.ok(!/from '\.\/guides\.js'|from '\.\/match\.js'/.test(shellSrc), '按钮文件不应直接引入流程数据（否则进首屏包）')
  assert.ok(panelSrc.includes("emit('close')"), '面板关闭/手机跳转后应通知外层收起')
  const navbarSrc = readFileSync(resolve(rootDir, 'src/layout/components/Navbar.vue'), 'utf8')

  assert.ok(vueSrc.includes("import { useAdminNav } from '@/layout/nav'"), '应接入 useAdminNav')
  assert.ok(vueSrc.includes(':modal="isMobile"'), '电脑端应关闭遮罩 :modal="false"')
  assert.ok(vueSrc.includes(':modal-penetrable="!isMobile"'), '电脑端应开启 modal-penetrable')
  assert.ok(vueSrc.includes("size=\"420px\"") || vueSrc.includes("'420px'"), '电脑端抽屉宽应为 420px')
  assert.ok(vueSrc.includes("if (isMobile.value)"), '手机端跳转后应自动收起')
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(vueSrc), '样式不应写死十六进制颜色，应使用 Element Plus CSS 变量')

  assert.ok(navbarSrc.includes("import OpsGuide from '@/components/OpsGuide/index.vue'"), 'Navbar 应引入 OpsGuide')
  assert.ok(navbarSrc.includes('<ops-guide />'), 'Navbar 应渲染 <ops-guide />')
  const bellIdx = navbarSrc.indexOf('<merchant-request-bell />')
  const guideIdx = navbarSrc.indexOf('<ops-guide />')
  const desktopOnlyIdx = navbarSrc.indexOf("v-if=\"appStore.device !== 'mobile'\"")
  assert.ok(bellIdx > 0 && guideIdx > bellIdx && guideIdx < desktopOnlyIdx, '按钮应在铃铛旁且手机端也显示')
})
