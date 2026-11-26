<template>
  <div class="app-container insurance-admin">
    <header class="page-heading"><div><h2>投保与退费</h2><p>核对缴费、登记真实保单，处理店家选择的退费去向。</p></div></header>
    <el-tabs v-model="tab">
      <el-tab-pane label="投保申请" name="applies" />
      <el-tab-pane label="保险退费" name="refunds" />
    </el-tabs>
    <el-form :inline="true" :model="query" @submit.prevent="search">
      <el-form-item label="搜索"><el-input v-model="query.keyword" clearable placeholder="输入被保险人或保单信息" @keyup.enter="search" /></el-form-item>
      <el-form-item label="状态"><el-select v-model="query.status" clearable placeholder="全部状态" style="width:170px"><el-option v-for="(label, value) in statuses" :key="value" :value="value" :label="label" /></el-select></el-form-item>
      <el-form-item><el-button type="primary" icon="Search" @click="search">查询</el-button><el-button icon="Refresh" @click="reset">重置</el-button></el-form-item>
    </el-form>
    <el-alert v-if="listError" :title="listError" type="error" :closable="false" show-icon><el-button link @click="loadList">重新加载</el-button></el-alert>
    <el-table v-loading="loading" :data="rows" empty-text="当前筛选范围内没有记录" :row-key="tab === 'applies' ? 'applyId' : 'refundId'">
      <el-table-column prop="applyId" label="投保编号" width="100" />
      <el-table-column prop="insuredName" label="被保险人" min-width="120" />
      <el-table-column prop="storeName" label="门店" min-width="160" show-overflow-tooltip />
      <el-table-column v-if="tab === 'applies'" prop="planName" label="保险方案" min-width="140" show-overflow-tooltip />
      <el-table-column label="金额" min-width="120"><template #default="{ row }">¥{{ money(tab === 'refunds' ? (row.approvedFen ?? row.amountFen) : (row.paymentStatus === 'legacy' ? row.referencePriceFen : row.amountFen)) }}<small v-if="tab === 'applies' && row.paymentStatus === 'legacy'">历史参考保费</small></template></el-table-column>
      <el-table-column v-if="tab === 'applies'" label="缴费" min-width="130"><template #default="{ row }">{{ paymentLabel(row) }}</template></el-table-column>
      <el-table-column v-else label="退费去向" min-width="140"><template #default="{ row }">{{ destinationLabel(row.destination) }}</template></el-table-column>
      <el-table-column label="状态" min-width="140"><template #default="{ row }"><el-tag :type="statusTone(row.status)">{{ (tab === 'applies' ? row.statusLabel || insuranceStatus[row.status] : refundLabel(row)) || row.status }}</el-tag><small v-if="row.refundRequired">需处理退费</small></template></el-table-column>
      <el-table-column label="操作" fixed="right" width="150"><template #default="{ row }"><el-button link type="primary" @click="openDetail(row.applyId, tab === 'refunds' ? row.refundId : null)" v-hasPermi="['kangaroo:insapply:query']">{{ tab === 'refunds' && (!row.policyNo || row.hqDeparture) && row.status === 'pending' ? '查看并审核' : '查看' }}</el-button></template></el-table-column>
    </el-table>
    <pagination v-show="total > 0" :total="total" v-model:page="query.pageNum" v-model:limit="query.pageSize" @pagination="loadList" />

    <el-drawer v-model="open" title="投保详情" size="min(760px, 100%)" :before-close="beforeClose" :close-on-click-modal="!busy" :close-on-press-escape="!busy" :show-close="!busy" destroy-on-close>
      <div v-loading="detailLoading" class="detail-content">
        <el-alert v-if="detailError" :title="detailError" type="error" :closable="false" show-icon><el-button link @click="openDetail(detailId, selectedRefundId)">重新加载详情</el-button></el-alert>
        <template v-if="detail">
          <h3>{{ detail.insuredName || '投保申请' }} <el-tag :type="statusTone(detail.status)">{{ detail.statusLabel || insuranceStatus[detail.status] || detail.status }}</el-tag></h3>
          <dl class="facts"><dt>投保编号</dt><dd>{{ detail.applyId }}</dd><dt>门店</dt><dd>{{ detail.storeName || '—' }}</dd><dt>方案</dt><dd>{{ detail.planName || '—' }}</dd><dt>缴费状态</dt><dd>{{ paymentLabel(detail) }}</dd><dt>保费</dt><dd>¥{{ money(detail.paymentStatus === 'legacy' ? detail.referencePriceFen : detail.amountFen) }}</dd><dt>付款账号</dt><dd>{{ detail.payerUserId ? '#' + detail.payerUserId : '无线上付款记录' }}</dd><dt v-if="detail.payNo">支付单号</dt><dd v-if="detail.payNo">{{ detail.payNo }}</dd><dt v-if="detail.paidAt">缴费时间</dt><dd v-if="detail.paidAt">{{ detail.paidAt }}</dd><dt>累计已退</dt><dd>¥{{ money(detail.refundedFen || 0) }}</dd><dt>剩余金额</dt><dd>¥{{ money(detail.refundableFen || 0) }}<small>最终可退金额须核实保单和实际退保结果。</small></dd><dt>保单号</dt><dd>{{ detail.policyNo || '尚未登记' }}</dd><dt>保障日期</dt><dd>{{ detail.startDate || '—' }} 至 {{ detail.endDate || '—' }}</dd></dl>
          <el-alert v-if="detail.paymentStatus === 'legacy'" title="历史人工办理记录" description="没有线上缴费凭证，不能据此生成退款或增加余额。" type="info" :closable="false" show-icon />
          <el-alert v-if="detail.refundRequired" title="这笔申请需要处理退费" description="请核实可退金额，并由付款店家在小程序选择原路退回或预存余额后提交申请。" type="warning" :closable="false" show-icon />
          <div class="actions" v-hasPermi="['kangaroo:insapply:handle']">
            <el-button v-if="detail.canRegister" type="primary" :disabled="busy" @click="startPolicy">登记保单</el-button>
            <el-button v-if="canReject" type="danger" plain :disabled="busy" @click="editor = editor === 'reject' ? '' : 'reject'">不予办理</el-button>
          </div>
          <section v-if="editor === 'policy' && detail.canRegister" class="editor" aria-label="登记实际保单">
            <h3>登记保险公司出具的保单</h3><p>核对真实保单号及保障日期。缴费完成不代表保障已经生效。</p>
            <el-form label-position="top" :disabled="busy" @submit.prevent="savePolicy">
              <el-form-item label="保单号（必填）"><el-input v-model="policy.policyNo" maxlength="64" /></el-form-item>
              <div class="date-fields"><el-form-item label="实际起保日期（必填）"><el-date-picker v-model="policy.startDate" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item><el-form-item label="实际止保日期（必填）"><el-date-picker v-model="policy.endDate" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item></div>
              <el-button type="primary" :loading="busy" @click="savePolicy">核对后登记</el-button><el-button :disabled="busy" @click="editor = ''">取消</el-button>
            </el-form>
          </section>
          <section v-if="editor === 'reject' && canReject" class="editor" aria-label="不予办理原因"><h3>不予办理</h3><p>已缴费的申请会进入退费待处理，不会在此直接退款。历史或未缴费申请关闭后不产生退款。</p><el-input v-model="rejectReason" type="textarea" :rows="3" maxlength="500" show-word-limit placeholder="填写原因" :disabled="busy" /><div class="actions"><el-button type="danger" :loading="busy" @click="rejectApply">确认不予办理</el-button><el-button :disabled="busy" @click="editor = ''">取消</el-button></div></section>
          <section class="refund-section"><h3>退费记录</h3><p v-if="!detail.refunds?.length" class="muted">尚未申请保险退费。</p><div v-for="refund in detail.refunds || []" :key="refund.refundId" class="refund-record">
            <div class="refund-heading"><strong>退费 #{{ refund.refundId }}</strong><el-tag :type="statusTone(refund.status)">{{ refundLabel(refund, detail.policyNo) }}</el-tag></div>
            <dl class="facts"><dt>店家选择</dt><dd>{{ destinationLabel(refund.destination) }}</dd><dt>{{ refund.verifiedDepartureDate ? '核定金额' : '申请金额' }}</dt><dd>¥{{ money(refund.verifiedDepartureDate ? refund.approvedFen ?? refund.amountFen : refund.amountFen) }}</dd><dt v-if="refund.approvedFen != null && !refund.verifiedDepartureDate">核定金额</dt><dd v-if="refund.approvedFen != null && !refund.verifiedDepartureDate">¥{{ money(refund.approvedFen) }}</dd><dt v-if="refund.departureDate">填报离店日期</dt><dd v-if="refund.departureDate">{{ refund.departureDate }}</dd><dt v-if="refund.verifiedDepartureDate">核实离店日期</dt><dd v-if="refund.verifiedDepartureDate">{{ refund.verifiedDepartureDate }}</dd><dt>原因</dt><dd>{{ refund.reason || '—' }}</dd><dt v-if="refund.handleNote">处理说明</dt><dd v-if="refund.handleNote">{{ refund.handleNote }}</dd><dt v-if="refund.createdAt">申请时间</dt><dd v-if="refund.createdAt">{{ refund.createdAt }}</dd></dl>
            <el-form v-if="refund.hqDeparture" label-position="top" :disabled="busy" v-hasPermi="['kangaroo:insapply:handle']" @submit.prevent="headquartersAudit(refund)">
              <el-form-item label="总部核实的实际离店日期"><el-date-picker v-model="departureDate" type="date" value-format="YYYY-MM-DD" /></el-form-item>
              <el-button type="primary" @click="headquartersAudit(refund)">核算金额并办理</el-button>
            </el-form>
            <el-button v-if="refund.status === 'pending' && !detail.policyNo && selectedRefundId !== refund.refundId" type="primary" plain :disabled="busy" @click="startAudit(refund)" v-hasPermi="['kangaroo:insapply:handle']">审核这笔退费</el-button>
            <div v-if="refund.destination === 'original' && ['processing', 'failed'].includes(refund.status)" class="actions" v-hasPermi="['kangaroo:insapply:handle']"><el-button :loading="busy" @click="recheckRefund(refund)">核对渠道结果</el-button><small>查询原退款单的实际结果，不会重复发起退款。</small></div>
            <el-form v-if="refund.status === 'pending' && !detail.policyNo && selectedRefundId === refund.refundId" label-position="top" :disabled="busy" class="editor" v-hasPermi="['kangaroo:insapply:handle']" @submit.prevent="submitAudit(refund, true)">
              <p>按实际退保结果核定金额；退费去向由店家选择，此处不能更改。</p>
              <el-form-item label="核定退费金额（元）"><el-input v-model="auditAmount" inputmode="decimal" placeholder="最多两位小数" /></el-form-item>
              <el-form-item label="审核说明（必填）"><el-input v-model="auditReason" type="textarea" :rows="3" maxlength="500" show-word-limit placeholder="填写核定依据，或不予退费的原因" /></el-form-item>
              <el-button type="primary" :loading="busy" @click="submitAudit(refund, true)">同意退费</el-button><el-button type="danger" plain :disabled="busy" @click="submitAudit(refund, false)">不予退费</el-button><el-button :disabled="busy" @click="selectedRefundId = null">取消</el-button>
            </el-form>
          </div></section>
          <el-alert v-if="actionError" :title="actionError" type="error" :closable="false" show-icon />
        </template>
      </div>
    </el-drawer>
  </div>
</template>

<script setup name="KgExtInsApply">
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { listInsuranceApplies, getInsuranceApply, registerInsurancePolicy, rejectInsuranceApply, listInsuranceRefunds, auditInsuranceRefund, previewInsuranceRefund, recheckInsuranceRefund } from '@/api/kangaroo/insurance-finance'
import { insuranceStatus, refundStatus, refundLabel, destinationLabel, money, amountToFen, validPolicyDates } from './finance-format'

const route = useRoute()
const tab = ref(route.query.tab === 'refunds' ? 'refunds' : 'applies'), query = reactive({ keyword: '', status: '', pageNum: 1, pageSize: 20 })
const rows = ref([]), total = ref(0), loading = ref(false), listError = ref('')
const open = ref(false), detail = ref(null), detailId = ref(null), detailLoading = ref(false), detailError = ref(''), actionError = ref(''), busy = ref(false)
const editor = ref(''), policy = reactive({ policyNo: '', startDate: '', endDate: '' }), rejectReason = ref('')
const departureDate = ref('')
const selectedRefundId = ref(null), auditAmount = ref(''), auditReason = ref('')
let active = true, listEpoch = 0, detailEpoch = 0
const statuses = computed(() => tab.value === 'applies' ? insuranceStatus : refundStatus)
const canReject = computed(() => detail.value?.canReject === true && !detail.value.refundRequired)
const statusTone = value => ['success', 'effective', 'refunded'].includes(value) ? 'success' : ['pending', 'pending_payment', 'processing', 'refunding'].includes(value) ? 'warning' : ['rejected', 'failed'].includes(value) ? 'danger' : 'info'
const paymentLabel = row => row.paymentStatus === 'legacy' ? '历史人工办理' : row.paymentStatus === 'paid' ? (row.paymentMethod === 'balance' ? '保险余额已缴费' : '微信已缴费') : row.paymentStatus === 'closed' ? '支付已关闭' : '待缴费'
const message = error => typeof error === 'string' ? error : error?.message || '操作未完成，请刷新核对后重试'
async function loadList() {
  const epoch = ++listEpoch, selectedTab = tab.value
  loading.value = true; listError.value = ''; rows.value = []; total.value = 0
  try {
    const { data } = await (selectedTab === 'applies' ? listInsuranceApplies : listInsuranceRefunds)({ ...query })
    if (!active || epoch !== listEpoch) return
    rows.value = data?.rows || []; total.value = Number(data?.total) || 0
  } catch (error) { if (active && epoch === listEpoch) listError.value = message(error) }
  finally { if (active && epoch === listEpoch) loading.value = false }
}
function search() { query.pageNum = 1; loadList() }
watch(() => route.query.tab, value => { tab.value = value === 'refunds' ? 'refunds' : 'applies' })
watch(tab, () => { query.status = ''; search() })
function reset() { query.keyword = ''; query.status = ''; search() }
function startAudit(refund) { selectedRefundId.value = refund.refundId; auditAmount.value = money(refund.amountFen); auditReason.value = ''; actionError.value = '' }
async function openDetail(id, refundId = null) {
  const epoch = ++detailEpoch
  open.value = true; detailId.value = id; detail.value = null; editor.value = ''; selectedRefundId.value = null
  detailLoading.value = true; detailError.value = ''; actionError.value = ''
  try {
    const { data } = await getInsuranceApply(id)
    if (!active || epoch !== detailEpoch || !open.value) return
    detail.value = data
    const pending = data?.refunds?.find(r => r.hqDeparture)
    departureDate.value = pending?.verifiedDepartureDate || pending?.departureDate || ''
    const refund = data?.refunds?.find(r => r.refundId === refundId && r.status === 'pending')
    if (refund && !data.policyNo) startAudit(refund)
  } catch (error) { if (active && epoch === detailEpoch) detailError.value = message(error) }
  finally { if (active && epoch === detailEpoch) detailLoading.value = false }
}
function beforeClose(done) { if (busy.value) return; ++detailEpoch; detail.value = null; selectedRefundId.value = null; done() }
function startPolicy() { policy.policyNo = detail.value.policyNo || ''; policy.startDate = (detail.value.startDate || '').slice(0, 10); policy.endDate = (detail.value.endDate || '').slice(0, 10); editor.value = 'policy'; actionError.value = '' }
async function mutate(action, text) {
  if (busy.value || !detail.value) return
  const id = detail.value.applyId, epoch = detailEpoch
  busy.value = true; actionError.value = ''
  try {
    await action()
    if (!active || epoch !== detailEpoch) return
    ElMessage.success(text)
    await openDetail(id); await loadList()
  } catch (error) { if (active && epoch === detailEpoch) actionError.value = message(error) }
  finally { if (active) busy.value = false }
}
function savePolicy() {
  if (!policy.policyNo.trim()) return ElMessage.warning('请填写真实保单号')
  if (!validPolicyDates(policy.startDate, policy.endDate)) return ElMessage.warning('请填写正确的保障起止日期')
  const id = detail.value.applyId, payload = { ...policy, policyNo: policy.policyNo.trim() }
  mutate(() => registerInsurancePolicy(id, payload), '保单已登记，保障状态按实际日期显示')
}
function rejectApply() {
  if (rejectReason.value.trim().length < 2) return ElMessage.warning('请填写不予办理的原因')
  const id = detail.value.applyId, reason = rejectReason.value.trim()
  mutate(() => rejectInsuranceApply(id, { reason }), '处理结果已保存，请核对申请状态')
}
function recheckRefund(refund) { mutate(() => recheckInsuranceRefund(refund.refundId), '渠道结果已核对，请查看最新退费状态') }
async function headquartersAudit(refund) {
  if (!departureDate.value || busy.value) return
  const payload = { approve: true, departureDate: departureDate.value }
  const epoch = detailEpoch
  busy.value = true
  try {
    const { data } = await previewInsuranceRefund(refund.refundId, payload)
    if (!active || epoch !== detailEpoch) return
    const fen = data.amountFen
    const decision = fen === 0 ? '可退为零，确认后结案，付款人不能再次申请' : '退回' + destinationLabel(refund.destination) + ' ¥' + money(fen)
    await ElMessageBox.confirm('离店日期 ' + payload.departureDate + '，' + decision, '确认总部办理')
    await auditInsuranceRefund(refund.refundId, { ...payload, amountFen: fen })
    ElMessage.success('总部办理完成')
    await openDetail(detailId.value); await loadList()
  } catch (e) { if (e !== 'cancel' && e !== 'close') actionError.value = message(e) }
  finally { busy.value = false }
}
async function submitAudit(refund, approve) {
  if (busy.value) return
  const reason = auditReason.value.trim(), amountFen = amountToFen(auditAmount.value)
  if (reason.length < 2) return ElMessage.warning('请填写审核说明')
  if (approve && (amountFen === null || amountFen <= 0 || amountFen > Number(refund.amountFen) || amountFen > Number(detail.value.refundableFen))) return ElMessage.warning('核定金额须大于0，且不超过申请金额和剩余金额')
  const epoch = detailEpoch, id = refund.refundId
  try { await ElMessageBox.confirm(approve ? `核定退费 ¥${money(amountFen)}，按店家选择${destinationLabel(refund.destination)}。确认提交？` : '确认不予退费？审核说明会保留在记录中。', '确认审核结果', { type: 'warning', confirmButtonText: '确认提交', cancelButtonText: '返回核对' }) } catch { return }
  if (!active || epoch !== detailEpoch || !open.value) return
  await mutate(() => auditInsuranceRefund(id, { approve, amountFen: approve ? amountFen : 0, reason }), '审核结果已提交，到账状态请以退费记录为准')
}
onBeforeUnmount(() => { active = false; ++listEpoch; ++detailEpoch })
loadList()
</script>

<style scoped>
.page-heading h2{margin:0 0 8px;font-size:22px}.page-heading p,.editor p,.muted{color:var(--el-text-color-secondary);line-height:1.7}.insurance-admin small{display:block;color:var(--el-text-color-secondary);font-size:12px;line-height:1.6;margin-top:4px}.detail-content{min-height:160px}.detail-content h3{display:flex;align-items:center;gap:12px;flex-wrap:wrap;line-height:1.5;font-size:18px}.facts{display:grid;grid-template-columns:105px minmax(0,1fr);gap:12px 16px;font-size:14px;line-height:1.6;margin:20px 0}.facts dt{color:var(--el-text-color-secondary)}.facts dd{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}.actions{display:flex;gap:8px;flex-wrap:wrap;margin:20px 0}.actions .el-button+.el-button{margin-left:0}.editor{padding:20px 0;margin:20px 0;border-top:1px solid var(--el-border-color-light);border-bottom:1px solid var(--el-border-color-light)}.editor h3{margin-top:0}.date-fields{display:grid;grid-template-columns:1fr 1fr;gap:16px}.refund-section{margin-top:30px}.refund-record{padding:20px 0;border-top:1px solid var(--el-border-color-light)}.refund-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}.detail-content>.el-alert+.el-alert{margin-top:12px}@media(max-width:540px){.date-fields{grid-template-columns:1fr;gap:0}.facts{grid-template-columns:88px minmax(0,1fr);gap:10px}.editor>.el-button{margin-top:8px}.insurance-admin :deep(.el-form--inline .el-form-item){display:flex;margin-right:0}.insurance-admin :deep(.el-form--inline .el-form-item__content){min-width:0}.insurance-admin :deep(.el-form--inline .el-input){width:100%}}
</style>
