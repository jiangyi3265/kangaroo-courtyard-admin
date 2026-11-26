<template>
  <section
    class="cp"
    @dragover.prevent="onDragOver"
    @dragleave.prevent="dragging = false"
    @drop.prevent="onDrop"
  >
    <!-- 头部：是谁、什么会话、状态、操作 -->
    <header class="cp__head">
      <el-button v-if="isMobile" link class="cp__back" aria-label="返回会话列表" @click="$emit('back')">
        <el-icon><ArrowLeft /></el-icon>
      </el-button>
      <el-avatar :size="34" :src="conv.avatar || undefined">{{ name.slice(0, 1) }}</el-avatar>
      <div class="cp__who">
        <div class="cp__name">{{ name }}<span v-if="conv.appUserId" class="cp__uid">用户ID {{ conv.appUserId }}</span></div>
        <div class="cp__tags">
          <el-tag size="small" :type="conv.type === 'wechat' ? 'success' : 'warning'" effect="plain">{{ TYPE_LABELS[conv.type] }}</el-tag>
          <el-tag size="small" effect="light" :type="conv.status === 'open' ? 'danger' : conv.status === 'replied' ? 'success' : 'info'">{{ conv.statusLabel || STATUS_LABELS[conv.status] || conv.status }}</el-tag>
          <span v-if="conv.type === 'ticket' && conv.contextLabel" class="cp__minor">来源：{{ conv.contextLabel }}</span>
        </div>
      </div>
      <div class="cp__actions">
        <el-button v-if="canSeeAi && conv.appUserId" size="small" @click="$emit('open-ai', conv)">看 TA 和 AI 的聊天</el-button>
        <template v-if="conv.type === 'wechat' && canReplyPerm">
          <el-button v-if="conv.status !== 'closed'" size="small" :loading="statusBusy" @click="changeStatus('closed')">关闭会话</el-button>
          <el-button v-else size="small" type="primary" plain :loading="statusBusy" @click="changeStatus('open')">重新打开</el-button>
        </template>
      </div>
    </header>

    <!-- 提示条 -->
    <div v-if="conv.type === 'wechat'" class="cp__notice" :class="{ 'is-warn': !replyState.canReply }">
      <span v-if="replyState.text">{{ replyState.text }}</span>
      <span>注意：有人在微信「客服小助手」里接入这个用户后，TA 之后发的消息只进小助手、这里收不到（小助手关闭会话或接入满 30 分钟后恢复）；小助手里的回复这里也看不到。</span>
    </div>
    <el-collapse v-else class="cp__detail">
      <el-collapse-item name="detail" title="工单详情（摘要、授权查看的信息、满意度）">
        <dl class="cp__facts">
          <dt>来源</dt><dd>{{ conv.contextLabel || conv.context || '—' }}</dd>
          <dt>摘要</dt><dd>{{ conv.summary || '—' }}</dd>
          <dt>授权查看的信息</dt><dd>{{ conv.related || '—' }}</dd>
          <dt>满意度</dt><dd>{{ conv.satisfaction != null ? conv.satisfaction + ' 分' : '还没评价' }}</dd>
          <dt>回复人</dt><dd>{{ conv.repliedBy || '—' }}</dd>
        </dl>
      </el-collapse-item>
    </el-collapse>

    <!-- 消息区 -->
    <div ref="scroller" class="cp__scroll" @scroll="onScroll">
      <div v-if="hasMore" class="cp__more">
        <el-button link type="primary" :loading="loadingOlder" @click="loadOlder">查看更早的消息</el-button>
      </div>
      <div v-if="loading && !messages.length" class="cp__empty" v-loading="true" />
      <div v-else-if="loadError" class="cp__empty">
        <span>{{ loadError }}</span>
        <el-button link type="primary" @click="load">重新加载</el-button>
      </div>
      <div v-else-if="!messages.length" class="cp__empty">还没有消息</div>
      <message-bubble
        v-for="m in messages"
        :key="m.id"
        :message="m"
        :mine="m.sender === 'staff'"
        :name="m.sender === 'staff' ? (m.staffName ? '客服 ' + m.staffName : '客服') : name"
        :avatar="m.sender === 'staff' ? '' : (conv.avatar || '')"
        :retryable="canRetry(conv, m) && composeEnabled"
        :stale="pendingIsStale(m, clock)"
        @retry="retry"
      />
    </div>

    <!-- 输入区 -->
    <footer class="cp__compose">
      <p v-if="!canReplyPerm" class="cp__hint">你没有回复权限（需要管理员在角色里勾上「工单回复」）。</p>
      <p v-else-if="conv.type === 'ticket' && conv.status === 'closed'" class="cp__hint">工单已关闭，不能再回复。</p>
      <template v-else>
        <p v-if="conv.type === 'ticket'" class="cp__hint">
          工单只能回一段文字，会发到用户的消息中心。再次回复会更新工单里的回复，并给用户再发一条通知（之前那条通知还在）。
        </p>
        <div class="cp__box" :class="{ 'is-disabled': !composeEnabled }">
          <el-input
            ref="inputRef"
            v-model="draft"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 6 }"
            :maxlength="conv.type === 'ticket' ? 1000 : 2000"
            show-word-limit
            resize="none"
            :disabled="!composeEnabled"
            :placeholder="composeEnabled ? placeholder : disabledText"
            aria-label="输入回复"
            @keydown.enter="onEnter"
            @paste="onPaste"
          />
          <div class="cp__tools">
            <template v-if="conv.type === 'wechat'">
              <el-button size="small" :disabled="!composeEnabled" @click="pickImage">
                <el-icon><Picture /></el-icon><span>发图片</span>
              </el-button>
              <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple hidden @change="onPick" />
              <span class="cp__tip">可直接粘贴截图或把图片拖进来</span>
            </template>
            <el-button type="primary" size="small" :disabled="!composeEnabled || !draft.trim()" :loading="sending" @click="sendText">发送</el-button>
          </div>
        </div>
      </template>
    </footer>

    <div v-if="dragging" class="cp__drop">松手发送图片</div>

    <!-- 发图片前确认一下，避免粘贴错 -->
    <el-dialog v-model="confirmOpen" title="发送图片" width="420px" append-to-body @closed="clearPending">
      <div class="cp__pending">
        <img v-for="p in pending" :key="p.url" :src="p.url" alt="待发送的图片" />
      </div>
      <template #footer>
        <el-button @click="confirmOpen = false">取消</el-button>
        <el-button type="primary" @click="sendPending">发送 {{ pending.length }} 张</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Picture } from '@element-plus/icons-vue'
import MessageBubble from '@/components/SupportChat/MessageBubble.vue'
import {
  STATUS_LABELS, TYPE_LABELS, canRetry, displayName, imageProblem, lastServerId, mergeMessages, pendingIsStale, pollCursor, prependMessages, wechatReplyState
} from '@/components/SupportChat/chat-state.js'
import { nowText } from '@/components/SupportChat/time.js'
import { getConversation, replyTicket, sendWechatImage, sendWechatText, setWechatStatus } from '@/api/kangaroo/support'
import { checkPermi } from '@/utils/permission'
import useUserStore from '@/store/modules/user'

const props = defineProps({
  row: { type: Object, required: true },        // 左边列表选中的会话
  isMobile: { type: Boolean, default: false }
})
const emit = defineEmits(['back', 'changed', 'open-ai'])

const userStore = useUserStore()
const conv = ref({ ...props.row })
const messages = ref([])
const hasMore = ref(false)
const loading = ref(false)
const loadingOlder = ref(false)
const loadError = ref('')
const draft = ref('')
const sending = ref(false)
const statusBusy = ref(false)
const dragging = ref(false)
const confirmOpen = ref(false)
const pending = ref([])
const scroller = ref(null)
const fileInput = ref(null)
const inputRef = ref(null)
const ready = ref(false) // 第一次读到会话之前不让发（避免拿旧状态发、或被稍后到的首屏覆盖）
const clock = ref(Date.now())
let atBottom = true
let seq = 0
let localSeq = 0
let seen = 0          // 从「读消息」接口拿到的最大编号（自己发送的回包不算），自动刷新从这里往后取
let pollFails = 0     // 连续失败次数：失败后越等越久再试，避免每 5 秒弹一次错
let pollSkip = 0
let stopped = false   // 会话不存在或没权限：不再自动刷新
const retried = new Set() // 已经点了重发的旧失败消息（按 clientId），自动刷新时别再把它们显示回来

const name = computed(() => displayName(conv.value))
const canReplyPerm = computed(() => checkPermi(['kangaroo:ticket:audit']))
const canSeeAi = computed(() => checkPermi(['kangaroo:supportchat:query']))
const replyState = computed(() => wechatReplyState(conv.value))
const composeEnabled = computed(() => ready.value && canReplyPerm.value &&
  (conv.value.type === 'ticket' ? conv.value.status !== 'closed' : replyState.value.canReply))
const disabledText = computed(() => !ready.value ? '正在读取会话…' : (conv.value.type === 'wechat' ? replyState.value.text : ''))
const placeholder = computed(() => conv.value.type === 'wechat'
  ? '输入回复，Enter 发送，Shift+Enter 换行'
  : '输入给用户的回复，Enter 发送，Shift+Enter 换行')
const myName = computed(() => userStore.nickName || userStore.name || '我')

function scrollToBottom(force) {
  if (!force && !atBottom) return
  nextTick(() => {
    const el = scroller.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

function onScroll() {
  const el = scroller.value
  if (el) atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60
}

function applyConversation(data) {
  if (data?.conversation) {
    conv.value = { ...conv.value, ...data.conversation }
    emit('changed', conv.value)
  }
}

/** 会话不存在、没权限这类错误，再刷也没用 */
function isFatal(e) {
  return !!(e && (e.isBusinessError || /不存在|没有权限|无权/.test(String(e.message || ''))))
}

function failed(e) {
  pollFails += 1
  pollSkip = Math.min(2 ** pollFails, 12) - 1 // 5 秒、10 秒、20 秒……最多 1 分钟试一次
  if (isFatal(e)) stopped = true
}

/** 读首屏（打开会话、点「重新加载」、首屏失败后的自动重试都走这里），成功返回 true */
async function load() {
  const current = ++seq
  loading.value = true
  loadError.value = ''
  stopped = false
  try {
    const res = await getConversation(props.row.type, props.row.id)
    if (current !== seq) return false
    applyConversation(res.data)
    const list = res.data?.messages || []
    // 首屏回来之前不让发，所以这里直接用服务器的；万一有本地还在发的，按同一次发送合并
    const locals = messages.value.filter(m => m.local)
    releasePreviews(locals)
    messages.value = locals.length ? mergeMessages(list, locals) : list
    seen = lastServerId(list)
    hasMore.value = !!res.data?.hasMore
    ready.value = true
    pollFails = 0
    pollSkip = 0
    atBottom = true
    scrollToBottom(true)
    return true
  } catch (e) {
    if (current === seq) {
      loadError.value = (e && e.message) || '消息读取失败'
      failed(e)
    }
    return false
  } finally {
    if (current === seq) loading.value = false
  }
}

/** 定时拉新消息：微信会话从上次读到的位置往后取（一次最多翻 5 页）；工单是虚拟消息，整段重取 */
async function poll() {
  clock.value = Date.now()
  if (stopped || loading.value || document.hidden) return
  if (pollSkip > 0) { pollSkip -= 1; return }
  if (!ready.value) { await load(); return } // 首屏没读成功：按首屏流程重试，成功后错误提示自动消失
  const current = seq
  try {
    if (conv.value.type === 'wechat') {
      let after = pollCursor(messages.value, seen)
      for (let page = 0; page < 5; page++) {
        const res = await getConversation(conv.value.type, conv.value.id, { after })
        if (current !== seq) return
        applyConversation(res.data)
        const incoming = res.data?.messages || []
        if (incoming.length) {
          messages.value = mergeMessages(messages.value, incoming, retried)
          seen = Math.max(seen, lastServerId(incoming))
          scrollToBottom()
        }
        if (!res.data?.hasMore || !incoming.length) break
        after = lastServerId(incoming)
      }
    } else {
      const res = await getConversation(conv.value.type, conv.value.id)
      if (current !== seq) return
      applyConversation(res.data)
      const next = res.data?.messages || []
      if (JSON.stringify(next) !== JSON.stringify(messages.value)) {
        messages.value = next
        scrollToBottom()
      }
    }
    pollFails = 0
    loadError.value = ''
  } catch (e) {
    if (current !== seq) return
    failed(e)
    if (stopped) loadError.value = ((e && e.message) || '会话读取失败') + '（已停止自动刷新）'
  }
}

async function loadOlder() {
  const first = messages.value.find(m => !m.local)
  if (!first) return
  const current = seq
  loadingOlder.value = true
  const el = scroller.value
  const keep = el ? el.scrollHeight - el.scrollTop : 0
  try {
    const res = await getConversation(conv.value.type, conv.value.id, { before: first.id })
    if (current !== seq) return
    messages.value = prependMessages(messages.value, res.data?.messages || [])
    hasMore.value = !!res.data?.hasMore
    nextTick(() => { if (el) el.scrollTop = el.scrollHeight - keep })
  } catch {
    // 请求封装已经弹了提示
  } finally {
    loadingOlder.value = false
  }
}

function newClientId() {
  localSeq += 1
  return `c${Date.now().toString(36)}${localSeq}${Math.random().toString(36).slice(2, 6)}`
}

function localMessage(extra) {
  return {
    id: `local-${newClientId()}`,
    clientId: newClientId(),
    local: true,
    sender: 'staff',
    staffName: myName.value,
    time: nowText(),
    sendStatus: 'pending',
    ...extra
  }
}

/** 服务器回了这次发送的结果（成功、失败或还在发送中）：按 clientId 合进列表，自动刷新先拿到的那条也会被认成同一条 */
function settle(local, serverMsg) {
  if (serverMsg && serverMsg.id != null) {
    const msg = { ...serverMsg, clientId: serverMsg.clientId || local.clientId }
    if (msg.sendStatus === 'failed' && !msg.error) msg.error = '微信没有接收'
    messages.value = mergeMessages(messages.value, [msg], retried)
  } else {
    patchByClient(local.clientId, { sendStatus: 'ok' })
  }
}

function patchByClient(clientId, patch) {
  const idx = messages.value.findIndex(m => m.clientId === clientId)
  if (idx >= 0) messages.value.splice(idx, 1, { ...messages.value[idx], ...patch })
}

/** 请求本身失败（断网、超时、服务器报错）：不知道微信收没收到，重发时用同一个 clientId，服务器会认出来不会再发一遍 */
function markUnknown(local, error) {
  patchByClient(local.clientId, { sendStatus: 'failed', error, retrySame: true })
}

async function deliver(local) {
  try {
    const res = local.kind === 'image'
      ? await sendWechatImage(conv.value.id, local.file, local.clientId)
      : await sendWechatText(conv.value.id, local.text, local.clientId)
    settle(local, res.data)
  } catch (e) {
    markUnknown(local, e?.message || '发送失败')
  }
}

async function sendText() {
  const text = draft.value.trim()
  if (!text || sending.value || !composeEnabled.value) return
  if (conv.value.type === 'ticket') {
    if (conv.value.status === 'replied' || conv.value.repliedBy) {
      try {
        await ElMessageBox.confirm('这张工单已经回复过。再发会更新工单里的回复，并给用户再发一条通知；之前那条通知用户仍能看到。继续？', '再次回复', { type: 'warning', confirmButtonText: '更新并通知', cancelButtonText: '再想想' })
      } catch { return }
    }
    sending.value = true
    try {
      await replyTicket(conv.value.id, text)
      draft.value = ''
      ElMessage.success('已回复，并通知了用户')
      await load()
    } catch {
      // 请求封装已经弹了提示，草稿保留；顺手刷新一下（可能工单刚被关闭）
      poll()
    } finally {
      sending.value = false
    }
    return
  }
  const local = localMessage({ kind: 'text', text })
  messages.value = [...messages.value, local]
  draft.value = ''
  atBottom = true
  scrollToBottom(true)
  sending.value = true
  try { await deliver(local) } finally { sending.value = false }
}

function onEnter(e) {
  if (e.shiftKey || e.isComposing || e.keyCode === 229) return
  e.preventDefault()
  sendText()
}

function retry(m) {
  if (!composeEnabled.value) { ElMessage.warning(disabledText.value || '现在不能回复'); return }
  // 微信明确拒收的换新编号重发；结果不确定的用原编号（服务器已发过就直接返回原来那条，用户不会收到两遍）
  const same = !!m.retrySame
  if (!same) retried.add(m.clientId)
  messages.value = messages.value.filter(x => x.clientId !== m.clientId)
  const local = localMessage({ kind: m.kind, text: m.text, file: m.file, localSrc: m.localSrc, image: m.image, ...(same ? { clientId: m.clientId } : {}) })
  messages.value = [...messages.value, local]
  atBottom = true
  scrollToBottom(true)
  deliver(local)
}

// —— 图片：按钮选、粘贴、拖进来，发之前确认 ——
function queueImages(files) {
  if (conv.value.type !== 'wechat' || !composeEnabled.value) return
  const ok = []
  for (const file of files) {
    const problem = imageProblem(file)
    if (problem) { ElMessage.warning(`${file.name || '图片'}：${problem}`); continue }
    ok.push({ file, url: URL.createObjectURL(file) })
  }
  if (!ok.length) return
  clearPending()
  pending.value = ok.slice(0, 9)
  if (ok.length > 9) ElMessage.warning('一次最多发 9 张，多的没加进来')
  confirmOpen.value = true
}

function clearPending() {
  // 确认框关掉时，没发出去的预览释放掉；已经发出去的由消息自己管
  for (const p of pending.value) if (!p.sent) URL.revokeObjectURL(p.url)
  pending.value = []
}

async function sendPending() {
  if (!composeEnabled.value) {
    confirmOpen.value = false
    ElMessage.warning(disabledText.value || '现在不能回复')
    return
  }
  const list = pending.value
  for (const p of list) p.sent = true
  confirmOpen.value = false
  atBottom = true
  for (const p of list) {
    const local = localMessage({ kind: 'image', file: p.file, localSrc: p.url })
    messages.value = [...messages.value, local]
    scrollToBottom(true)
    await deliver(local)
  }
}

function pickImage() { fileInput.value?.click() }
function onPick(e) {
  queueImages([...(e.target.files || [])])
  e.target.value = ''
}
function onPaste(e) {
  const files = [...(e.clipboardData?.files || [])].filter(f => f.type.startsWith('image/'))
  if (!files.length) return
  e.preventDefault()
  queueImages(files)
}
function onDragOver(e) {
  if (conv.value.type === 'wechat' && composeEnabled.value && [...(e.dataTransfer?.types || [])].includes('Files')) dragging.value = true
}
function onDrop(e) {
  dragging.value = false
  queueImages([...(e.dataTransfer?.files || [])].filter(f => f.type.startsWith('image/')))
}

async function changeStatus(status) {
  if (status === 'closed') {
    try {
      await ElMessageBox.confirm('关闭后这个会话移到「已关闭」；用户再发消息会自动回到「待处理」。', '关闭会话', { type: 'info', confirmButtonText: '关闭', cancelButtonText: '取消' })
    } catch { return }
  }
  statusBusy.value = true
  try {
    await setWechatStatus(conv.value.id, status)
    conv.value = { ...conv.value, status, statusLabel: STATUS_LABELS[status] }
    emit('changed', conv.value)
    ElMessage.success(status === 'closed' ? '已关闭' : '已重新打开')
    poll() // 马上取一次最新的「能不能回复」
  } catch {
    // 请求封装已经弹了提示
  } finally {
    statusBusy.value = false
  }
}

// 换会话：重新读（定时拉新消息由外层页面统一管，页面切走或浏览器标签页隐藏时会停）
watch(() => props.row.key, () => {
  conv.value = { ...props.row }
  draft.value = ''
  releasePreviews()
  messages.value = []
  hasMore.value = false
  ready.value = false
  seen = 0
  load()
}, { immediate: true })

/** 释放图片预览占的内存；keep 里的（还在发的）留着 */
function releasePreviews(keep = []) {
  const keepSrc = new Set(keep.map(m => m.localSrc).filter(Boolean))
  for (const m of messages.value) if (m.localSrc && !keepSrc.has(m.localSrc)) URL.revokeObjectURL(m.localSrc)
}

onBeforeUnmount(() => {
  seq++
  clearPending()
  releasePreviews()
})

defineExpose({ poll, focus: () => inputRef.value?.focus() })
</script>

<style lang="scss" scoped>
.cp {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: var(--el-fill-color-lighter);

  &__head {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    background: var(--el-bg-color);
  }

  &__back { font-size: 18px; padding: 4px; }

  &__who { flex: 1; min-width: 0; }

  &__name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 15px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  &__uid {
    margin-left: 8px;
    font-size: 12px;
    font-weight: 400;
    color: var(--el-text-color-secondary);
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin-top: 3px;
  }

  &__minor { font-size: 12px; color: var(--el-text-color-secondary); }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 6px;
  }

  &__notice {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    padding: 6px 14px;
    font-size: 12px;
    line-height: 1.6;
    color: var(--el-text-color-secondary);
    background: var(--el-fill-color-light);
    border-bottom: 1px solid var(--el-border-color-lighter);

    &.is-warn {
      color: var(--el-color-warning);
      background: color-mix(in srgb, var(--el-color-warning) 10%, var(--el-bg-color));
    }
  }

  &__detail {
    padding: 0 14px;
    background: var(--el-bg-color);
    border-top: 0;

    :deep(.el-collapse-item__header) { height: 36px; font-size: 13px; background: transparent; }
    :deep(.el-collapse-item__wrap) { background: transparent; }
  }

  &__facts {
    display: grid;
    grid-template-columns: 110px 1fr;
    gap: 4px 10px;
    margin: 0;
    font-size: 13px;

    dt { color: var(--el-text-color-secondary); }
    dd { margin: 0; white-space: pre-wrap; word-break: break-word; }
  }

  &__scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 4px 16px 12px;
  }

  &__more { padding-top: 8px; text-align: center; }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 160px;
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }

  &__compose {
    padding: 10px 14px 12px;
    border-top: 1px solid var(--el-border-color-lighter);
    background: var(--el-bg-color);
  }

  &__hint {
    margin: 0 0 6px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  &__box.is-disabled { opacity: 0.7; }

  &__tools {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;

    > .el-button:last-child { margin-left: auto; }
    .el-button span { margin-left: 4px; }
  }

  &__tip { font-size: 12px; color: var(--el-text-color-placeholder); }

  &__drop {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px dashed var(--el-color-primary);
    background: color-mix(in srgb, var(--el-color-primary) 10%, var(--el-bg-color));
    color: var(--el-color-primary);
    font-size: 16px;
    pointer-events: none;
  }

  &__pending {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;

    img {
      width: 110px;
      height: 110px;
      object-fit: cover;
      border-radius: 6px;
      background: var(--el-fill-color-light);
    }
  }
}

@media (max-width: 767px) {
  .cp__head { flex-wrap: wrap; }
  .cp__actions { order: 3; width: 100%; justify-content: flex-start; }
  .cp__tip { display: none; }
  .cp__facts { grid-template-columns: 90px 1fr; }
}
</style>
