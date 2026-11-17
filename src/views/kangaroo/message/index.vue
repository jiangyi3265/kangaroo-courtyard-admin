<template>
  <div class="app-container">
    <notification-guide context="message" />
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch">
      <!-- recipientId 在后端是 Long，输入 abc 会在 Spring 绑参阶段就抛 NumberFormatException（code 500），
           所以在输入环节就把非数字字符滤掉，从源头杜绝这种注定失败的查询条件 -->
      <el-form-item label="接收人ID" prop="recipientId">
        <el-input
          v-model="queryParams.recipientId"
          placeholder="请输入接收人账号ID（纯数字）"
          clearable
          style="width: 180px"
          @input="onRecipientIdInput"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="身份" prop="mode">
        <el-select v-model="queryParams.mode" placeholder="全部身份" clearable style="width: 140px">
          <el-option
            v-for="item in modeOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="分类" prop="category">
        <el-select v-model="queryParams.category" placeholder="全部分类" clearable style="width: 140px">
          <el-option
            v-for="dict in kg_msg_category"
            :key="dict.value"
            :label="dict.label"
            :value="dict.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="已读" prop="readFlag">
        <el-select v-model="queryParams.readFlag" placeholder="全部" clearable style="width: 120px">
          <el-option
            v-for="item in readFlagOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="创建时间">
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
      <!-- 站内消息由业务流程产生，这里刻意不放新增/修改/删除，只留查询与刷新 -->
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="messageList">
      <el-table-column label="消息ID" align="center" prop="msgId" width="90" />
      <el-table-column label="接收人昵称" align="center" prop="nickname" width="130" :show-overflow-tooltip="true">
        <template #default="scope">
          <!-- 接收人被逻辑删除后昵称查不出来，退回到显示账号ID，起码还能定位到人 -->
          <span>{{ scope.row.nickname || "账号#" + scope.row.recipientId }}</span>
        </template>
      </el-table-column>
      <el-table-column label="身份" align="center" prop="mode" width="90">
        <template #default="scope">
          <span>{{ modeLabel(scope.row.mode) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="分类" align="center" prop="category" width="90">
        <template #default="scope">
          <!-- DictTag 的未匹配兜底渲染是坏的，字典里没有的值直接显示原始值 -->
          <dict-tag v-if="inDict(kg_msg_category, scope.row.category)" :options="kg_msg_category" :value="scope.row.category" />
          <span v-else>{{ scope.row.category }}</span>
        </template>
      </el-table-column>
      <el-table-column label="标题" align="center" prop="title" :show-overflow-tooltip="true"><template #default="scope">{{ messageWording(scope.row).title }}</template></el-table-column>
      <el-table-column label="正文" align="center" prop="content" :show-overflow-tooltip="true"><template #default="scope">{{ messageWording(scope.row).content }}</template></el-table-column>
      <el-table-column label="关联业务" align="center" prop="bizType" width="150" :show-overflow-tooltip="true">
        <template #default="scope">
          <span>{{ bizLabel(scope.row) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="已读" align="center" prop="readFlag" width="80">
        <template #default="scope">
          <el-tag v-if="scope.row.readFlag === '1'" type="info">已读</el-tag>
          <el-tag v-else-if="scope.row.readFlag === '0'" type="danger">未读</el-tag>
          <span v-else>{{ scope.row.readFlag }}</span>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" align="center" prop="createTime" width="180">
        <template #default="scope">
          <span>{{ parseTime(scope.row.createTime) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="100" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="View" @click="handleView(scope.row)" v-hasPermi="['kangaroo:message:query']">查看详情</el-button>
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

    <!-- 消息详情对话框（只读） -->
    <el-dialog :title="title" v-model="open" width="700px" append-to-body>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="消息ID">{{ form.msgId }}</el-descriptions-item>
        <el-descriptions-item label="接收人">{{ form.nickname || "账号#" + form.recipientId }}</el-descriptions-item>
        <el-descriptions-item label="身份">{{ modeLabel(form.mode) }}</el-descriptions-item>
        <el-descriptions-item label="分类">
          <dict-tag v-if="inDict(kg_msg_category, form.category)" :options="kg_msg_category" :value="form.category" />
          <span v-else>{{ form.category }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="关联业务">{{ bizLabel(form) }}</el-descriptions-item>
        <el-descriptions-item label="跳转路由">{{ form.route || "-" }}</el-descriptions-item>
        <el-descriptions-item label="已读">{{ form.readFlag === "1" ? "已读" : "未读" }}</el-descriptions-item>
        <el-descriptions-item label="阅读时间">{{ parseTime(form.readTime) || "-" }}</el-descriptions-item>
        <el-descriptions-item label="创建时间" :span="2">{{ parseTime(form.createTime) }}</el-descriptions-item>
        <el-descriptions-item label="标题" :span="2">{{ messageWording(form).title }}</el-descriptions-item>
        <el-descriptions-item label="正文" :span="2">
          <div class="msg-content">{{ messageWording(form).content }}</div>
          <details v-if="messageWording(form).title !== form.title || messageWording(form).content !== form.content"><summary style="margin-top:10px;cursor:pointer;color:#9a6c3d">称呼已更新 · 查看消息原文</summary><div class="msg-content">{{ form.title }}<br />{{ form.content }}</div></details>
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="cancel">关 闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="KgMessage">
import { listMessage, getMessage } from "@/api/kangaroo/message"
import NotificationGuide from '@/components/NotificationGuide/index.vue'
import { messageWording } from '@/utils/displayWording'

const { proxy } = getCurrentInstance()
const { kg_msg_category } = proxy.useDict("kg_msg_category")

const messageList = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(window.innerWidth > 768)  // 手机上搜索栏先收起，点右边放大镜再展开
const total = ref(0)
const title = ref("")
const dateRange = ref([])
// 页面只读，没有批量操作，所以不需要 ids/single/multiple 这几个选择态变量

// mode 与 readFlag 只有两个取值且没有建字典，写死在页面里比造两个字典更直接
const modeOptions = [
  { value: "user", label: "用户端" },
  { value: "staff", label: "员工端" }
]
const readFlagOptions = [
  { value: "0", label: "未读" },
  { value: "1", label: "已读" }
]

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    recipientId: undefined,
    mode: undefined,
    category: undefined,
    readFlag: undefined
  }
})

const { queryParams, form } = toRefs(data)

/**
 * 接收人ID 只允许纯数字。
 * 不用 type="number"：原生数字框还能输入 e / + / - / 小数点，一样会送出非法值给 Long 字段；
 * 直接把非数字字符滤掉，运营既看不到非法内容，也不会发出注定 500 的请求。
 */
function onRecipientIdInput(value) {
  const digits = String(value == null ? "" : value).replace(/\D/g, "")
  // 空串要还原成 undefined，否则 recipientId= 会作为空参数发给后端
  queryParams.value.recipientId = digits === "" ? undefined : digits
}

/** 查询站内消息列表 */
function getList() {
  loading.value = true
  listMessage(proxy.addDateRange(queryParams.value, dateRange.value)).then(response => {
    messageList.value = response.rows
    total.value = response.total
  }).catch(() => {
    // 查询失败必须把上一次的结果清掉：留着旧的 10 行和旧的 total，
    // 运营会把它当成本次查询的结果，比什么都不显示危险得多。
    // 具体错误 request.js 已经弹过了，这里不再重复提示。
    messageList.value = []
    total.value = 0
  }).finally(() => {
    // loading 收敛在 finally：无论成功、失败还是以后新增分支，遮罩都一定会关
    loading.value = false
  })
}

/** 身份展示文案 */
function modeLabel(mode) {
  const item = modeOptions.find(option => option.value === mode)
  return item ? item.label : mode
}

/** 关联业务展示文案 */
function bizLabel(row) {
  if (!row || !row.bizType) {
    return "-"
  }
  return row.bizId ? row.bizType + " #" + row.bizId : row.bizType
}

/** 字典里是否有这个值 */
function inDict(options, value) {
  return options.some(dict => dict.value === value)
}

/** 关闭详情 */
function cancel() {
  open.value = false
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

/** 查看详情 */
function handleView(row) {
  // 列表里的正文被 tooltip 截断了，详情走一次 query 接口拿完整内容
  getMessage(row.msgId).then(response => {
    form.value = response.data
    // 详情接口不带 left join 出来的昵称，用列表行里的补上
    form.value.nickname = row.nickname
    open.value = true
    title.value = "消息详情"
  }).catch(() => {
    // 取详情失败就别打开抽屉，否则会弹出一个空白详情框；错误提示 request.js 已经给了
  })
}

getList()
</script>

<style scoped>
.msg-content {
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.6;
}
</style>
