<template>
   <div class="app-container">
      <el-alert v-if="fixedJobType" :title="fixedJobType === 'online' ? '线上任务报名审核：通过后远程交付，无需面试、签约或保险。' : '换工报名审核：按到店流程处理，与线上任务分开管理。'" type="info" :closable="false" class="mb8" />
      <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch">
         <el-form-item label="报名单号" prop="appNo">
            <el-input
               v-model="queryParams.appNo"
               placeholder="请输入完整报名单号"
               clearable
               style="width: 220px"
               @keyup.enter="handleQuery"
            />
         </el-form-item>
         <el-form-item label="姓名" prop="realName">
            <el-input
               v-model="queryParams.realName"
               placeholder="请输入姓名"
               clearable
               style="width: 160px"
               @keyup.enter="handleQuery"
            />
         </el-form-item>
         <el-form-item label="手机号" prop="phone">
            <el-input
               v-model="queryParams.phone"
               placeholder="请输入完整手机号"
               clearable
               style="width: 180px"
               @keyup.enter="handleQuery"
            />
         </el-form-item>
         <el-form-item label="门店" prop="storeId">
            <el-select
               v-model="queryParams.storeId"
               placeholder="全部门店"
               clearable
               filterable
               style="width: 200px"
               @change="handleStoreChange"
            >
               <el-option
                  v-for="item in storeOptions"
                  :key="item.storeId"
                  :label="item.storeName"
                  :value="item.storeId"
               />
            </el-select>
         </el-form-item>
         <el-form-item label="岗位" prop="jobId">
            <el-select
               v-model="queryParams.jobId"
               placeholder="全部岗位"
               clearable
               filterable
               style="width: 220px"
            >
               <el-option
                  v-for="item in jobOptions"
                  :key="item.jobId"
                  :label="item.title"
                  :value="item.jobId"
               />
            </el-select>
         </el-form-item>
         <el-form-item label="状态" prop="status">
            <el-select v-model="queryParams.status" placeholder="全部状态" clearable style="width: 160px">
               <el-option
                  v-for="dict in kg_app_status"
                  :key="dict.value"
                  :label="dict.label"
                  :value="dict.value"
               />
            </el-select>
         </el-form-item>
         <el-form-item label="提交时间">
            <el-date-picker
               v-model="dateRange"
               value-format="YYYY-MM-DD"
               type="daterange"
               range-separator="-"
               start-placeholder="开始日期"
               end-placeholder="结束日期"
            ></el-date-picker>
         </el-form-item>
         <el-form-item>
            <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
            <el-button icon="Refresh" @click="resetQuery">重置</el-button>
         </el-form-item>
      </el-form>

      <el-row :gutter="10" class="mb8">
         <!--
            这里刻意没有"新增"与"删除"：
            报名必须由小程序用户本人发起，后台代建会产生没有真实用户意愿的记录；
            删除会打断履约链路的审计（kg_application_log 与面试、名额都挂在这条单子上），
            需要作废时走"终止"，留下终止人与原因。
         -->
         <el-col :span="1.5">
            <el-button
               type="warning"
               plain
               icon="Download"
               @click="handleExport"
               v-hasPermi="['kangaroo:application:export']"
            >导出</el-button>
         </el-col>
         <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
      </el-row>

      <!-- 笔记本常见宽度（1366 / 1440）放不下全部列，固定在右侧的操作列会盖住最后几列：
           原先状态排在倒数第二，正好被盖住，审核时最要看的东西看不到。现在状态紧跟姓名，
           年龄、到岗日期、停留天数放到后面（横向拖动可见） -->
      <el-table v-loading="loading" :data="applicationList">
         <el-table-column label="报名单号" align="center" prop="appNo" width="170" show-overflow-tooltip />
         <el-table-column label="岗位标题" align="center" prop="jobTitle" min-width="150" show-overflow-tooltip />
         <el-table-column label="门店" align="center" prop="storeName" min-width="120" show-overflow-tooltip />
         <el-table-column label="姓名" align="center" prop="realName" width="90" show-overflow-tooltip />
         <el-table-column label="状态" align="center" prop="status" width="120">
            <template #default="scope">
               <!-- 线上任务有了结算单就按结算进度显示：报名状态一直停在「审核通过」，看不出验收、付款到哪一步了。
                    格子窄，「已验收 · 待门店付款」拆成两行：标签写前半句，下面一行小字写后半句 -->
               <template v-if="scope.row.onlineSettleStatus && !CLOSED_STATUSES.includes(scope.row.status)">
                  <el-tag :type="settleTagType(scope.row.onlineSettleStatus)" :title="settleLabel(scope.row.onlineSettleStatus)">{{ settleLabel(scope.row.onlineSettleStatus).split(" · ")[0] }}</el-tag>
                  <div v-if="settleLabel(scope.row.onlineSettleStatus).split(' · ')[1]" class="settle-sub">{{ settleLabel(scope.row.onlineSettleStatus).split(" · ")[1] }}</div>
               </template>
               <template v-else>
                  <dict-tag :options="kg_app_status" :value="scope.row.status" />
                  <!-- 已终止（或已撤回 / 未通过）但结算单还在：先写报名状态，结算进度放下面小字，不能再显示成「已验收 待门店付款」。
                       同样在「 · 」处拆成两行，免得「已登记付款」「收款申诉中」在字中间折行（格子 120 宽，一行最多 8 个字） -->
                  <template v-if="scope.row.onlineSettleStatus">
                     <div class="settle-sub">结算：{{ settleLabel(scope.row.onlineSettleStatus).split(" · ")[0] }}</div>
                     <div v-if="settleLabel(scope.row.onlineSettleStatus).split(' · ')[1]" class="settle-sub">{{ settleLabel(scope.row.onlineSettleStatus).split(" · ")[1] }}</div>
                  </template>
               </template>
            </template>
         </el-table-column>
         <el-table-column label="手机号" align="center" prop="phone" width="120" />
         <el-table-column label="提交时间" align="center" prop="submitTime" width="140">
            <template #default="scope">
               <span>{{ parseTime(scope.row.submitTime, '{y}-{m}-{d} {h}:{i}') }}</span>
            </template>
         </el-table-column>
         <el-table-column label="到岗日期" align="center" prop="arrivalDate" width="110" />
         <el-table-column label="停留天数" align="center" prop="stayDays" width="90" />
         <el-table-column label="年龄" align="center" prop="age" width="70" />
         <el-table-column label="操作" align="center" width="220" fixed="right" class-name="small-padding fixed-width">
            <template #default="scope">
               <el-button link type="primary" icon="View" @click="handleDetail(scope.row)" v-hasPermi="['kangaroo:application:query']">详情</el-button>
               <el-button
                  v-if="canDo(scope.row, 'pass')"
                  link
                  type="primary"
                  icon="Check"
                  @click="handlePass(scope.row)"
                  v-hasPermi="['kangaroo:application:audit']"
               >通过</el-button>
               <el-button
                  v-if="canDo(scope.row, 'reject')"
                  link
                  type="danger"
                  icon="Close"
                  @click="handleReject(scope.row)"
                  v-hasPermi="['kangaroo:application:audit']"
               >驳回</el-button>
               <el-button
                  v-if="canDo(scope.row, 'confirm')"
                  link
                  type="success"
                  icon="CircleCheck"
                  @click="handleConfirm(scope.row)"
                  v-hasPermi="['kangaroo:application:confirm']"
               >确认录用</el-button>
               <el-button
                  v-if="canDo(scope.row, 'onboard')"
                  link
                  type="success"
                  icon="UserFilled"
                  @click="handleOnboard(scope.row)"
                  v-hasPermi="['kangaroo:application:confirm']"
               >标记入职</el-button>
               <el-button
                  v-if="canDo(scope.row, 'terminate')"
                  link
                  type="danger"
                  icon="CircleClose"
                  @click="handleTerminate(scope.row)"
                  v-hasPermi="['kangaroo:application:terminate']"
               >终止</el-button>
            </template>
         </el-table-column>
      </el-table>

      <pagination
         v-show="total > 0"
         :total="total"
         v-model:page="queryParams.pageNum"
         v-model:limit="queryParams.pageSize"
         @pagination="getList"
      />

      <!-- 报名详情：只读，展示全部字段 + 状态流转日志 + 面试信息 -->
      <el-drawer :title="title" v-model="open" size="680px" append-to-body>
         <el-descriptions title="报名信息" :column="2" border size="small">
            <el-descriptions-item label="报名单号">{{ form.appNo }}</el-descriptions-item>
            <el-descriptions-item label="当前状态">
               <dict-tag :options="kg_app_status" :value="form.status" />
               <el-tag v-if="form.onlineSettleStatus" :type="settleTagType(form.onlineSettleStatus)" style="margin-top: 4px">结算：{{ settleLabel(form.onlineSettleStatus) }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="岗位">{{ form.jobTitle }}</el-descriptions-item>
            <el-descriptions-item label="门店">{{ form.storeName }}</el-descriptions-item>
            <el-descriptions-item label="姓名">{{ form.realName }}</el-descriptions-item>
            <el-descriptions-item v-if="form.jobType !== 'online'" label="年龄">{{ form.age }}</el-descriptions-item>
            <el-descriptions-item label="手机号">{{ form.phone }}</el-descriptions-item>
            <el-descriptions-item label="小程序昵称">{{ form.nickname }}</el-descriptions-item>
            <el-descriptions-item label="到岗日期">{{ form.arrivalDate }}</el-descriptions-item>
            <el-descriptions-item label="停留天数">{{ form.stayDays }}</el-descriptions-item>
            <el-descriptions-item v-if="form.jobType !== 'online'" label="技能与经历" :span="2">{{ form.skills }}</el-descriptions-item>
            <el-descriptions-item label="补充说明" :span="2">{{ form.note }}</el-descriptions-item>
            <el-descriptions-item label="提交时间">{{ parseTime(form.submitTime) }}</el-descriptions-item>
            <el-descriptions-item label="审核时间">{{ parseTime(form.auditTime) }}</el-descriptions-item>
            <el-descriptions-item label="审核人">{{ form.auditBy }}</el-descriptions-item>
            <el-descriptions-item label="审核人类型">{{ operatorLabel(form.auditByType) }}</el-descriptions-item>
            <el-descriptions-item label="未通过原因" :span="2">{{ form.rejectReason }}</el-descriptions-item>
            <el-descriptions-item label="用户面试后意向">{{ intentLabel(form.userIntent) }}</el-descriptions-item>
            <el-descriptions-item label="用户确认时间">{{ parseTime(form.userConfirmTime) }}</el-descriptions-item>
            <el-descriptions-item label="商家确认时间">{{ parseTime(form.storeConfirmTime) }}</el-descriptions-item>
            <el-descriptions-item label="商家确认截止">{{ parseTime(form.confirmDeadline) }}</el-descriptions-item>
            <el-descriptions-item label="入职时间">{{ parseTime(form.onboardTime) }}</el-descriptions-item>
            <el-descriptions-item label="撤回时间">{{ parseTime(form.withdrawTime) }}</el-descriptions-item>
            <el-descriptions-item label="终止原因" :span="2">{{ form.terminateReason }}</el-descriptions-item>
         </el-descriptions>

         <el-divider content-position="left">面试信息</el-divider>
         <el-descriptions v-if="interview" :column="2" border size="small">
            <el-descriptions-item label="面试开始">{{ parseTime(interview.startTime) }}</el-descriptions-item>
            <el-descriptions-item label="面试结束">{{ parseTime(interview.endTime) }}</el-descriptions-item>
            <el-descriptions-item label="面试状态">{{ interviewStatusLabel(interview.status) }}</el-descriptions-item>
            <el-descriptions-item label="通话时长">{{ durationText(interview.durationSeconds) }}</el-descriptions-item>
            <el-descriptions-item label="岗位理解">{{ interview.understandJob }}</el-descriptions-item>
            <el-descriptions-item label="食宿条件">{{ interview.acceptBoard }}</el-descriptions-item>
            <el-descriptions-item label="到岗日期确认">{{ interview.confirmArrival }}</el-descriptions-item>
            <el-descriptions-item label="面试后备注">{{ interview.feedbackNote }}</el-descriptions-item>
         </el-descriptions>
         <el-empty v-else description="该报名还没有面试记录" :image-size="60" />

         <el-divider content-position="left">状态流转</el-divider>
         <el-timeline v-if="logs.length > 0">
            <el-timeline-item
               v-for="log in logs"
               :key="log.logId"
               :type="statusTagType(log.toStatus)"
               :timestamp="parseTime(log.createTime)"
               placement="top"
            >
               <div class="log-title">
                  <span v-if="log.fromStatus">{{ statusText(log.fromStatus) }} → </span>
                  <strong>{{ statusText(log.toStatus) }}</strong>
               </div>
               <div class="log-meta">
                  操作方：{{ operatorLabel(log.operatorType) }}
                  <span v-if="log.operatorName"> · {{ log.operatorName }}</span>
               </div>
               <div class="log-meta" v-if="log.reason">原因：{{ log.reason }}</div>
            </el-timeline-item>
         </el-timeline>
         <el-empty v-else description="暂无流转记录" :image-size="60" />

         <template #footer>
            <el-button @click="cancel">关 闭</el-button>
         </template>
      </el-drawer>
   </div>
</template>

<script setup name="KgApplication">
import {
  listApplication,
  getApplication,
  auditApplication,
  confirmApplication,
  onboardApplication,
  terminateApplication,
  listStoreOptions,
  listJobOptions
} from "@/api/kangaroo/application"
import { checkPermi } from "@/utils/permission"

const props = defineProps({ fixedJobType: { type: String, default: '' } })
const { proxy } = getCurrentInstance()
const { kg_app_status } = proxy.useDict("kg_app_status")

const applicationList = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(window.innerWidth > 768)  // 手机上搜索栏先收起，点右边放大镜再展开
const total = ref(0)
const title = ref("")
const dateRange = ref([])
const storeOptions = ref([])
const jobOptions = ref([])
const logs = ref([])
const interview = ref(null)

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    appNo: undefined,
    realName: undefined,
    phone: undefined,
    storeId: undefined,
    jobId: undefined,
    status: undefined
  }
})

const { queryParams, form } = toRefs(data)

/**
 * 每个状态下后台允许做什么。
 *
 * 真正的状态机在后端 ApplicationStatus，这张表只是它的投影：把当前状态下注定会被
 * assertCanTransfer 拒绝的按钮直接藏掉，而不是让运营点完才看到报错。
 * 集中成一张表而不是写在模板的 v-if 里，是因为后端状态机一改，这里必须跟着改一处，
 * 散在模板里必然漏改。
 *
 * 没有列出的动作说明后台无权发起：
 *   review_passed —— 推进只能由用户本人挑面试时段；后台只能终止（用户迟迟不约面试时的出口）；
 *   store_confirmed —— 等用户签责任书，后台只能终止；
 *   review_rejected / withdrawn / onboarded / terminated 是终态，不可再流转。
 */
const STATUS_ACTIONS = {
  submitted: ["pass", "reject"],
  review_passed: ["terminate"],
  interview_booked: ["terminate"],
  interview_done: ["terminate"],
  user_confirmed: ["confirm", "terminate"],
  store_confirmed: ["terminate"],
  contract_signed: ["onboard", "terminate"],
  review_rejected: [],
  withdrawn: [],
  onboarded: [],
  terminated: []
}

/** 当前行是否允许执行某个动作 */
function canDo(row, action) {
  const actions = STATUS_ACTIONS[row.status]
  if (actions === undefined || actions.indexOf(action) === -1) {
    return false
  }
  // 线上任务已经结算完成（接单人确认收款），钱已两清，后端也会拒绝终止，按钮直接不给
  if (action === "terminate" && row.onlineSettleStatus === "confirmed") {
    return false
  }
  // 「确认录用」还有一道时间门槛：用户表态"愿意前往"时会写下 confirm_deadline
  // （默认 24 小时），后端 storeConfirm 逾期一律抛"已超过确认截止时间"。
  // 这里原先不看这个字段，逾期的行照样把按钮亮着 ——
  // 运营点下去只会拿到一句报错，而按钮本身没给任何提示。
  if (action === "confirm" && isConfirmExpired(row)) {
    return false
  }
  return true
}

/** 商家确认是否已过截止时间。没有这个字段就当没逾期，不擅自禁用按钮。 */
function isConfirmExpired(row) {
  if (!row || !row.confirmDeadline) {
    return false
  }
  const t = Date.parse(String(row.confirmDeadline).replace(/-/g, "/"))
  return !Number.isNaN(t) && t < Date.now()
}

/**
 * 线上任务结算单状态（kg_online_settlement.status）的中文名，与后端 KgOnlineTaskService.settleLabel 一致。
 * 没登记的值原样显示，不显示成空白
 */
const SETTLE_LABELS = {
  pending_payout: "已验收 · 待门店付款",
  payout_registered: "已登记付款 · 待确认",
  confirmed: "结算完成",
  disputed: "收款申诉中"
}
const SETTLE_TAG_TYPES = { pending_payout: "warning", payout_registered: "primary", confirmed: "success", disputed: "danger" }
/** 报名已经结束（终止 / 撤回 / 未通过）：列表先显示报名状态，结算进度只作补充 */
const CLOSED_STATUSES = ["terminated", "withdrawn", "review_rejected"]

function settleLabel(status) {
  return SETTLE_LABELS[status] || status || ""
}

function settleTagType(status) {
  return SETTLE_TAG_TYPES[status] || "info"
}

/** 状态中文名：走 selectDictLabel，匹配不上时原样回显字典值（DictTag 的兜底是坏的） */
function statusText(status) {
  return proxy.selectDictLabel(kg_app_status.value, status)
}

/** 时间线圆点配色直接复用字典里配的 listClass，免得两处各维护一套颜色 */
function statusTagType(status) {
  const hit = kg_app_status.value.find(item => item.value === status)
  return hit && hit.elTagType ? hit.elTagType : "primary"
}

const OPERATOR_LABELS = { user: "用户本人", staff: "门店员工", admin: "后台管理员", system: "系统" }
const INTENT_LABELS = { accept: "愿意前往", pending: "还在考虑", reject: "不合适" }
const INTERVIEW_STATUS_LABELS = { booked: "已预约", done: "已完成", canceled: "已取消" }

/** 这三类值后端没有建字典，取不到就原样回显，不要显示成空白 */
function operatorLabel(value) {
  return value ? (OPERATOR_LABELS[value] || value) : ""
}

function intentLabel(value) {
  return value ? (INTENT_LABELS[value] || value) : ""
}

function interviewStatusLabel(value) {
  return value ? (INTERVIEW_STATUS_LABELS[value] || value) : ""
}

/** 面试时长后端存秒，直接显示 1107 没人读得懂 */
function durationText(seconds) {
  if (seconds === null || seconds === undefined) {
    return ""
  }
  return Math.floor(seconds / 60) + " 分 " + (seconds % 60) + " 秒"
}

/** 查询报名列表 */
function getList() {
  loading.value = true
  listApplication(proxy.addDateRange({ ...queryParams.value, jobType: props.fixedJobType || undefined }, dateRange.value)).then(response => {
    applicationList.value = response.rows
    total.value = response.total
  }).catch(() => {
    // 查询失败必须把上一次的结果清掉：留着旧数据和旧 total，
    // 运营会把它当成本次查询的结果，还可能对着陈旧的行去点"通过/终止"。
    // 具体错误 request.js 已经弹过了。
    applicationList.value = []
    total.value = 0
  }).finally(() => {
    // loading 收敛在 finally：无论成功、失败还是以后新增分支，遮罩都一定会关
    loading.value = false
  })
}

/** 门店与岗位下拉。只有具备对应菜单权限的角色才去拉，
 *  否则后端会返回 403，request.js 会给一个与本页无关的报错通知。 */
function getStoreOptions() {
  if (!checkPermi(["kangaroo:store:list"])) {
    return
  }
  listStoreOptions().then(response => {
    storeOptions.value = response.rows
  }).catch(() => {
    // 下拉拉不到时清空候选即可，列表照常可用，不要把整页拖下水
    storeOptions.value = []
  })
}

function getJobOptions() {
  if (!checkPermi(["kangaroo:job:list"])) {
    return
  }
  listJobOptions(queryParams.value.storeId).then(response => {
    jobOptions.value = response.rows
  }).catch(() => {
    // 同上：岗位下拉失败不影响列表查询
    jobOptions.value = []
  })
}

/** 切换门店时岗位候选要跟着收窄，已选岗位可能不属于新门店，先清掉 */
function handleStoreChange() {
  queryParams.value.jobId = undefined
  getJobOptions()
}

/** 关闭详情 */
function cancel() {
  open.value = false
  reset()
}

/** 详情重置 */
function reset() {
  form.value = {}
  logs.value = []
  interview.value = null
}

/** 搜索按钮操作 */
function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

/** 重置按钮操作 */
function resetQuery() {
  dateRange.value = []
  proxy.resetForm("queryRef")
  getJobOptions()
  handleQuery()
}

/** 查看详情 */
function handleDetail(row) {
  reset()
  getApplication(row.appId).then(response => {
    const detail = response.data
    form.value = detail.application || {}
    logs.value = detail.logs || []
    interview.value = detail.interview || null
    title.value = "报名详情（" + detail.statusLabel + "）"
    open.value = true
  }).catch(() => {
    // 取详情失败就别打开抽屉，否则会弹出一个空白详情；错误提示 request.js 已经给了
  })
}

/** 审核通过 */
function handlePass(row) {
  proxy.$modal.confirm('确认通过"' + row.realName + '"的报名（' + row.appNo + '）？').then(function() {
    return auditApplication({ appId: row.appId, pass: true })
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("已通过审核")
  }).catch(() => {})
}

/** 审核驳回 */
function handleReject(row) {
  proxy.$modal.prompt('请填写驳回"' + row.appNo + '"的原因（必填，会推送给报名人）').then(({ value }) => {
    const reason = (value || "").trim()
    // 后端 audit 在 pass=false 时强制校验原因，这里先拦一道，省掉一次注定失败的请求
    if (!reason) {
      proxy.$modal.msgError("驳回必须填写原因")
      return Promise.reject("emptyReason")
    }
    return auditApplication({ appId: row.appId, pass: false, reason: reason })
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("已驳回")
  }).catch(() => {})
}

/** 商家确认录用 */
function handleConfirm(row) {
  proxy.$modal.confirm('确认录用"' + row.realName + '"？确认后会占用该岗位一个名额，并通知报名人签署责任书。').then(function() {
    return confirmApplication(row.appId)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("已确认录用")
  }).catch(() => {})
}

/** 标记入职 */
function handleOnboard(row) {
  proxy.$modal.confirm('确认"' + row.realName + '"已到岗入职？标记后该报名进入终态，不可再流转。').then(function() {
    return onboardApplication(row.appId)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("已标记入职")
  }).catch(() => {})
}

/** 终止申请 */
function handleTerminate(row) {
  proxy.$modal.prompt('请填写终止"' + row.appNo + '"的原因（必填，会推送给报名人）').then(({ value }) => {
    const reason = (value || "").trim()
    // 后端 terminate 同样强制要求原因
    if (!reason) {
      proxy.$modal.msgError("终止必须填写原因")
      return Promise.reject("emptyReason")
    }
    return terminateApplication({ appId: row.appId, reason: reason })
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("已终止该申请")
  }).catch(() => {})
}

/** 导出按钮操作 */
function handleExport() {
  proxy.download("kangaroo/application/export", {
    ...proxy.addDateRange({ ...queryParams.value, jobType: props.fixedJobType || undefined }, dateRange.value)
  }, `application_${new Date().getTime()}.xlsx`)
}

getStoreOptions()
getJobOptions()
getList()
</script>

<style scoped>
.log-title {
  font-size: 14px;
  line-height: 22px;
}

.log-meta {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 20px;
}

/* 结算进度小字：每行都是在「 · 」处拆好的短句（最长「结算：已登记付款」8 个字 = 96px，正好是 120 宽格子的内容宽），不再在字中间折行 */
.settle-sub {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 18px;
  white-space: nowrap;
}
</style>
