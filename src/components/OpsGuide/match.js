// 本地找流程打分与兜底菜单匹配（纯 JS，不 import @/ 或 .vue，可直接被 node --test 加载）

import { guideAdminPaths } from './guides.js'

// 口语填充词（按长度从长到短排列，避免短词抢先截断长词）
const FILLER_WORDS = [
  '请问一下', '怎么才能', '怎么操作', '在哪里看', '在哪里改', '怎么设置',
  '怎么弄', '怎么办', '怎么样', '怎么去', '在哪里', '在哪儿', '请问',
  '帮我找', '帮我看', '帮我', '帮忙', '一下子', '一下', '如何', '怎么',
  '在哪', '哪里', '哪儿', '我想', '我要', '想要', '想问', '想', '咋办', '咋',
  '这个', '那个', '一个', '可以', '吗', '呢', '啊', '呀', '吧', '的', '了'
]

// 常见口语同义词归一（单次扫描替换，避免替换结果再次命中其他规则）
const SYNONYM_MAP = {
  地区群码: '地区群码',
  群二维码: '地区群码',
  二维码: '地区群码',
  群码: '地区群码',
  开账号: '权限',
  给权限: '权限',
  开权限: '权限',
  加人: '权限',
  房子: '房源',
  民宿: '房源',
  小院: '房源',
  退钱: '退款',
  退费: '退款',
  打钱: '打款',
  转钱: '打款',
  提现: '打款',
  义工: '换工',
  弹窗: '公告',
  通知: '公告',
  关掉: '关闭',
  停用: '关闭',
  打开: '开启',
  启用: '开启',
  帖子: '社区动态',
  派发任务: '派发任务',
  派任务: '派发任务'
}

const SYNONYM_RE = new RegExp(
  Object.keys(SYNONYM_MAP).sort((a, b) => b.length - a.length).join('|'),
  'g'
)

const PUNCTUATION_RE = /[\s\p{P}\p{S}]+/gu

export function stripPunctuation(text) {
  return String(text || '').trim().toLowerCase().replace(PUNCTUATION_RE, '')
}

export function applySynonyms(text) {
  return String(text || '').replace(SYNONYM_RE, match => SYNONYM_MAP[match])
}

export function normalizeQuery(input) {
  const raw = stripPunctuation(input)
  if (!raw) return { raw: '', cleaned: '', normalized: '' }
  let cleaned = raw
  for (const word of FILLER_WORDS) {
    if (cleaned.includes(word)) cleaned = cleaned.split(word).join('')
  }
  // 去掉所有口语词后若被清空，回退到原始词
  if (!cleaned) cleaned = raw
  const normalized = applySynonyms(cleaned)
  return { raw, cleaned, normalized }
}

export function bigrams(text) {
  const s = String(text || '')
  if (s.length < 2) return []
  const set = new Set()
  for (let i = 0; i < s.length - 1; i++) {
    set.add(s.slice(i, i + 2))
  }
  return [...set]
}

function uniquePageNames(guide) {
  const set = new Set()
  for (const step of guide.steps || []) {
    if (step.pageName) set.add(step.pageName)
    for (const extra of step.extraLinks || []) {
      if (extra.pageName) set.add(extra.pageName)
    }
  }
  return [...set]
}

/** 计算单条流程与查询的相关度分数（标题 > 关键词 > 页面名） */
export function scoreGuide(queryInfo, guide) {
  const { cleaned, normalized } = queryInfo
  if (!cleaned && !normalized) return 0

  const titleRaw = stripPunctuation(guide.title)
  const titleNorm = applySynonyms(titleRaw)
  const summaryRaw = stripPunctuation(guide.summary)
  const summaryNorm = applySynonyms(summaryRaw)

  const pageNamesRaw = uniquePageNames(guide).map(stripPunctuation).filter(Boolean)
  const pageNamesNorm = pageNamesRaw.map(applySynonyms)
  const pageTextRaw = pageNamesRaw.join(' ')
  const pageTextNorm = pageNamesNorm.join(' ')

  const kwPairs = (guide.keywords || []).map(k => {
    const raw = stripPunctuation(k)
    return { raw, norm: applySynonyms(raw) }
  }).filter(k => k.raw)

  let score = 0
  let titleHits = 0
  let keywordHits = 0

  // 单字查询兜底
  if (cleaned.length === 1 && normalized.length === 1) {
    const ch = normalized
    if (titleRaw.includes(cleaned) || titleNorm.includes(ch)) score += 15
    if (kwPairs.some(k => k.raw.includes(cleaned) || k.norm.includes(ch))) score += 10
    if (pageTextRaw.includes(cleaned) || pageTextNorm.includes(ch)) score += 6
    return score
  }

  // 1. 整句 / 关键词包含加分
  if (titleRaw.includes(cleaned) || titleNorm.includes(normalized)) {
    score += 65
    titleHits += 2
  }

  const matchedKw = new Set()
  for (const kw of kwPairs) {
    if (kw.raw === cleaned || kw.norm === normalized) {
      if (!matchedKw.has('exact:' + kw.norm)) {
        matchedKw.add('exact:' + kw.norm)
        score += 55
        keywordHits += 2
      }
      continue
    }
    if (kw.raw.length >= 2 && (cleaned.includes(kw.raw) || normalized.includes(kw.norm))) {
      if (!matchedKw.has('in:' + kw.norm)) {
        matchedKw.add('in:' + kw.norm)
        score += 18 + Math.min(kw.norm.length, 6) * 3
        keywordHits += 1
      }
      continue
    }
    if (cleaned.length >= 2 && (kw.raw.includes(cleaned) || kw.norm.includes(normalized))) {
      if (!matchedKw.has('has:' + kw.norm)) {
        matchedKw.add('has:' + kw.norm)
        score += 28
        keywordHits += 1
      }
    }
  }

  for (let i = 0; i < pageNamesRaw.length; i++) {
    const pr = pageNamesRaw[i]
    const pn = pageNamesNorm[i]
    if ((cleaned.length >= 2 && (pr.includes(cleaned) || pn.includes(normalized))) ||
        (pr.length >= 2 && (cleaned.includes(pr) || normalized.includes(pn)))) {
      score += 14
      break
    }
  }

  // 2. 2 字切片重叠（标题 10 > 关键词 6 > 页面名 4 > 简介 2）
  const grams = new Set([...bigrams(normalized), ...bigrams(cleaned)])
  const kwTextRaw = kwPairs.map(k => k.raw).join(' ')
  const kwTextNorm = kwPairs.map(k => k.norm).join(' ')

  for (const g of grams) {
    let hit = false
    if (titleRaw.includes(g) || titleNorm.includes(g)) {
      score += 10
      titleHits += 1
      hit = true
    }
    if (kwTextRaw.includes(g) || kwTextNorm.includes(g)) {
      score += 6
      keywordHits += 1
      hit = true
    }
    if (pageTextRaw.includes(g) || pageTextNorm.includes(g)) {
      score += 4
      hit = true
    }
    if (!hit && (summaryRaw.includes(g) || summaryNorm.includes(g))) {
      score += 2
    }
  }

  // 过滤只有微弱简介字面巧合的噪音结果
  if (score < 8 || (titleHits === 0 && keywordHits === 0 && score < 12)) {
    return 0
  }
  return score
}

/** 按自然语言问法匹配最相关的流程列表 */
export function matchGuides(query, guides, { limit = 6 } = {}) {
  const info = normalizeQuery(query)
  if (!info.raw) return []

  const ranked = []
  guides.forEach((guide, index) => {
    const score = scoreGuide(info, guide)
    if (score > 0) ranked.push({ guide, score, index })
  })

  ranked.sort((a, b) => b.score - a.score || a.index - b.index)
  return ranked.slice(0, limit).map(r => r.guide)
}

/** 没命中流程时，用侧边栏菜单项按名字 / 关键词兜底找「直接打开」的页面 */
export function searchFallbackMenus(query, navItems, { limit = 8 } = {}) {
  const info = normalizeQuery(query)
  if (!info.raw || !Array.isArray(navItems) || !navItems.length) return []

  const grams = new Set([...bigrams(info.normalized), ...bigrams(info.cleaned)])
  const scored = []

  navItems.forEach((item, index) => {
    const labelRaw = stripPunctuation(item.label)
    const titleRaw = stripPunctuation(item.title)
    const groupRaw = stripPunctuation(item.groupTitle)
    const oldGroupRaw = stripPunctuation(item.oldGroup)
    const kwRaw = (item.keywords || []).map(stripPunctuation)

    const labelNorm = applySynonyms(labelRaw)
    const titleNorm = applySynonyms(titleRaw)
    const kwNorm = kwRaw.map(applySynonyms)

    let score = 0
    if (labelRaw.includes(info.cleaned) || labelNorm.includes(info.normalized) ||
        titleRaw.includes(info.cleaned) || titleNorm.includes(info.normalized)) {
      score += 40
    }
    if (kwRaw.some(k => k && (k.includes(info.cleaned) || info.cleaned.includes(k))) ||
        kwNorm.some(k => k && (k.includes(info.normalized) || info.normalized.includes(k)))) {
      score += 24
    }
    if (info.cleaned.length >= 2 && (groupRaw.includes(info.cleaned) || oldGroupRaw.includes(info.cleaned))) {
      score += 10
    }
    if (score === 0 && grams.size > 0) {
      const hay = [labelRaw, labelNorm, titleRaw, titleNorm, ...kwRaw, ...kwNorm].join(' ')
      for (const g of grams) {
        if (hay.includes(g)) score += 6
      }
    }

    if (score >= 10) scored.push({ item, score, index })
  })

  scored.sort((a, b) => b.score - a.score || a.index - b.index)
  return scored.slice(0, limit).map(s => s.item)
}

// 「新增菜单」「打开用户管理」这类问法：去掉菜单名后只剩这些动作词，也算点名要这个页面
const ACTION_WORDS_RE = /新增|添加|增加|新建|修改|编辑|删除|查看|查询|打开|进入|设置|配置|管理|页面|菜单/g

function menuNameVariants(item) {
  const set = new Set()
  for (const name of [item.label, item.title]) {
    const text = String(name || '')
    if (!text) continue
    set.add(stripPunctuation(text))
    // 「岗位管理（系统职务）」也认「岗位管理」
    set.add(stripPunctuation(text.replace(/[（(][^）)]*[）)]/g, '')))
    // 「首页·小程序功能开关」也认「小程序功能开关」
    for (const part of text.split(/[·・]/)) set.add(stripPunctuation(part))
  }
  set.delete('')
  return [...set]
}

/**
 * 问法里直接点了菜单名时，给出可「直接打开」的页面（就算同时命中了流程也给）。
 * 只认菜单名：整名相同、问法包含整个菜单名、或去掉「管理」后的名字 + 动作词（如「新增菜单」）。
 */
export function directMenuHits(query, navItems, { limit = 3 } = {}) {
  const info = normalizeQuery(query)
  if (!info.raw || !Array.isArray(navItems) || !navItems.length) return []
  const asked = [...new Set([info.raw, info.cleaned].filter(Boolean))]

  const scored = []
  navItems.forEach((item, index) => {
    let score = 0
    for (const name of menuNameVariants(item)) {
      for (const q of asked) {
        if (q === name) score = Math.max(score, 100)
        else if (name.length >= 3 && q.includes(name)) score = Math.max(score, 80)
        else if (q.length >= 3 && name.length > q.length && name.startsWith(q)) score = Math.max(score, 60)
        const core = name.replace(/管理$/, '')
        if (core.length >= 2 && core !== name && q.includes(core) &&
            !q.split(core).join('').replace(ACTION_WORDS_RE, '')) {
          score = Math.max(score, 50)
        }
      }
    }
    if (score > 0) scored.push({ item, score, index })
  })

  scored.sort((a, b) => b.score - a.score || a.index - b.index)
  return scored.slice(0, limit).map(s => s.item)
}

/** 判断某条流程是否与当前页面路径相关 */
export function guideMatchesPath(guide, currentPath) {
  if (!currentPath) return false
  const clean = String(currentPath).replace(/\/+$/, '') || '/'
  return guideAdminPaths(guide).includes(clean)
}

/** 按当前账号可打开的页面，把流程拆成「可用流程」和「全部页面都无权限的流程」 */
export function partitionGuidesByAccess(guides, canOpenPage) {
  const accessible = []
  const locked = []
  for (const guide of guides) {
    const paths = guideAdminPaths(guide)
    const ok = paths.length > 0 && paths.some(p => canOpenPage(p))
    if (ok) accessible.push(guide)
    else locked.push(guide)
  }
  return { accessible, locked }
}
