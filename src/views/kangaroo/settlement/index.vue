<template>
  <div class="app-container settlement-page">
    <div class="page-heading">
      <div><h2>订单分账与招聘费用</h2><p>自营房源按后台标价销售，不加价、不收平台服务费；合作、加盟、代运营房源按原规则加价 5%。结算按订单生成时的规则执行，退款后重新核对，历史账单不随门店类型变更。兼职按每日工资扣 10%，全职按首月底薪扣一次 10%。</p></div>
      <el-button v-if="canEdit" type="primary" @click="openWork">登记工资</el-button>
    </div>
    <el-form inline @submit.prevent="load">
      <el-form-item label="门店"><el-select v-model="storeId" clearable filterable style="width:220px" @change="reset"><el-option v-for="store in stores" :key="store.storeId" :label="store.storeName" :value="store.storeId" /></el-select></el-form-item>
      <el-form-item label="账单类型"><el-select v-model="kind" style="width:150px" @change="reset"><el-option label="全部" value="" /><el-option v-for="(label, value) in kinds" :key="value" :label="label" :value="value" /></el-select></el-form-item>
      <el-button @click="load">刷新</el-button>
    </el-form>
    <el-alert v-if="error" :title="error" type="error" :closable="false" />
    <el-table :data="rows" v-loading="loading" empty-text="暂无账单，新房费订单和已登记的工资会显示在这里">
      <el-table-column prop="storeName" label="门店" min-width="130" />
      <el-table-column label="类型" width="100"><template #default="{ row }">{{ kinds[row.kind] }}</template></el-table-column>
      <el-table-column label="订单 / 工作人员" min-width="190"><template #default="{ row }">{{ row.title }}<p v-if="row.orderNo" class="sub">{{ row.orderNo }} · {{ row.checkIn }} → {{ row.checkOut }}</p></template></el-table-column>
      <el-table-column label="结算价 / 工资" width="140"><template #default="{ row }">{{ money(row.baseFen) }}</template></el-table-column>
      <el-table-column label="平台费用" width="120"><template #default="{ row }">{{ money(row.feeFen) }}</template></el-table-column>
      <el-table-column label="状态" min-width="150"><template #default="{ row }">{{ state(row) }}</template></el-table-column>
      <el-table-column label="操作" width="110"><template #default="{ row }"><el-button link type="primary" @click="view(row.billId)">查看账单</el-button></template></el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page" :page-size="20" :total="total" layout="prev,pager,next,total" @current-change="load" />

    <el-drawer v-model="detailOpen" title="账单明细" size="min(620px,100vw)">
      <template v-if="detail">
        <h3>{{ detail.title }}</h3><p>{{ detail.storeName }} · {{ kinds[detail.kind] }} · {{ state(detail) }}</p>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="订单号" v-if="detail.orderNo">{{ detail.orderNo }}</el-descriptions-item>
          <el-descriptions-item label="入住 → 离店" v-if="detail.checkIn">{{ detail.checkIn }} → {{ detail.checkOut }}</el-descriptions-item>
          <el-descriptions-item label="客人" v-if="detail.guestName">{{ detail.guestName }}</el-descriptions-item>
          <el-descriptions-item label="工作日期" v-if="detail.workDate">{{ detail.workDate }}</el-descriptions-item>
          <el-descriptions-item :label="detail.kind === 'stay' ? '商家结算价' : '工资 / 首月底薪'">{{ money(detail.baseFen) }}</el-descriptions-item>
          <el-descriptions-item label="服务费">{{ detail.directFeeFree ? '自营免收' : detail.rateBp / 100 + '%' }} · {{ money(detail.feeFen) }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.kind !== 'stay'" label="工作人员实得">{{ money(detail.workerNetFen) }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.kind === 'stay'" label="实际收款减已退款">{{ money(detail.netFen) }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.directFeeFree || detail.merchantFeePolicy" label="当前结算试算">商家 {{ money(detail.suggestTargetFen) }} · 平台服务费 {{ money(detail.currentServiceFeeFen) }}（{{ detail.directFeeFree ? '自营免平台服务费' : '本单按原规则内扣 5%' }}）</el-descriptions-item>
          <el-descriptions-item label="已核对金额">{{ money(detail.targetFen) }}</el-descriptions-item>
          <el-descriptions-item :label="detail.kind === 'stay' ? '已付商家净额' : '已收服务费'">{{ money(detail.recordedFen) }}</el-descriptions-item>
          <el-descriptions-item label="待处理金额">{{ money(detail.remainingFen) }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.kind === 'stay'" label="可提现金额">{{ money(detail.withdrawableFen || 0) }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.withdrawingFen > 0" label="微信提现处理中">{{ money(detail.withdrawingFen) }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.discountFen > 0" label="订单优惠">{{ detail.discountLabel || '优惠' }} · {{ money(detail.discountFen) }} · {{ discountText(detail) }}</el-descriptions-item>
          <el-descriptions-item :label="detail.kind === 'stay' ? '结算依据' : '工资依据'" v-if="detail.basis">{{ detail.basis }}</el-descriptions-item>
        </el-descriptions>
        <p v-if="detail.kind !== 'stay'">商家从工资中代扣服务费并交给平台，工作人员实得金额已扣除这笔费用。</p>
        <el-alert v-if="detail.needsReview" title="退款金额发生变化，请重新核对商家应收金额" type="warning" :closable="false" />
        <el-alert v-if="detail.withdrawingFen > 0" title="微信提现正在处理，结果确认后可继续核对或登记收付款" type="info" :closable="false" />
        <el-form v-if="canEdit && detail.eligible && !detail.withdrawingFen" label-position="top" class="action-form" @submit.prevent>
          <el-form-item v-if="detail.kind === 'stay'" label="本单最终应付商家总额（元）"><el-input v-model="form.targetYuan" inputmode="decimal" :readonly="detail.directFeeFree || detail.merchantFeePolicy" /></el-form-item>
          <el-form-item v-if="detail.kind !== 'stay'" label="确认工资 / 首月底薪（元）"><el-input v-model="form.baseYuan" inputmode="decimal" /></el-form-item>
          <el-form-item label="核对 / 收付款说明"><el-input v-model="form.note" type="textarea" :rows="2" maxlength="1000" placeholder="记录工资确认依据，或退款、会员权益的承担方式" /></el-form-item>
          <el-button :loading="busy" @click="command('approve')">核对并确认金额</el-button>
          <template v-if="detail.status === 'approved' && !detail.needsReview && detail.remainingFen !== 0">
            <h3>{{ receiptLabel }}</h3>
            <el-form-item label="本次实际金额（元）"><el-input v-model="form.amountYuan" inputmode="decimal" /></el-form-item>
            <el-form-item label="收付款流水号或凭证编号"><el-input v-model="form.proof" maxlength="500" /></el-form-item>
            <el-button type="primary" :loading="busy" @click="command('receipt')">登记{{ receiptLabel }}</el-button>
          </template>
        </el-form>
        <el-alert v-if="detailError" :title="detailError" type="error" :closable="false" />
        <template v-if="detail.withdrawals?.length">
          <h3>微信零钱提现记录</h3>
          <el-button @click="view(detail.billId)">刷新提现记录</el-button>
          <el-table :data="detail.withdrawals">
            <el-table-column label="金额" width="110"><template #default="{ row }">{{ money(row.amountFen) }}</template></el-table-column>
            <el-table-column label="状态" min-width="150"><template #default="{ row }">{{ transferState(row.state) }}<p v-if="row.errorCode">{{ row.errorCode }}</p><p v-if="row.failReason">{{ row.failReason }}</p></template></el-table-column>
            <el-table-column label="提现单 / 微信流水" min-width="180"><template #default="{ row }"><p>{{ row.withdrawalNo }}</p><p>{{ row.wxBillNo }}</p></template></el-table-column>
          </el-table>
        </template>
        <h3>操作记录</h3>
        <el-timeline><el-timeline-item v-for="(log, index) in detail.logs" :key="index" :timestamp="log.createTime"><p>{{ log.actor }} · {{ log.note }}</p><p v-if="log.proof">{{ money(log.amountFen) }} · {{ log.proof }}</p></el-timeline-item></el-timeline>
      </template>
    </el-drawer>

    <el-drawer v-model="workOpen" title="登记工资与招聘服务费" size="min(560px,100vw)">
      <el-form label-position="top" @submit.prevent="saveWork">
        <el-form-item label="已入职人员"><el-select v-model="work.appId" filterable style="width:100%" @change="selectWorker"><el-option v-for="person in candidates" :key="person.appId" :value="person.appId" :label="person.storeName + ' · ' + person.realName + ' · ' + kinds[person.jobType]" /></el-select></el-form-item>
        <el-form-item v-if="selectedWorker?.jobType === 'parttime'" label="实际工作日期"><el-date-picker v-model="work.workDate" value-format="YYYY-MM-DD" /></el-form-item>
        <el-form-item :label="selectedWorker?.jobType === 'fulltime' ? '首月确认底薪（元）' : '当天确认工资（元）'"><el-input v-model="work.yuan" inputmode="decimal" /></el-form-item>
        <p v-if="previewFee != null">服务费 {{ money(previewFee) }}，工作人员实得 {{ money(previewNet) }}。</p>
        <p v-if="selectedWorker?.jobType === 'fulltime'">同一次录用只登记一次。首月未做满的，填写双方确认的首月底薪，并在依据中说明计算方式。</p>
        <el-form-item label="工资确认依据"><el-input v-model="work.basis" type="textarea" :rows="3" maxlength="1000" placeholder="工作日期、工时、双方确认的工资或首月底薪" /></el-form-item>
        <el-alert v-if="workError" :title="workError" type="error" :closable="false" />
        <el-button type="primary" native-type="submit" :loading="busy">保存工资及服务费</el-button>
      </el-form>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import request from '@/utils/request'
import { checkPermi } from '@/utils/permission'

const canEdit = checkPermi(['kangaroo:businessbill:edit'])
const kinds = { stay: '房费分账', parttime: '兼职服务费', fulltime: '全职服务费' }
const rows = ref([]), stores = ref([]), storeId = ref(), kind = ref(''), page = ref(1), total = ref(0)
const loading = ref(false), busy = ref(false), error = ref('')
const detailOpen = ref(false), detail = ref(null), detailError = ref(''), form = ref({})
const workOpen = ref(false), work = ref({}), workError = ref(''), candidates = ref([])
const selectedWorker = computed(() => candidates.value.find(person => person.appId === work.value.appId))
const receiptLabel = computed(() => detail.value?.remainingFen < 0 ? (detail.value?.kind === 'stay' ? '商家退回款项' : '退还服务费') : detail.value?.kind === 'stay' ? '实际付款' : '服务费收款')
const api = (path = '', method = 'get', data) => request({ url: '/kangaroo/business-bills' + path, method, ...(method === 'get' ? { params: data } : { data }) })
const money = value => value == null ? '待核对' : '¥' + (Number(value) / 100).toFixed(2)
// 订单优惠怎么进账：长住优惠等已按比例分摊；会员权益、规则上线前的老账单要平台核对（老账单给按比例算的建议金额）
const discountText = bill => bill.directFeeFree ? '优惠已计入实付房费，自营免平台服务费' : bill.merchantFeePolicy ? '本单按原规则在优惠后实付房费内扣5%服务费' : bill.discountShared ? '已按比例分摊到商家结算价和平台服务费'
  : bill.discountMember ? '会员权益，承担方式请核对后填写金额'
  : '老账单未分摊' + (bill.suggestTargetFen != null ? '，按比例分摊商家应得 ' + money(bill.suggestTargetFen) : '') + '，请核对'
const transferState = state => ({ QUEUED: '等待处理', ACCEPTED: '微信已受理', PROCESSING: '微信处理中', WAIT_USER_CONFIRM: '待商家确认收款', TRANSFERING: '转账中', SUCCESS: '已到账', FAIL: '失败，已释放金额', CANCELING: '撤销处理中', CANCELLED: '已撤销，已释放金额' }[state] || state)
function fen(value) {
  if (!/^\d+(\.\d{1,2})?$/.test(String(value))) throw Error('金额最多保留两位小数')
  const [whole, decimal = ''] = String(value).split('.')
  const amount = Number(whole) * 100 + Number(decimal.padEnd(2, '0'))
  if (!Number.isSafeInteger(amount) || amount > 100000000000) throw Error('金额超出范围')
  return amount
}
const previewFee = computed(() => { try { return Math.floor((fen(work.value.yuan) + 5) / 10) } catch { return null } })
const previewNet = computed(() => previewFee.value == null ? null : fen(work.value.yuan) - previewFee.value)
function state(row) {
  if (row.withdrawingFen > 0) return '微信提现处理中'
  if (row.withdrawableFen > 0) return '可提现'
  if (row.kind === 'stay' && row.sourceStatus === 'closed') return '订单已关闭'
  if (row.kind === 'stay' && row.sourceStatus === 'pending_payment') return '待客人付款' 
  if (row.needsReview) return '退款变化 · 待重新核对'
  if (row.kind === 'stay' && row.sourceStatus === 'no_show' && row.eligible && row.status === 'draft') return '客人未到店 · 待核对'
  if (row.kind === 'stay' && !row.eligible) return '待退房或退款处理'
  return { draft: '待核对', approved: '待收付款登记', settled: '已结清' }[row.status] || row.status
}
let loadSequence = 0
async function load() {
  const sequence = ++loadSequence
  loading.value = true
  error.value = ''
  try {
    const result = (await api('', 'get', { storeId: storeId.value, kind: kind.value, pageNum: page.value })).data
    if (sequence !== loadSequence) return
    rows.value = result.rows
    total.value = result.total
  } catch (e) { if (sequence === loadSequence) error.value = e.message }
  finally { if (sequence === loadSequence) loading.value = false }
}
function reset() { page.value = 1; load() }
async function view(id) {
  detailError.value = ''
  try {
    detail.value = (await api('/' + id)).data
    const bill = detail.value
    // 分摊规则上线前、有长住优惠的老账单：默认填按比例算出的建议金额（suggestTargetFen），不再默认把实付全给商家
    form.value = { baseYuan: (bill.baseFen / 100).toFixed(2), targetYuan: (((bill.directFeeFree || bill.merchantFeePolicy) ? bill.suggestTargetFen : (bill.targetFen ?? Math.min(bill.suggestTargetFen ?? bill.baseFen, bill.netFen))) / 100).toFixed(2), amountYuan: (Math.abs(bill.remainingFen || 0) / 100).toFixed(2), note: '', proof: '' }
    detailOpen.value = true
  } catch (e) { error.value = e.message }
}
async function command(action) {
  if (busy.value) return
  busy.value = true
  detailError.value = ''
  try {
    const body = { version: detail.value.version, note: form.value.note }
    if (action === 'approve' && detail.value.kind === 'stay') body.targetFen = fen(form.value.targetYuan)
    if (action === 'approve' && detail.value.kind !== 'stay') body.baseFen = fen(form.value.baseYuan)
    if (action === 'receipt') Object.assign(body, { amountFen: fen(form.value.amountYuan), proof: form.value.proof })
    await api('/' + detail.value.billId + '/' + action, 'post', body)
    await view(detail.value.billId)
    await load()
  } catch (e) { detailError.value = e.message }
  finally { busy.value = false }
}
async function openWork() {
  try {
    candidates.value = (await api('/candidates', 'get', { storeId: storeId.value })).data
    work.value = { appId: null, workDate: '', yuan: '', basis: '' }
    workError.value = ''
    workOpen.value = true
  } catch (e) { error.value = e.message }
}
function selectWorker() {
  work.value.yuan = ''
  work.value.workDate = ''
  if (['daily', 'monthly'].includes(selectedWorker.value?.salaryType)) work.value.yuan = String(selectedWorker.value.salaryMin || '')
}
async function saveWork() {
  if (busy.value) return
  busy.value = true
  workError.value = ''
  try {
    const id = (await api('/work', 'post', { appId: work.value.appId, workDate: work.value.workDate, baseFen: fen(work.value.yuan), basis: work.value.basis })).data
    workOpen.value = false
    await load()
    await view(id)
  } catch (e) { workError.value = e.message }
  finally { busy.value = false }
}
api('/stores').then(result => { stores.value = result.data }).catch(e => { error.value = e.message })
load()
</script>

<style scoped>
.page-heading { display: flex; align-items: center; gap: 20px; margin-bottom: 24px; }
.page-heading > div { flex: 1; }
h2 { margin: 0 0 10px; }
p { line-height: 1.7; overflow-wrap: anywhere; }
.page-heading p { margin: 0; color: var(--el-text-color-secondary); max-width: 70ch; }
.el-pagination, .el-alert { margin: 16px 0; }
.action-form { margin: 24px 0; padding-top: 20px; border-top: 1px solid var(--el-border-color); }
.sub { margin: 4px 0 0; font-size: 12px; color: var(--el-text-color-secondary); }
@media (max-width: 600px) { .page-heading { align-items: flex-start; flex-direction: column; } }
</style>
