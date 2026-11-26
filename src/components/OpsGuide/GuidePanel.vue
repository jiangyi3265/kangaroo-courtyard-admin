<template>
  <div class="ops-guide-panel">
    <header class="ops-guide-header">
      <div class="ops-guide-header__left">
        <el-button
          v-if="activeGuide"
          link
          type="primary"
          class="ops-guide-back"
          @click="activeGuide = null"
        >
          <el-icon><ArrowLeft /></el-icon>
          <span>返回目录</span>
        </el-button>
        <div v-else class="ops-guide-title">
          <el-icon class="ops-guide-title__icon"><Guide /></el-icon>
          <span>操作向导</span>
        </div>
      </div>
      <el-button link class="ops-guide-close" aria-label="关闭操作向导" @click="emit('close')">
        <el-icon><Close /></el-icon>
      </el-button>
    </header>

    <!-- 流程详情视图 -->
    <div v-if="activeGuide" class="ops-guide-body">
      <div class="ops-detail-head">
        <el-tag size="small" effect="plain">{{ activeGuide.groupTitle }}</el-tag>
        <h3 class="ops-detail-title">{{ activeGuide.title }}</h3>
        <p class="ops-detail-summary">{{ activeGuide.summary }}</p>
      </div>

      <ol class="ops-steps">
        <li v-for="(step, idx) in activeGuide.steps" :key="idx" class="ops-step">
          <div class="ops-step__top">
            <span class="ops-step__num">{{ idx + 1 }}</span>
            <el-tag
              size="small"
              :type="step.where === 'admin' ? 'primary' : 'warning'"
              effect="light"
            >
              {{ step.where === 'admin' ? '后台操作' : '小程序里完成' }}
            </el-tag>
          </div>

          <p class="ops-step__text">{{ step.text }}</p>

          <!-- 后台操作步骤：提供「带我去」或当前页 / 权限提示；小程序步骤不给跳转按钮 -->
          <div v-if="step.where === 'admin'" class="ops-step__actions">
            <div v-for="link in stepLinks(step)" :key="link.path" class="ops-step__link-row">
              <div class="ops-step__link-line">
                <span class="ops-step__page">{{ pageDisplayName(link) }}</span>
                <template v-if="canOpenPage(link.path)">
                  <el-tag v-if="isCurrentPage(link.path)" size="small" type="success" effect="plain">
                    当前就在这个页面
                  </el-tag>
                  <el-button
                    v-else
                    size="small"
                    type="primary"
                    plain
                    @click="goToPage(link.path)"
                  >
                    带我去
                  </el-button>
                </template>
                <span v-else class="ops-step__no-perm">需要管理员开通权限</span>
              </div>
              <p
                v-if="canOpenPage(link.path) && link.perm && !hasPerm(link.perm)"
                class="ops-step__perm-tip"
              >
                这一步需要管理员开通「{{ link.permLabel || link.perm }}」权限
              </p>
            </div>
          </div>
        </li>
      </ol>

      <div class="ops-detail-footer">
        <el-button plain style="width: 100%" @click="activeGuide = null">返回流程目录</el-button>
      </div>
    </div>

    <!-- 目录 & 搜索视图 -->
    <div v-else class="ops-guide-body">
      <div class="ops-search-box">
        <el-input
          v-model="query"
          clearable
          placeholder="你想做什么？例如：上架房子、退钱、开权限"
          aria-label="搜索操作流程"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <div class="ops-quick-tags" aria-label="快捷问题">
          <button
            v-for="tag in QUICK_QUERIES"
            :key="tag"
            type="button"
            class="ops-quick-tag"
            :class="{ 'is-selected': query.trim() === tag }"
            @click="pickQuick(tag)"
          >
            {{ tag }}
          </button>
        </div>
      </div>

      <!-- 搜索结果 -->
      <template v-if="hasQuery">
        <!-- 问法里直接点了菜单名：先给「直接打开」，下面再列相关流程 -->
        <section v-if="matchedGuides.length && directMenus.length" class="ops-section">
          <div class="ops-section__head">
            <h4>直接打开</h4>
          </div>
          <div class="ops-fallback-list">
            <div v-for="item in directMenus" :key="item.path" class="ops-fallback-item">
              <div class="ops-fallback-item__info">
                <span class="ops-fallback-item__label">{{ item.label }}</span>
                <span class="ops-fallback-item__group">{{ item.groupTitle }}</span>
              </div>
              <el-tag v-if="isCurrentPage(item.path)" size="small" type="success" effect="plain">
                当前页
              </el-tag>
              <el-button v-else size="small" type="primary" plain @click="goToMenuItem(item)">
                打开
              </el-button>
            </div>
          </div>
        </section>

        <section v-if="matchedGuides.length" class="ops-section">
          <div class="ops-section__head">
            <h4>为你找到 {{ matchedGuides.length }} 条相关流程</h4>
          </div>
          <div class="ops-card-list">
            <button
              v-for="g in matchedGuides"
              :key="g.id"
              type="button"
              class="ops-card"
              @click="selectGuide(g)"
            >
              <div class="ops-card__main">
                <div class="ops-card__title-row">
                  <span class="ops-card__title">{{ g.title }}</span>
                  <el-tag v-if="lockedIds.has(g.id)" size="small" type="info" effect="plain">需开权限</el-tag>
                </div>
                <p class="ops-card__summary">{{ g.summary }}</p>
                <span class="ops-card__group">{{ g.groupTitle }}</span>
              </div>
              <el-icon class="ops-card__arrow"><ArrowRight /></el-icon>
            </button>
          </div>
        </section>

        <!-- 没命中流程：兜底列出可直接打开的菜单 + 下方继续给全部流程目录 -->
        <template v-else>
          <div class="ops-empty-hint">
            没有直接匹配到操作流程，可以试试换个说法，或直接打开相关页面。
          </div>

          <section v-if="fallbackMenus.length" class="ops-section">
            <div class="ops-section__head">
              <h4>直接打开</h4>
            </div>
            <div class="ops-fallback-list">
              <div v-for="item in fallbackMenus" :key="item.path" class="ops-fallback-item">
                <div class="ops-fallback-item__info">
                  <span class="ops-fallback-item__label">{{ item.label }}</span>
                  <span class="ops-fallback-item__group">{{ item.groupTitle }}</span>
                </div>
                <el-tag v-if="isCurrentPage(item.path)" size="small" type="success" effect="plain">
                  当前页
                </el-tag>
                <el-button
                  v-else
                  size="small"
                  type="primary"
                  plain
                  @click="goToMenuItem(item)"
                >
                  打开
                </el-button>
              </div>
            </div>
          </section>
        </template>
      </template>

      <!-- 非搜索态（或搜索未命中兜底时）：展示当前页相关 + 常用流程目录 + 无权限折叠区 -->
      <template v-if="!hasQuery || !matchedGuides.length">
        <section v-if="!hasQuery && currentPageGuides.length" class="ops-section ops-section--current">
          <div class="ops-section__head">
            <h4>当前页面相关</h4>
          </div>
          <div class="ops-card-list">
            <button
              v-for="g in currentPageGuides"
              :key="g.id"
              type="button"
              class="ops-card ops-card--current"
              @click="selectGuide(g)"
            >
              <div class="ops-card__main">
                <span class="ops-card__title">{{ g.title }}</span>
                <p class="ops-card__summary">{{ g.summary }}</p>
              </div>
              <el-icon class="ops-card__arrow"><ArrowRight /></el-icon>
            </button>
          </div>
        </section>

        <section v-if="groupedAccessible.length" class="ops-section">
          <div class="ops-section__head">
            <h4>常用流程</h4>
          </div>
          <div v-for="group in groupedAccessible" :key="group.id" class="ops-group">
            <div class="ops-group__title">{{ group.title }}</div>
            <div class="ops-card-list">
              <button
                v-for="g in group.guides"
                :key="g.id"
                type="button"
                class="ops-card"
                @click="selectGuide(g)"
              >
                <div class="ops-card__main">
                  <span class="ops-card__title">{{ g.title }}</span>
                  <p class="ops-card__summary">{{ g.summary }}</p>
                </div>
                <el-icon class="ops-card__arrow"><ArrowRight /></el-icon>
              </button>
            </div>
          </div>
        </section>

        <section v-if="lockedGuides.length" class="ops-section ops-section--locked">
          <el-collapse v-model="lockedCollapse">
            <el-collapse-item name="locked">
              <template #title>
                <span class="ops-locked-title">
                  需要管理员开通权限的流程（{{ lockedGuides.length }}）
                </span>
              </template>
              <div class="ops-card-list">
                <button
                  v-for="g in lockedGuides"
                  :key="g.id"
                  type="button"
                  class="ops-card ops-card--locked"
                  @click="selectGuide(g)"
                >
                  <div class="ops-card__main">
                    <span class="ops-card__title">{{ g.title }}</span>
                    <span class="ops-card__group">{{ g.groupTitle }}</span>
                  </div>
                  <el-icon class="ops-card__arrow"><ArrowRight /></el-icon>
                </button>
              </div>
            </el-collapse-item>
          </el-collapse>
        </section>
      </template>
    </div>
  </div>
</template>

<script setup name="OpsGuidePanel">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, ArrowRight, Close, Guide, Search } from '@element-plus/icons-vue'
import useAppStore from '@/store/modules/app'
import { checkPermi } from '@/utils/permission'
import { useAdminNav } from '@/layout/nav'
import { GUIDES, GUIDE_GROUPS, QUICK_QUERIES } from './guides.js'
import {
  directMenuHits,
  guideMatchesPath,
  matchGuides,
  partitionGuidesByAccess,
  searchFallbackMenus
} from './match.js'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const nav = useAdminNav()

const emit = defineEmits(['close'])
const query = ref('')
const activeGuide = ref(null)
const lockedCollapse = ref([])

const isMobile = computed(() => appStore.device === 'mobile')
const hasQuery = computed(() => query.value.trim().length > 0)

function normalizePath(path) {
  return String(path || '').replace(/\/+$/, '') || '/'
}

function canOpenPage(path) {
  if (!path) return false
  const clean = normalizePath(path)
  if (clean === '/index') return checkPermi(['system:config:edit'])
  return nav.byPath.has(clean)
}

function hasPerm(perm) {
  return checkPermi([perm])
}

function isCurrentPage(path) {
  return normalizePath(route.path) === normalizePath(path)
}

const partitioned = computed(() => partitionGuidesByAccess(GUIDES, canOpenPage))
const accessibleGuides = computed(() => partitioned.value.accessible)
const lockedGuides = computed(() => partitioned.value.locked)
const lockedIds = computed(() => new Set(lockedGuides.value.map(g => g.id)))

const currentPageGuides = computed(() => {
  const path = normalizePath(route.path)
  return accessibleGuides.value.filter(g => guideMatchesPath(g, path))
})

const groupedAccessible = computed(() => {
  const byGroup = new Map(GUIDE_GROUPS.map(g => [g.id, { ...g, guides: [] }]))
  for (const guide of accessibleGuides.value) {
    const bucket = byGroup.get(guide.groupId)
    if (bucket) bucket.guides.push(guide)
  }
  return [...byGroup.values()].filter(g => g.guides.length > 0)
})

const matchedGuides = computed(() => {
  if (!hasQuery.value) return []
  return matchGuides(query.value, GUIDES, { limit: 6 })
})

// 点名菜单的命中（如「通知送达记录」「怎么新增菜单」），有没有命中流程都给
const directMenus = computed(() => {
  if (!hasQuery.value) return []
  return directMenuHits(query.value, nav.items, { limit: 3 })
})

const fallbackMenus = computed(() => {
  if (!hasQuery.value || matchedGuides.value.length > 0) return []
  const seen = new Set()
  return [...directMenus.value, ...searchFallbackMenus(query.value, nav.items, { limit: 8 })]
    .filter(item => !seen.has(item.path) && seen.add(item.path))
    .slice(0, 8)
})

function pickQuick(tag) {
  query.value = query.value.trim() === tag ? '' : tag
}

function selectGuide(guide) {
  activeGuide.value = guide
}

function stepLinks(step) {
  const list = []
  if (step.path) {
    list.push({
      path: step.path,
      pageName: step.pageName,
      perm: step.perm,
      permLabel: step.permLabel
    })
  }
  if (Array.isArray(step.extraLinks)) {
    for (const extra of step.extraLinks) {
      if (extra?.path) list.push(extra)
    }
  }
  return list
}

function pageDisplayName(link) {
  const item = nav.byPath.get(normalizePath(link.path))
  return item?.label || link.pageName || link.path
}

function goToPage(path) {
  if (!canOpenPage(path)) return
  const clean = normalizePath(path)
  const item = nav.byPath.get(clean)
  if (item?.external) {
    window.open(item.path, '_blank', 'noopener,noreferrer')
  } else {
    router.push(item?.to || clean)
  }
  // 手机上抽屉是全屏的：跳过去以后自动收起，才能看到目标页面
  if (isMobile.value) {
    emit('close')
  }
}

function goToMenuItem(item) {
  if (!item) return
  if (item.external) {
    window.open(item.path, '_blank', 'noopener,noreferrer')
  } else {
    router.push(item.to || item.path)
  }
  // 手机上抽屉是全屏的：跳过去以后自动收起，才能看到目标页面
  if (isMobile.value) {
    emit('close')
  }
}
</script>

<style lang="scss" scoped>
.ops-guide-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--el-bg-color);
  color: var(--el-text-color-primary);
}

.ops-guide-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;

  &__left {
    display: flex;
    align-items: center;
    min-width: 0;
  }
}

.ops-guide-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);

  &__icon {
    color: var(--el-color-primary);
    font-size: 18px;
  }
}

.ops-guide-back {
  padding: 0;
  font-size: 14px;
  font-weight: 500;
}

.ops-guide-close {
  padding: 4px;
  font-size: 18px;
  color: var(--el-text-color-secondary);

  &:hover {
    color: var(--el-text-color-primary);
  }
}

.ops-guide-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px 16px 24px;
  -webkit-overflow-scrolling: touch;
}

.ops-search-box {
  margin-bottom: 16px;
}

.ops-quick-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.ops-quick-tag {
  padding: 4px 10px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 12px;
  background: var(--el-fill-color-lighter);
  color: var(--el-text-color-regular);
  font-size: 12px;
  line-height: 1.5;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;

  &:hover,
  &.is-selected {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
  }
}

.ops-section {
  margin-bottom: 18px;

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;

    h4 {
      margin: 0;
      font-size: 13px;
      font-weight: 600;
      color: var(--el-text-color-secondary);
    }
  }
}

.ops-group {
  margin-bottom: 14px;

  &__title {
    margin: 0 0 6px;
    font-size: 12px;
    font-weight: 600;
    color: var(--el-text-color-secondary);
  }
}

.ops-card-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ops-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-blank);
  color: var(--el-text-color-primary);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s, background-color 0.2s;

  &:hover {
    border-color: var(--el-color-primary-light-5);
    background: var(--el-fill-color-light);
  }

  &--current {
    border-color: var(--el-color-primary-light-7);
    background: var(--el-color-primary-light-9);

    &:hover {
      border-color: var(--el-color-primary);
      background: var(--el-color-primary-light-9);
    }
  }

  &--locked {
    opacity: 0.78;
  }

  &__main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__title-row {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  &__title {
    font-size: 14px;
    font-weight: 500;
    line-height: 1.45;
    color: var(--el-text-color-primary);
  }

  &__summary {
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
    color: var(--el-text-color-secondary);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  &__group {
    font-size: 11px;
    color: var(--el-text-color-placeholder);
  }

  &__arrow {
    flex-shrink: 0;
    color: var(--el-text-color-placeholder);
  }
}

.ops-empty-hint {
  margin-bottom: 14px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.ops-fallback-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ops-fallback-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-blank);

  &__info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  &__label {
    font-size: 14px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  &__group {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

.ops-section--locked {
  margin-top: 8px;

  :deep(.el-collapse) {
    border-top-color: var(--el-border-color-lighter);
    border-bottom-color: var(--el-border-color-lighter);
  }

  :deep(.el-collapse-item__header) {
    background: transparent;
    color: var(--el-text-color-secondary);
    font-size: 13px;
  }

  :deep(.el-collapse-item__wrap) {
    background: transparent;
  }

  :deep(.el-collapse-item__content) {
    padding-bottom: 12px;
  }
}

.ops-locked-title {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.ops-detail-head {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.ops-detail-title {
  margin: 8px 0 6px;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--el-text-color-primary);
}

.ops-detail-summary {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}

.ops-steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ops-step {
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-lighter);

  &__top {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  &__num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--el-color-primary);
    color: var(--el-color-white);
    font-size: 12px;
    font-weight: 600;
    flex-shrink: 0;
  }

  &__text {
    margin: 0;
    font-size: 13px;
    line-height: 1.7;
    color: var(--el-text-color-primary);
  }

  &__actions {
    margin-top: 10px;
    padding-top: 8px;
    border-top: 1px dashed var(--el-border-color-light);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__link-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__link-line {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__page {
    font-size: 12px;
    font-weight: 500;
    color: var(--el-text-color-regular);
  }

  &__no-perm {
    font-size: 12px;
    color: var(--el-text-color-placeholder);
  }

  &__perm-tip {
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
    color: var(--el-color-warning);
  }
}

.ops-detail-footer {
  margin-top: 18px;
}
</style>
