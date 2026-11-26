<template>
  <div class="cl">
    <div class="cl__filters">
      <el-radio-group v-model="filters.type" size="small" class="cl__seg" @change="userReload">
        <el-radio-button value="all">全部</el-radio-button>
        <el-radio-button value="wechat">微信客服</el-radio-button>
        <el-radio-button value="ticket">转人工工单</el-radio-button>
      </el-radio-group>
      <el-radio-group v-model="filters.status" size="small" class="cl__seg" @change="userReload">
        <el-radio-button value="all">全部</el-radio-button>
        <el-radio-button value="open">待处理</el-radio-button>
        <el-radio-button value="replied">已回复</el-radio-button>
        <el-radio-button value="closed">已关闭</el-radio-button>
      </el-radio-group>
      <el-input
        v-model="filters.search"
        clearable
        size="small"
        placeholder="搜用户ID或内容，回车搜索"
        aria-label="搜索会话"
        @keyup.enter="userReload"
        @clear="userReload"
      >
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
    </div>

    <div class="cl__scroll" v-loading="loading && !rows.length">
      <p v-if="error" class="cl__empty">
        {{ error }}
        <el-button link type="primary" @click="reload">重新加载</el-button>
      </p>
      <p v-else-if="!loading && !rows.length" class="cl__empty">没有符合条件的会话</p>

      <button
        v-for="row in rows"
        :key="row.key"
        type="button"
        class="cl__item"
        :class="{ 'is-active': row.key === activeKey }"
        @click="$emit('select', row)"
      >
        <el-badge :value="row.unread" :hidden="!row.unread" :max="99" class="cl__badge">
          <el-avatar :size="36" :src="row.avatar || undefined">{{ displayName(row).slice(0, 1) }}</el-avatar>
        </el-badge>
        <div class="cl__main">
          <div class="cl__line">
            <span class="cl__name">{{ displayName(row) }}</span>
            <time class="cl__time">{{ shortTime(row.lastTime) }}</time>
          </div>
          <div class="cl__preview">{{ row.lastPreview || row.title || '（无内容）' }}</div>
          <div class="cl__tags">
            <el-tag size="small" :type="row.type === 'wechat' ? 'success' : 'warning'" effect="plain">{{ TYPE_LABELS[row.type] || row.type }}</el-tag>
            <el-tag size="small" :type="statusTone(row.status)" effect="light">{{ row.statusLabel || STATUS_LABELS[row.status] || row.status }}</el-tag>
            <span v-if="row.appUserId" class="cl__uid">ID {{ row.appUserId }}</span>
          </div>
        </div>
      </button>

      <div v-if="rows.length && rows.length < total" class="cl__more">
        <el-button link type="primary" :loading="loading" @click="loadMore">加载更多（还有 {{ total - rows.length }} 个）</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { listConversations } from '@/api/kangaroo/support'
import { STATUS_LABELS, TYPE_LABELS, displayName, searchParams } from '@/components/SupportChat/chat-state.js'
import { shortTime } from '@/components/SupportChat/time.js'

const props = defineProps({
  activeKey: { type: String, default: '' },
  initialSearch: { type: String, default: '' }
})
const emit = defineEmits(['select', 'filter'])

const PAGE = 30
const filters = reactive({ type: 'all', status: 'all', search: props.initialSearch })
const rows = ref([])
const total = ref(0)
const loading = ref(false)
const error = ref('')
let pageNum = 1
let seq = 0

function statusTone(status) {
  return status === 'open' ? 'danger' : status === 'replied' ? 'success' : 'info'
}

function params(extra) {
  return { type: filters.type, status: filters.status, ...searchParams(filters.search), ...extra }
}

async function fetchPage(num, size) {
  const current = ++seq
  loading.value = true
  error.value = ''
  try {
    const res = await listConversations(params({ pageNum: num, pageSize: size }))
    if (current !== seq) return null
    total.value = Number(res.total ?? res.data?.total ?? 0)
    return res.rows || res.data?.rows || []
  } catch (e) {
    if (current === seq) error.value = e?.message || '会话列表读取失败'
    return null
  } finally {
    if (current === seq) loading.value = false
  }
}

async function reload() {
  pageNum = 1
  rows.value = []
  const list = await fetchPage(1, PAGE)
  if (list) rows.value = list
}

async function loadMore() {
  const list = await fetchPage(pageNum + 1, PAGE)
  if (!list) return
  pageNum += 1
  const known = new Set(rows.value.map(r => r.key))
  rows.value = [...rows.value, ...list.filter(r => !known.has(r.key))]
}

/** 客服自己改了筛选或搜索：右边正在看的会话可能已不在结果里，交给外面关掉，免得打字发给了别人 */
function userReload() {
  emit('filter')
  reload()
}

/**
 * 定时刷新，不打断正在看的人：
 * - 只翻了 3 页以内：按原来每页 30 条逐页重取（后台单页最多 50 条，不能一次要太多）；
 * - 翻得更多：只重取第 1 页放最前面，后面已加载的保留（去掉重复的）。
 */
async function refresh() {
  if (loading.value) return
  if (pageNum <= 3) {
    const all = []
    for (let n = 1; n <= pageNum; n++) {
      const list = await fetchPage(n, PAGE)
      if (!list) return
      all.push(...list)
      if (list.length < PAGE) break
    }
    const seenKeys = new Set()
    rows.value = all.filter(r => !seenKeys.has(r.key) && seenKeys.add(r.key))
    return
  }
  const first = await fetchPage(1, PAGE)
  if (!first) return
  const keys = new Set(first.map(r => r.key))
  rows.value = [...first, ...rows.value.filter(r => !keys.has(r.key))]
}

/** 打开会话后本地先把未读清零（服务器打开时也会清） */
function markRead(key) {
  const row = rows.value.find(r => r.key === key)
  if (row) row.unread = 0
}

/** 聊天里状态变了（回复、关闭），列表这一行同步 */
function patchRow(key, patch) {
  const row = rows.value.find(r => r.key === key)
  if (row) Object.assign(row, patch)
}

function searchFor(text) {
  filters.search = String(text || '')
  filters.type = 'all'
  filters.status = 'all'
  reload()
}

defineExpose({ reload, refresh, markRead, patchRow, searchFor })
reload()
</script>

<style lang="scss" scoped>
.cl {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-right: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);

  &__filters {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  &__seg {
    display: flex;
    flex-wrap: nowrap;

    :deep(.el-radio-button) { flex: 1; }
    :deep(.el-radio-button__inner) { width: 100%; padding-left: 6px; padding-right: 6px; }
  }

  &__scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  &__empty {
    padding: 24px 12px;
    text-align: center;
    color: var(--el-text-color-secondary);
    font-size: 13px;
  }

  &__item {
    display: flex;
    gap: 10px;
    width: 100%;
    padding: 10px 12px;
    border: 0;
    border-bottom: 1px solid var(--el-border-color-extra-light);
    background: transparent;
    color: inherit;
    text-align: left;
    cursor: pointer;

    &:hover { background: var(--el-fill-color-light); }
    &.is-active { background: var(--el-color-primary-light-9); background: color-mix(in srgb, var(--el-color-primary) 12%, var(--el-bg-color)); }
  }

  &__badge { flex-shrink: 0; }

  &__main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  &__line {
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }

  &__name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 14px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  &__time {
    flex-shrink: 0;
    font-size: 12px;
    color: var(--el-text-color-placeholder);
  }

  &__preview {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }

  &__tags {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  &__uid {
    font-size: 12px;
    color: var(--el-text-color-placeholder);
  }

  &__more {
    padding: 10px;
    text-align: center;
  }
}
</style>
