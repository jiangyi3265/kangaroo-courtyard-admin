<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch">
      <el-form-item label="门店" prop="storeId">
        <el-select v-model="queryParams.storeId" placeholder="全部门店" clearable style="width: 200px">
          <el-option
            v-for="item in storeOptions"
            :key="item.storeId"
            :label="item.storeName"
            :value="item.storeId"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="限定岗位" prop="jobId">
        <el-select v-model="queryParams.jobId" placeholder="全部岗位" clearable style="width: 220px">
          <el-option
            v-for="item in jobsOfStore(queryParams.storeId)"
            :key="item.jobId"
            :label="item.title"
            :value="item.jobId"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="全部状态" clearable style="width: 140px">
          <el-option
            v-for="dict in kg_slot_status"
            :key="dict.value"
            :label="dict.label"
            :value="dict.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="开始日期">
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
      <el-col :span="1.5">
        <el-button
          type="primary"
          plain
          icon="Plus"
          @click="handleAdd"
          v-hasPermi="['kangaroo:slot:add']"
        >新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <!--
          按钮不再因为"已被占用"而禁用：后端现在按"占用是否仍然有效"判定，
          被一条已终止/已撤回/已驳回/已入职的报名占着的时段，运营本来就该能处理。
          页面拿不到那条报名的状态，所以不在前端猜，交给后端判 —— 它会返回
          "时段正被报名 KAxxxx（面试已预约）占用，不能删除" 这种写明对象的提示。
        -->
        <el-tooltip content="已被占用的时段：若占用它的报名已终止/撤回/驳回/入职，可以直接处理；若报名仍在进行中，后端会拒绝并告诉你是哪一条" placement="top" :disabled="!bookedSelected">
          <span>
            <el-button
              type="success"
              plain
              icon="Edit"
              :disabled="single"
              @click="handleUpdate"
              v-hasPermi="['kangaroo:slot:edit']"
            >修改</el-button>
          </span>
        </el-tooltip>
      </el-col>
      <el-col :span="1.5">
        <el-tooltip content="已被占用的时段：若占用它的报名已终止/撤回/驳回/入职，可以直接处理；若报名仍在进行中，后端会拒绝并告诉你是哪一条" placement="top" :disabled="!bookedSelected">
          <span>
            <el-button
              type="danger"
              plain
              icon="Delete"
              :disabled="multiple"
              @click="handleDelete"
              v-hasPermi="['kangaroo:slot:remove']"
            >删除</el-button>
          </span>
        </el-tooltip>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="slotList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="时段ID" align="center" prop="slotId" width="90" />
      <el-table-column label="门店名称" align="center" prop="storeName" :show-overflow-tooltip="true" />
      <el-table-column label="限定岗位" align="center" prop="jobId" :show-overflow-tooltip="true">
        <template #default="scope">
          <span>{{ jobLabel(scope.row.jobId) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="开始时间" align="center" prop="startTime" width="180">
        <template #default="scope">
          <span>{{ parseTime(scope.row.startTime) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="结束时间" align="center" prop="endTime" width="180">
        <template #default="scope">
          <span>{{ parseTime(scope.row.endTime) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" align="center" prop="status" width="100">
        <template #default="scope">
          <!-- DictTag 的未匹配兜底渲染是坏的，字典里没有的值直接显示原始值，免得列变空白 -->
          <dict-tag v-if="inDict(kg_slot_status, scope.row.status)" :options="kg_slot_status" :value="scope.row.status" />
          <span v-else>{{ scope.row.status }}</span>
        </template>
      </el-table-column>
      <el-table-column label="占用的报名ID" align="center" prop="bookedAppId" width="120">
        <template #default="scope">
          <span>{{ scope.row.bookedAppId || "-" }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="180" class-name="small-padding fixed-width">
        <template #default="scope">
          <!-- 禁用按钮本身不派发鼠标事件，按 Element Plus 的建议套一层 span 才能触发 tooltip -->
          <el-tooltip content="已被占用的时段：若占用它的报名已终止/撤回/驳回/入职，可以直接处理；若报名仍在进行中，后端会拒绝并告诉你是哪一条" placement="top" :disabled="!isBooked(scope.row)">
            <span>
              <el-button
                link
                type="primary"
                icon="Edit"
                
                @click="handleUpdate(scope.row)"
                v-hasPermi="['kangaroo:slot:edit']"
              >修改</el-button>
            </span>
          </el-tooltip>
          <el-tooltip content="已被占用的时段：若占用它的报名已终止/撤回/驳回/入职，可以直接处理；若报名仍在进行中，后端会拒绝并告诉你是哪一条" placement="top" :disabled="!isBooked(scope.row)">
            <span>
              <el-button
                link
                type="primary"
                icon="Delete"
                
                @click="handleDelete(scope.row)"
                v-hasPermi="['kangaroo:slot:remove']"
              >删除</el-button>
            </span>
          </el-tooltip>
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

    <!-- 添加或修改面试时段对话框 -->
    <el-dialog :title="title" v-model="open" width="560px" append-to-body :before-close="closeEditor" :show-close="!saving">
      <el-alert v-if="saveUncertain" title="未收到保存结果。时段列表已请求刷新，请关闭此窗口，按门店和起止时间核对后再重试。" type="warning" :closable="false" show-icon />
      <el-form ref="slotRef" :model="form" :rules="rules" label-width="100px" :disabled="saving">
        <el-form-item label="门店" prop="storeId">
          <el-select v-model="form.storeId" placeholder="请选择门店" style="width: 100%" @change="handleStoreChange">
            <el-option
              v-for="item in storeOptions"
              :key="item.storeId"
              :label="item.storeName"
              :value="item.storeId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="限定岗位" prop="jobId">
          <el-select v-model="form.jobId" placeholder="留空表示门店通用时段，任何岗位都能约" clearable style="width: 100%">
            <el-option
              v-for="item in jobsOfStore(form.storeId)"
              :key="item.jobId"
              :label="item.title"
              :value="item.jobId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="开始时间" prop="startTime">
          <el-date-picker
            v-model="form.startTime"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="请选择开始时间"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="结束时间" prop="endTime">
          <el-date-picker
            v-model="form.endTime"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="请选择结束时间"
            style="width: 100%"
          />
        </el-form-item>
        <!-- 新增的时段一律是"可选"，状态由后端写死；占用状态只能由小程序预约产生，所以这里只给可选/已关闭 -->
        <el-form-item v-if="form.slotId != undefined" label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio
              v-for="dict in editableStatus"
              :key="dict.value"
              :value="dict.value"
            >{{ dict.label }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="会议信息" prop="meetingInfo"><el-input v-model="form.meetingInfo" type="textarea" placeholder="会议工具、会议号或链接，仅提供给已预约候选人" maxlength="500" show-word-limit /></el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" placeholder="请输入内容" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" :loading="saving" @click="submitForm">确 定</el-button>
          <el-button :disabled="saving" @click="cancel">取 消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="KgSlot">
import { listSlot, getSlot, addSlot, updateSlot, delSlot, listStoreOption, listJobOption } from "@/api/kangaroo/slot"

const { proxy } = getCurrentInstance()
const { kg_slot_status } = proxy.useDict("kg_slot_status")

const slotList = ref([])
const open = ref(false)
let listRequest = 0
let editorRequest = 0
const saving = ref(false)
const saveUncertain = ref(false)
const loading = ref(true)
const showSearch = ref(window.innerWidth > 768)  // 手机上搜索栏先收起，点右边放大镜再展开
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref("")
const dateRange = ref([])
const storeOptions = ref([])
const jobOptions = ref([])
// 勾选里是否有已占用的时段，用来禁用批量修改/删除
const bookedSelected = ref(false)

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    storeId: undefined,
    jobId: undefined,
    status: undefined
  },
  // 只校验必填。时间先后、不能建过去的时段、同门店不重叠这三条规则在后端，
  // 前端再抄一遍迟早和后端对不上，直接把后端的 msg 弹出来更准
  rules: {
    storeId: [{ required: true, message: "门店不能为空", trigger: "change" }],
    startTime: [{ required: true, message: "开始时间不能为空", trigger: "change" }],
    endTime: [{ required: true, message: "结束时间不能为空", trigger: "change" }]
  }
})

const { queryParams, form, rules } = toRefs(data)

// booked 不能手工设置，编辑表单里去掉
const editableStatus = computed(() => kg_slot_status.value.filter(dict => dict.value !== "booked"))

/** 查询面试时段列表 */
function getList() {
  const request = ++listRequest
  loading.value = true
  listSlot(proxy.addDateRange(queryParams.value, dateRange.value)).then(response => {
    if (request !== listRequest) return
    slotList.value = response.rows
    total.value = response.total
  }).catch(() => {
    if (request !== listRequest) return
    // 查询失败必须把上一次的结果清掉：留着旧数据和旧 total，
    // 运营会把它当成本次查询的结果。具体错误 request.js 已经弹过了。
    slotList.value = []
    total.value = 0
  }).finally(() => {
    // loading 收敛在 finally：无论成功、失败还是以后新增分支，遮罩都一定会关
    if (request === listRequest) loading.value = false
  })
}

/** 拉取门店与岗位下拉数据 */
function getOptions() {
  // 两个下拉各自失败各自兜底：门店拉不到不该连带把岗位下拉也弄没
  listStoreOption().then(response => {
    storeOptions.value = response.rows
  }).catch(() => {
    storeOptions.value = []
  })
  listJobOption().then(response => {
    jobOptions.value = response.rows
  }).catch(() => {
    // jobOptions 还兼做表格里"限定岗位"列的翻译表，拉不到时列会退化成"岗位#123"，
    // 这是刻意的降级：显示 ID 总好过显示一个可能过期的标题
    jobOptions.value = []
  })
}

/** 岗位下拉按门店过滤：岗位属于门店，选了门店还列出别家的岗位只会让人选错 */
function jobsOfStore(storeId) {
  if (!storeId) {
    return jobOptions.value
  }
  return jobOptions.value.filter(item => item.storeId === storeId)
}

/** 限定岗位的展示文案 */
function jobLabel(jobId) {
  // job_id 为空表示门店通用时段，这家店的任何岗位都能约
  if (jobId === undefined || jobId === null || jobId === "") {
    return "门店通用"
  }
  const job = jobOptions.value.find(item => item.jobId === jobId)
  return job ? job.title : "岗位#" + jobId
}

/**
 * 该行当前是不是 booked 状态。
 *
 * 只用来决定要不要显示那条提示，**不再用来禁用按钮** ——
 * 能不能改/能不能删由后端按"占用是否仍然有效"判定，前端猜不出来。
 */
function isBooked(row) {
  return row.status === "booked"
}

/** 字典里是否有这个值 */
function inDict(options, value) {
  return options.some(dict => dict.value === value)
}

/** 取消按钮 */
function cancel() {
  if (saving.value) return
  editorRequest++
  open.value = false
  reset()
}

function closeEditor(done) {
  if (saving.value) return
  editorRequest++
  done()
}

/** 表单重置 */
function reset() {
  saveUncertain.value = false
  form.value = {
    slotId: undefined,
    storeId: undefined,
    jobId: undefined,
    startTime: undefined,
    endTime: undefined,
    status: "open",
    remark: undefined
  }
  proxy.resetForm("slotRef")
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
  handleQuery()
}

/** 多选框选中数据 */
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.slotId)
  single.value = selection.length != 1
  multiple.value = !selection.length
  bookedSelected.value = selection.some(item => isBooked(item))
}

/** 新增按钮操作 */
function handleAdd() {
  if (saving.value) return
  editorRequest++
  reset()
  open.value = true
  title.value = "添加面试时段"
}

/** 修改按钮操作 */
function handleUpdate(row) {
  if (saving.value) return
  const request = ++editorRequest
  reset()
  const slotId = row.slotId || ids.value[0]
  getSlot(slotId).then(response => {
    if (request !== editorRequest) return
    form.value = response.data
    open.value = true
    title.value = "修改面试时段"
  }).catch(() => {
    // 取详情失败就别打开对话框，否则运营会在一个空表单上编辑并提交出一条新时段
  })
}

/** 门店变更 */
function handleStoreChange() {
  // 岗位是挂在门店下的，换了门店原来的限定岗位一定不再适用
  form.value.jobId = undefined
}

/** 提交按钮 */
async function submitForm() {
  if (!open.value || saving.value) return
  const request = editorRequest
  saving.value = true
  try {
    await proxy.$refs["slotRef"].validate()
    saveUncertain.value = false
    const payload = { ...form.value }
    const editing = payload.slotId != null
    if (editing) await updateSlot(payload)
    else await addSlot(payload)
    if (request !== editorRequest) return
    proxy.$modal.msgSuccess(editing ? "修改成功" : "新增成功")
    open.value = false
    getList()
  } catch (error) {
    if (error?.isAxiosError && (!error.response || error.response.status >= 500)) {
      saveUncertain.value = true
      getList()
    }
  } finally {
    saving.value = false
  }
}

/** 删除按钮操作 */
function handleDelete(row) {
  const slotIds = row.slotId || ids.value
  proxy.$modal.confirm('是否确认删除时段编号为"' + slotIds + '"的数据项？').then(function() {
    return delSlot(slotIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

getOptions()
getList()
onBeforeUnmount(() => { editorRequest++ })
</script>
