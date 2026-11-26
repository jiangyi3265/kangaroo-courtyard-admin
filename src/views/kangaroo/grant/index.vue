<template>
  <div class="app-container">
    <p class="grant-guide">门店未开通时，可先按城市授予员工身份。角色切换后，换工主理人可在其他门店协作招聘；其他内部员工按本城授权处理业务。已有门店授权或撤销记录优先。合作商家先获得待绑定身份，由平台绑定真实门店后开展业务。岗位详情里的城市负责人称呼和头像，请在「城市字典」中维护。</p>
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="88px">
      <el-form-item label="门店" prop="storeId">
        <el-select v-model="queryParams.storeId" placeholder="请选择门店" clearable filterable style="width: 200px">
          <el-option
            v-for="item in storeOptions"
            :key="item.storeId"
            :label="item.storeName"
            :value="item.storeId"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="小程序账号" prop="appUserId">
        <el-select
          v-model="queryParams.appUserId"
          placeholder="昵称、手机号或会员编号（账号ID）"
          clearable
          filterable
          remote
          reserve-keyword
          :remote-method="remoteAppUser"
          :loading="appUserLoading"
          style="width: 260px"
        >
          <el-option
            v-for="item in appUserOptions"
            :key="item.userId"
            :label="appUserLabel(item)"
            :value="item.userId"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="员工角色" prop="roleCode">
        <el-select v-model="queryParams.roleCode" placeholder="请选择角色" clearable style="width: 160px">
          <el-option
            v-for="dict in selectableRoles"
            :key="dict.value"
            :label="dict.label"
            :value="dict.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="授权状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="请选择状态" clearable style="width: 160px">
          <el-option
            v-for="dict in sys_normal_disable"
            :key="dict.value"
            :label="dict.label"
            :value="dict.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <!--
      没有"删除"：授权记录要留档备查（谁在什么时候把员工身份给了谁），
      所以下线手段只有撤销，后端也是把状态置为已撤销而不是删行。
    -->
    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button
          type="primary"
          plain
          icon="Plus"
          @click="handleAdd"
          v-hasPermi="['kangaroo:grant:add']"
        >新增授权</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="success"
          plain
          icon="Edit"
          :disabled="single"
          @click="handleUpdate"
          v-hasPermi="['kangaroo:grant:edit']"
        >修改角色</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="danger"
          plain
          icon="CircleClose"
          :disabled="multiple"
          @click="handleRevoke"
          v-hasPermi="['kangaroo:grant:revoke']"
        >撤销授权</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="grantList" @selection-change="handleSelectionChange">
      <!-- 已撤销的行不允许勾选：再撤一次后端会直接报"授权已撤销，请勿重复操作" -->
      <el-table-column type="selection" width="50" align="center" :selectable="isRevocable" />
      <el-table-column label="授权ID" align="center" prop="grantId" width="70" />
      <!-- 员工入口登录的新账号都叫「小院同学」：昵称后面带上账号ID（会员编号），同一门店的几条授权才分得清。
           昵称太长时只截昵称，后面的（ID …）始终完整显示 -->
      <el-table-column label="小程序账号（ID）" align="center" prop="appUserId" min-width="160">
        <template #default="scope">
          <div class="account-cell" :title="accountText(scope.row)">
            <span class="account-name">{{ scope.row.nickname || "未设置昵称" }}</span>
            <span v-if="scope.row.appUserId != null" class="account-id">（ID {{ scope.row.appUserId }}）</span>
          </div>
        </template>
      </el-table-column>
      <!-- 加了账号ID 这一列后，其余各列收窄一点，1366 宽屏幕下仍然一屏放得下；操作列固定在右边。
           各列宽加起来（门店名称按最窄 80 算）是 1115：1366 宽时表格只有 1120（列表一长，右侧会多出 6px 的竖滚动条），再加宽就会出现横向滚动条 -->
      <el-table-column label="账号手机号" align="center" prop="phone" width="120" />
      <el-table-column label="授权范围" align="center" :show-overflow-tooltip="true"><template #default="scope">{{ scope.row.cityId ? (scope.row.city + ' · 城市授权') : scope.row.storeName }}</template></el-table-column>
      <!-- 「线上任务专员」6 个字，标签要 92px，原先 110 宽的格子放不下 -->
      <el-table-column label="员工角色" align="center" prop="roleCode" width="120">
        <template #default="scope">
          <dict-tag :options="kg_staff_role" :value="scope.row.roleCode" />
          <!-- 开了兼任：读作「小院主理人 + 商家服务人」。分两行写，这一列不加宽（上面算过 1366 宽屏幕一屏放得下） -->
          <div v-if="isAlsoService(scope.row)" class="also-service-tag">+ 商家服务人</div>
        </template>
      </el-table-column>
      <el-table-column label="授权状态" align="center" prop="status" width="90">
        <template #default="scope">
          <dict-tag :options="sys_normal_disable" :value="scope.row.status" />
        </template>
      </el-table-column>
      <el-table-column label="授权人" align="center" prop="grantedBy" width="100" :show-overflow-tooltip="true" />
      <el-table-column label="授权时间" align="center" prop="grantedTime" width="160">
        <template #default="scope">
          <span>{{ parseTime(scope.row.grantedTime) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="165" fixed="right" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button
            link
            type="primary"
            icon="Edit"
            v-if="isRevocable(scope.row)"
            @click="handleUpdate(scope.row)"
            v-hasPermi="['kangaroo:grant:edit']"
          >修改角色</el-button>
          <el-button
            link
            type="primary"
            icon="CircleClose"
            v-if="isRevocable(scope.row)"
            @click="handleRevoke(scope.row)"
            v-hasPermi="['kangaroo:grant:revoke']"
          >撤销</el-button>
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

    <!-- 新增授权 / 修改角色对话框 -->
    <el-dialog :title="title" v-model="open" width="680px" append-to-body :close-on-click-modal="false" :close-on-press-escape="!submitting" :show-close="!submitting" @closed="reset">
      <el-form ref="grantRef" :model="form" :rules="rules" label-width="100px" :disabled="submitting">
        <!-- 账号与门店只在新增时可选：后端的修改接口只认 grantId + roleCode，改这两项没有意义 -->
        <el-form-item label="小程序账号" prop="appUserId">
          <el-select
            v-if="form.grantId == undefined"
            v-model="form.appUserId"
            placeholder="昵称、手机号或会员编号（账号ID）"
            clearable
            filterable
            remote
            reserve-keyword
            :remote-method="remoteAppUser"
            :loading="appUserLoading"
            style="width: 100%"
          >
            <el-option
              v-for="item in appUserOptions"
              :key="item.userId"
              :label="appUserLabel(item)"
              :value="item.userId"
            />
          </el-select>
          <span v-else>{{ appUserLabel(form) }}</span>
        </el-form-item>
        <el-form-item v-if="form.grantId == undefined" label="授权方式">
          <el-radio-group v-model="form.scopeType" @change="changeScope"><el-radio value="store">门店授权</el-radio><el-radio value="city">城市授权（无需门店）</el-radio></el-radio-group>
        </el-form-item>
        <el-form-item v-if="cityScope" label="负责城市" prop="cityId">
          <el-select v-if="form.grantId == undefined" v-model="form.cityId" placeholder="请选择负责城市" filterable clearable :loading="cityLoading" style="width:100%"><el-option v-for="city in cityOptions" :key="city.cityId" :label="city.name" :value="city.cityId" /></el-select>
          <span v-else>{{ form.city }}</span>
          <div class="also-service-hint">{{ cityScopeHint }}</div>
        </el-form-item>
        <el-form-item v-else label="门店" prop="storeId">
          <el-select
            v-if="form.grantId == undefined"
            v-model="form.storeId"
            placeholder="请选择门店"
            :loading="storeLoading"
            :disabled="storeLoading || submitting"
            clearable
            filterable
            style="width: 100%"
          >
            <!-- 带上城市：商家服务人、城市负责人靠所选门店的城市定范围 -->
            <el-option
              v-for="item in storeOptions"
              :key="item.storeId"
              :label="item.city ? item.storeName + '（' + item.city + '）' : item.storeName"
              :value="item.storeId"
            />
          </el-select>
          <span v-else>{{ form.storeName }}</span>
        </el-form-item>
        <el-form-item label="员工角色" prop="roleCode">
          <el-radio-group v-model="form.roleCode">
            <el-radio
              v-for="dict in selectableRoles"
              :key="dict.value"
              :value="dict.value"
            >{{ dict.label }}</el-radio>
          </el-radio-group>
          <!-- 切换前这句话很要紧：这里选换工主理人，切换后这个人会变城市负责人 -->
          <div v-if="rolePhaseHint" class="role-phase-hint">{{ rolePhaseHint }}</div>
        </el-form-item>
        <el-form-item v-if="form.roleCode === ALSO_SERVICE_ROLE" label="兼任">
          <el-checkbox v-model="form.alsoService" true-value="1" false-value="0">{{ ALSO_SERVICE_LABEL }}</el-checkbox>
          <div class="also-service-hint">{{ ALSO_SERVICE_HINT }}</div>
        </el-form-item>
      </el-form>
      <section class="role-explanation" aria-label="所选角色权限">
        <div class="role-explanation__heading"><strong>{{ selectedRole?.label || '角色' }}权限范围</strong><span>{{ form.roleCode ? selectedScope : '请先选择员工角色' }}</span></div>
        <p v-if="selectedHint" class="role-explanation__hint">{{ selectedHint }}</p>
        <el-alert v-if="rolesError" title="权限说明读取失败" type="error" :closable="false"><el-button link @click="loadRoles">重新加载</el-button></el-alert>
        <el-table v-else :data="selectedRole?.matrix || []" v-loading="rolesLoading" size="small">
          <el-table-column prop="name" label="功能" min-width="150" />
          <el-table-column v-for="(action, i) in roleActions" :key="action" :label="action" width="65" align="center"><template #default="scope"><span :class="'permission-' + scope.row.values[i]">{{ permissionText(scope.row.values[i]) }}</span></template></el-table-column>
        </el-table>
        <p>「部分」表示仅可处理本人负责的内容，具体以该功能的操作规则为准。修改后，小程序重新读取授权即可生效。</p>
      </section>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" :loading="submitting" :disabled="storeLoading" @click="submitForm">确 定</el-button>
          <el-button :disabled="submitting" @click="cancel">取 消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="KgGrant">
import {
  getGrantRoles,
  listGrant,
  getGrant,
  addGrant,
  updateGrant,
  revokeGrant,
  listGrantAppUserOption,
  listGrantStoreOption,
  listGrantCityOption
} from "@/api/kangaroo/grant"
import { mergeStaffRoles, selectableStaffRoles, roleScopeText, roleHint, ALSO_SERVICE_ROLE, ALSO_SERVICE_LABEL, ALSO_SERVICE_HINT, alsoServiceValue, isAlsoService } from "@/utils/staffRoles"

const { proxy } = getCurrentInstance()
const { kg_staff_role: rawStaffRoles, sys_normal_disable } = proxy.useDict("kg_staff_role", "sys_normal_disable")

const grantList = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(window.innerWidth > 768)  // 手机上搜索栏先收起，点右边放大镜再展开
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref("")
const storeOptions = ref([])
const storeLoading = ref(false)
const cityOptions = ref([]), cityLoading = ref(false)
const submitting = ref(false)
let storeRequest = 0
const appUserOptions = ref([])
const appUserLoading = ref(false)
const roleOptions = ref([]), roleActions = ref([]), rolesLoading = ref(false), rolesError = ref(false)
const roleLabels = ref({}), roleSelectable = ref([]), rolePhase = ref(""), rolePhaseHint = ref("")
// 列表标签用显示列表（含已停用的员工），单选和搜索只认接口给的 selectable
const kg_staff_role = computed(() => mergeStaffRoles(rawStaffRoles.value, roleOptions.value, roleLabels.value))
const selectableRoles = computed(() => selectableStaffRoles(kg_staff_role.value, roleSelectable.value))
const selectedRole = computed(() => roleOptions.value.find(r => r.value === form.value.roleCode))
const selectedStore = computed(() => storeOptions.value.find(store => String(store.storeId) === String(form.value.storeId)))
const cityScope = computed(() => form.value.scopeType === 'city' || form.value.cityId != null)
const cityScopeHint = computed(() => form.value.roleCode === 'merchant' ? '先开通合作商家身份，待平台绑定真实门店后才能经营；不会获得同城其他门店权限。' : '城市尚无门店也可授权；门店开通后仅在本城按所选角色行使权限。已有门店授权或撤销记录优先。')
const selectedScope = computed(() => cityScope.value ? cityScopeHint.value : roleScopeText(form.value.roleCode, selectedStore.value, isAlsoService(form.value), rolePhase.value))
const selectedHint = computed(() => roleHint(form.value.roleCode, rolePhase.value))
const permissionText = v => ({ yes: '允许', part: '部分', no: '—' }[v] || '—')
let userRequest = 0, listRequest = 0, editorRequest = 0
async function loadRoles() {
  rolesLoading.value = true; rolesError.value = false
  try {
    const res = await getGrantRoles()
    roleOptions.value = res.data.roles || []; roleActions.value = res.data.actions || []
    roleLabels.value = res.data.labels || {}; roleSelectable.value = res.data.selectable || []
    rolePhase.value = res.data.phase || ""; rolePhaseHint.value = res.data.hint || ""
  }
  catch { rolesError.value = true }
  finally { rolesLoading.value = false }
}

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    storeId: undefined,
    appUserId: undefined,
    roleCode: undefined,
    status: undefined
  },
  rules: {
    appUserId: [{ required: true, message: "小程序账号不能为空", trigger: "change" }],
    storeId: [{ required: true, message: "门店不能为空", trigger: "change" }],
    cityId: [{ required: true, message: "请选择负责城市", trigger: "change" }],
    roleCode: [{ required: true, message: "员工角色不能为空", trigger: "change" }]
  }
})

const { queryParams, form, rules } = toRefs(data)

function changeScope(type) {
  form.value.storeId = undefined; form.value.cityId = undefined
  proxy.$refs.grantRef?.clearValidate()
}
async function getCityOptions() {
  cityLoading.value = true
  try { const res = await listGrantCityOption(); cityOptions.value = res.data || []; return true }
  catch { cityOptions.value = []; return false }
  finally { cityLoading.value = false }
}

// 切到别的角色时勾选框不显示了，值也要清掉：切回小院主理人不能自己又是勾着的
watch(() => form.value.roleCode, role => {
  if (role !== ALSO_SERVICE_ROLE) form.value.alsoService = "0"
})

/**
 * 下拉里同时显示昵称、账号ID 与手机号：昵称大量重复（员工入口登录的新账号都叫「小院同学」，还没有手机号），
 * 只有账号ID（小程序「我的」页上的会员编号）分得清是谁。授权记录里的字段叫 appUserId，账号列表里叫 userId
 */
function appUserLabel(row) {
  if (!row) {
    return ""
  }
  const id = row.userId != null ? row.userId : row.appUserId
  const extra = [id != null ? "ID " + id : "", row.phone || ""].filter(Boolean).join(" / ")
  return extra ? (row.nickname || "未设置昵称") + "（" + extra + "）" : row.nickname
}

/** 列表里的账号：昵称（ID 账号ID），手机号单独一列 */
function accountText(row) {
  const name = row.nickname || "未设置昵称"
  return row.appUserId != null ? name + "（ID " + row.appUserId + "）" : name
}

/** 只有生效中的授权才能改角色或撤销 */
function isRevocable(row) {
  return row.status === "0"
}

/** 查询员工授权列表 */
function getList() {
  const request = ++listRequest
  loading.value = true
  listGrant({ ...queryParams.value }).then(response => {
    if (request !== listRequest) return
    grantList.value = response.rows
    total.value = response.total
  }).catch(() => {
    if (request !== listRequest) return
    // 查询失败必须把上一次的结果清掉：留着旧数据和旧 total，
    // 运营会把它当成本次查询的结果。具体错误 request.js 已经弹过了。
    grantList.value = []
    total.value = 0
  }).finally(() => {
    // loading 收敛在 finally：无论成功、失败还是以后新增分支，遮罩都一定会关
    if (request === listRequest) loading.value = false
  })
}

/** 门店可能在另一页面删除重建，打开授权表单和提交前都读取最新候选。 */
async function getStoreOptions() {
  const request = ++storeRequest
  storeLoading.value = true
  storeOptions.value = []
  try {
    const options = []
    for (let pageNum = 1; ; pageNum++) {
      const response = await listGrantStoreOption({ pageNum, pageSize: 200, status: "0" })
      if (request !== storeRequest) return false
      const batch = response.rows || []
      options.push(...batch)
      if (!batch.length || options.length >= Number(response.total || options.length)) break
    }
    storeOptions.value = options
    return true
  } catch {
    return false
  } finally {
    if (request === storeRequest) storeLoading.value = false
  }
}

/** 账号下拉：账号会越来越多，默认只给前 200 条，其余靠远程搜索 */
function getAppUserOptions(query) {
  const request = ++userRequest
  appUserLoading.value = true
  appUserOptions.value = []
  const params = { pageNum: 1, pageSize: 200 }
  // 后端 phone、userId 是精确匹配，nickname 是模糊匹配，按输入内容分流：
  // 11 位 1 开头的数字按手机号，其余纯数字按账号ID（员工报来的会员编号），否则按昵称
  const q = (query || "").trim()
  if (q) {
    if (/^1\d{10}$/.test(q)) {
      params.phone = q
    } else if (/^\d{1,18}$/.test(q)) {
      params.userId = q
    } else {
      params.nickname = q
    }
  }
  listGrantAppUserOption(params).then(response => {
    if (request !== userRequest) return
    appUserOptions.value = response.rows
  }).catch(() => {
    if (request !== userRequest) return
    // 搜不出来就把候选清空，避免下拉里留着上一次关键词的结果误导选择
    appUserOptions.value = []
  }).finally(() => {
    // 下拉自己的 loading 同样用 finally 收敛，免得转圈不停
    if (request === userRequest) appUserLoading.value = false
  })
}

/** 账号下拉远程搜索 */
function remoteAppUser(query) {
  getAppUserOptions(query)
}

/** 取消按钮 */
function cancel() {
  if (submitting.value) return
  ++editorRequest
  open.value = false
  reset()
}

/** 表单重置 */
function reset() {
  form.value = {
    grantId: undefined,
    appUserId: undefined,
    storeId: undefined,
    cityId: undefined,
    scopeType: 'store',
    roleCode: undefined,
    alsoService: "0"
  }
  proxy.resetForm("grantRef")
}

/** 搜索按钮操作 */
function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

/** 重置按钮操作 */
function resetQuery() {
  proxy.resetForm("queryRef")
  handleQuery()
}

/** 多选框选中数据 */
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.grantId)
  single.value = selection.length != 1
  multiple.value = !selection.length
}

/** 新增按钮操作 */
function handleAdd() {
  if (submitting.value) return
  ++editorRequest
  reset()
  getStoreOptions()
  getCityOptions()
  getAppUserOptions()
  loadRoles()  // 能选哪些角色跟着切换阶段走，页面开着的时候可能已经切换了
  open.value = true
  title.value = "新增员工授权"
}

/** 修改按钮操作 */
function handleUpdate(row) {
  if (submitting.value) return
  const request = ++editorRequest
  reset()
  const grantId = row.grantId || ids.value[0]
  getGrant(grantId).then(response => {
    if (request !== editorRequest) return
    if (!isRevocable(response.data)) { proxy.$modal.msgWarning('该授权已撤销，请重新授权'); getList(); return }
    form.value = response.data
    loadRoles()
    open.value = true
    title.value = "修改员工角色"
  }).catch(() => {
    // 取详情失败就别打开对话框，否则会在一个空表单上提交出一条新授权
  })
}

/** 提交按钮 */
function submitForm() {
  if (!open.value || submitting.value || storeLoading.value) return
  const request = editorRequest
  proxy.$refs["grantRef"].validate(async valid => {
    if (!valid || !open.value || request !== editorRequest || submitting.value) return
    submitting.value = true
    try {
      const { grantId, appUserId, storeId, cityId, roleCode } = form.value
      const alsoService = alsoServiceValue(roleCode, form.value.alsoService)
      if (grantId != undefined) {
        await updateGrant({ grantId, roleCode, alsoService })
        proxy.$modal.msgSuccess("修改成功")
      } else if (cityScope.value) {
        if (!(await getCityOptions())) return
        if (!open.value || form.value.appUserId !== appUserId || form.value.cityId !== cityId || form.value.roleCode !== roleCode || alsoServiceValue(roleCode, form.value.alsoService) !== alsoService) return
        if (!cityOptions.value.some(city => String(city.cityId) === String(cityId))) { form.value.cityId = undefined; proxy.$modal.msgError('所选城市已停用，请重新选择'); return }
        await addGrant({ appUserId, cityId, roleCode, alsoService })
        proxy.$modal.msgSuccess('城市授权成功')
      } else {
        if (!(await getStoreOptions())) return
        // 刷新期间取消或改动表单，不提交旧选择。
        if (!open.value || form.value.appUserId !== appUserId || form.value.storeId !== storeId || form.value.roleCode !== roleCode || alsoServiceValue(roleCode, form.value.alsoService) !== alsoService) return
        if (!storeOptions.value.some(store => String(store.storeId) === String(storeId))) {
          form.value.storeId = undefined
          proxy.$modal.msgError("所选门店已删除或停用，请重新选择当前门店")
          return
        }
        await addGrant({ appUserId, storeId, roleCode, alsoService })
        proxy.$modal.msgSuccess("授权成功")
      }
      open.value = false
      getList()
    } catch {
      // 接口错误由 request.js 展示，保留表单供修正重试。
    } finally {
      submitting.value = false
    }
  })
}

/** 撤销按钮操作（这里没有 handleDelete：授权记录只撤销、不删除） */
function handleRevoke(row) {
  const grantIds = row.grantId || ids.value
  // 行内撤销写明是哪个账号、哪家店，免得几条「小院同学」撤错人
  const who = row.grantId ? "「" + accountText(row) + "」在「" + (row.storeName || row.city || "该范围") + "」的员工身份（授权编号 " + row.grantId + "）" : '授权编号为"' + grantIds + '"的员工身份'
  proxy.$modal.confirm("是否确认撤销" + who + "？撤销后该员工的小程序会话会立即失去员工身份。").then(function () {
    return revokeGrant(grantIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("撤销成功")
  }).catch(() => {})
}

getStoreOptions()
getAppUserOptions()
getList()
loadRoles()
onBeforeUnmount(() => { ++editorRequest; ++listRequest; ++userRequest; ++storeRequest })
</script>

<style scoped>
.grant-guide{margin:0 0 18px;line-height:1.7;color:var(--el-text-color-regular)}
.also-service-tag{margin-top:2px;font-size:12px;line-height:1.5;color:var(--el-color-warning-dark-2)}
.role-phase-hint{width:100%;margin-top:4px;font-size:12px;line-height:1.7;color:var(--el-color-danger)}
.also-service-hint{width:100%;font-size:12px;line-height:1.7;color:var(--el-text-color-secondary)}
.role-explanation__hint{margin:0 0 12px}
.role-explanation{margin:8px 0 0;padding:16px;background:var(--el-fill-color-light);border-radius:8px;overflow:auto}
.role-explanation__heading{display:flex;justify-content:space-between;gap:12px;margin-bottom:12px}.role-explanation__heading span,.role-explanation p{color:var(--el-text-color-secondary);font-size:12px;line-height:1.7}.permission-yes{color:var(--el-color-success)}.permission-part{color:var(--el-color-warning)}.permission-no{color:var(--el-text-color-placeholder)}
/* 账号列：昵称过长只截昵称，（ID …）不截断 */
.account-cell {
  display: flex;
  justify-content: center;
  white-space: nowrap;
}
.account-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.account-id {
  flex: none;
}
</style>
