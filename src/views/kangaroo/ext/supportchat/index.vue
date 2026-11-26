<template>
  <div class="ai" :class="{ 'is-table': view === 'table' }">
    <div class="ai__bar">
      <div class="ai__title">
        <strong>AI 客服聊天记录</strong>
        <span class="ai__sub">用户和 AI袋鼠 的对话，按人看；记录永久保存、不能删除</span>
      </div>
      <el-radio-group v-model="view" size="small" aria-label="切换视图" @change="saveView">
        <el-radio-button value="chat">聊天视图</el-radio-button>
        <el-radio-button value="table">表格视图（原来的）</el-radio-button>
      </el-radio-group>
    </div>

    <!-- 原来的只读表格，一点没动 -->
    <div v-if="view === 'table'" class="ai__table">
      <ext-crud entity="supportchat" />
    </div>

    <div v-else class="ai__main" :class="{ 'show-chat': isMobile && active }">
      <div class="ai__list">
        <div class="ai__filters">
          <el-input
            v-model="search"
            clearable
            size="small"
            placeholder="搜用户ID或聊天内容，回车搜索"
            aria-label="搜索聊天记录"
            @keyup.enter="userReload"
            @clear="userReload"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <el-radio-group v-model="role" size="small" class="ai__seg" aria-label="谁说的" @change="userReload">
            <el-radio-button value="">都看</el-radio-button>
            <el-radio-button value="user">用户说的</el-radio-button>
            <el-radio-button value="bot">AI袋鼠说的</el-radio-button>
          </el-radio-group>
          <el-date-picker
            v-model="range"
            type="daterange"
            size="small"
            value-format="YYYY-MM-DD"
            range-separator="到"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            :clearable="true"
            style="width: 100%"
            @change="userReload"
          />
        </div>
        <div class="ai__scroll" v-loading="loading && !rows.length">
          <p v-if="error" class="ai__empty">
            {{ error }}
            <el-button link type="primary" @click="reload">重新加载</el-button>
          </p>
          <p v-else-if="!loading && !rows.length" class="ai__empty">没有符合条件的聊天记录</p>
          <button
            v-for="row in rows"
            :key="row.appUserId"
            type="button"
            class="ai__item"
            :class="{ 'is-active': active && String(active.appUserId) === String(row.appUserId) }"
            @click="select(row)"
          >
            <el-avatar :size="36" :src="row.avatar || undefined">{{ nameOf(row).slice(0, 1) }}</el-avatar>
            <div class="ai__info">
              <div class="ai__line">
                <span class="ai__name">{{ nameOf(row) }}</span>
                <time class="ai__time">{{ shortTime(row.lastTime) }}</time>
              </div>
              <div class="ai__preview">{{ row.lastText || '（无内容）' }}</div>
              <div class="ai__minor">ID {{ row.appUserId }} · 共 {{ row.count || 0 }} 条</div>
            </div>
          </button>
          <div v-if="rows.length && rows.length < total" class="ai__more">
            <el-button link type="primary" :loading="loading" @click="loadMore">加载更多（还有 {{ total - rows.length }} 人）</el-button>
          </div>
        </div>
      </div>

      <section v-if="active" class="ai__chat">
        <header class="ai__head">
          <el-button v-if="isMobile" link class="ai__back" aria-label="返回列表" @click="active = null">
            <el-icon><ArrowLeft /></el-icon>
          </el-button>
          <el-avatar :size="34" :src="active.avatar || undefined">{{ nameOf(active).slice(0, 1) }}</el-avatar>
          <div class="ai__who">
            <div class="ai__name">{{ nameOf(active) }}</div>
            <div class="ai__minor">用户ID {{ active.appUserId }} · 只读，AI 的回答不能改</div>
          </div>
          <el-button v-if="canSeeTickets" size="small" @click="openTickets">TA 的人工客服记录</el-button>
        </header>
        <ai-transcript
          :key="active.appUserId"
          class="ai__transcript"
          :app-user-id="active.appUserId"
          :nickname="active.nickname || ''"
          :avatar="active.avatar || ''"
        />
      </section>
      <div v-else class="ai__chat ai__placeholder">
        <el-icon :size="40"><ChatDotRound /></el-icon>
        <p>在左边选一个用户，看 TA 和 AI袋鼠 聊了什么</p>
      </div>
    </div>
  </div>
</template>

<script setup name="KgExtSupportChat">
// 主人（2026-11-03）：「历史聊天记录，永久保存，不能删除」。AI袋鼠聊天记录：按用户ID查，只读（V72）
// 2026-11-24：加聊天视图（按人看对话气泡）；原表格保留在「表格视图」
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, ChatDotRound, Search } from '@element-plus/icons-vue'
import ExtCrud from '../ExtCrud.vue'
import AiTranscript from '@/components/SupportChat/AiTranscript.vue'
import { searchParams } from '@/components/SupportChat/chat-state.js'
import { shortTime } from '@/components/SupportChat/time.js'
import { listAiUsers } from '@/api/kangaroo/support'
import { checkPermi } from '@/utils/permission'

const VIEW_KEY = 'kg-support-ai-view'
const PAGE = 30
const router = useRouter()

function readView() {
  try { return localStorage.getItem(VIEW_KEY) === 'table' ? 'table' : 'chat' } catch { return 'chat' }
}
function saveView(v) {
  try { localStorage.setItem(VIEW_KEY, v) } catch { /* 浏览器不让存就算了 */ }
}

const view = ref(readView())
const search = ref('')
const range = ref(null)
const role = ref('') // 关键词按谁说的找：空=都看，user=用户说的，bot=AI袋鼠说的
const rows = ref([])
const total = ref(0)
const loading = ref(false)
const error = ref('')
const active = ref(null)
const canSeeTickets = computed(() => checkPermi(['kangaroo:ticket:list']))
const canQuery = computed(() => checkPermi(['kangaroo:supportchat:query']))
let pageNum = 1
let seq = 0

const mq = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(max-width: 767px)') : null
const isMobile = ref(!!mq?.matches)
function onMq(e) { isMobile.value = e.matches }

function nameOf(row) {
  if (!row) return ''
  return row.nickname || ('用户 ' + row.appUserId)
}

function params(num) {
  const p = { pageNum: num, pageSize: PAGE, ...searchParams(search.value) }
  if (role.value) p.role = role.value
  if (range.value && range.value.length === 2) {
    // 选的是日期，补上时分秒：结束那天整天都算（否则只算到结束日零点，当天的记录查不到）
    p.beginTime = range.value[0] + ' 00:00:00'
    p.endTime = range.value[1] + ' 23:59:59'
  }
  return p
}

async function fetchPage(num) {
  const current = ++seq
  loading.value = true
  error.value = ''
  try {
    const res = await listAiUsers(params(num))
    if (current !== seq) return null
    total.value = Number(res.total ?? res.data?.total ?? 0)
    return res.rows || res.data?.rows || []
  } catch (e) {
    if (current === seq) error.value = e?.message || '聊天记录读取失败'
    return null
  } finally {
    if (current === seq) loading.value = false
  }
}

async function reload() {
  pageNum = 1
  rows.value = []
  const list = await fetchPage(1)
  if (list) rows.value = list
}

async function loadMore() {
  const list = await fetchPage(pageNum + 1)
  if (!list) return
  pageNum += 1
  const known = new Set(rows.value.map(r => String(r.appUserId)))
  rows.value = [...rows.value, ...list.filter(r => !known.has(String(r.appUserId)))]
}

/** 客服自己改了筛选：右边旧的对话可能已不在结果里，先关掉 */
function userReload() {
  active.value = null
  reload()
}

function select(row) {
  if (!canQuery.value) {
    ElMessage.warning('你只能看列表，打开对话需要管理员在角色里勾上「记录查询」')
    return
  }
  active.value = { ...row }
}

function openTickets() {
  // _ 是这次跳转的记号：客服工作台据此只处理一次，之后点标签页回去不会冲掉手动改的筛选
  router.push({ path: '/kgusersvc/ticket', query: { appUserId: String(active.value.appUserId), _: String(Date.now()) } })
}

onMounted(() => {
  mq?.addEventListener?.('change', onMq)
  reload()
})
onBeforeUnmount(() => mq?.removeEventListener?.('change', onMq))
</script>

<style lang="scss" scoped>
.ai {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 84px);
  height: calc(100dvh - 84px);
  min-height: 520px;
  padding: 12px;
  box-sizing: border-box;
  gap: 10px;

  &.is-table { height: auto; min-height: 0; }

  &__bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  &__title {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 10px;

    strong { font-size: 16px; color: var(--el-text-color-primary); }
  }

  &__sub, &__minor {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  &__table {
    margin: 0 -12px;

    :deep(.app-container) { padding-top: 0; }
  }

  &__main {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: 300px minmax(0, 1fr);
    overflow: hidden;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    background: var(--el-bg-color);
  }

  &__list {
    display: flex;
    flex-direction: column;
    min-height: 0;
    border-right: 1px solid var(--el-border-color-lighter);
  }

  &__filters {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    border-bottom: 1px solid var(--el-border-color-lighter);

    :deep(.el-date-editor) { box-sizing: border-box; }
  }

  &__seg {
    display: flex;

    :deep(.el-radio-button) { flex: 1; }
    :deep(.el-radio-button__inner) { width: 100%; padding-left: 4px; padding-right: 4px; }
  }

  &__scroll { flex: 1; min-height: 0; overflow-y: auto; }

  &__empty {
    padding: 24px 12px;
    text-align: center;
    font-size: 13px;
    color: var(--el-text-color-secondary);
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

  &__info, &__who { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }

  &__line { display: flex; justify-content: space-between; gap: 8px; }

  &__name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 14px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  &__time { flex-shrink: 0; font-size: 12px; color: var(--el-text-color-placeholder); }

  &__preview {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }

  &__more { padding: 10px; text-align: center; }

  &__chat {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    background: var(--el-fill-color-lighter);
  }

  &__head {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    background: var(--el-bg-color);
  }

  &__back { font-size: 18px; padding: 4px; }

  &__transcript { flex: 1; min-height: 0; }

  &__placeholder {
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 20px;
    color: var(--el-text-color-secondary);
    text-align: center;

    p { margin: 0; }
  }
}

@media (max-width: 767px) {
  .ai {
    padding: 8px;
    min-height: 420px;

    &__sub { display: none; }

    &__main {
      grid-template-columns: minmax(0, 1fr);

      .ai__placeholder { display: none; }
      &.show-chat .ai__list { display: none; }
      &:not(.show-chat) .ai__chat { display: none; }
    }
  }
}
</style>
