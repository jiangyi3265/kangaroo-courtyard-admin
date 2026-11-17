<template>
  <div class="app-container undercover-admin">
    <div class="game-heading">
      <div><h2>谁是卧底管理</h2><p>维护游戏词库，查看房间与近期对局。</p></div>
      <el-button :loading="loading" @click="load">刷新</el-button>
    </div>
    <el-tabs v-model="tab" @tab-change="changeTab">
      <el-tab-pane label="词库管理" name="words" />
      <el-tab-pane label="房间管理" name="rooms" />
      <el-tab-pane label="对局记录" name="history" />
    </el-tabs>

    <el-form :inline="true" @submit.prevent="search">
      <template v-if="tab === 'words'">
        <el-form-item label="词语"><el-input v-model="filters.keyword" placeholder="搜索词语" maxlength="30" clearable @keyup.enter="search" /></el-form-item>
        <el-form-item label="词库"><el-select v-model="filters.category" clearable placeholder="全部词库" style="width:150px"><el-option v-for="item in categories" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
        <el-form-item label="状态"><el-select v-model="filters.status" clearable placeholder="全部状态" style="width:130px"><el-option label="启用" value="1" /><el-option label="停用" value="0" /></el-select></el-form-item>
      </template>
      <template v-else>
        <el-form-item label="房间号"><el-input v-model="filters.code" placeholder="6位房间号" maxlength="6" clearable @keyup.enter="search" /></el-form-item>
        <el-form-item v-if="tab === 'rooms'" label="状态"><el-select v-model="filters.phase" clearable placeholder="全部状态" style="width:150px"><el-option v-for="(label, value) in phases" :key="value" :label="label" :value="value" /></el-select></el-form-item>
      </template>
      <el-form-item><el-button type="primary" @click="search">查询</el-button><el-button @click="reset">重置</el-button></el-form-item>
      <el-form-item v-if="tab === 'words'"><el-button v-hasPermi="['kangaroo:undercover:edit']" type="success" plain @click="editWord()">新增词组</el-button></el-form-item>
    </el-form>
    <p class="game-note">{{ tab === 'words' ? '启用的词组用于下一次开局，已发放的词语保留到本局结束。' : tab === 'history' ? '对局记录保留7天，已过期记录自动移除。' : '显示尚未过期的房间。等待与进行中的房间闲置24小时后过期，已结束房间保留7天。' }}</p>
    <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" class="game-error" />

    <el-table v-if="tab === 'words'" v-loading="loading" :data="rows" row-key="wordId" empty-text="没有符合条件的词组">
      <el-table-column prop="wordId" label="编号" width="80" />
      <el-table-column label="词库" width="130"><template #default="{ row }">{{ categoryLabel(row.category) }}</template></el-table-column>
      <el-table-column prop="firstWord" label="词语一" min-width="150" />
      <el-table-column prop="secondWord" label="词语二" min-width="150" />
      <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="Number(row.enabled) ? 'success' : 'info'">{{ Number(row.enabled) ? '启用' : '停用' }}</el-tag></template></el-table-column>
      <el-table-column prop="updateBy" label="更新人" min-width="130" />
      <el-table-column prop="updateTime" label="更新时间" width="180" />
      <el-table-column label="操作" width="150" fixed="right"><template #default="{ row }">
        <el-button v-hasPermi="['kangaroo:undercover:edit']" link type="primary" :disabled="saving" @click="editWord(row)">编辑</el-button>
        <el-button v-hasPermi="['kangaroo:undercover:edit']" link :type="Number(row.enabled) ? 'warning' : 'success'" :disabled="saving" @click="toggleWord(row)">{{ Number(row.enabled) ? '停用' : '启用' }}</el-button>
      </template></el-table-column>
    </el-table>
    <el-table v-else v-loading="loading" :data="rows" :row-key="row => row.code + row.gameId" empty-text="没有符合条件的记录">
      <el-table-column prop="code" label="房间号" width="100" />
      <el-table-column prop="hostName" label="房主" min-width="130" />
      <el-table-column label="状态" width="110"><template #default="{ row }">{{ phases[row.phase] }}</template></el-table-column>
      <el-table-column prop="playerCount" label="人数" width="70" />
      <el-table-column prop="round" label="轮次" width="70" />
      <el-table-column label="词库" width="120"><template #default="{ row }">{{ categoryLabel(row.category) }}</template></el-table-column>
      <el-table-column label="结果" width="130"><template #default="{ row }">{{ winners[row.winner] || '—' }}</template></el-table-column>
      <el-table-column :label="tab === 'history' ? '结束时间' : '建房时间'" width="180"><template #default="{ row }">{{ formatTime(tab === 'history' ? row.finishedAt : row.createdAt) }}</template></el-table-column>
      <el-table-column label="操作" width="150" fixed="right"><template #default="{ row }">
        <el-button link type="primary" @click="openRoom(row)">查看</el-button>
        <el-button v-if="tab === 'rooms' && row.phase !== 'closed'" v-hasPermi="['kangaroo:undercover:close']" link type="danger" :disabled="closing" @click="dissolve(row)">解散</el-button>
      </template></el-table-column>
    </el-table>
    <pagination v-if="total > 0" :total="total" v-model:page="page" v-model:limit="pageSize" @pagination="load" />

    <el-dialog v-model="wordOpen" :title="form.wordId ? '编辑词组' : '新增词组'" width="min(520px, 94vw)" :close-on-click-modal="false" :show-close="!saving" :close-on-press-escape="!saving">
      <el-form ref="wordForm" :model="form" :rules="wordRules" :disabled="saving" label-position="top">
        <el-form-item label="词库" prop="category"><el-select v-model="form.category"><el-option v-for="item in categories" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
        <el-form-item label="词语一" prop="firstWord"><el-input v-model="form.firstWord" maxlength="12" show-word-limit placeholder="例如 民宿" /></el-form-item>
        <el-form-item label="词语二" prop="secondWord"><el-input v-model="form.secondWord" maxlength="12" show-word-limit placeholder="例如 酒店" /></el-form-item>
        <el-form-item label="启用"><el-switch v-model="form.enabled" /></el-form-item>
      </el-form>
      <p class="game-note">每个词语支持1至12个文字或数字。开局时随机分配平民词和卧底词。</p>
      <template #footer><el-button :disabled="saving" @click="wordOpen = false">取消</el-button><el-button type="primary" :loading="saving" @click="submitWord">保存</el-button></template>
    </el-dialog>

    <el-drawer v-model="drawer" title="房间详情" size="min(780px, 95vw)" @closed="detailEpoch++">
      <div v-loading="detailLoading">
        <el-alert v-if="detailError" type="error" :title="detailError" :closable="false" />
        <template v-if="detail">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="房间号">{{ detail.code }}</el-descriptions-item>
            <el-descriptions-item label="状态">{{ phases[detail.phase] }}</el-descriptions-item>
            <el-descriptions-item label="轮次">{{ detail.round }}</el-descriptions-item>
            <el-descriptions-item label="词库">{{ categoryLabel(detail.category) }}</el-descriptions-item>
            <el-descriptions-item label="描述时长">{{ detail.speechSeconds }}秒</el-descriptions-item>
            <el-descriptions-item label="投票时长">{{ detail.voteSeconds }}秒</el-descriptions-item>
            <el-descriptions-item label="开始时间">{{ formatTime(detail.startedAt) }}</el-descriptions-item>
            <el-descriptions-item label="结束时间">{{ formatTime(detail.finishedAt) }}</el-descriptions-item>
          </el-descriptions>
          <el-alert v-if="detail.phase === 'finished'" :title="winners[detail.winner] + ' · 平民词 ' + detail.civilianWord + ' · 卧底词 ' + detail.undercoverWord" type="success" :closable="false" class="game-error" />
          <el-alert v-else-if="detail.phase === 'closed'" :title="detail.closeReason ? '解散原因 ' + detail.closeReason : '所有玩家已退出'" type="warning" :closable="false" class="game-error" />
          <p v-else class="game-note">身份和词语将在对局结束后揭晓。</p>
          <p v-if="detail.closedBy" class="game-note">{{ detail.closedBy }} · {{ formatTime(detail.closedAt) }}</p>
          <h3>参与玩家</h3>
          <el-table :data="detail.players" row-key="userId">
            <el-table-column prop="seat" label="座位" width="70" /><el-table-column prop="name" label="昵称" min-width="110" />
            <el-table-column prop="userId" label="用户编号" min-width="120" />
            <el-table-column label="状态" width="100"><template #default="{row}">{{ row.alive ? '在场' : '已出局' }}</template></el-table-column>
            <el-table-column v-if="detail.phase === 'finished'" label="身份 / 词语" min-width="150"><template #default="{row}">{{ row.role === 'undercover' ? '卧底' : '平民' }} · {{ row.word }}</template></el-table-column>
          </el-table>
          <el-collapse class="game-records">
            <el-collapse-item title="描述记录" name="messages">
              <el-empty v-if="!detail.messages.length" description="暂无文字描述" :image-size="60" />
              <div v-for="message in detail.messages" :key="message.id" class="game-message"><small>第{{ message.round }}轮{{ message.runoff ? '加赛' : '' }} · {{ message.seat }}号 {{ message.name }}</small><p>{{ message.text }}</p></div>
            </el-collapse-item>
            <el-collapse-item title="对局过程" name="events"><p v-for="(event,index) in detail.events" :key="index" class="game-event">{{ event }}</p></el-collapse-item>
          </el-collapse>
        </template>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, nextTick, onBeforeUnmount } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { listWords, saveWord, listRooms, roomDetail, closeRoom } from '@/api/kangaroo/undercover'

const categories = [{ value: 'travel', label: '旅行见闻' }, { value: 'daily', label: '日常生活' }]
const phases = { waiting: '等待开局', reveal: '查看词语', discussion: '轮流描述', vote: '投票中', finished: '已结束', closed: '已解散' }
const winners = { civilian: '平民获胜', undercover: '卧底获胜', draw: '平局' }
const categoryLabel = value => value === 'mixed' ? '随机混合' : categories.find(item => item.value === value)?.label || value
const formatTime = value => value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '—'
const emptyFilters = () => ({ keyword: '', category: '', status: '', code: '', phase: '' })
const tab = ref('words'), filters = ref(emptyFilters()), page = ref(1), pageSize = ref(20)
const rows = ref([]), total = ref(0), loading = ref(false), error = ref('')
const wordOpen = ref(false), wordForm = ref(), form = ref({}), saving = ref(false)
const drawer = ref(false), detail = ref(null), detailLoading = ref(false), detailError = ref(''), closing = ref(false)
let epoch = 0, detailEpoch = 0
const wordRule = { required: true, pattern: /^[\p{L}\p{N}]{1,12}$/u, message: '填写1至12个文字或数字，避免空格和标点', trigger: 'blur' }
const wordRules = { category: [{ required: true, message: '请选择词库' }], firstWord: [wordRule], secondWord: [wordRule] }

async function load() {
  const generation = ++epoch
  loading.value = true
  error.value = ''
  try {
    const params = { ...filters.value, pageNum: page.value, pageSize: pageSize.value }
    const response = tab.value === 'words' ? await listWords(params) : await listRooms({ ...params, history: tab.value === 'history', phase: tab.value === 'history' ? '' : params.phase })
    if (generation !== epoch) return
    rows.value = response.data.rows
    total.value = response.data.total
  } catch (e) {
    if (generation === epoch) { error.value = e.message || '加载失败，请重试'; rows.value = []; total.value = 0 }
  } finally {
    if (generation === epoch) loading.value = false
  }
}
function search() {
  if (tab.value !== 'words' && filters.value.code && !/^[1-9]\d{5}$/.test(filters.value.code)) {
    ElMessage.warning('请输入完整的6位房间号')
    return
  }
  page.value = 1
  load()
}
function reset() { filters.value = emptyFilters(); search() }
function changeTab() { rows.value = []; total.value = 0; reset() }
async function editWord(row) {
  form.value = row ? { ...row, enabled: !!Number(row.enabled) } : { category: 'travel', firstWord: '', secondWord: '', enabled: true }
  wordOpen.value = true
  await nextTick()
  wordForm.value?.clearValidate()
}
async function submitWord() {
  if (saving.value || !await wordForm.value.validate().catch(() => false)) return
  if (form.value.firstWord === form.value.secondWord) { ElMessage.warning('两个词语需要不同'); return }
  saving.value = true
  try {
    await saveWord(form.value)
    wordOpen.value = false
    ElMessage.success('词组已保存，下次开局生效')
    await load()
  } catch (e) { /* Request layer displays the failure and keeps the draft available. */ }
  finally { saving.value = false }
}
async function toggleWord(row) {
  if (saving.value) return
  saving.value = true
  try {
    await saveWord({ ...row, enabled: !Number(row.enabled) })
    ElMessage.success(Number(row.enabled) ? '词组已停用' : '词组已启用')
    await load()
  } catch (e) { /* Request layer displays failure. */ }
  finally { saving.value = false }
}
async function openRoom(row) {
  const generation = ++detailEpoch
  const historyId = tab.value === 'history' ? row.gameId : undefined
  detail.value = null
  detailError.value = ''
  drawer.value = true
  detailLoading.value = true
  try {
    const response = await roomDetail(row.code, historyId)
    if (generation === detailEpoch) detail.value = response.data
  } catch (e) { if (generation === detailEpoch) detailError.value = e.message || '详情加载失败' }
  finally { if (generation === detailEpoch) detailLoading.value = false }
}
async function dissolve(row) {
  if (closing.value) return
  closing.value = true
  try {
    const { value } = await ElMessageBox.prompt('解散后，玩家需重新开房。请填写处理原因。', '解散房间 ' + row.code, {
      confirmButtonText: '确认解散', cancelButtonText: '取消',
      inputValidator: value => (!!value?.trim() && value.trim().length <= 200) || '请填写1至200字的原因'
    })
    await closeRoom(row.code, { gameId: row.gameId, reason: value.trim() })
    ElMessage.success('房间已解散，原因已记录')
    await load()
  } catch (e) { /* Cancellation is harmless; request failures are shown globally. */ }
  finally { closing.value = false }
}
onBeforeUnmount(() => { epoch++; detailEpoch++ })
load()
</script>

<style scoped>
.game-heading { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 18px; }
.game-heading h2 { margin: 0 0 8px; font-size: 22px; color: var(--el-text-color-primary); }
.game-heading p, .game-note { color: var(--el-text-color-secondary); font-size: 13px; line-height: 1.65; }
.game-heading p { margin: 0; }
.game-note { margin: 8px 0 18px; }
.game-error { margin: 16px 0; }
.game-records { margin-top: 24px; }
.game-message { padding: 12px 0; border-bottom: 1px solid var(--el-border-color-lighter); }
.game-message small { color: var(--el-text-color-secondary); }
.game-message p, .game-event { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.7; }
.undercover-admin :deep(.el-form--inline .el-form-item) { margin-right: 16px; }
.undercover-admin :deep(.el-drawer h3) { font-size: 17px; margin-top: 24px; }
</style>
