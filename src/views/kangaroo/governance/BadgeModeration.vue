<template>
  <section class="moderation">
    <el-alert v-if="error" :title="error" type="error" :closable="false" />
    <el-form inline class="filter" @submit.prevent="search">
      <el-form-item label="会员ID"><el-input-number v-model="memberId" :min="1" :precision="0" /></el-form-item>
      <el-form-item><el-button type="primary" :loading="loading" @click="search">查询</el-button><el-button :disabled="loading" @click="clearSearch">全部记录</el-button></el-form-item>
    </el-form>
    <div v-if="data.member" class="member-summary">
      <strong>会员 {{ data.userId }} · 信用 {{ data.member.creditScore }} 分</strong>
      <span>优质内容 {{ data.member.qualityContents }} 条 · 精华 {{ data.member.featuredContents }} 条</span>
      <span v-if="data.member.referralFraud">有核实的虚假邀请记录</span>
      <span v-if="data.member.falseContent">有核实的虚假内容记录</span>
      <span v-if="data.member.historicalIntegrityNeedsReview">历史会员处理记录需补充违规类型核定</span>
      <span v-if="!data.member.accountAvailable">账号当前受限</span>
    </div>

    <template v-if="mode === 'content'">
      <p class="help">优质与精华分别核定。内容隐藏、删除、被撤销或修改后，原核定自动失效。已有人工核验过的会员精华会带入，自动初审结果需在这里确认。</p>
      <el-table :data="data.contents?.rows || []" v-loading="loading" :row-key="row => row.contentType + '-' + row.contentId">
        <el-table-column type="expand"><template #default="{ row }">
          <div class="content-preview"><h3 v-if="row.title">{{ row.title }}</h3><p>{{ row.content }}</p>
            <div class="preview-images"><el-image v-for="(url, index) in images(row.images)" :key="url" :src="url" :preview-src-list="images(row.images)" :initial-index="index" preview-teleported fit="cover" /></div>
          </div>
        </template></el-table-column>
        <el-table-column label="内容" min-width="270"><template #default="{ row }"><div>{{ targetLabel(row.contentType) }} #{{ row.contentId }} · 会员 {{ row.appUserId }}</div><div class="content-summary">{{ row.title || row.content }}</div></template></el-table-column>
        <el-table-column label="核定结果" width="130"><template #default="{ row }">{{ row.featured === '1' ? '精华、优质' : row.quality === '1' ? '优质' : '未计入' }}</template></el-table-column>
        <el-table-column prop="sourceLabel" label="依据状态" min-width="190" />
        <el-table-column prop="checkedBy" label="核定人" width="150" />
        <el-table-column label="操作" width="150"><template #default="{ row }"><el-button v-hasPermi="['kangaroo:memberlevel:edit']" link type="primary" :disabled="!row.canAssess || busy" @click="selectContent(row)">{{ row.canAssess ? '核定内容' : '内容当前不可核定' }}</el-button></template></el-table-column>
      </el-table>
      <el-pagination v-model:current-page="page" :total="data.contents?.total || 0" :page-size="20" layout="prev,pager,next,total" @current-change="load" />
      <el-form v-if="selectedContent" ref="formElement" class="form content-form" label-position="top" @submit.prevent>
        <h3>核定{{ targetLabel(selectedContent.contentType) }} #{{ selectedContent.contentId }}</h3>
        <p class="help">{{ selectedContent.title || selectedContent.content }}</p>
        <el-form-item label="内容等级"><el-checkbox v-model="contentForm.quality" @change="clearFeatured">优质内容</el-checkbox><el-checkbox v-model="contentForm.featured" :disabled="!contentForm.quality">精华内容</el-checkbox></el-form-item>
        <el-form-item label="核定依据"><el-input v-model="contentForm.note" type="textarea" :rows="3" maxlength="500" show-word-limit placeholder="写明核验的内容、真实性及判断依据，至少10字" /></el-form-item>
        <el-button v-hasPermi="['kangaroo:memberlevel:edit']" type="primary" :loading="busy" @click="saveContent">保存核定</el-button><el-button :disabled="busy" @click="selectedContent = null">取消</el-button>
      </el-form>
    </template>

    <template v-else>
      <p class="help">初始信用100分，已有评审扣分会继承。确认违规时关联具体邀请人或内容，系统按实际已发奖励扣回，同一记录只处理一次。</p>
      <el-form class="form" label-position="top" @submit.prevent>
        <div class="field-row">
          <el-form-item label="被核定会员ID"><el-input-number v-model="violation.userId" :min="1" :precision="0" /></el-form-item>
          <el-form-item label="违规类型"><el-select v-model="violation.violationType" class="violation-type" @change="changeViolationType"><el-option label="虚假邀请" value="referral_fraud" /><el-option label="虚假内容" value="false_content" /></el-select></el-form-item>
          <el-form-item label="信用扣分"><el-input-number v-model="violation.deduction" :min="0" :max="100" :precision="0" /></el-form-item>
        </div>
        <el-form-item v-if="violation.violationType === 'false_content'" label="内容类型"><el-radio-group v-model="violation.targetType"><el-radio value="review">评价</el-radio><el-radio value="post">社区帖子</el-radio></el-radio-group></el-form-item>
        <el-form-item :label="violation.targetType === 'invited' ? '对应被邀请人账号ID' : '对应内容ID'"><el-input-number v-model="violation.targetId" :min="1" :precision="0" /></el-form-item>
        <el-form-item label="核实依据"><el-input v-model="violation.note" type="textarea" :rows="4" maxlength="500" show-word-limit placeholder="记录已核实的事实和证据，至少10字" /></el-form-item>
        <el-button v-hasPermi="['kangaroo:memberlevel:edit']" type="danger" :loading="busy" @click="recordViolation">确认违规并扣回关联奖励</el-button>
      </el-form>
      <h3>已核实记录</h3>
      <el-table :data="data.violations || []" v-loading="loading">
        <el-table-column prop="appUserId" label="会员ID" width="100" />
        <el-table-column label="关联事实" min-width="200"><template #default="{ row }">{{ row.violationType === 'referral_fraud' ? '虚假邀请' : '虚假内容' }} · {{ targetLabel(row.targetType) }} #{{ row.targetId }}</template></el-table-column>
        <el-table-column prop="creditDeduction" label="实际扣分" width="100" />
        <el-table-column prop="note" label="核实依据" min-width="280" />
        <el-table-column prop="createdBy" label="核实人" width="140" />
        <el-table-column prop="createTime" label="时间" width="180" />
      </el-table>
    </template>
  </section>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'

defineProps({ mode: { type: String, required: true } })
const emit = defineEmits(['saved'])
const data = ref({}), memberId = ref(), page = ref(1), loading = ref(false), busy = ref(false), error = ref('')
const selectedContent = ref(null), formElement = ref(null), contentForm = ref({ quality: false, featured: false, note: '' })
const violation = ref({ userId: undefined, violationType: 'referral_fraud', targetType: 'invited', targetId: undefined, deduction: 0, note: '' })
let loadVersion = 0

async function load() {
  const version = ++loadVersion
  loading.value = true
  error.value = ''
  try {
    const response = await request({ url: '/kangaroo/governance/badge-moderation', params: { userId: memberId.value || undefined, pageNum: page.value } })
    if (version === loadVersion) data.value = response.data || {}
  } catch (failure) { if (version === loadVersion) error.value = failure.message || '读取核定记录失败，请重试' }
  finally { if (version === loadVersion) loading.value = false }
}
async function search() { selectedContent.value = null; page.value = 1; if (memberId.value) violation.value.userId = memberId.value; await load() }
async function clearSearch() { memberId.value = undefined; await search() }
async function send(path, body) {
  if (busy.value) return false
  busy.value = true
  error.value = ''
  try {
    await request({ url: '/kangaroo/governance/' + path, method: 'post', data: body })
    ElMessage.success('已保存')
    await load()
    emit('saved')
    return true
  } catch (failure) { error.value = failure.message || '保存失败，请重试'; return false }
  finally { busy.value = false }
}
function images(value) { return Array.isArray(value) ? value : String(value || '').split(',').map(item => item.trim()).filter(Boolean) }
function targetLabel(value) { return { invited: '被邀请人', review: '评价', post: '帖子' }[value] || value }
async function selectContent(row) {
  selectedContent.value = row
  contentForm.value = { quality: row.quality === '1', featured: row.featured === '1', note: '' }
  await nextTick()
  formElement.value?.$el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}
function clearFeatured(value) { if (!value) contentForm.value.featured = false }
async function saveContent() {
  if (!selectedContent.value || contentForm.value.note.trim().length < 10) { ElMessage.warning('请填写至少10字的核定依据'); return }
  const row = selectedContent.value
  if (await send('badge-content', { contentType: row.contentType, contentId: row.contentId, contentDigest: row.currentDigest, ...contentForm.value })) selectedContent.value = null
}
function changeViolationType(value) { violation.value.targetType = value === 'referral_fraud' ? 'invited' : 'review'; violation.value.targetId = undefined }
async function recordViolation() {
  if (!violation.value.userId || !violation.value.targetId || violation.value.note.trim().length < 10) { ElMessage.warning('请填写会员、关联记录和至少10字的核实依据'); return }
  if (await send('badge-violations', { ...violation.value })) { violation.value.targetId = undefined; violation.value.note = '' }
}
onMounted(load)
</script>

<style scoped>
.filter, .el-pagination { margin: 16px 0; }
.form { max-width: 760px; padding: 20px 0; }
.help { max-width: 75ch; color: var(--el-text-color-secondary); font-size: 14px; line-height: 1.7; }
.member-summary { display: flex; flex-wrap: wrap; gap: 8px 20px; padding-bottom: 16px; color: var(--el-text-color-regular); }
.field-row { display: flex; flex-wrap: wrap; gap: 0 24px; }
.violation-type { width: 180px; }
.content-summary { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 44ch; color: var(--el-text-color-secondary); }
.content-preview { max-width: 75ch; padding: 12px 24px; white-space: pre-wrap; line-height: 1.7; }
.preview-images { display: flex; flex-wrap: wrap; gap: 8px; }
.preview-images .el-image { width: 100px; height: 100px; }
.content-form { border-top: 1px solid var(--el-border-color); }
</style>
