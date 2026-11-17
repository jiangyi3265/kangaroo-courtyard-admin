<template>
  <div class="app-container reimburse">
    <el-alert class="reimburse-note" type="info" :closable="false" show-icon title="系统只记账，不打款">
      通过、标记已打款都只是记一笔，钱要另外转给提交人。只报销提交进这张表的采购，没提交进表的不报销。
    </el-alert>

    <el-form ref="queryRef" :model="query" :inline="true" v-show="showSearch">
      <el-form-item label="门店" prop="storeId">
        <el-select v-model="query.storeId" placeholder="全部门店" clearable filterable style="width: 200px">
          <el-option v-for="store in storeOptions" :key="store.storeId" :label="store.storeName" :value="store.storeId" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="query.status" placeholder="全部状态" clearable style="width: 140px">
          <el-option v-for="status in STATUS_ORDER" :key="status" :label="STATUS_META[status].text" :value="status" />
        </el-select>
      </el-form-item>
      <el-form-item label="提交人" prop="submitter">
        <el-input v-model="query.submitter" placeholder="请输入昵称" clearable style="width: 160px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="购买日期">
        <el-date-picker v-model="purchaseRange" type="daterange" value-format="YYYY-MM-DD" range-separator="-" start-placeholder="开始日期" end-placeholder="结束日期" style="width: 240px" />
      </el-form-item>
      <el-form-item label="提交日期">
        <el-date-picker v-model="submitRange" type="daterange" value-format="YYYY-MM-DD" range-separator="-" start-placeholder="开始日期" end-placeholder="结束日期" style="width: 240px" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <!-- 合计跟着上面的筛选走，不分页。金额都是接口算好的，页面不加减 -->
    <div class="reimburse-summary" aria-label="合计">
      <div class="reimburse-tile reimburse-tile--total">
        <span>合计（不含驳回）</span>
        <div class="reimburse-tile__nums"><strong>{{ summary.validAmount }}</strong><small>{{ summary.validCount }} 笔</small></div>
      </div>
      <div v-for="item in summary.statuses" :key="item.status" class="reimburse-tile">
        <span>{{ item.tile }}</span>
        <div class="reimburse-tile__nums"><strong>{{ item.count }} 笔</strong><small>{{ item.amount }}</small></div>
      </div>
    </div>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="warning" plain icon="Download" :disabled="!total" @click="handleExport" v-hasPermi="['kangaroo:reimburse:list']">导出 Excel</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <div v-loading="loading" class="reimburse-list">
      <!-- 手机上是卡片：十列的表格要左右滑很久才看得到金额 -->
      <div v-if="isMobile" class="reimburse-cards">
        <p v-if="!rows.length" class="reimburse-empty">{{ emptyText }}</p>
        <article v-for="row in rows" :key="row.reimburseId" class="reimburse-card">
          <div class="reimburse-card__head">
            <strong class="reimburse-card__item">{{ row.itemName }}<small>× {{ row.quantity }}</small></strong>
            <b class="reimburse-money">{{ moneyText(row.amount) }}</b>
          </div>
          <div class="reimburse-card__meta">{{ row.storeName }} · {{ row.submitterName }}</div>
          <div class="reimburse-card__meta">购买 {{ row.purchaseDate }}，提交 {{ timeText(row.submitTime) }}</div>
          <receipt-thumbs class="reimburse-card__thumbs" :receipts="row.receipts" :size="56" :max="4" />
          <p v-if="row.remark" class="reimburse-card__line">备注：{{ row.remark }}</p>
          <p v-if="row.rejectReason" class="reimburse-card__line reimburse-reason">驳回理由：{{ row.rejectReason }}</p>
          <div class="reimburse-card__foot">
            <el-tag :type="tagOf(row.status)">{{ row.statusText }}</el-tag>
            <reimburse-actions :row="row" :busy="acting" @detail="openDetail(row)" @approve="handleApprove(row)" @reject="openReject(row)" @paid="handlePaid(row)" />
          </div>
        </article>
      </div>

      <el-table v-else :data="rows" row-key="reimburseId" :empty-text="emptyText">
        <el-table-column label="门店" prop="storeName" min-width="104" :show-overflow-tooltip="true" />
        <el-table-column label="提交人" prop="submitterName" width="84" :show-overflow-tooltip="true" />
        <el-table-column label="品名" prop="itemName" min-width="110" :show-overflow-tooltip="true" />
        <el-table-column label="数量" prop="quantity" width="60" align="right" />
        <el-table-column label="金额" width="104" align="right">
          <template #default="scope"><span class="reimburse-money">{{ moneyText(scope.row.amount) }}</span></template>
        </el-table-column>
        <el-table-column label="购买日期" prop="purchaseDate" width="100" align="center" />
        <el-table-column label="凭证" width="134">
          <template #default="scope"><receipt-thumbs :receipts="scope.row.receipts" :size="34" :max="3" /></template>
        </el-table-column>
        <el-table-column label="备注" prop="remark" min-width="80" :show-overflow-tooltip="true" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="scope">
            <el-tag :type="tagOf(scope.row.status)">{{ scope.row.statusText }}</el-tag>
            <el-tooltip v-if="scope.row.rejectReason" :content="scope.row.rejectReason" placement="top">
              <div class="reimburse-reason reimburse-reason--clamp">{{ scope.row.rejectReason }}</div>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="提交时间" width="100" align="center">
          <template #default="scope">
            <div class="reimburse-time">{{ String(scope.row.submitTime).slice(0, 10) }}<br />{{ String(scope.row.submitTime).slice(11, 16) }}</div>
            <div v-if="scope.row.revision > 1" class="reimburse-revision">第 {{ scope.row.revision }} 次提交</div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="136" align="center" fixed="right" class-name="small-padding fixed-width">
          <template #default="scope">
            <reimburse-actions :row="scope.row" link :busy="acting" @detail="openDetail(scope.row)" @approve="handleApprove(scope.row)" @reject="openReject(scope.row)" @paid="handlePaid(scope.row)" />
          </template>
        </el-table-column>
      </el-table>
    </div>

    <pagination v-show="total > 0" :total="total" v-model:page="query.pageNum" v-model:limit="query.pageSize" @pagination="getList" />

    <el-dialog v-model="detailOpen" title="报销详情" width="640px" append-to-body>
      <div v-if="detail" class="reimburse-detail">
        <el-descriptions :column="isMobile ? 1 : 2" border>
          <el-descriptions-item label="门店">{{ detail.storeName }}</el-descriptions-item>
          <el-descriptions-item label="提交人">{{ detail.submitterName }}</el-descriptions-item>
          <el-descriptions-item label="品名">{{ detail.itemName }}</el-descriptions-item>
          <el-descriptions-item label="数量">{{ detail.quantity }}</el-descriptions-item>
          <el-descriptions-item label="金额"><span class="reimburse-money">{{ moneyText(detail.amount) }}</span></el-descriptions-item>
          <el-descriptions-item label="购买日期">{{ detail.purchaseDate }}</el-descriptions-item>
          <el-descriptions-item label="状态"><el-tag :type="tagOf(detail.status)">{{ detail.statusText }}</el-tag></el-descriptions-item>
          <el-descriptions-item label="提交时间">{{ detail.submitTime }}<span v-if="detail.revision > 1">（第 {{ detail.revision }} 次提交）</span></el-descriptions-item>
          <el-descriptions-item v-if="detail.auditTime" label="审核">{{ detail.auditBy }} {{ detail.auditTime }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.paidTime" label="打款登记">{{ detail.paidBy }} {{ detail.paidTime }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.rejectReason" label="驳回理由" :span="isMobile ? 1 : 2"><span class="reimburse-reason">{{ detail.rejectReason }}</span></el-descriptions-item>
          <el-descriptions-item label="备注" :span="isMobile ? 1 : 2">{{ detail.remark || '无' }}</el-descriptions-item>
        </el-descriptions>
        <div class="reimburse-detail__label">凭证（{{ (detail.receipts || []).length }} 张，点开看大图）</div>
        <receipt-thumbs :receipts="detail.receipts" :size="96" />
      </div>
      <template #footer>
        <div class="dialog-footer reimburse-detail__foot">
          <reimburse-actions v-if="detail" :row="detail" hide-detail :busy="acting" @approve="handleApprove(detail)" @reject="openReject(detail)" @paid="handlePaid(detail)" />
          <el-button @click="detailOpen = false">关 闭</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="rejectOpen" title="驳回报销" width="520px" append-to-body :close-on-click-modal="false" :close-on-press-escape="!acting" :show-close="!acting">
      <template v-if="rejectRow">
        <p class="reimburse-reject__line">{{ rejectRow.storeName }} · {{ rejectRow.submitterName }}：{{ rejectRow.itemName }} {{ moneyText(rejectRow.amount) }}</p>
        <el-form label-position="top" @submit.prevent>
          <el-form-item class="reimburse-reject__item" label="驳回理由（必填，提交人能看到，改好可以再交）" :error="rejectError" required>
            <el-input v-model="rejectReason" type="textarea" :rows="4" :maxlength="REASON_MAX" show-word-limit placeholder="如：小票看不清，请重新拍一张" @input="rejectError = ''" />
          </el-form-item>
        </el-form>
      </template>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="danger" :loading="acting" @click="confirmReject">确认驳回</el-button>
          <el-button :disabled="acting" @click="rejectOpen = false">取 消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="KgReimburse">
// 袋鼠小院 → 旅居 → 采购报销（V66）：小院主理人在小程序提交，主人在这里看表格、通过或驳回、标记已打款。系统只记账不打款。
// 菜单 route_name 和这里的页面名一样（标签页缓存靠它）。权限：kangaroo:reimburse:list 看和导出，kangaroo:reimburse:audit 审核（按钮在 ReimburseActions.vue）
import { approveReimburse, getReimburse, listReimburse, listReimburseStores, markReimbursePaid, rejectReimburse, REIMBURSE_EXPORT_URL } from '@/api/kangaroo/reimburse'
import { REASON_MAX, STATUS_META, STATUS_ORDER, approveConfirmText, exportFileName, filterParams, moneyText, paidConfirmText, rejectReasonProblem, summaryView } from '@/utils/reimburse'
import useAppStore from '@/store/modules/app'
import ReceiptThumbs from './ReceiptThumbs.vue'
import ReimburseActions from './ReimburseActions.vue'

const { proxy } = getCurrentInstance()
const appStore = useAppStore()
const isMobile = computed(() => appStore.device === 'mobile')
const emptyText = '还没有报销记录。直营小院的小院主理人在小程序工作台提交后，会出现在这里。'

const showSearch = ref(window.innerWidth > 768) // 手机上搜索栏先收起，点右边放大镜再展开
const loading = ref(true)
const rows = ref([])
const total = ref(0)
const summary = ref(summaryView(null))
const storeOptions = ref([])
const purchaseRange = ref(null)
const submitRange = ref(null)
const query = reactive({ pageNum: 1, pageSize: 10, storeId: undefined, status: undefined, submitter: '' })
// 点「搜索」时定下来的筛选：翻页、导出都按它，框里改了没点搜索时不算，表格、合计、导出才对得上
let applied = {}
let listSeq = 0

const tagOf = status => (STATUS_META[status] || {}).tag || 'info'
const timeText = text => String(text || '').slice(5, 16)

function getList() {
  const seq = ++listSeq
  loading.value = true
  return listReimburse({ pageNum: query.pageNum, pageSize: query.pageSize, ...applied }).then(res => {
    if (seq !== listSeq) return
    rows.value = res.rows || []
    total.value = Number(res.total) || 0
    summary.value = summaryView(res.summary)
    // 筛的是「待审核」时审完这一行就不在了：最后一页空了退回有内容的那一页，只往回退
    const lastPage = Math.ceil(total.value / query.pageSize)
    if (!rows.value.length && lastPage >= 1 && lastPage < query.pageNum) {
      query.pageNum = lastPage
      return getList()
    }
  }).catch(() => {
    // 查询失败把旧结果清掉：财务数字不能让人把上一次的结果当成这一次的。具体错误 request.js 已经弹过
    if (seq !== listSeq) return
    rows.value = []
    total.value = 0
    summary.value = summaryView(null)
  }).finally(() => {
    if (seq === listSeq) loading.value = false
  })
}

function getStores() {
  // 下拉拉不到不影响看表格（门店名在每一行上）；错误 request.js 已经弹过
  return listReimburseStores().then(res => { storeOptions.value = res.data || [] }).catch(() => {})
}

function handleQuery() {
  applied = filterParams(query, purchaseRange.value, submitRange.value)
  query.pageNum = 1
  getList()
}

function resetQuery() {
  purchaseRange.value = null
  submitRange.value = null
  proxy.resetForm('queryRef')
  handleQuery()
}

function handleExport() {
  // 财务表格可能一万条，默认 10 秒的超时不够；超过上限后端回 JSON，download 会把原话弹出来
  proxy.download(REIMBURSE_EXPORT_URL, { ...applied }, exportFileName(), { timeout: 120000 })
}

// ---------------------------------------------------------------- 审核
const acting = ref(false)

/** 三个动作共用：成功弹接口的话，不管成败都刷新（失败多半是状态变了，要看最新的）。返回是否成功 */
async function runAction(call) {
  if (acting.value) return { ok: false }
  acting.value = true
  try {
    const res = await call()
    proxy.$modal.msgSuccess(res.msg)
    detailOpen.value = false
    return { ok: true }
  } catch (error) {
    return { ok: false, error }
  } finally {
    acting.value = false
    getList()
  }
}

function handleApprove(row) {
  proxy.$modal.confirm(approveConfirmText(row)).then(() => runAction(() => approveReimburse(row.reimburseId, row.revision))).catch(() => {})
}

function handlePaid(row) {
  proxy.$modal.confirm(paidConfirmText(row)).then(() => runAction(() => markReimbursePaid(row.reimburseId))).catch(() => {})
}

const rejectOpen = ref(false)
const rejectRow = ref(null)
const rejectReason = ref('')
const rejectError = ref('')

function openReject(row) {
  rejectRow.value = row
  rejectReason.value = ''
  rejectError.value = ''
  rejectOpen.value = true
}

async function confirmReject() {
  const problem = rejectReasonProblem(rejectReason.value)
  if (problem) {
    rejectError.value = problem
    return
  }
  const row = rejectRow.value
  const result = await runAction(() => rejectReimburse(row.reimburseId, rejectReason.value.trim(), row.revision))
  // 业务状态已变化时关闭弹窗并重新读取，网络失败时保留已输入的理由。
  if (result.ok || result.error === 'error' || result.error?.isBusinessError) rejectOpen.value = false
}

// ---------------------------------------------------------------- 详情
const detailOpen = ref(false)
const detail = ref(null)

function openDetail(row) {
  detail.value = row
  detailOpen.value = true
  // 先显示表格里的，再取最新的：对方可能刚改过再交，审的要是最新内容
  getReimburse(row.reimburseId).then(res => {
    if (detailOpen.value && detail.value && detail.value.reimburseId === row.reimburseId && res.data) detail.value = res.data
  }).catch(() => {
    detailOpen.value = false
    getList()
  })
}

getStores()
getList()
// 页面被标签页缓存：切走再切回来重新拉，不然看到的是旧数据。
// 不能写成「跳过第一次 activated」：刷新浏览器直接落在这一页时，挂载那一下还不在缓存名单里、不触发 activated，第一次切回来才触发，会被跳过
let leftPage = false
onDeactivated(() => { leftPage = true })
onActivated(() => {
  if (!leftPage) return
  leftPage = false
  getStores()
  getList()
})
</script>

<style scoped>
.reimburse-note { margin-bottom: 16px; }
/* 默认的灰字在灰底上太淡：这句是钱的事，要看得清 */
.reimburse-note :deep(.el-alert__title) { font-weight: 600; color: var(--el-text-color-primary); }
.reimburse-note :deep(.el-alert__description) { line-height: 1.7; color: var(--el-text-color-regular); }

.reimburse-summary { display: grid; grid-template-columns: 1.3fr repeat(4, minmax(0, 1fr)); gap: 10px; margin-bottom: 14px; }
.reimburse-tile { display: flex; flex-direction: column; gap: 3px; min-width: 0; padding: 10px 14px; background: var(--el-fill-color-light); border-radius: 6px; }
.reimburse-tile__nums { display: flex; flex-direction: column; gap: 3px; }
.reimburse-tile span { font-size: 12px; line-height: 1.5; color: var(--el-text-color-regular); }
.reimburse-tile strong { font-size: 16px; line-height: 1.4; font-weight: 600; font-variant-numeric: tabular-nums; color: var(--el-text-color-primary); }
.reimburse-tile small { font-size: 12px; line-height: 1.5; font-variant-numeric: tabular-nums; color: var(--el-text-color-regular); }
.reimburse-tile--total { background: var(--el-color-primary-light-9); }
.reimburse-tile--total strong { font-size: 20px; color: var(--el-color-primary); }

.reimburse-money { font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }
.reimburse-reason { color: var(--el-color-danger); }
.reimburse-reason--clamp { display: -webkit-box; margin-top: 4px; overflow: hidden; font-size: 12px; line-height: 1.4; text-align: left; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.reimburse-time { font-size: 13px; line-height: 1.4; font-variant-numeric: tabular-nums; }
.reimburse-revision { margin-top: 2px; font-size: 12px; line-height: 1.4; color: var(--el-color-warning-dark-2); }

.reimburse-cards { display: flex; flex-direction: column; gap: 10px; min-height: 80px; }
.reimburse-empty { margin: 0; padding: 32px 12px; text-align: center; font-size: 14px; line-height: 1.7; color: var(--el-text-color-secondary); }
.reimburse-card { padding: 12px; background: var(--el-bg-color); border: 1px solid var(--el-border-color-lighter); border-radius: 8px; }
.reimburse-card__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.reimburse-card__item { min-width: 0; font-size: 15px; line-height: 1.5; font-weight: 600; overflow-wrap: anywhere; }
.reimburse-card__item small { margin-left: 6px; font-size: 13px; font-weight: 400; color: var(--el-text-color-secondary); }
.reimburse-card__head .reimburse-money { flex: none; font-size: 16px; line-height: 1.4; }
.reimburse-card__meta { margin-top: 4px; font-size: 13px; line-height: 1.5; color: var(--el-text-color-regular); overflow-wrap: anywhere; }
.reimburse-card__thumbs { margin-top: 8px; }
.reimburse-card__line { margin: 8px 0 0; font-size: 13px; line-height: 1.6; overflow-wrap: anywhere; }
.reimburse-card__foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; margin-top: 10px; }

/* 窄的那一列是字段名，不许一个字一行 */
.reimburse-detail :deep(.el-descriptions__label) { white-space: nowrap; }
.reimburse-detail__label { margin: 14px 0 8px; font-size: 13px; color: var(--el-text-color-regular); }
.reimburse-detail__foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 10px; }
.reimburse-reject__line { margin: 0 0 12px; font-size: 14px; line-height: 1.6; overflow-wrap: anywhere; }
/* 手机适配把最后一项的下边距压到 12px，放不下下面那行红字，弹窗会把它截掉 */
.reimburse-reject__item { margin-bottom: 24px !important; }

@media (max-width: 991px) {
  .reimburse-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .reimburse-tile--total { grid-column: 1 / -1; }
  /* 手机上数字并成一行，别把下面的列表挤到第二屏 */
  .reimburse-tile { padding: 8px 12px; }
  .reimburse-tile__nums { flex-direction: row; flex-wrap: wrap; align-items: baseline; gap: 2px 8px; }
}
</style>
