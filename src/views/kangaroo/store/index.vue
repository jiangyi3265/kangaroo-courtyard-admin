<template>
   <div class="app-container">
      <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch">
         <el-form-item label="门店名称" prop="storeName">
            <el-input
               v-model="queryParams.storeName"
               placeholder="请输入门店名称"
               clearable
               style="width: 200px"
               @keyup.enter="handleQuery"
            />
         </el-form-item>
         <el-form-item label="城市" prop="city">
            <!-- 后端是 city = #{city} 精确匹配（不是 like），所以提示里写清楚要填全称 -->
            <el-input
               v-model="queryParams.city"
               placeholder="城市全称，精确匹配"
               clearable
               style="width: 200px"
               @keyup.enter="handleQuery"
            />
         </el-form-item>
         <el-form-item label="安心认证" prop="safeCert">
            <el-select v-model="queryParams.safeCert" placeholder="认证状态" clearable style="width: 200px">
               <el-option
                  v-for="item in safeCertOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
               />
            </el-select>
         </el-form-item>
         <el-form-item label="状态" prop="status">
            <el-select v-model="queryParams.status" placeholder="门店状态" clearable style="width: 200px">
               <el-option
                  v-for="dict in sys_normal_disable"
                  :key="dict.value"
                  :label="dict.label"
                  :value="dict.value"
               />
            </el-select>
         </el-form-item>
         <el-form-item label="创建时间" style="width: 308px">
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
               v-hasPermi="['kangaroo:store:add']"
            >新增</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button
               type="success"
               plain
               icon="Edit"
               :disabled="single"
               @click="handleUpdate"
               v-hasPermi="['kangaroo:store:edit']"
            >修改</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button
               type="danger"
               plain
               icon="Delete"
               :disabled="multiple"
               @click="handleDelete"
               v-hasPermi="['kangaroo:store:remove']"
            >删除</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button
               type="warning"
               plain
               icon="Download"
               @click="handleExport"
               v-hasPermi="['kangaroo:store:export']"
            >导出</el-button>
         </el-col>
         <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
      </el-row>

      <!-- 笔记本常见宽度（1366 / 1440）放不下全部列：门店名称、地址给足最小宽度（原先被挤到 80px，只剩两三个字），
           状态、认证排在前面，操作列固定在右侧（原先不固定，「认证 / 删除」要横向拖到最右才看得见） -->
      <el-table v-loading="loading" :data="storeList" @selection-change="handleSelectionChange">
         <el-table-column type="selection" width="50" align="center" />
         <el-table-column label="门店ID" align="center" prop="storeId" width="70" />
         <el-table-column label="门店名称" align="center" prop="storeName" min-width="160" :show-overflow-tooltip="true" />
         <el-table-column label="城市" align="center" prop="city" width="90" :show-overflow-tooltip="true" />
         <el-table-column label="详细地址" align="center" prop="address" min-width="180" :show-overflow-tooltip="true" />
         <el-table-column label="状态" align="center" prop="status" width="80">
            <template #default="scope">
               <dict-tag :options="sys_normal_disable" :value="scope.row.status" />
            </template>
         </el-table-column>
         <el-table-column label="安心认证" align="center" prop="safeCert" width="90">
            <template #default="scope">
               <!-- 库里没有 kg_safe_cert 字典，用 dict-tag 会走到它的兜底分支，所以直接出标签。
                    注：DictTag 的兜底分支已修复（未匹配的值会原样回显，不再变成 0），
                    这里继续写死标签只是为了把 0/1 翻译成"已认证/未认证"，不是在绕开组件 bug。 -->
               <el-tag v-if="scope.row.safeCert === '0'" type="success">已认证</el-tag>
               <el-tag v-else type="info">未认证</el-tag>
            </template>
         </el-table-column>
         <el-table-column label="运营类型" align="center" prop="opType" width="90">
            <template #default="scope">
               <dict-tag :options="kg_store_op_type" :value="scope.row.opType" />
            </template>
         </el-table-column>
         <el-table-column label="联系电话" align="center" prop="contactPhone" width="120" />
         <el-table-column label="综合评分" align="center" prop="rating" width="85">
            <template #default="scope">
               <!-- 评分由评价聚合，还没有评价时是 null，避免表格里出现空白格 -->
               <span>{{ scope.row.rating == null ? "-" : scope.row.rating }}</span>
            </template>
         </el-table-column>
         <el-table-column label="累计评价" align="center" prop="reviewCount" width="85">
            <template #default="scope">
               <span>{{ scope.row.reviewCount == null ? 0 : scope.row.reviewCount }}</span>
            </template>
         </el-table-column>
         <el-table-column label="创建时间" align="center" prop="createTime" width="140">
            <template #default="scope">
               <span>{{ parseTime(scope.row.createTime, '{y}-{m}-{d} {h}:{i}') }}</span>
            </template>
         </el-table-column>
         <el-table-column label="操作" :width="isMobile ? 190 : 400" align="center" fixed="right" class-name="small-padding fixed-width">
            <template #default="scope">
               <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['kangaroo:store:edit']">修改</el-button>
               <el-button link type="primary" icon="Document" @click="handleProfile(scope.row)" v-hasPermi="['kangaroo:store:edit']">门店资料 / 采访视频</el-button>
               <el-button link type="primary" icon="CircleCheck" @click="handleCert(scope.row)" v-hasPermi="['kangaroo:store:cert']">{{ scope.row.safeCert === "0" ? "撤销认证" : "认证" }}</el-button>
               <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['kangaroo:store:remove']">删除</el-button>
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

      <!-- 添加或修改门店对话框 -->
      <!-- 安心认证、综合评分、累计评价都不在表单里：
           认证只能走 /kangaroo/store/cert，评分与评价数由评价聚合，
           通用编辑接口会把这三个字段置空丢弃，放进表单会让人以为改生效了 -->
      <el-dialog :title="title" v-model="open" width="680px" append-to-body :before-close="closeStoreEditor" :close-on-click-modal="false" :close-on-press-escape="!storeSaving && !storeImagesUploading">
         <!-- 各字段的 maxlength 一律对齐 kg_store 的列长度（V1__kangaroo_core.sql）：
              超长的内容如果放行到后端，MyBatis 会把 "Data too long for column ..." 连同
              jar 内部路径和完整 SQL 一起弹给运营，既看不懂又泄露内部结构。
              联系电话是例外：列宽 20，但业务只收 11 位手机号，按业务口径收紧。 -->
         <el-form ref="storeRef" :model="form" :rules="rules" :disabled="storeSaving" label-width="90px" :label-position="isMobile ? 'top' : 'right'">
            <el-form-item label="门店名称" prop="storeName">
               <el-input v-model="form.storeName" placeholder="请输入门店名称" maxlength="64" show-word-limit />
            </el-form-item>
            <el-form-item label="城市" prop="city">
               <el-input v-model="form.city" placeholder="请输入城市" maxlength="32" />
            </el-form-item>
            <el-form-item label="详细地址" prop="address">
               <el-input v-model="form.address" placeholder="请输入详细地址" maxlength="255" show-word-limit />
            </el-form-item>
            <el-form-item label="联系电话" prop="contactPhone">
               <el-input v-model="form.contactPhone" placeholder="请输入11位手机号" maxlength="11" />
            </el-form-item>
            <el-form-item label="运营类型" prop="opType">
               <!-- 直营才由平台在线代收活动报名费；加盟 / 代运营 / 合作（2026-11-03 加，V70 字典）门店的收费活动走线下。选项读字典 kg_store_op_type，顺序 直营、加盟、代运营、合作 -->
               <el-select v-model="form.opType" placeholder="请选择运营类型" style="width: 100%">
                  <el-option v-for="d in kg_store_op_type" :key="d.value" :label="d.label" :value="d.value" />
               </el-select>
               <div class="el-form-item__tip">旅居价格：直营（自营）不加价、免平台服务费；合作、加盟、代运营按原规则加价5%。修改影响新报价，已下订单保持原价。</div>
            </el-form-item>
            <el-form-item label="地图定位">
               <place-location-input :latitude="form.latitude" :longitude="form.longitude" :address="form.address || ''" :city="form.city || ''" @change="Object.assign(form, $event)" />
            </el-form-item>
            <el-form-item label="门店图片" prop="images">
               <store-image-upload v-if="open" :key="storeSession" v-model="storeImages" :disabled="storeSaving" @busy="storeImagesUploading = $event" />
            </el-form-item>
            <el-form-item label="门店简介" prop="intro">
               <el-input v-model="form.intro" type="textarea" :rows="3" placeholder="请输入门店简介" maxlength="1000" show-word-limit />
            </el-form-item>
            <el-form-item label="状态" prop="status">
               <el-radio-group v-model="form.status">
                  <el-radio
                     v-for="dict in sys_normal_disable"
                     :key="dict.value"
                     :value="dict.value"
                  >{{ dict.label }}</el-radio>
               </el-radio-group>
            </el-form-item>
            <el-form-item label="备注" prop="remark">
               <el-input v-model="form.remark" type="textarea" placeholder="请输入内容" maxlength="500" show-word-limit />
            </el-form-item>
         </el-form>
         <template #footer>
            <div class="dialog-footer">
               <el-button type="primary" :loading="storeSaving" :disabled="storeImagesUploading" @click="submitForm">确 定</el-button>
               <el-button :disabled="storeSaving || storeImagesUploading" @click="cancel">取 消</el-button>
            </div>
         </template>
      </el-dialog>

      <!-- 门店资料：小程序「岗位详情」页（换宿旅行线下岗位）展示的采访视频、店长介绍、该店亮点、交通参考、营业执照、店里日常。
           没填的项小程序会先借用这家店小院的资料；保存走 /kangaroo/store/profile，不经过上面的通用修改接口 -->
      <el-dialog title="门店资料" v-model="profileOpen" width="980px" top="4vh" append-to-body :close-on-click-modal="false" :before-close="beforeProfileClose">
         <div v-loading="profileLoading" class="store-profile">
            <div class="store-profile__name">门店：{{ profile.storeName || "-" }}</div>
            <el-alert
               v-if="profileFallback.hasStay"
               type="info"
               :closable="false"
               show-icon
               :title="'没填的项，小程序会先用小院「' + (profileFallback.stayName || '') + '」的主理人 / 出行参考 / 生活碎片顶上'"
               class="store-profile__fallback"
            />
            <el-form :key="profileSession" ref="profileRef" :model="profile" :disabled="profileSaving" label-width="120px" :label-position="isMobile ? 'top' : 'right'">
               <display-material-checklist v-if="!profileLoading" :items="profileMaterials" @locate="focusDisplayField(profileRef?.$el, $event)" />
               <el-divider content-position="left">采访</el-divider>
               <el-form-item label="采访方式" data-display-field="interviewMode">
                  <el-radio-group v-model="profile.interviewMode">
                     <el-radio value="onsite">实地探访</el-radio>
                     <el-radio value="online">线上采访</el-radio>
                     <el-radio value="none">未采访</el-radio>
                  </el-radio-group>
                  <div v-if="videoHiddenByMode(profile.interviewMode, profile.interviewVideo)" class="store-profile__tip store-profile__warn">{{ VIDEO_HIDDEN_TEXT }}。</div>
                  <div class="store-profile__tip">
                     实地探访 = 袋鼠已去现场拍过，等同「安心商家认证」；这家店的岗位含保险时，小程序会挂「经袋鼠实地拍摄并含保险」角标。<br />
                     线上采访 = 袋鼠视频连线店长。选「未采访」时，小程序保留待补充区块，不显示已完成采访。<br />
                     改成或改掉「实地探访」会同时认证 / 撤销认证，需要有「认证」权限<span v-if="!canCert" class="store-profile__warn">（你的账号没有这个权限，改了会保存不上）</span>。
                  </div>
               </el-form-item>
               <el-form-item label="采访视频" data-display-field="interviewVideo">
                  <div class="store-profile__video">
                     <template v-if="videoUi.running">
                        <el-progress :percentage="videoUi.percent" :stroke-width="14" class="store-profile__progress" />
                        <div class="store-profile__tip">{{ videoUi.text }}</div>
                        <div><el-button icon="Close" @click="cancelVideoUpload">取消上传</el-button></div>
                     </template>
                     <template v-else>
                        <video
                           v-if="profile.interviewVideo"
                           :src="imageUrl(profile.interviewVideo)"
                           :poster="profile.interviewCover ? imageUrl(profile.interviewCover.split(',')[0]) : undefined"
                           controls
                           preload="metadata"
                           class="store-profile__player"
                        />
                        <div>
                           <el-button type="primary" plain icon="Upload" @click="pickVideo">{{ profile.interviewVideo ? "换一个视频" : "选择视频" }}</el-button>
                           <el-button v-if="profile.interviewVideo" icon="Delete" @click="removeVideo">去掉视频</el-button>
                           <span v-if="profile.interviewVideo && profile.interviewSeconds" class="store-profile__tip store-profile__inline">时长 {{ formatSeconds(profile.interviewSeconds) }}</span>
                        </div>
                     </template>
                     <div v-if="profileVideoDirty" class="store-profile__tip store-profile__warn">{{ VIDEO_UNSAVED_TEXT }}，点保存才生效。<template v-if="profile.interviewVideo && profile.interviewCover">{{ VIDEO_COVER_REMINDER }}。</template></div>
                     <div class="store-profile__tip">不限时长，文件不超过 300MB，格式 mp4 / mov。上传完点保存才生效。{{ VIDEO_SHARED_TEXT }}。{{ VIDEO_NOT_SHARED_TEXT }}。</div>
                     <input ref="videoInput" type="file" accept="video/mp4,video/quicktime,.mp4,.mov" style="display: none" @change="onVideoChosen" />
                  </div>
               </el-form-item>
               <el-form-item label="视频封面" data-display-field="interviewCover">
                  <image-upload v-model="profile.interviewCover" :limit="1" @busy="setProfileImageBusy('interviewCover', $event)" />
               </el-form-item>
               <el-form-item label="采访说明">
                  <el-input v-model="profile.interviewNote" :placeholder="'不填就显示：' + defaultNote" maxlength="100" show-word-limit />
               </el-form-item>

               <el-divider content-position="left">店长介绍</el-divider>
               <el-row :gutter="16">
                  <el-col :span="isMobile ? 24 : 12">
                     <el-form-item label="称呼" data-display-field="managerName">
                        <el-input v-model="profile.managerName" :placeholder="profileFallback.managerName ? '不填就用小院主理人「' + profileFallback.managerName + '」' : '如 小林'" maxlength="32" />
                     </el-form-item>
                  </el-col>
                  <el-col :span="isMobile ? 24 : 12">
                     <el-form-item label="在这里工作多久">
                        <el-input v-model="profile.managerYears" placeholder="如 3年" maxlength="32" />
                     </el-form-item>
                  </el-col>
               </el-row>
               <el-form-item label="头像" data-display-field="managerAvatar">
                  <image-upload v-model="profile.managerAvatar" :limit="1" @busy="setProfileImageBusy('managerAvatar', $event)" />
               </el-form-item>
               <el-form-item label="擅长">
                  <el-input v-model="profile.managerSkills" placeholder="如 带新人、做咖啡、规划周边游" maxlength="100" show-word-limit />
               </el-form-item>
               <el-form-item label="店长说" data-display-field="managerQuote">
                  <el-input v-model="profile.managerQuote" type="textarea" :rows="3" placeholder="店长想对来工作的人说的话" maxlength="200" show-word-limit />
               </el-form-item>

               <el-divider content-position="left">该店亮点</el-divider>
               <el-form-item label="亮点">
                  <el-switch v-model="profile.inheritFacilities" active-text="沿用小院设施" aria-label="沿用小院设施" />
                  <el-checkbox-group v-model="profileDisplayFacilities" :disabled="profile.inheritFacilities">
                     <el-checkbox v-for="opt in facilityOptions" :key="opt.code" :value="opt.code">{{ opt.label }}</el-checkbox>
                  </el-checkbox-group>
                  <div class="store-profile__tip">关闭沿用后，只展示勾选的亮点；全部取消则不展示任何已确认设施。</div>
                  <div v-if="profile.inheritFacilities" class="store-profile__tip">当前沿用：{{ fallbackFacilityText || '暂无小院设施' }}</div>
               </el-form-item>

               <el-divider content-position="left">交通参考</el-divider>
               <el-form-item label="高铁 / 火车" data-display-field="travelRail">
                  <el-input v-model="profile.travelRail" type="textarea" :rows="2" :placeholder="profileFallback.travelRail ? '不填就用小院的：' + profileFallback.travelRail : '如 大理站下车，打车约 20 分钟到店'" maxlength="500" show-word-limit />
               </el-form-item>
               <el-form-item label="机场" data-display-field="travelAirport">
                  <el-input v-model="profile.travelAirport" type="textarea" :rows="2" :placeholder="profileFallback.travelAirport ? '不填就用小院的：' + profileFallback.travelAirport : '如 大理机场打车约 40 分钟到店'" maxlength="500" show-word-limit />
               </el-form-item>
               <el-form-item label="预估最低出行成本">
                  <el-input v-model="profile.travelCost" placeholder="如 约37元起" maxlength="32" style="width: 240px; max-width: 100%" />
               </el-form-item>

               <el-divider content-position="left">资质与日常</el-divider>
               <el-form-item label="营业执照" data-display-field="licenseImage">
                  <image-upload v-model="profile.licenseImage" action="/kangaroo/store/profile/license/upload" :limit="1" @busy="setProfileImageBusy('licenseImage', $event)" />
                  <div class="store-profile__tip">上传后自动添加“仅用于袋鼠认证”水印，小程序展示带水印的营业执照。</div>
               </el-form-item>
               <el-form-item label="店里日常" data-display-field="dailyImages">
                  <image-upload v-model="profile.dailyImages" :limit="9" @busy="setProfileImageBusy('dailyImages', $event)" />
                  <div v-if="profileFallback.hasStay && profileFallback.dailyCount" class="store-profile__tip">一张都不传时，小程序用小院的 {{ Math.min(profileFallback.dailyCount, 6) }} 张生活碎片照片。</div>
               </el-form-item>
            </el-form>
         </div>
         <template #footer>
            <div class="dialog-footer">
               <el-button type="primary" :loading="profileSaving" :disabled="profileLoading" @click="submitProfile">保 存</el-button>
               <el-button @click="closeProfile">取 消</el-button>
            </div>
         </template>
      </el-dialog>
   </div>
</template>

<script setup name="KgStore">
import {
  listStore, getStore, addStore, updateStore, delStore, certStore, setStoreOpType,
  getStoreProfile, updateStoreProfile
} from "@/api/kangaroo/store"
import { useStoreInterviewVideo } from "@/composables/useStoreInterviewVideo"
import { VIDEO_COVER_REMINDER, VIDEO_HIDDEN_CONFIRM, VIDEO_HIDDEN_TEXT, VIDEO_NOT_SHARED_TEXT, VIDEO_SHARED_TEXT, VIDEO_UNSAVED_CONFIRM, VIDEO_UNSAVED_TEXT, interviewVideoBody, videoChanged, videoHiddenByMode } from "@/utils/interviewVideo"
import { parseStoreFocus } from "@/utils/merchantRequest"
import { imageUrl } from "@/utils/imageUrl"
import useAppStore from "@/store/modules/app"
import DisplayMaterialChecklist from '@/components/DisplayMaterialChecklist/index.vue'
import PlaceLocationInput from '@/components/PlaceLocationInput/index.vue'
import StoreImageUpload from '@/components/StoreImageUpload/index.vue'
import { storeDisplayMaterials, focusDisplayField } from '@/utils/displayMaterials'

const profileRef = ref()
const profileMaterials = computed(() => storeDisplayMaterials({ ...profile.value, fallback: profileFallback.value }))

const { proxy } = getCurrentInstance()
// 手机（宽度 < 992）：表单标签放到输入框上面、店长介绍两栏改一栏、操作列收窄（按钮在格子里换行）
const isMobile = computed(() => useAppStore().device === "mobile")
const { sys_normal_disable, kg_store_op_type } = proxy.useDict("sys_normal_disable", "kg_store_op_type")

// safe_cert 在库里没有对应字典，这里写死两个取值，保证和表格里的标签口径一致
const safeCertOptions = [
  { label: "已认证", value: "0" },
  { label: "未认证", value: "1" }
]

const storeList = ref([])
const open = ref(false)
const storeImages = ref([])
const storeImagesUploading = ref(false)
const storeSaving = ref(false)
const storeSession = ref(0)
const loading = ref(true)
const showSearch = ref(window.innerWidth > 768)  // 手机上搜索栏先收起，点右边放大镜再展开
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref("")
const dateRange = ref([])

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    storeName: undefined,
    city: undefined,
    safeCert: undefined,
    status: undefined
  },
  rules: {
    storeName: [{ required: true, message: "门店名称不能为空", trigger: "blur" }],
    city: [{ required: true, message: "城市不能为空", trigger: "blur" }],
    // 与后端 KgStoreServiceImpl.validate 的 ^1\d{10}$ 保持一致，前端不额外收紧，
    // 否则会出现后端能存、前端不让提交的割裂
    contactPhone: [{ pattern: /^1\d{10}$/, message: "联系电话须为11位手机号", trigger: "blur" }]
  }
})

const { queryParams, form, rules } = toRefs(data)

/** 查询门店列表 */
function getList() {
  loading.value = true
  listStore(proxy.addDateRange(queryParams.value, dateRange.value)).then(response => {
    storeList.value = response.rows
    total.value = response.total
  }).catch(() => {
    // 查询失败必须把上一次的结果清掉：留着旧数据和旧 total，
    // 运营会把它当成本次查询的结果。具体错误 request.js 已经弹过了。
    storeList.value = []
    total.value = 0
  }).finally(() => {
    // loading 收敛在 finally：无论成功、失败还是以后新增分支，遮罩都一定会关
    loading.value = false
  })
}

/** 取消按钮 */
function cancel() {
  if (storeEditorBusy()) return
  storeSession.value++
  open.value = false
  reset()
}

function storeEditorBusy() {
  if (!storeSaving.value && !storeImagesUploading.value) return false
  proxy.$modal.msgWarning(storeSaving.value ? '正在保存，请稍候' : '图片正在上传，请等待上传完成')
  return true
}

function closeStoreEditor(done) {
  if (storeEditorBusy()) return
  storeSession.value++
  done()
}

function readStoreImages(store) {
  let images = []
  try { images = Array.isArray(store.images) ? store.images : JSON.parse(store.images || '[]') } catch { /* 旧门店仅有封面 */ }
  if (!Array.isArray(images)) images = []
  images = images.filter(value => typeof value === 'string' && value.trim()).map(value => value.trim())
  return images.length ? images : (store.cover ? [store.cover] : [])
}

/** 表单重置 */
function reset() {
  storeImages.value = []
  storeImagesUploading.value = false
  form.value = {
    storeId: undefined,
    storeName: undefined,
    city: undefined,
    address: undefined,
    cover: undefined,
    intro: undefined,
    contactPhone: undefined,
    opType: "direct",
    latitude: undefined,
    longitude: undefined,
    status: "0",
    remark: undefined
  }
  proxy.resetForm("storeRef")
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
  ids.value = selection.map(item => item.storeId)
  single.value = selection.length != 1
  multiple.value = !selection.length
}

/** 新增按钮操作 */
function handleAdd() {
  if (storeEditorBusy()) return
  storeSession.value++
  reset()
  open.value = true
  title.value = "添加门店"
}

/** 修改按钮操作 */
function handleUpdate(row) {
  if (storeEditorBusy()) return
  const session = ++storeSession.value
  reset()
  const storeId = row.storeId || ids.value
  getStore(storeId).then(response => {
    if (session !== storeSession.value) return
    form.value = response.data
    storeImages.value = readStoreImages(response.data)
    open.value = true
    title.value = "修改门店"
  }).catch(() => {
    // 取详情失败就别打开对话框，否则运营会在一个空表单上编辑并提交出一条新门店
  })
}

/** 提交按钮 */
function submitForm() {
  if (storeEditorBusy()) return
  const session = storeSession.value
  proxy.$refs["storeRef"].validate(async valid => {
    if (!valid || !open.value || session !== storeSession.value || storeEditorBusy()) return
    storeSaving.value = true
    const payload = { ...form.value, images: JSON.stringify(storeImages.value), cover: storeImages.value[0] || '' }
    // 2026-11-03 主人：来源类型加「合作」。线上旧版门店保存接口只认 直营 / 加盟 / 代运营（带 partner 会报错），
    // 所以主表单不带 partner：改门店时不传这一项（不传就不动，原来已是合作的也不会被改掉），新门店先按直营建；
    // 保存成功后再单独调来源类型接口（setStoreOpType → PUT /kangaroo/store/{id}/op-type，只改这一列、不经过旧校验）改成合作
    const wantPartner = payload.opType === 'partner'
    const isUpdate = payload.storeId != undefined
    if (wantPartner) {
      if (isUpdate) delete payload.opType
      else payload.opType = 'direct'
    }
    try {
      let storeId = payload.storeId
      if (isUpdate) await updateStore(payload)
      else storeId = (await addStore(payload)).data
      if (wantPartner) {
        try { await setStoreOpType(storeId, 'partner') }
        catch {
          // 门店本身已经存好，只是来源类型没改成：说清楚该怎么补救（后端给的原因 request.js 已弹过）
          proxy.$modal.alertWarning(isUpdate ? '门店资料已保存，但来源类型没能改成「合作」，请再修改一次该门店。' : '门店已按「直营」新建，但来源类型没能改成「合作」，请在列表里修改该门店再选一次「合作」。')
        }
      }
      proxy.$modal.msgSuccess(isUpdate ? '修改成功' : '新增成功')
      open.value = false
      getList()
    } catch { /* request.js 已显示错误；保留图片及顺序以便重试 */ }
    finally { storeSaving.value = false }
  })
}

onBeforeUnmount(() => { storeSession.value++ })

/** 删除按钮操作 */
function handleDelete(row) {
  const storeIds = row.storeId || ids.value
  proxy.$modal.confirm('是否确认删除门店编号为"' + storeIds + '"的数据项？').then(function() {
    return delStore(storeIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

/** 安心认证 / 撤销认证 */
function handleCert(row) {
  // 当前未认证(safeCert != '0')就去认证，已认证就撤销
  const certified = row.safeCert !== "0"
  const text = certified ? "认证" : "撤销认证"
  proxy.$modal.confirm('是否确认' + text + '门店"' + row.storeName + '"？').then(function() {
    return certStore(row.storeId, certified)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess(text + "成功")
  }).catch(() => {})
}

/** 导出按钮操作 */
function handleExport() {
  proxy.download("kangaroo/store/export", {
    ...proxy.addDateRange(queryParams.value, dateRange.value)
  }, `store_${new Date().getTime()}.xlsx`)
}

/* ---------------- 门店资料（小程序岗位详情页） ---------------- */

// 采访说明不填时小程序显示的默认文字（和小程序 pages/jobs/detail.vue 保持一致）
const DEFAULT_NOTES = {
  onsite: "袋鼠工作人员线下实拍，店长讲清工作、食宿与真实氛围",
  online: "袋鼠工作人员视频连线店长，讲清工作、食宿与真实氛围"
}

const canCert = proxy.$auth.hasPermi("kangaroo:store:cert")
const profileOpen = ref(false)
const profileLoading = ref(false)
const profileSaving = ref(false)
const profileSession = ref(0)
const profileImageBusy = ref({})
const profileImagesUploading = computed(() => Object.values(profileImageBusy.value).some(Boolean))
function setProfileImageBusy(field, busy) {
  profileImageBusy.value[field] = busy
}
const profile = ref({})
const facilityOptions = ref([])
const profileFallback = ref({})
// 打开时的采访方式：保存时用来判断是否牵动了安心认证
const profileModeOrigin = ref("")
// 打开时的视频：判断「传完没保存」，以及视频没变时保存不带时长（见 interviewVideoBody）
const profileVideoOrigin = ref("")
const profileVideoDirty = computed(() => videoChanged(profileVideoOrigin.value, profile.value.interviewVideo))
const { videoInput, videoUi, pickVideo, removeVideo, onVideoChosen, cancelVideoUpload, formatSeconds } = useStoreInterviewVideo({ profile, profileOpen, proxy })

const defaultNote = computed(() => DEFAULT_NOTES[profile.value.interviewMode] || DEFAULT_NOTES.onsite)
const fallbackFacilityText = computed(() => {
  const codes = profileFallback.value.hasStay && Array.isArray(profileFallback.value.facilities) ? profileFallback.value.facilities : []
  return codes.map(c => (facilityOptions.value.find(o => o.code === c) || {}).label).filter(Boolean).join("、")
})

const profileDisplayFacilities = computed({
  get: () => profile.value.inheritFacilities ? (profileFallback.value.facilities || []) : profile.value.facilities,
  set: value => { profile.value.facilities = value }
})

function emptyProfile(row) {
  return {
    storeId: row.storeId,
    storeName: row.storeName,
    interviewMode: "none",
    interviewVideo: "",
    interviewCover: "",
    interviewSeconds: null,
    interviewNote: "",
    managerName: "",
    managerAvatar: "",
    managerYears: "",
    managerSkills: "",
    managerQuote: "",
    facilities: [],
    inheritFacilities: false,
    travelRail: "",
    travelAirport: "",
    travelCost: "",
    licenseImage: "",
    // image-upload 用逗号拼接的字符串，保存时再拆成数组
    dailyImages: ""
  }
}

/** 门店资料按钮 */
function handleProfile(row) {
  if (profileSaving.value || videoUi.running || profileImagesUploading.value) {
    proxy.$modal.msgWarning(profileSaving.value ? "门店资料正在保存，请稍候" : "资料还在上传，请先完成或取消上传")
    return
  }
  const session = ++profileSession.value
  cancelVideoUpload()
  profileImageBusy.value = {}
  profile.value = emptyProfile(row)
  profileModeOrigin.value = ""
  profileVideoOrigin.value = ""
  facilityOptions.value = []
  profileFallback.value = {}
  profileOpen.value = true
  profileLoading.value = true
  const storeId = row.storeId
  getStoreProfile(storeId).then(response => {
    // 等接口回来时运营可能已经关掉、换开了另一家店，旧结果直接丢掉
    if (!currentProfile(session, storeId)) return
    const d = response.data || {}
    const options = Array.isArray(d.facilityOptions) ? d.facilityOptions : []
    const mode = d.interviewMode === "onsite" || d.interviewMode === "online" ? d.interviewMode : "none"
    profile.value = {
      storeId: storeId,
      storeName: d.storeName || row.storeName,
      interviewMode: mode,
      interviewVideo: d.interviewVideo || "",
      interviewCover: d.interviewCover || "",
      interviewSeconds: d.interviewSeconds == null ? null : d.interviewSeconds,
      interviewNote: d.interviewNote || "",
      managerName: d.managerName || "",
      managerAvatar: d.managerAvatar || "",
      managerYears: d.managerYears || "",
      managerSkills: d.managerSkills || "",
      managerQuote: d.managerQuote || "",
      // 只留清单里有的代码：清单外的代码后端不收，留着会让整张表保存不上
      inheritFacilities: d.inheritFacilities === true,
      facilities: (Array.isArray(d.facilities) ? d.facilities : []).filter(c => options.some(o => o.code === c)),
      travelRail: d.travelRail || "",
      travelAirport: d.travelAirport || "",
      travelCost: d.travelCost || "",
      licenseImage: d.licenseImage || "",
      dailyImages: Array.isArray(d.dailyImages) ? d.dailyImages.filter(Boolean).join(",") : ""
    }
    profileModeOrigin.value = mode
    profileVideoOrigin.value = d.interviewVideo || ""
    facilityOptions.value = options
    profileFallback.value = d.fallback || {}
  }).catch(() => {
    // 取不到资料就关掉弹窗：在空表上点保存会把原有资料清空。具体错误 request.js 已经弹过
    if (currentProfile(session, storeId)) profileOpen.value = false
  }).finally(() => {
    if (profileSession.value === session) profileLoading.value = false
  })
}

function currentProfile(session, storeId) {
  return profileOpen.value && profileSession.value === session && profile.value.storeId === storeId
}

/** image-upload 给的是逗号拼接的路径：单张取第一张，多张拆成数组 */
function firstImage(value) {
  return String(value || "").split(",").map(s => s.trim()).filter(Boolean)[0] || ""
}
function imageList(value) {
  return String(value || "").split(",").map(s => s.trim()).filter(Boolean)
}

/** 保存门店资料 */
async function submitProfile() {
  if (profileSaving.value || profileLoading.value || !profileOpen.value) return
  if (profileImagesUploading.value) {
    proxy.$modal.msgWarning("图片还在上传，请传完后再保存")
    return
  }
  if (videoUi.running) {
    proxy.$modal.msgWarning("视频还在上传，等传完或取消后再保存")
    return
  }
  const p = profile.value
  const session = profileSession.value
  const mode = p.interviewMode === "none" ? "" : p.interviewMode
  const dailyImages = imageList(p.dailyImages)
  if (dailyImages.length > 9) {
    proxy.$modal.msgError("店里日常最多 9 张")
    return
  }
  const body = {
    interviewMode: mode,
    ...interviewVideoBody(profileVideoOrigin.value, p.interviewVideo, p.interviewSeconds),
    interviewCover: firstImage(p.interviewCover),
    interviewNote: (p.interviewNote || "").trim(),
    managerName: (p.managerName || "").trim(),
    managerAvatar: firstImage(p.managerAvatar),
    managerYears: (p.managerYears || "").trim(),
    managerSkills: (p.managerSkills || "").trim(),
    managerQuote: (p.managerQuote || "").trim(),
    facilities: p.facilities || [],
    inheritFacilities: p.inheritFacilities,
    travelRail: (p.travelRail || "").trim(),
    travelAirport: (p.travelAirport || "").trim(),
    travelCost: (p.travelCost || "").trim(),
    licenseImage: firstImage(p.licenseImage),
    dailyImages: dailyImages
  }
  const wasOnsite = profileModeOrigin.value === "onsite"
  const nowOnsite = mode === "onsite"
  // 从确认框开始锁定本次会话，避免保存 A 时关闭/切换到 B 后被 A 的迟到响应关闭。
  profileSaving.value = true
  try {
    if (wasOnsite !== nowOnsite) {
      await proxy.$modal.confirm(nowOnsite
        ? '改成「实地探访」会同时给门店"' + p.storeName + '"加上安心商家认证，确认保存？'
        : '改掉「实地探访」会同时撤销门店"' + p.storeName + '"的安心商家认证，确认保存？')
    }
    if (videoHiddenByMode(mode, p.interviewVideo)) await proxy.$modal.confirm(VIDEO_HIDDEN_CONFIRM)
    if (!currentProfile(session, p.storeId)) return
    await updateStoreProfile(p.storeId, body)
    if (currentProfile(session, p.storeId)) {
      proxy.$modal.msgSuccess("保存成功")
      profileOpen.value = false
    }
  } catch (_) {
    // 取消确认或保存失败（含没有认证权限）：后端的原因 request.js 已经弹出，弹窗保持打开
  } finally {
    if (profileSession.value === session) profileSaving.value = false
    // 采访方式会连带改安心认证，刷新列表里的认证状态。
    getList()
  }
}

/** 关闭前：视频还在传，或传完 / 去掉了还没保存，先问一句；确认后取消上传 */
function beforeProfileClose(done) {
  if (profileSaving.value) {
    proxy.$modal.msgWarning("门店资料正在保存，请稍候")
    return
  }
  if (profileImagesUploading.value) {
    proxy.$modal.msgWarning("图片还在上传，请传完后再关闭")
    return
  }
  const session = profileSession.value
  const storeId = profile.value.storeId
  const close = () => {
    if (!currentProfile(session, storeId)) return
    profileSession.value++
    profileLoading.value = false
    cancelVideoUpload()
    done()
  }
  if (!videoUi.running && !profileVideoDirty.value) {
    close()
    return
  }
  proxy.$modal.confirm(videoUi.running ? "视频还在上传，关掉会取消这次上传，确定关闭？" : VIDEO_UNSAVED_CONFIRM).then(() => {
    close()
  }).catch(() => {})
}

function closeProfile() {
  beforeProfileClose(() => {
    profileOpen.value = false
  })
}


getList()
// 从「商家入驻申请」点开通门店ID 过来：直接打开这家店补资料；打开后把地址栏参数清掉，再点同一家还能打开
const route = useRoute()
const router = useRouter()
function openStoreFromRoute() {
  const storeId = parseStoreFocus(route.query)
  if (storeId === null) return
  handleUpdate({ storeId })
  router.replace({ query: {} })
}
onMounted(openStoreFromRoute)
// 页面被标签页缓存时不会重新加载，换了链接要在这里接住
watch(() => route.fullPath, () => { if (route.name === 'KgStore') openStoreFromRoute() })
</script>

<style scoped lang="scss">
.store-profile {
  min-height: 200px;
}
.store-profile__name {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 10px;
}
.store-profile__fallback {
  margin-bottom: 8px;
}
.store-profile__tip {
  width: 100%;
  color: #909399;
  font-size: 12px;
  line-height: 1.7;
  margin-top: 4px;
}
.store-profile__inline {
  width: auto;
  margin-left: 10px;
}
.store-profile__warn {
  color: #e6a23c;
}
.store-profile__video {
  width: 100%;
}
.store-profile__player {
  display: block;
  width: 480px;
  max-width: 100%;
  max-height: 300px;
  background: #000;
  border-radius: 4px;
  margin-bottom: 8px;
}
.store-profile__progress {
  width: 420px;
  max-width: 100%;
}
</style>
