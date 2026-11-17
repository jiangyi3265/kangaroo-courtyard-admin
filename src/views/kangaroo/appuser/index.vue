<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="88px">
      <el-form-item label="昵称" prop="nickname">
        <el-input
          v-model="queryParams.nickname"
          placeholder="请输入昵称"
          clearable
          style="width: 200px"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <!-- 手机号后端是精确匹配，提示语写清楚，免得运营以为能搜号码片段 -->
      <el-form-item label="手机号" prop="phone">
        <el-input
          v-model="queryParams.phone"
          placeholder="请输入完整手机号"
          clearable
          style="width: 200px"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="常驻城市" prop="city">
        <el-input
          v-model="queryParams.city"
          placeholder="请输入常驻城市"
          clearable
          style="width: 200px"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="账号状态" clearable style="width: 200px">
          <el-option
            v-for="dict in sys_normal_disable"
            :key="dict.value"
            :label="dict.label"
            :value="dict.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="注册时间" style="width: 308px">
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

    <!--
      这里刻意只有"导出"：账号由微信登录创建，后台新增会造出没有 openid 的孤儿数据，
      删除则会让已产生的报名记录失去归属，所以不提供新增与删除，停用就是下线手段。
      也正因为没有任何批量操作，表格不需要多选列，页面里也就没有 ids/single/multiple。
    -->
    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button
          type="warning"
          plain
          icon="Download"
          @click="handleExport"
          v-hasPermi="['kangaroo:appuser:export']"
        >导出</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="appUserList">
      <el-table-column label="账号ID" align="center" prop="userId" width="90" />
      <el-table-column label="昵称" align="center" prop="nickname" :show-overflow-tooltip="true" />
      <el-table-column label="手机号" align="center" prop="phone" width="130" />
      <el-table-column label="常驻城市" align="center" prop="city" :show-overflow-tooltip="true" />
      <el-table-column label="状态" align="center" width="90">
        <template #default="scope">
          <!-- 挂上与后端 changeStatus 同一个权限标识：
               没有 kangaroo:appuser:status 的角色原先也能看到这个开关，点下去才收到 403。 -->
          <el-switch
            v-model="scope.row.status"
            active-value="0"
            inactive-value="1"
            v-hasPermi="['kangaroo:appuser:status']"
            @change="handleStatusChange(scope.row)"
          ></el-switch>
        </template>
      </el-table-column>
      <el-table-column label="注册时间" align="center" prop="registerTime" width="170">
        <template #default="scope">
          <span>{{ parseTime(scope.row.registerTime) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="最后登录时间" align="center" prop="lastLoginTime" width="170">
        <template #default="scope">
          <span>{{ parseTime(scope.row.lastLoginTime) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="120" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="View" @click="handleView(scope.row)" v-hasPermi="['kangaroo:appuser:query']">查看详情</el-button>
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

    <!-- 账号详情：openid/unionid 只在这里出现，列表接口出于隐私根本不下发这两个字段 -->
    <el-dialog :title="title" v-model="open" width="680px" append-to-body>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="账号ID">{{ form.userId }}</el-descriptions-item>
        <el-descriptions-item label="昵称">{{ form.nickname }}</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ form.phone }}</el-descriptions-item>
        <el-descriptions-item label="真实姓名">{{ form.realName }}</el-descriptions-item>
        <el-descriptions-item label="性别">{{ genderText(form.gender) }}</el-descriptions-item>
        <el-descriptions-item label="常驻城市">{{ form.city }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <dict-tag :options="sys_normal_disable" :value="form.status" />
        </el-descriptions-item>
        <el-descriptions-item label="最后登录IP">{{ form.lastLoginIp }}</el-descriptions-item>
        <el-descriptions-item label="注册时间">{{ parseTime(form.registerTime) }}</el-descriptions-item>
        <el-descriptions-item label="最后登录时间">{{ parseTime(form.lastLoginTime) }}</el-descriptions-item>
        <el-descriptions-item label="openid" :span="2">{{ form.openid }}</el-descriptions-item>
        <el-descriptions-item label="unionid" :span="2">{{ form.unionid }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ form.remark }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="cancel">关 闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="KgAppUser">
import { listAppUser, getAppUser, changeAppUserStatus } from "@/api/kangaroo/appuser"

const { proxy } = getCurrentInstance()
const { sys_normal_disable } = proxy.useDict("sys_normal_disable")

const appUserList = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(window.innerWidth > 768)  // 手机上搜索栏先收起，点右边放大镜再展开
const total = ref(0)
const title = ref("")
const dateRange = ref([])

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    nickname: undefined,
    phone: undefined,
    city: undefined,
    status: undefined
  }
})

const { queryParams, form } = toRefs(data)

// kg_app_user.gender 是 0未知/1男/2女，与若依自带的 sys_user_sex（0男/1女/2未知）正好错位，
// 复用那本字典会把性别显示反，所以这里用本地映射
const GENDER_TEXT = { "0": "未知", "1": "男", "2": "女" }

function genderText(gender) {
  return GENDER_TEXT[gender] || ""
}

/** 查询小程序账号列表 */
function getList() {
  loading.value = true
  listAppUser(proxy.addDateRange(queryParams.value, dateRange.value)).then(response => {
    appUserList.value = response.rows
    total.value = response.total
  }).catch(() => {
    // 查询失败必须把上一次的结果清掉：留着旧数据和旧 total，
    // 运营会把它当成本次查询的结果。具体错误 request.js 已经弹过了。
    appUserList.value = []
    total.value = 0
  }).finally(() => {
    // loading 收敛在 finally：无论成功、失败还是以后新增分支，遮罩都一定会关
    loading.value = false
  })
}

/** 取消按钮 */
function cancel() {
  open.value = false
  reset()
}

/** 表单重置 */
function reset() {
  form.value = {}
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

/** 查看详情按钮操作 */
function handleView(row) {
  reset()
  getAppUser(row.userId).then(response => {
    form.value = response.data
    open.value = true
    title.value = "账号详情"
  }).catch(() => {
    // 取详情失败就别打开对话框，否则会弹出一个空白详情框；错误提示 request.js 已经给了
  })
}

/** 账号状态修改 */
function handleStatusChange(row) {
  const text = row.status === "0" ? "启用" : "停用"
  // 停用带即时副作用：后端会把该账号的小程序会话一起踢下线，必须在确认框里讲清楚
  const tip = row.status === "0"
    ? "确认要启用【" + row.nickname + "】的账号吗？"
    : "确认要停用【" + row.nickname + "】的账号吗？停用后该账号的小程序会话会立即失效，需要重新登录。"
  proxy.$modal.confirm(tip).then(function () {
    return changeAppUserStatus(row.userId, row.status)
  }).then(() => {
    proxy.$modal.msgSuccess(text + "成功")
    // 其余 6 个业务页的写操作成功后都会重新拉列表，这里原先是唯一的例外：
    // 只弹提示不刷新，界面上的状态只是开关自己拨过去的那个值，并不是服务端的真实结果。
    getList()
  }).catch(function () {
    // 取消或接口失败都要把开关拨回去，否则界面状态与库里不一致
    row.status = row.status === "0" ? "1" : "0"
  })
}

/** 导出按钮操作 */
function handleExport() {
  proxy.download("kangaroo/appuser/export", {
    ...queryParams.value
  }, `appuser_${new Date().getTime()}.xlsx`)
}

getList()
</script>
