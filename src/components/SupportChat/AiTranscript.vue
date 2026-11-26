<template>
  <div class="ai-transcript">
    <div ref="scroller" class="ai-transcript__scroll">
      <div v-if="hasMore" class="ai-transcript__more">
        <el-button link type="primary" :loading="loadingMore" @click="loadOlder">查看更早的对话</el-button>
      </div>
      <div v-if="loading" class="ai-transcript__empty" v-loading="true" />
      <div v-else-if="error" class="ai-transcript__empty">
        <span>{{ error }}</span>
        <el-button link type="primary" @click="reload">重新加载</el-button>
      </div>
      <div v-else-if="!messages.length" class="ai-transcript__empty">TA 还没和 AI 袋鼠聊过</div>
      <template v-else>
        <message-bubble
          v-for="m in messages"
          :key="m.id"
          :message="toBubble(m)"
          :mine="m.role !== 'user'"
          :name="m.role === 'user' ? (nickname || '用户') : 'AI袋鼠'"
          :avatar="m.role === 'user' ? avatar : ''"
          :extra="extraLine(m)"
        />
      </template>
    </div>
  </div>
</template>

<script setup>
// AI 袋鼠聊天记录：按用户看整段对话，只读（主人 11-03 要求永久保存、不能删）
import { nextTick, ref, watch } from 'vue'
import MessageBubble from './MessageBubble.vue'
import { getAiMessages } from '@/api/kangaroo/support'

const props = defineProps({
  appUserId: { type: [Number, String], required: true },
  nickname: { type: String, default: '' },
  avatar: { type: String, default: '' }
})

const messages = ref([])
const hasMore = ref(false)
const loading = ref(false)
const loadingMore = ref(false)
const error = ref('')
const scroller = ref(null)
let seq = 0

function toBubble(m) {
  return { id: m.id, sender: m.role === 'user' ? 'user' : 'staff', kind: 'text', text: m.content, time: m.time }
}

function extraLine(m) {
  const parts = []
  if (m.source) parts.push('信息来源：' + m.source)
  if (m.contextLabel || m.context) parts.push('入口：' + (m.contextLabel || m.context))
  if (m.intent) parts.push('识别意图：' + m.intent)
  return parts.join(' · ')
}

function scrollToBottom() {
  nextTick(() => {
    const el = scroller.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

async function reload() {
  const current = ++seq
  loading.value = true
  error.value = ''
  messages.value = []
  hasMore.value = false
  try {
    const res = await getAiMessages(props.appUserId, { size: 50 })
    if (current !== seq) return
    messages.value = res.data?.messages || []
    hasMore.value = !!res.data?.hasMore
    scrollToBottom()
  } catch (e) {
    if (current === seq) error.value = e?.message || '对话读取失败'
  } finally {
    if (current === seq) loading.value = false
  }
}

async function loadOlder() {
  if (!messages.value.length) return
  const current = seq
  loadingMore.value = true
  const el = scroller.value
  const before = el ? el.scrollHeight - el.scrollTop : 0
  try {
    const res = await getAiMessages(props.appUserId, { size: 50, before: messages.value[0].id })
    if (current !== seq) return
    const older = res.data?.messages || []
    const known = new Set(messages.value.map(m => m.id))
    messages.value = [...older.filter(m => !known.has(m.id)), ...messages.value]
    hasMore.value = !!res.data?.hasMore
    // 保持当前看到的位置不跳
    nextTick(() => { if (el) el.scrollTop = el.scrollHeight - before })
  } catch {
    // 请求封装已经弹了提示
  } finally {
    loadingMore.value = false
  }
}

watch(() => props.appUserId, reload, { immediate: true })
</script>

<style lang="scss" scoped>
.ai-transcript {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;

  &__scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 4px 16px 16px;
  }

  &__more {
    text-align: center;
    padding-top: 8px;
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 160px;
    color: var(--el-text-color-secondary);
    font-size: 13px;
  }
}
</style>
