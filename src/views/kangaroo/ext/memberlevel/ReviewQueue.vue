<template>
  <section>
    <el-alert type="info" :closable="false" show-icon title="总部人工复核待办" description="检测或举报受理后顺延3个工作日，保留受理时刻。按北京时间排除周末、法定假日，计入调休上班日。成立后填写违规通知，再进入7天申诉流程。" />
    <el-alert v-if="calendarPending" type="warning" :closable="false" title="部分记录的工作日日历待确认" description="请在节假日页核对对应年份放假及调休日期，确认后显示复核期限。历史举报沿用原受理时间。" />
    <el-alert v-if="error" type="error" :closable="false" :title="error" />
    <div class="queue-tools"><el-button :loading="loading" @click="load">刷新待办</el-button><span>待复核 {{ total }} 条</span></div>
    <el-table v-loading="loading" :data="rows" empty-text="暂无待复核举报">
      <el-table-column prop="reportId" label="举报编号" width="100" />
      <el-table-column prop="source" label="来源" width="145" />
      <el-table-column prop="appUserId" label="涉及会员ID" width="115" />
      <el-table-column prop="reason" label="类型" min-width="160" />
      <el-table-column prop="detail" label="待核实情况" min-width="220" />
      <el-table-column prop="createTime" label="受理时间" width="175" />
      <el-table-column label="复核截止" width="175"><template #default="{row}">{{ row.reviewDeadline || deadlineLabels[row.deadlineState] }}</template></el-table-column>
      <el-table-column label="期限" width="110"><template #default="{row}"><el-tag :type="deadlineTypes[row.deadlineState]">{{ deadlineLabels[row.deadlineState] }}</el-tag></template></el-table-column>
      <el-table-column label="操作" fixed="right" width="130"><template #default="{row}"><el-button v-hasPermi="['kangaroo:report:handle']" link type="primary" @click="inspect(row)">查看和处理</el-button></template></el-table-column>
    </el-table>
    <el-pagination v-if="total>20" v-model:current-page="page" :page-size="20" :total="total" layout="prev,pager,next" @current-change="load" />
    <el-dialog v-model="open" title="人工复核举报" width="min(680px,94vw)" :close-on-click-modal="false">
      <div v-loading="contextLoading">
        <p class="source-text">{{ contextText }}</p>
        <el-image v-for="(src,index) in images" :key="src" :src="src" :preview-src-list="images" :initial-index="index" preview-teleported fit="cover" class="evidence-image" />
        <el-form label-position="top"><el-form-item label="核实依据与处理说明"><el-input v-model="note" type="textarea" :rows="4" maxlength="250" show-word-limit /></el-form-item></el-form>
        <el-alert v-if="actionError" :title="actionError" type="error" :closable="false" />
      </div>
      <template #footer>
        <el-button :disabled="saving" @click="open=false">关闭</el-button>
        <el-button :loading="saving" :disabled="contextLoading || !contextReady" @click="handle('reject')">举报不成立</el-button>
        <el-button type="primary" :loading="saving" :disabled="contextLoading || !contextReady" @click="handle('uphold')">{{ canCreateCase && selected.appUserId ? '成立，填写违规通知' : '举报成立' }}</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import request from '@/utils/request'
import { checkPermi } from '@/utils/permission'

const emit = defineEmits(['create-case'])
const rows = ref([]), total = ref(0), page = ref(1), loading = ref(false), error = ref('')
const open = ref(false), selected = ref({}), contextText = ref(''), images = ref([]), note = ref('')
const contextLoading = ref(false), contextReady = ref(false), saving = ref(false), actionError = ref('')
const canCreateCase = computed(() => checkPermi(['kangaroo:memberlevel:edit']))
const calendarPending = computed(() => rows.value.some(row => row.deadlineState === 'calendar_pending'))
const deadlineLabels = { overdue: '已逾期', due_today: '今日到期', pending: '待复核', calendar_pending: '日历待确认', receipt_pending: '受理时间待核实' }
const deadlineTypes = { overdue: 'danger', due_today: 'warning', pending: 'info', calendar_pending: 'warning', receipt_pending: 'warning' }
let generation = 0

async function load() {
  const current = ++generation
  loading.value = true
  error.value = ''
  try {
    const response = await request({ url: '/kangaroo/membership/review-queue', params: { pageNum: page.value } })
    if (current !== generation) return
    rows.value = response.data.rows || []
    total.value = response.data.total || 0
  } catch (failure) {
    if (current === generation) error.value = failure.message || '复核待办加载失败'
  } finally {
    if (current === generation) loading.value = false
  }
}
async function inspect(row) {
  selected.value = row
  contextText.value = ''
  images.value = []
  note.value = ''
  actionError.value = ''
  contextReady.value = false
  contextLoading.value = true
  open.value = true
  try {
    const response = await request({ url: '/kangaroo/core/report/' + row.reportId + '/context' })
    if (selected.value !== row) return
    const context = response.data.reviewContext
    contextText.value = context.text || ''
    let source = context.images || []
    if (typeof source === 'string') {
      try { source = JSON.parse(source) } catch { source = source.split(',') }
    }
    images.value = (Array.isArray(source) ? source : []).filter(Boolean).map(src => /^https?:/.test(src) ? src : import.meta.env.VITE_APP_BASE_API + src)
    contextReady.value = true
  } catch (failure) {
    if (selected.value === row) actionError.value = failure.message || '举报原文加载失败'
  } finally {
    if (selected.value === row) contextLoading.value = false
  }
}
async function handle(action) {
  if (saving.value || !contextReady.value) return
  if (note.value.trim().length < 2) { actionError.value = '请填写核实依据与处理说明'; return }
  saving.value = true
  actionError.value = ''
  const row = selected.value
  try {
    await request({ url: '/kangaroo/core/report/' + row.reportId + '/' + action, method: 'put', data: { reason: note.value.trim() } })
    open.value = false
    if (action === 'uphold' && canCreateCase.value && row.appUserId) emit('create-case', { userId: row.appUserId, reviewId: row.targetType === 'review' ? row.targetId : undefined, note: '举报 #' + row.reportId + ' · ' + note.value.trim() })
    await load()
  } catch (failure) {
    actionError.value = failure.message || '处理失败，请刷新核对举报状态'
  } finally {
    saving.value = false
  }
}
load()
const timer = setInterval(() => { if (!loading.value && !open.value) load() }, 60000)
onBeforeUnmount(() => { clearInterval(timer); generation++ })
</script>

<style scoped>
.queue-tools { display: flex; align-items: center; gap: 16px; margin: 16px 0; color: #606266; }
.el-alert { margin-bottom: 16px; }
.el-pagination { margin-top: 20px; }
.source-text { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.7; }
.evidence-image { width: 90px; height: 90px; margin: 0 8px 16px 0; }
</style>
