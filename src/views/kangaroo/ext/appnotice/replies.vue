<template>
  <div class="notice-conversations">
    <el-alert title="这里是用户对公告的私密回复。选择一段对话继续回复，对方会在小程序消息中心收到提醒。" type="info" :closable="false" show-icon />
    <template v-if="!selected">
      <el-form :inline="true" class="reply-search" @submit.prevent="search">
        <el-form-item label="状态"><el-select v-model="query.pending" style="width:140px" @change="search"><el-option label="全部" value="" /><el-option label="待回复" value="1" /><el-option label="已回复" value="0" /></el-select></el-form-item>
        <el-form-item label="搜索"><el-input v-model="query.keyword" clearable placeholder="公告标题 / 昵称 / 用户ID" @keyup.enter="search" /></el-form-item>
        <el-form-item><el-button type="primary" @click="search">查询</el-button><el-button @click="loadList">刷新</el-button></el-form-item>
      </el-form>
      <p v-if="listError" class="conversation__error" role="alert">{{ listError }}，请点击刷新重试。</p>
      <el-table v-loading="listLoading" :data="rows" empty-text="暂时没有用户回复。用户打开公告后，可在下方联系管理员。">
        <el-table-column prop="noticeTitle" label="公告" min-width="190" show-overflow-tooltip />
        <el-table-column label="用户" min-width="145"><template #default="{ row }">{{ row.nickname || '用户' }}（{{ row.appUserId }}）</template></el-table-column>
        <el-table-column prop="lastContent" label="最新消息" min-width="200" show-overflow-tooltip />
        <el-table-column label="状态" width="95"><template #default="{ row }"><el-tag :type="row.pending === '1' ? 'warning' : 'success'">{{ row.pending === '1' ? '待回复' : '已回复' }}</el-tag></template></el-table-column>
        <el-table-column prop="updateTime" label="最近更新" width="165" />
        <el-table-column label="操作" width="100"><template #default="{ row }"><el-button link type="primary" @click="open(row)">查看对话</el-button></template></el-table-column>
      </el-table>
      <pagination v-show="total > 0" v-model:page="query.pageNum" v-model:limit="query.pageSize" :total="total" @pagination="loadList" />
    </template>
    <section v-else class="conversation">
      <header class="conversation__head"><el-button :disabled="sending" @click="close">返回回复列表</el-button><el-button :disabled="loading" @click="loadHistory(false)">刷新对话</el-button></header>
      <h3>{{ selected.noticeTitle }}</h3><p class="conversation__hint">{{ selected.nickname || '用户' }} · 用户ID {{ selected.appUserId }}</p>
      <el-button v-if="hasMore" :loading="loading" @click="loadHistory(true)">查看更早记录</el-button>
      <p v-if="error" class="conversation__error" role="alert">{{ error }}</p>
      <div v-loading="loading && !messages.length" class="conversation__history" aria-live="polite">
        <article v-for="m in messages" :key="m.replyId" class="conversation__message" :class="{ 'conversation__message--admin': m.sender === 'admin' }">
          <small>{{ m.sender === 'admin' ? '平台管理员' : (selected.nickname || '用户') }} · {{ m.createTime }}</small><p>{{ m.content }}</p>
        </article>
      </div>
      <div v-if="canReply" class="conversation__composer"><el-input v-model="draft" type="textarea" :rows="4" :maxlength="1000" show-word-limit :disabled="sending" aria-label="回复内容" placeholder="回复这位用户，内容仅对方可见" /><div class="conversation__send"><span>回复会保留在当前对话中</span><el-button type="primary" :loading="sending" :disabled="!draft.trim()" @click="send">发送回复</el-button></div></div>
      <p v-else class="conversation__hint">当前账号只有查询权限，请联系管理员开通公告修改权限后回复。</p>
    </section>
  </div>
</template>
<script setup>
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { checkPermi } from '@/utils/permission'
import { listNoticeReplies, getNoticeReplies, sendNoticeReply } from '@/api/kangaroo/noticeReply'
const query = reactive({ pending: '1', keyword: '', pageNum: 1, pageSize: 10 })
const rows = ref([]), total = ref(0), listLoading = ref(false), selected = ref(null), messages = ref([]), loading = ref(false), hasMore = ref(false)
const listError = ref('')
const draft = ref(''), error = ref(''), sending = ref(false)
const canReply = checkPermi(['kangaroo:appnotice:edit'])
let timer, serial = 0, listSerial = 0, retry = null, initial = true
const drafts = new Map()
async function loadList() {
  const seq = ++listSerial; listLoading.value = true
  try { const d = (await listNoticeReplies(query)).data; if (seq === listSerial) { rows.value = d.rows; total.value = d.total; listError.value = '' } }
  catch (e) { if (seq === listSerial) listError.value = e.message || '回复列表加载失败' }
  finally { if (seq === listSerial) listLoading.value = false }
}
const search = () => { query.pageNum = 1; loadList().catch(() => {}) }
function open(row) { selected.value = row; messages.value = []; draft.value = drafts.get(row.threadId) || ''; retry = null; error.value = ''; hasMore.value = false; initial = true; loadHistory(false) }
function close() { drafts.set(selected.value.threadId, draft.value); selected.value = null; serial++; loading.value = false; loadList().catch(() => {}) }
const merge = list => { const map = new Map(messages.value.map(m => [String(m.replyId), m])); list.forEach(m => map.set(String(m.replyId), m)); messages.value = [...map.values()].sort((a,b) => Number(a.replyId)-Number(b.replyId)) }
async function loadHistory(older = false) {
  if (!selected.value || loading.value) return
  const seq = ++serial; loading.value = true
  try {
    const d = (await getNoticeReplies(selected.value.threadId, older ? messages.value[0]?.replyId : undefined)).data
    if (seq !== serial) return
    merge(d.rows); if (older || initial) hasMore.value = d.hasMore
    initial = false; error.value = ''
  } catch (e) { if (seq === serial) error.value = e.message || '对话加载失败，请点击刷新重试' }
  finally { if (seq === serial) loading.value = false }
}
async function send() {
  if (sending.value || !draft.value.trim()) return
  const id = selected.value.threadId, content = draft.value.trim()
  if (!retry || retry.content !== content) retry = { content, requestId: 'admin_' + Date.now() + '_' + Math.random().toString(36).slice(2) }
  sending.value = true; error.value = ''
  try {
    const r = await sendNoticeReply(id, retry)
    merge([r.data]); draft.value = ''; drafts.delete(id); retry = null; ElMessage.success('已回复，对方可在消息中心查看')
    loadHistory(false)
  } catch (e) { error.value = e.message || '发送失败，内容已保留，请重试' }
  finally { sending.value = false }
}
onMounted(() => { loadList().catch(() => {}); timer = setInterval(() => { if (document.visibilityState === 'visible' && selected.value) loadHistory(false) }, 10000) })
onBeforeUnmount(() => { serial++; listSerial++; clearInterval(timer) })
</script>
<style scoped>
.notice-conversations{padding:0 20px 24px}.reply-search{margin-top:20px}.conversation{max-width:860px;margin:20px auto}.conversation__head{display:flex;justify-content:space-between;gap:10px}.conversation h3{font-size:18px;line-height:1.6;margin:20px 0 6px}.conversation__hint,.conversation__send{color:var(--el-text-color-secondary);font-size:13px;line-height:1.6}.conversation__history{min-height:140px;margin:20px 0}.conversation__message{display:flex;align-items:flex-start;flex-direction:column;margin:18px 0}.conversation__message--admin{align-items:flex-end}.conversation__message small{color:var(--el-text-color-secondary);font-size:12px}.conversation__message p{max-width:85%;padding:12px 15px;line-height:1.7;white-space:pre-wrap;overflow-wrap:anywhere;background:var(--el-fill-color-light);border-radius:10px;margin:6px 0 0}.conversation__message--admin p{background:var(--el-color-primary-light-9)}.conversation__send{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-top:12px}.conversation__error{color:var(--el-color-danger);font-size:14px}.conversation__composer{padding-top:16px;border-top:1px solid var(--el-border-color-lighter)}@media(max-width:600px){.notice-conversations{padding:0 12px 20px}.conversation__message p{max-width:95%}.conversation__send{align-items:flex-end}.conversation__send span{max-width:170px}}
</style>
