<template>
  <div class="ws" :class="{ 'is-table': view === 'table' }">
    <div class="ws__bar">
      <div class="ws__title">
        <strong>客服工作台</strong>
        <span class="ws__sub">微信客服消息和转人工工单都在这里，像聊天一样回复</span>
      </div>
      <el-radio-group v-model="view" size="small" aria-label="切换视图" @change="saveView">
        <el-radio-button value="chat">聊天视图</el-radio-button>
        <el-radio-button value="table">表格视图（原来的）</el-radio-button>
      </el-radio-group>
    </div>

    <!-- 原来的工单表格，一点没动，随时可以切回来 -->
    <div v-if="view === 'table'" class="ws__table">
      <ext-crud entity="ticket" />
    </div>

    <div v-else class="ws__main" :class="{ 'show-chat': isMobile && active }">
      <conversation-list
        ref="listRef"
        class="ws__list"
        :active-key="active?.key || ''"
        :initial-search="appliedSearch"
        @select="select"
        @filter="active = null"
      />
      <chat-panel
        v-if="active"
        ref="chatRef"
        :key="active.key"
        class="ws__chat"
        :row="active"
        :is-mobile="isMobile"
        @back="active = null"
        @changed="onChanged"
        @open-ai="openAi"
      />
      <div v-else class="ws__chat ws__placeholder">
        <el-icon :size="40"><ChatDotRound /></el-icon>
        <p>在左边选一个会话开始回复</p>
        <p class="ws__minor">红色数字是还没看的消息；「待处理」是用户发了消息还没人回。</p>
      </div>
    </div>

    <el-drawer v-model="aiOpen" :title="aiTitle" :size="isMobile ? '100%' : '520px'" append-to-body destroy-on-close>
      <ai-transcript v-if="aiUser" :app-user-id="aiUser.appUserId" :nickname="aiUser.nickname || ''" :avatar="aiUser.avatar || ''" />
    </el-drawer>
  </div>
</template>

<script setup name="KgExtTicket">
import { computed, nextTick, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ChatDotRound } from '@element-plus/icons-vue'
import ExtCrud from '../ExtCrud.vue'
import ConversationList from './ConversationList.vue'
import ChatPanel from './ChatPanel.vue'
import AiTranscript from '@/components/SupportChat/AiTranscript.vue'
import { displayName } from '@/components/SupportChat/chat-state.js'
import { checkPermi } from '@/utils/permission'

const VIEW_KEY = 'kg-support-workbench-view'
const route = useRoute()

function readView() {
  try { return localStorage.getItem(VIEW_KEY) === 'table' ? 'table' : 'chat' } catch { return 'chat' }
}
function saveView(v) {
  try { localStorage.setItem(VIEW_KEY, v) } catch { /* 浏览器不让存就算了 */ }
}

function querySearch() { return String(route.query.appUserId || route.query.keyword || '') }
const appliedSearch = ref(querySearch())
// 带着用户ID跳进来时一定先看聊天视图（不改主人记住的偏好）
const view = ref(appliedSearch.value ? 'chat' : readView())
let consumedStamp = String(route.query._ || '')
const listRef = ref(null)
const chatRef = ref(null)
const active = ref(null)
const aiOpen = ref(false)
const aiUser = ref(null)
const aiTitle = computed(() => aiUser.value ? `${displayName(aiUser.value)} 和 AI袋鼠 的聊天` : 'AI 聊天记录')

// 手机上一次只显示一栏：先列表，点进去再看聊天
const mq = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(max-width: 767px)') : null
const isMobile = ref(!!mq?.matches)
function onMq(e) { isMobile.value = e.matches }

function select(row) {
  // 只有列表权限、没有「工单查询」权限的，点开详情必然被拒，先说清楚
  if (!checkPermi(['kangaroo:ticket:query'])) {
    ElMessage.warning('你只能看会话列表，打开聊天需要管理员在角色里勾上「工单查询」')
    return
  }
  active.value = { ...row } // 未读数等聊天窗口读成功后再清（见 onChanged）
}

function onChanged(conv) {
  if (!conv?.key) return
  listRef.value?.patchRow(conv.key, {
    status: conv.status,
    statusLabel: conv.statusLabel,
    canReply: conv.canReply,
    unread: 0
  })
}

// 从别的页面带着用户ID跳过来（如 AI 聊天记录页的「TA 的人工客服记录」，地址里带 _=时间戳）：
// 切到聊天视图并按这个人搜；同一次跳转只处理一次，之后点标签页回来不会把手动改的筛选冲掉
function consumeQuery() {
  if (!route.path.includes('/ticket')) return // 标签页缓存时别的页面的地址变化不管
  const text = querySearch()
  const stamp = String(route.query._ || '')
  if (!text) return
  if (stamp ? stamp === consumedStamp : text === appliedSearch.value) return
  consumedStamp = stamp
  appliedSearch.value = text
  active.value = null
  if (view.value !== 'chat') { view.value = 'chat'; return } // 列表新建时会用 appliedSearch
  nextTick(() => listRef.value?.searchFor(text))
}
watch(() => [route.query._, route.query.appUserId, route.query.keyword], consumeQuery)

function openAi(conv) {
  aiUser.value = { appUserId: conv.appUserId, nickname: conv.nickname, avatar: conv.avatar }
  aiOpen.value = true
}

// —— 定时刷新：聊天 5 秒、列表 20 秒；页面切走或浏览器标签页藏起来就停 ——
let chatTimer = null
let listTimer = null
let pageActive = true
function start() {
  stop()
  chatTimer = setInterval(() => { if (!document.hidden) chatRef.value?.poll() }, 5000)
  listTimer = setInterval(() => { if (!document.hidden) listRef.value?.refresh() }, 20000)
}
function stop() {
  clearInterval(chatTimer)
  clearInterval(listTimer)
  chatTimer = listTimer = null
}
function onVisible() {
  if (document.hidden || !pageActive) return // 切到别的后台菜单时，这页在缓存里，不能替客服去读消息、清未读
  chatRef.value?.poll()
  listRef.value?.refresh()
}

onMounted(() => {
  mq?.addEventListener?.('change', onMq)
  document.addEventListener('visibilitychange', onVisible)
  start()
})
let firstActivate = true
onActivated(() => {
  pageActive = true
  if (firstActivate) { firstActivate = false; return }
  consumeQuery()
  start()
  onVisible()
})
onDeactivated(() => {
  pageActive = false
  stop()
})
onBeforeUnmount(() => {
  stop()
  mq?.removeEventListener?.('change', onMq)
  document.removeEventListener('visibilitychange', onVisible)
})
</script>

<style lang="scss" scoped>
.ws {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 84px);
  height: calc(100dvh - 84px);
  min-height: 520px;
  padding: 12px;
  box-sizing: border-box;
  gap: 10px;

  &.is-table {
    height: auto;
    min-height: 0;
  }

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
    grid-template-columns: 320px minmax(0, 1fr);
    overflow: hidden;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    background: var(--el-bg-color);
  }

  &__list, &__chat { min-height: 0; }

  &__placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 20px;
    color: var(--el-text-color-secondary);
    background: var(--el-fill-color-lighter);
    text-align: center;

    p { margin: 0; }
  }
}

@media (max-width: 767px) {
  .ws {
    padding: 8px;
    min-height: 420px;

    &__sub { display: none; }

    &__main {
      grid-template-columns: minmax(0, 1fr);

      .ws__placeholder { display: none; }
      &.show-chat .ws__list { display: none; }
      &:not(.show-chat) .ws__chat { display: none; }
    }
  }
}
</style>
