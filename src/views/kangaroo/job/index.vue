<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch">
      <el-form-item label="岗位标题" prop="title">
        <el-input
          v-model="queryParams.title"
          placeholder="请输入岗位标题"
          clearable
          style="width: 200px"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="所属门店" prop="storeId">
        <el-select v-model="queryParams.storeId" placeholder="全部门店" clearable style="width: 200px">
          <el-option
            v-for="store in storeOptions"
            :key="store.storeId"
            :label="store.storeName"
            :value="store.storeId"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="岗位分类" prop="jobType">
        <el-select v-model="queryParams.jobType" placeholder="全部分类" clearable style="width: 200px">
          <el-option
            v-for="dict in kg_job_type"
            :key="dict.value"
            :label="dict.label"
            :value="dict.value"
          />
        </el-select>
      </el-form-item>
      <!-- 换工类型：选项来自「系统管理 → 字典管理 → 换工类型」（kg_volunteer_kind），在那里改名、排序、停用 -->
      <el-form-item label="换工类型" prop="workKind">
        <el-select v-model="queryParams.workKind" placeholder="全部" clearable style="width: 160px">
          <el-option v-for="dict in kg_volunteer_kind" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="城市" prop="city">
        <el-input
          v-model="queryParams.city"
          placeholder="请输入城市"
          clearable
          style="width: 200px"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="岗位状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="全部状态" clearable style="width: 200px">
          <el-option
            v-for="dict in kg_job_status"
            :key="dict.value"
            :label="dict.label"
            :value="dict.value"
          />
        </el-select>
      </el-form-item>
      <!-- 后端的日期区间过滤的是 create_time（见 KgJobMapper.selectKgJobList），所以这里标"创建时间"而不是发布时间 -->
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
          v-hasPermi="['kangaroo:job:add']"
        >新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="success"
          plain
          icon="Edit"
          :disabled="single"
          @click="handleUpdate"
          v-hasPermi="['kangaroo:job:edit']"
        >修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="danger"
          plain
          icon="Delete"
          :disabled="multiple"
          @click="handleDelete"
          v-hasPermi="['kangaroo:job:remove']"
        >删除</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="warning"
          plain
          icon="Download"
          @click="handleExport"
          v-hasPermi="['kangaroo:job:export']"
        >导出</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
          type="info"
          plain
          icon="Refresh"
          @click="handleRecalc"
          v-hasPermi="['kangaroo:job:recalc']"
        >重算名额</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <!-- 笔记本常见宽度（1366 / 1440）放不下全部列：操作列固定在右侧，状态、分类、来源、名额排在前面，
         换工类型、城市、薪资、发布时间放后面（横向拖动可见）。原先操作列不固定、状态排在倒数，这两样都得拖到最右才看得见 -->
    <el-table v-loading="loading" :data="jobList" :row-class-name="jobRowClass" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="50" align="center" />
      <el-table-column label="岗位ID" align="center" prop="jobId" width="70" />
      <el-table-column label="岗位标题" align="center" prop="title" min-width="160" :show-overflow-tooltip="true" />
      <el-table-column label="门店名称" align="center" prop="storeName" min-width="120" :show-overflow-tooltip="true" />
      <el-table-column label="展示顺序" align="center" prop="sortNo" width="95" />
      <el-table-column label="紧急优先" align="center" width="100">
        <template #default="scope">
          <el-tag v-if="scope.row.urgentLevel > 0" type="danger">{{ ['无', '一般', '较急', '紧急', '特急'][scope.row.urgentLevel] || '加急' }}</el-tag>
          <span v-else>—</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" align="center" prop="status" width="90">
        <template #default="scope">
          <dict-tag :options="kg_job_status" :value="scope.row.status" />
        </template>
      </el-table-column>
      <el-table-column label="分类" align="center" prop="jobType" width="90">
        <template #default="scope">
          <dict-tag :options="kg_job_type" :value="scope.row.jobType" />
        </template>
      </el-table-column>
      <!-- 来源标签（平台录入 / 门店提交）本身 68px，加上格子左右各 12px 内边距要 92px：给 90 时每个标签后面都多出一个省略号 -->
      <el-table-column label="来源" align="center" prop="source" width="100">
        <template #default="scope">
          <el-tag :type="scope.row.source === 'staff' ? 'warning' : 'info'">{{ scope.row.source === 'staff' ? '门店提交' : '平台录入' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="剩余 / 总名额" align="center" prop="headcount" width="115">
        <template #default="scope">
          <span>{{ scope.row.remainingCount ?? Math.max(0, Number(scope.row.headcount || 0) - Number(scope.row.hiredCount || 0)) }} / {{ scope.row.headcount }}</span>
        </template>
      </el-table-column>
      <el-table-column label="累计报名" align="center" prop="appliedCount" width="85" />
      <el-table-column label="换工类型" align="center" prop="workKind" width="90">
        <template #default="scope">
          <dict-tag v-if="scope.row.workKind" :options="kg_volunteer_kind" :value="scope.row.workKind" />
          <span v-else>—</span>
        </template>
      </el-table-column>
      <el-table-column label="城市" align="center" prop="city" width="90" :show-overflow-tooltip="true" />
      <el-table-column label="薪资" align="center" prop="salaryMin" width="140" :show-overflow-tooltip="true">
        <template #default="scope">
          <span>{{ formatSalary(scope.row) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="发布时间" align="center" prop="publishTime" width="140">
        <template #default="scope">
          <span>{{ parseTime(scope.row.publishTime, '{y}-{m}-{d} {h}:{i}') }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="230" fixed="right" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['kangaroo:job:edit']">修改</el-button>
          <!-- 状态流转按钮按当前状态给：closed 是终态，不给任何入口 -->
          <el-button
            v-if="scope.row.status === 'draft' || scope.row.status === 'paused'"
            link
            type="primary"
            icon="Upload"
            @click="handleChangeStatus(scope.row, 'published')"
            v-hasPermi="['kangaroo:job:publish']"
          >发布</el-button>
          <el-button
            v-if="scope.row.status === 'published'"
            link
            type="warning"
            icon="VideoPause"
            @click="handleChangeStatus(scope.row, 'paused')"
            v-hasPermi="['kangaroo:job:publish']"
          >暂停</el-button>
          <el-button
            v-if="scope.row.status === 'published' || scope.row.status === 'paused'"
            link
            type="info"
            icon="CircleClose"
            @click="handleChangeStatus(scope.row, 'closed')"
            v-hasPermi="['kangaroo:job:publish']"
          >关闭</el-button>
          <!-- 2026-11-03 主人：线上任务的截止时间是预计完成时间，到期自动关闭后可以「继续开启」。后端只认到期关闭的（审核不通过、手动关闭的会说明原因拒绝） -->
          <el-button
            v-if="scope.row.status === 'closed' && scope.row.jobType === 'online'"
            link
            type="primary"
            icon="RefreshRight"
            @click="handleReopenOnline(scope.row)"
            v-hasPermi="['kangaroo:job:publish']"
          >继续开启</el-button>
          <!-- 门店提交的草稿：审核不通过 = draft→closed，必须填原因（后端写进给门店的通知和岗位备注）；
               原先只有一个确认框，门店只收到「如有疑问请联系平台运营」，不知道该改什么 -->
          <el-button
            v-if="scope.row.status === 'draft' && scope.row.source === 'staff'"
            link
            type="warning"
            icon="CircleClose"
            @click="handleReject(scope.row)"
            v-hasPermi="['kangaroo:job:publish']"
          >不通过</el-button>
          <!-- 非草稿行后端一定拒绝删除（发布过的岗位可能已被小程序侧收藏/分享），不给按钮免得点了才知道 -->
          <el-button
            v-if="scope.row.status === 'draft'"
            link
            type="danger"
            icon="Delete"
            @click="handleDelete(scope.row)"
            v-hasPermi="['kangaroo:job:remove']"
          >删除</el-button>
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

    <!-- 添加或修改岗位对话框 -->
    <!-- 各字段的 maxlength 一律对齐 kg_job 的列长度（V1__kangaroo_core.sql / V3__job_display_fields.sql）：
         超长内容放行到后端，MyBatis 会把 "Data too long for column ..." 连同 jar 内部路径
         和完整 SQL 一起弹给运营，既看不懂又泄露内部结构。
         工作内容 / 任职要求是 text 列（约 2 万汉字），不设上限，正常输入撑不满。 -->
    <el-dialog :title="title" v-model="open" width="800px" append-to-body :close-on-click-modal="false" :close-on-press-escape="!jobSaving" :show-close="!jobSaving" :before-close="beforeJobClose">
      <!-- 线上任务的佣金、截止时间以 kg_online_task 为准（结算单金额、能否提交成果都读它），岗位表只是展示：
           这里能改的只有单人佣金（后端同一事务写回扩展行），其余与结算相关的字段锁住，免得用户看到的和最后结算的对不上 -->
      <el-alert
        v-if="isOnline"
        type="warning"
        :closable="false"
        show-icon
        style="margin-bottom: 16px"
        title="线上任务：单人佣金保存后同步为结算金额，计薪方式固定为按单计佣；交付日期由截止时间生成，截止时间、交付物、验收标准不能在此修改。"
      />
      <!-- 采访视频在弹窗最底部，第一屏看不到：顶部给一个入口 -->
      <p v-if="!isOnline" class="job-video-jump">
        <template v-if="!form.storeId">采访视频属于门店资料：先选「发布管理门店」，弹窗底部才会出现。</template>
        <template v-else-if="canReadStoreProfile">采访视频属于门店资料，同店岗位共用，已上架也能换。<el-button link type="primary" @click="storeDisplayRef?.focusVideo()">{{ canEditStoreProfile ? '跳到采访视频（更换 / 上传）' : '跳到采访视频（查看）' }}</el-button></template>
        <template v-else>采访视频属于门店资料，当前账号没有门店查询权限，请找有门店权限的运营更换。</template>
      </p>
      <el-form :key="editVersion" :disabled="jobSaving" ref="jobRef" :model="form" :rules="rules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="发布管理门店" prop="storeId">
              <el-select v-model="form.storeId" :disabled="jobMediaUploading" filterable placeholder="请选择负责管理报名的门店" style="width: 100%" @change="storeChanged">
                <el-option
                  v-for="store in storeOptions"
                  :key="store.storeId"
                  :label="store.storeName"
                  :value="store.storeId"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="岗位分类" prop="jobType">
              <!-- 线上任务只能在「线上任务」页面新增（那里登记截止时间、交付物、验收标准和佣金），也不能与其他分类互改：
                   后端同样拒绝，这里提前禁用免得填完才报错 -->
              <el-select v-model="form.jobType" placeholder="请选择岗位分类" style="width: 100%" :disabled="onlineLocked || jobMediaUploading">
                <el-option
                  v-for="dict in kg_job_type"
                  :key="dict.value"
                  :label="dict.value === 'online' && !onlineLocked ? dict.label + '（请到「线上任务」页面新增）' : dict.label"
                  :value="dict.value"
                  :disabled="dict.value === 'online' && !onlineLocked"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="展示顺序" prop="sortNo">
              <el-input-number v-model="form.sortNo" :min="0" :max="9999" :precision="0" controls-position="right" />
              <div class="el-form-item__extra" style="width:100%;color:var(--el-text-color-secondary);font-size:12px;line-height:1.6;margin-top:6px">数值越小越靠前，同值按最新发布排序。同一筛选范围内，有效的紧急招募优先显示，截止后自动恢复普通顺序；不代表固定第几位。</div>
            </el-form-item>
          </el-col>
          <el-col :span="24">
        <recruit-store-picker v-if="!isOnline" v-model="form.recruitStoreId" :publisher-store-id="form.storeId" :options="storeOptions" :disabled="jobSaving || jobMediaUploading" @change="recruitStoreChanged" @created="storeOptions.push($event)" />
          </el-col>
          <!-- 编辑时改了所属门店：保存时后端会把报名一起转过去（合作店拆分就是这样做的），先说清楚会发生什么 -->
          <el-col :span="24" v-if="storeMoved">
            <el-alert
              type="warning"
              :closable="false"
              show-icon
              style="margin-bottom: 16px"
              :title="isOnline
                ? '改到新门店后，后续接单由新门店审核、验收和结算；还有没结算完的接单时不能改门店。发单方、城市和地点如果还是原门店的，已自动换成新门店的，保存前请再核对一下。'
                : '改到新门店后，这个岗位还没走完流程的报名会连同已约的面试时段、投保申请一起转到新门店处理，两边门店都会收到通知；已入职、已结束的报名留在原门店。工作地点和城市如果还是原门店的，已自动换成新门店的，保存前请再核对一下。'"
            />
          </el-col>
          <!-- 换工类型只对换工岗位有意义；改成其他分类保存时后端会自动清空。选项在「字典管理 → 换工类型」里维护 -->
          <el-col :span="12" v-if="form.jobType === 'volunteer'">
            <el-form-item label="换工类型" prop="workKind">
              <el-select v-model="form.workKind" placeholder="可不选（用户按类型筛选时用到）" clearable style="width: 100%">
                <el-option v-for="dict in kg_volunteer_kind" :key="dict.value" :label="dict.label" :value="dict.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <!-- 性别偏好（V48）只对换工换宿（多半是因为住女生 / 男生宿舍）：兼职、全职招聘不能写性别限制，保存时后端一律清空。
               小程序里用户筛「女」时，选了「女」和「男女不限」的岗位都会出来 -->
          <el-col :span="12" v-if="form.jobType === 'volunteer'">
            <el-form-item label="性别偏好" prop="genderPref">
              <el-select v-model="form.genderPref" :disabled="form.genderCountsEnabled" placeholder="男女不限" clearable style="width: 100%">
                <el-option v-for="o in GENDER_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="岗位标题" prop="title">
              <el-input v-model="form.title" placeholder="请输入岗位标题" maxlength="128" show-word-limit />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="城市" prop="city">
              <el-input v-model="form.city" placeholder="如：云南大理 / 不限" maxlength="32" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="工作地点" prop="address">
              <el-input v-model="form.address" placeholder="请输入工作地点" maxlength="255" show-word-limit />
            </el-form-item>
          </el-col>
          <!-- 岗位照片（V49）：最多 9 张，可拖动排序，第一张就是列表和详情头图的封面（保存时封面跟着改成第一张）；小程序详情顶部可以左右滑着看。
               门店在小程序里传的照片也在这里，运营可以替换或删掉 -->
          <el-col :span="24">
            <el-form-item label="岗位照片" prop="imageList" :required="!isOnline">
              <image-upload v-model="form.imageList" :disabled="jobSaving" :limit="9" :file-size="20" @busy="jobImagesUploading = $event" />
              <div style="width: 100%; color: #909399; font-size: 12px; line-height: 1.6">{{ isOnline ? '最多 9 张。' : '必填，至少上传 1 张、最多 9 张；未上传照片不能保存或上架。' }}拖动可以调顺序，第一张做封面。</div>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item v-if="isOnline" label="封面图" prop="cover">
              <el-input v-model="form.cover" :disabled="hasImages" :placeholder="hasImages ? '已传岗位照片：封面用第一张照片' : '没传照片时的封面地址，如 /static/media/jobs-vol-1.jpg'" maxlength="255" />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="计薪方式" prop="salaryType">
              <el-select v-model="form.salaryType" placeholder="请选择计薪方式" style="width: 100%" :disabled="isOnline" @change="salaryTypeChanged">
                <el-option
                  v-for="dict in kg_salary_type"
                  :key="dict.value"
                  :label="dict.value === 'none' ? '无底薪（可单独设奖金或提成）' : dict.label"
                  :value="dict.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="薪资单位" prop="salaryUnit">
              <el-input v-model="form.salaryUnit" placeholder="计薪周期自动匹配单位，计件可填元/篇等" maxlength="16" :readonly="!!SALARY_UNITS[form.salaryType]" :disabled="form.salaryType === 'none' || isOnline" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <!-- 线上任务这一格就是单人佣金：与发布时同一规则（1–5000 元、两位小数） -->
            <el-form-item :label="isOnline ? '单人佣金' : '薪资下限'" prop="salaryMin">
              <el-input-number v-model="form.salaryMin" :min="isOnline ? 1 : 0" :max="isOnline ? 5000 : Infinity" :precision="2" :disabled="form.salaryType === 'none'" style="width: 100%" @change="onlinePriceChanged" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <!-- 留空时后端按"固定薪资"补成与下限相同，不会出现没有上限的模糊展示；线上任务按单计佣只有一个价，上限跟随佣金 -->
            <el-form-item label="薪资上限" prop="salaryMax">
              <el-input-number v-model="form.salaryMax" :min="0" :precision="2" :disabled="form.salaryType === 'none' || isOnline" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="奖金与提成">
              <el-checkbox-group v-model="salaryExtras">
                <el-checkbox label="bonus">奖金</el-checkbox>
                <el-checkbox label="commission">提成</el-checkbox>
              </el-checkbox-group>
              <!-- 满月红包（V44）：勾了小程序岗位列表、详情显示「满月红包」标签，筛选页「更多」里能只看这类岗位；0 有 1 没有。
                   线上任务按单结算，没有「做满一个月」，不显示这个勾选框（后端保存时也一律存「没有」） -->
              <el-checkbox v-if="!isOnline" v-model="form.monthRedpacket" true-value="0" false-value="1" style="margin-left: 24px">做满一个月有红包</el-checkbox>
            </el-form-item>
          </el-col>
          <el-col v-if="salaryExtras.includes('bonus')" :span="24">
            <el-form-item label="奖金规则" prop="bonusDesc">
              <el-input v-model="form.bonusDesc" type="textarea" :rows="2" maxlength="120" show-word-limit placeholder="例如：每月绩效达标奖 500 元，随工资发放" />
            </el-form-item>
          </el-col>
          <el-col v-if="salaryExtras.includes('commission')" :span="24">
            <el-form-item label="提成规则" prop="commissionDesc">
              <el-input v-model="form.commissionDesc" type="textarea" :rows="2" maxlength="120" show-word-limit placeholder="例如：按个人销售额的 5% 提成，每月结算" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="结算方式" prop="settleDesc">
              <el-input v-model="form.settleDesc" placeholder="如：月结 · 次月5日前发放" maxlength="128" :disabled="form.salaryType === 'none'" />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="招聘名额" prop="headcount">
              <el-input-number v-model="form.headcount" :min="1" :max="form.jobType === 'volunteer' ? 99 : undefined" :disabled="form.jobType === 'volunteer' && form.genderCountsEnabled" style="width: 100%" />
              <div v-if="form.jobType === 'volunteer'" class="recruitment-tip">设置总招募人数。报名成功占用 1 个名额，撤回、拒绝或终止后释放；小程序显示剩余人数。</div>
            </el-form-item>
          </el-col>
          <el-col :span="24" v-if="form.jobType === 'volunteer'">
            <el-form-item label="男女招募人数">
              <el-switch v-model="form.genderCountsEnabled" active-text="分别设置" inactive-text="不分别设置" @change="toggleGenderCounts" />
              <div v-if="form.genderCountsEnabled" class="gender-count-inputs">
                <label>男生 <el-input-number v-model="form.genderMaleCount" :min="0" :max="99" :precision="0" @change="syncGenderCounts" /> 人</label>
                <label>女生 <el-input-number v-model="form.genderFemaleCount" :min="0" :max="99" :precision="0" @change="syncGenderCounts" /> 人</label>
                <div class="recruitment-tip">总人数自动合计，不招请填 0。这里设置招募计划；剩余名额仍按实际报名占位计算。</div>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="可开始日期" prop="startDate">
              <el-date-picker
                v-model="form.startDate"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="请选择可开始日期"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <!-- 小程序「最低在店时长」筛选：用户选「最少半个月」= 只看最短停留不超过 15 天的岗位；不填 = 不限 -->
            <el-form-item label="最短停留" prop="minDays">
              <el-input-number v-model="form.minDays" :min="1" :max="365" placeholder="天数，不填为不限" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="每日工时" prop="dailyHours">
              <!-- 还是自由文本：老岗位存的「弹性时间」「每天 10 小时」照实显示，不会被悄悄改掉；点开给的常用值只有 2、4、6、8 小时（和小程序发布表单同一组） -->
              <el-autocomplete v-model="form.dailyHours" :fetch-suggestions="dailyHourSuggestions" placeholder="如：每天 4 小时" maxlength="32" style="width: 100%" />
            </el-form-item>
          </el-col>
          <!-- 休息排班（V48）：线下岗位都能选；不选的岗位，用户在小程序按排班筛选时不会出现。线上任务没有排班 -->
          <el-col :span="12" v-if="!isOnline">
            <el-form-item label="休息排班" prop="restMode">
              <el-select v-model="form.restMode" placeholder="不填" clearable style="width: 100%">
                <el-option v-for="o in REST_MODE_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
              </el-select>
            </el-form-item>
          </el-col>

          <!-- 兼职旅行才排班：换工/全职的班次在合同或驻店说明里，在线兼职根本没有班次 -->
          <template v-if="form.jobType === 'parttime'">
            <el-col :span="12">
              <el-form-item label="排班方式" prop="shiftDesc">
                <el-input v-model="form.shiftDesc" placeholder="如：两班倒 · 做五休二" maxlength="128" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="排班时段" prop="shiftTime">
                <el-input v-model="form.shiftTime" placeholder="如：10:00-18:00" maxlength="32" />
              </el-form-item>
            </el-col>
          </template>

          <!-- 培训和试用期只对全职开放；兼职、全职共用详情页的福利字段。 -->
          <template v-if="form.jobType === 'fulltime'">
            <el-col :span="12">
              <el-form-item label="培训项目" prop="trainDesc">
                <el-input v-model="form.trainDesc" placeholder="如：岗前培训7天" maxlength="64" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="试用期" prop="probation">
                <el-input v-model="form.probation" placeholder="如：试用期1个月" maxlength="32" />
              </el-form-item>
            </el-col>
          </template>
          <el-col v-if="form.jobType === 'parttime' || form.jobType === 'fulltime'" :span="24">
            <el-form-item label="福利" prop="benefits">
              <el-input v-model="form.benefits" placeholder="多个福利用英文逗号分隔，如：包住,无押金,带薪年假" maxlength="255" show-word-limit />
              <div class="recruitment-tip">填写门店实际提供的福利，保存后展示在岗位详情的待遇卡；清空后不再展示。</div>
            </el-form-item>
          </el-col>

          <!-- 在线兼职按"交付"组织：没有到岗，只有交付周期与发单方 -->
          <template v-if="form.jobType === 'online'">
            <el-col :span="12">
              <!-- 由 kg_online_task.deadline_time 生成（如「10月5日 18:00 前」），后台没有改截止时间的入口；
                   手改只会让展示的交付日期和真正卡提交的截止时间对不上，后端也不接受这里的值 -->
              <el-form-item label="交付日期" prop="deliverDesc">
                <el-input v-model="form.deliverDesc" placeholder="由截止时间自动生成" maxlength="32" disabled />
                <div style="color: var(--el-text-color-secondary); font-size: 12px; line-height: 18px">由线上任务截止时间生成，不能在此修改</div>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="预计工时" prop="estHours">
                <el-input v-model="form.estHours" placeholder="如：2-3小时" maxlength="32" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="发单方" prop="publisherName">
                <el-input v-model="form.publisherName" placeholder="小程序列表展示的发单方名称" maxlength="64" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="是否远程" prop="remoteFlag">
                <el-radio-group v-model="form.remoteFlag">
                  <el-radio value="0">远程</el-radio>
                  <el-radio value="1">非远程</el-radio>
                </el-radio-group>
              </el-form-item>
            </el-col>
          </template>

          <el-col :span="12">
            <el-form-item label="食宿" prop="boardType">
              <el-select v-model="form.boardType" placeholder="请选择食宿" style="width: 100%">
                <el-option
                  v-for="dict in kg_board_type"
                  :key="dict.value"
                  :label="dict.label"
                  :value="dict.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="是否含保险" prop="insuranceFlag">
              <el-radio-group v-model="form.insuranceFlag">
                <el-radio value="0">含保险</el-radio>
                <el-radio value="1">不含保险</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <!-- 餐补（V66）：只要不包吃就出现（只包住、不包食宿），选填。金额 + 单位，用户端岗位详情显示 -->
          <el-col :span="12" v-if="hasMealAllowance">
            <el-form-item label="餐补" prop="mealAllowance">
              <div class="meal-allowance">
                <el-input v-model="form.mealAllowance" placeholder="选填，如：15" maxlength="8" />
                <el-select v-model="form.mealAllowanceUnit" aria-label="餐补单位">
                  <el-option v-for="o in MEAL_UNIT_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
                </el-select>
              </div>
            </el-form-item>
          </el-col>
          <!-- 住宿条件（V48）：只在包住时有意义（换工换宿，或食宿是包吃包住 / 包住宿），其余保存时后端一律清空；
               不选的岗位，用户在小程序按住宿条件筛选时不会出现 -->
          <el-col :span="12" v-if="hasHousing">
            <el-form-item label="住宿条件" prop="roomType">
              <el-select v-model="form.roomType" placeholder="不填" clearable style="width: 100%">
                <el-option v-for="o in ROOM_TYPE_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="食宿说明" prop="boardDesc">
              <el-input v-model="form.boardDesc" placeholder="如：包吃包住（独立宿舍 · Wi-Fi · 洗衣机）" maxlength="255" show-word-limit :disabled="form.boardType === 'none'" />
            </el-form-item>
          </el-col>
          <!-- 住宿照片和视频（V66）：包住才有（条件同住宿条件），都选填。用户端岗位详情的「住宿环境」显示；视频规则同小院视频（3 分钟、200MB） -->
          <template v-if="hasHousing">
            <el-col :span="24">
              <el-form-item label="住宿照片">
                <image-upload v-model="form.lodgingImageList" :disabled="jobSaving" :limit="9" :file-size="20" @busy="extrasBusy.lodgingImages = $event" />
                <div class="recruitment-tip">选填，最多 9 张，拖动可以调顺序。用户在岗位详情的「住宿环境」里看。</div>
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="住宿视频">
                <admin-video-upload v-if="open" :key="'lodging:' + (form.jobId || 'new')" v-model="form.lodgingVideo" kind="lodging" :active="open" :cover="form.lodgingVideoCover || ''" @busy="extrasBusy.lodgingVideo = $event" />
              </el-form-item>
            </el-col>
            <el-col v-if="form.lodgingVideo" :span="24">
              <el-form-item label="住宿视频封面">
                <image-upload v-model="form.lodgingVideoCover" :disabled="jobSaving" :limit="1" :file-size="20" @busy="extrasBusy.lodgingCover = $event" />
                <div class="recruitment-tip">选填，用户端视频卡片上显示的图。换了视频记得换封面。</div>
              </el-form-item>
            </el-col>
          </template>
          <!-- 宠物（V66）：只给换工。不选 = 没填，不挡保存；选「有」才能传照片，最多 6 张 -->
          <template v-if="form.jobType === 'volunteer'">
            <el-col :span="12">
              <el-form-item label="宠物">
                <el-select v-model="form.petStatus" placeholder="不填" clearable style="width: 100%">
                  <el-option v-for="o in PET_STATUS_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col v-if="form.petStatus === 'yes'" :span="24">
              <el-form-item label="宠物照片">
                <image-upload v-model="form.petImageList" :disabled="jobSaving" :limit="6" :file-size="20" @busy="extrasBusy.petImages = $event" />
                <div class="recruitment-tip">选填，最多 6 张。</div>
              </el-form-item>
            </el-col>
          </template>

          <el-col :span="24">
            <el-form-item label="标签" prop="tags">
              <el-input v-model="form.tags" placeholder="多个标签用英文逗号分隔，如：咖啡制作,店铺运营,接待顾客" maxlength="255" show-word-limit />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="工作内容" prop="content">
              <el-input v-model="form.content" type="textarea" :rows="3" placeholder="请输入工作内容" />
            </el-form-item>
          </el-col>
          <!-- 2026-11-03 主人：「年龄选择年龄段，在后台管理配置」「加一个性格」。年龄、性格从「袋鼠小院 → 岗位要求选项」里选，
               保存时和小程序发布一样写成要求的前两行（「年龄：18-30岁」「性格：活泼开朗、善于沟通」），下面框里只放其他要求。
               老岗位手写的年龄（不在选项里）照样显示在框里，原样保存 -->
          <el-col :span="12" v-if="!isOnline">
            <el-form-item label="年龄" prop="reqAge">
              <el-select v-model="form.reqAge" placeholder="不限" clearable style="width: 100%">
                <el-option v-for="a in ageOptions" :key="a" :label="a" :value="a" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12" v-if="!isOnline">
            <el-form-item label="性格" prop="reqPersonality">
              <el-select v-model="form.reqPersonality" multiple :multiple-limit="REQ_PERSONALITY_MAX" placeholder="可不选，最多 3 个" clearable style="width: 100%">
                <el-option v-for="p in personalityOptions" :key="p" :label="p" :value="p" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item :label="isOnline ? '任职要求' : '其他要求'" prop="requirement">
              <el-input v-model="form.requirement" type="textarea" :rows="3" :placeholder="isOnline ? '请输入任职要求' : '一行写一条，如：能待满一个月（年龄、性格在上面选）'" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注" prop="remark">
              <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="请输入内容" maxlength="500" show-word-limit />
            </el-form-item>
          </el-col>
        </el-row>
        <store-display-settings v-if="open && !isOnline && form.storeId" :key="form.recruitStoreId || form.storeId" ref="storeDisplayRef" :store-id="form.recruitStoreId || form.storeId" :busy="jobSaving" @busy="sharedMediaUploading = $event" />
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" :loading="jobSaving" :disabled="jobMediaUploading" @click="submitForm">确 定</el-button>
          <el-button :disabled="jobSaving" @click="cancel">取 消</el-button>
        </div>
      </template>
    </el-dialog>
    <el-dialog v-model="publishOpen" title="上架前确认采访与门店亮点" width="780px" append-to-body destroy-on-close :close-on-click-modal="false" :close-on-press-escape="!publishing" :show-close="!publishing" :before-close="beforePublishClose">
      <p>即将上架：{{ publishRow?.title }}</p>
      <el-form v-if="publishOpen && publishRow?.storeId">
        <store-display-settings ref="publishDisplayRef" :key="publishRow.recruitStoreId || publishRow.storeId" :store-id="publishRow.recruitStoreId || publishRow.storeId" :busy="publishing" save-label="「保存配置并上架」" @busy="publishMediaUploading = $event" />
      </el-form>
      <template #footer>
        <el-button :disabled="publishing" @click="closePublish">取消</el-button>
        <el-button type="primary" :loading="publishing" :disabled="publishMediaUploading" @click="confirmPublish">保存配置并上架</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="KgJob">
import StoreDisplaySettings from './StoreDisplaySettings.vue'
import RecruitStorePicker from './RecruitStorePicker.vue'
import AdminVideoUpload from '@/components/AdminVideoUpload/index.vue'
const storeDisplayRef = ref(null)
const publishDisplayRef = ref(null)
const jobSaving = ref(false)
const editVersion = ref(0)
const jobImagesUploading = ref(false)
const sharedMediaUploading = ref(false)
const publishMediaUploading = ref(false)
// 住宿照片、住宿视频、视频封面、宠物照片（V66）：哪个还在传都不能保存或关闭
const extrasBusy = reactive({})
const jobMediaUploading = computed(() => jobImagesUploading.value || sharedMediaUploading.value || Object.values(extrasBusy).some(Boolean))
const publishOpen = ref(false)
const publishing = ref(false)
const publishRow = ref(null)
import { listJob, getJob, addJob, updateJob, delJob, changeJobStatus, listStoreOptions, recalcJobCounters, reopenOnlineTask } from "@/api/kangaroo/job"
import { parseJobFocus } from "@/utils/merchantRequest"
import { VIDEO_UNSAVED_CONFIRM, videoChanged } from "@/utils/interviewVideo"
import { revealFirstFormError } from "@/utils/formErrors"

const { proxy } = getCurrentInstance()
const canReadStoreProfile = proxy.$auth.hasPermi('kangaroo:store:query')
const canEditStoreProfile = proxy.$auth.hasPermi('kangaroo:store:edit')
const { kg_job_type, kg_job_status, kg_salary_type, kg_board_type, kg_volunteer_kind, kg_job_age, kg_job_personality } = proxy.useDict("kg_job_type", "kg_job_status", "kg_salary_type", "kg_board_type", "kg_volunteer_kind", "kg_job_age", "kg_job_personality")
// 年龄、性格（V67，2026-11-03）：选项在「袋鼠小院 → 岗位要求选项」里维护（字典 kg_job_age / kg_job_personality，只列启用的）。
// 「不限」= 不写年龄这一行，所以不放进下拉（清空就是不限）；岗位上原来的值不在选项里（老岗位手写的、后来停用的）也列出来，免得打开就显示成一串看不懂的值
const REQ_PERSONALITY_MAX = 3
const REQ_LINE = /^(年龄|性格)[：:]\s*(.*)$/
const dictLabels = list => (Array.isArray(list) ? list : []).map(d => String(d.label || '').trim()).filter(Boolean)
const ageOptions = computed(() => {
  const list = dictLabels(kg_job_age?.value).filter(a => a !== '不限')
  const now = form.value.reqAge
  return now && !list.includes(now) ? list.concat(now) : list
})
const personalityOptions = computed(() => {
  const list = dictLabels(kg_job_personality?.value)
  return list.concat((form.value.reqPersonality || []).filter(p => !list.includes(p)))
})
/** 岗位「要求」→ 年龄、性格、其他要求（和小程序 pages/staff/request-view.js 拆的一样：只认「年龄：」「性格：」开头的行，各取第一行） */
function splitRequirement(text) {
  let age = '', personality = null
  const rest = []
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim()
    const m = REQ_LINE.exec(line)
    if (m && m[1] === '年龄' && !age) age = m[2].trim()
    else if (m && m[1] === '性格' && !personality) personality = m[2].split(/[、,，]/).map(s => s.trim()).filter(Boolean)
    else if (line) rest.push(line)
  }
  return { age: age === '不限' ? '' : age, personality: personality || [], rest: rest.join('\n') }
}
/** 反过来合成：年龄、性格各一行放在最前面，后面是其他要求（和小程序 pages/staff/jobs.vue requirementText 同一个顺序） */
function joinRequirement(age, personality, rest) {
  const lines = []
  if (String(age || '').trim()) lines.push('年龄：' + String(age).trim())
  const picks = (personality || []).map(p => String(p).trim()).filter(Boolean)
  if (picks.length) lines.push('性格：' + picks.join('、'))
  for (const line of String(rest || '').split(/\r?\n/)) if (line.trim()) lines.push(line.trim())
  return lines.join('\n')
}
const SALARY_UNITS = { hourly: '元/小时', daily: '元/天', weekly: '元/周', monthly: '元/月' }
// 岗位筛选条件（V48，和后端 JobFilterFields 同一套取值）：门店选填，空 = 没填
const GENDER_OPTIONS = [{ value: 'F', label: '女' }, { value: 'M', label: '男' }]
const REST_MODE_OPTIONS = [
  { value: '1-1', label: '做一休一' }, { value: '4-3', label: '做四休三' }, { value: '2-1', label: '做二休一' }, { value: '5-2', label: '做五休二' },
  { value: '3-2', label: '做三休二' }, { value: '3-1', label: '做三休一' }, { value: '6-1', label: '做六休一' }
]
/** 岗位照片（V49）：库里存 JSON 数组；后台图片上传组件用逗号分隔的路径。老数据是空串，也认逗号分隔的写法 */
function imagesToText(v) {
  const s = String(v || "").trim()
  if (!s) return ""
  if (s.startsWith("[")) {
    try { return JSON.parse(s).filter(x => typeof x === "string" && x).join(",") } catch (e) { return "" }
  }
  return s
}
function textToImages(v) {
  return [...new Set(String(v || "").split(",").map(x => x.trim()).filter(Boolean))]
}
const hasImages = computed(() => textToImages(form.value.imageList).length > 0)
const ROOM_TYPE_OPTIONS = [{ value: 'single', label: '单人间' }, { value: 'double', label: '双人间' }, { value: 'triple', label: '三人间' }, { value: 'multi', label: '多人间' }]
// 餐补单位（V66，和后端 JobExtras 同一套取值）
const MEAL_UNIT_OPTIONS = [{ value: 'day', label: '元/天' }, { value: 'month', label: '元/月' }]
// 宠物（V66）：空 = 没填
const PET_STATUS_OPTIONS = [{ value: 'none', label: '没有' }, { value: 'yes', label: '有' }]
// 每日工时的常用值：主人定的四档，不再有 10 小时和弹性。写法和小程序发布表单提交的一样
const DAILY_HOUR_OPTIONS = ['每天 2 小时', '每天 4 小时', '每天 6 小时', '每天 8 小时']
/** 不管框里现在写的什么都给全部四个：老值「每天 10 小时」按字面匹配会一个都不出，就没法点选了 */
function dailyHourSuggestions(_text, callback) {
  callback(DAILY_HOUR_OPTIONS.map(value => ({ value })))
}
/** 有没有餐补：只要不包吃就有（只包住、不包食宿），线上任务没有。和后端 JobExtras.mealShown 同一条规则 */
const hasMealAllowance = computed(() => {
  const board = form.value.boardType || ''
  return form.value.jobType !== 'online' && (board === '' || board === 'room' || board === 'none')
})
/** 包不包住：换工换宿本来就换住宿；兼职、全职看食宿（包吃包住 / 包住宿）；线上任务不到店 */
const hasHousing = computed(() => form.value.jobType === 'volunteer'
  || (form.value.jobType !== 'online' && (form.value.boardType === 'all' || form.value.boardType === 'room')))
const salaryExtras = ref([])
function salaryTypeChanged(type) {
  form.value.salaryUnit = SALARY_UNITS[type] || undefined
}
// 正在编辑的是线上任务（打开时库里就是 online）：分类锁死，佣金 / 交付日期按线上任务规则处理。
// 新增或编辑其他岗位时 online 选项禁用，所以 isOnline 只会在编辑线上任务时为真
const onlineLocked = ref(false)
const isOnline = computed(() => form.value.jobType === 'online')
// 打开编辑时岗位原来的门店：改成别的门店时在表单里提示报名会一起转过去
const originStoreId = ref(null)
const storeMoved = computed(() => form.value.jobId != undefined && originStoreId.value != null
  && form.value.storeId != null && String(form.value.storeId) !== String(originStoreId.value))
// 换门店前选中的门店：工作地点 / 城市还是它的（多半是建岗位时照抄的），就跟着换成新门店的；运营自己改过的不动
const lastStoreId = ref(null)
function storeChanged(storeId) {
  const find = id => storeOptions.value.find(s => String(s.storeId) === String(id))
  const from = find(lastStoreId.value), to = find(storeId)
  lastStoreId.value = storeId
  if (form.value.recruitStoreId) return
  if (!to) return
  const same = (v, old) => !v || (old != null && String(v).trim() === String(old).trim())
  if (to.address && same(form.value.address, from && from.address)) form.value.address = to.address
  if (to.city && same(form.value.city, from && from.city)) form.value.city = to.city
  // 线上任务的「发单方」还写着原门店的名字时也一起换（小程序线上任务卡片按它显示是哪家店发的）；
  // 空着的不补：留空时小程序本来就显示岗位所属门店的名字
  const pub = String(form.value.publisherName || '').trim()
  if (pub && from && to.storeName && pub === String(from.storeName || '').trim()) form.value.publisherName = to.storeName
}
function recruitStoreChanged(id) {
  const store = storeOptions.value.find(s => String(s.storeId) === String(id || form.value.storeId))
  if (!store) return
  // 仅空白地点自动补入；已经填写的真实工作地址保留，避免代招时覆盖。
  if (!form.value.city) form.value.city = store.city
  if (!form.value.address) form.value.address = store.address
}
/** 线上任务按单计佣只有一个价，上限跟着佣金走（后端要求上下限相同） */
function onlinePriceChanged(v) {
  if (isOnline.value) form.value.salaryMax = v
}

const jobList = ref([])
const storeOptions = ref([])
const open = ref(false)
let listRequest = 0
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
    title: undefined,
    storeId: undefined,
    jobType: undefined,
    workKind: undefined,
    city: undefined,
    status: undefined
  },
  rules: {
    imageList: [{
      validator: (rule, value, callback) => {
        if (form.value.jobType !== 'online' && !textToImages(value).length) callback(new Error('请至少上传 1 张岗位照片'))
        else callback()
      },
      trigger: 'change'
    }],
    // 餐补（V66）：选填，有金额时和后端 JobExtras.amount 同一条规则，免得点了确定才弹错
    mealAllowance: [{
      validator: (rule, value, callback) => {
        const text = String(value ?? "").trim()
        if (text && !/^\d{1,5}(\.\d{1,2})?$/.test(text)) callback(new Error("餐补金额要是数字，最多两位小数，不超过 99999"))
        else if (text && !(Number(text) > 0)) callback(new Error("餐补金额要大于 0"))
        else callback()
      },
      trigger: "blur"
    }],
    storeId: [{ required: true, message: "所属门店不能为空", trigger: "change" }],
    jobType: [{ required: true, message: "岗位分类不能为空", trigger: "change" }],
    title: [{ required: true, message: "岗位标题不能为空", trigger: "blur" }],
    city: [{ required: true, message: "城市不能为空", trigger: "blur" }],
    headcount: [{ required: true, message: "招聘名额至少为 1", trigger: "blur" }],
    // 与后端 KgJobServiceImpl.validate 保持一致：只要不是"无薪资"，下限必填且不能高于上限
    salaryMin: [{
      validator: (rule, value, callback) => {
        const empty = value === undefined || value === null || value === ""
        // 线上任务的佣金规则与「线上任务」页发布时一致（KgOnlineTaskService.commissionFen）
        if (form.value.jobType === "online" && (empty || Number(value) < 1 || Number(value) > 5000)) {
          callback(new Error("单人佣金 1–5000 元"))
        } else if (form.value.salaryType && form.value.salaryType !== "none" && empty) {
          callback(new Error("选择了计薪方式时薪资下限不能为空"))
        } else {
          callback()
        }
      },
      trigger: "blur"
    }],
    salaryMax: [{
      validator: (rule, value, callback) => {
        if (form.value.jobType !== "online" && value !== undefined && value !== null && value !== "" && form.value.salaryMin != null && value < form.value.salaryMin) {
          callback(new Error("薪资上限不能低于薪资下限"))
        } else {
          callback()
        }
      },
      trigger: "blur"
    }]
  }
})

const { queryParams, form, rules } = toRefs(data)
for (const [key, label] of [['bonus', '奖金'], ['commission', '提成']]) {
  rules.value[key + 'Desc'] = [{ validator: (_rule, value, callback) => {
    if (salaryExtras.value.includes(key) && !String(value || '').trim()) return callback(new Error('请填写' + label + '规则'))
    if (String(value || '').trim().length > 120) return callback(new Error(label + '规则不能超过 120 字'))
    callback()
  }, trigger: 'blur' }]
}

/** 拼薪资区间展示。上下限相同时只显示一个数，避免出现"150-150元/天" */
function formatSalary(row) {
  const supplements = [row.bonusDesc ? '奖金' : '', row.commissionDesc ? '提成' : ''].filter(Boolean)
  if (!row.salaryType || row.salaryType === "none" || row.salaryMin == null) {
    return supplements.join(' + ') || '无薪资'
  }
  const unit = row.salaryUnit || ""
  const extras = (row.bonusDesc ? ' + 奖金' : '') + (row.commissionDesc ? ' + 提成' : '')
  if (row.salaryMax == null || Number(row.salaryMax) === Number(row.salaryMin)) {
    return row.salaryMin + unit + extras
  }
  return row.salaryMin + "-" + row.salaryMax + unit + extras
}

/** 查询岗位列表 */
function getList() {
  const request = ++listRequest
  loading.value = true
  listJob(proxy.addDateRange(queryParams.value, dateRange.value)).then(response => {
    if (request !== listRequest) return
    jobList.value = response.rows
    total.value = response.total
  }).catch(() => {
    if (request !== listRequest) return
    // 查询失败必须把上一次的结果清掉：留着旧数据和旧 total，
    // 运营会把它当成本次查询的结果。具体错误 request.js 已经弹过了。
    jobList.value = []
    total.value = 0
  }).finally(() => {
    // loading 收敛在 finally：无论成功、失败还是以后新增分支，遮罩都一定会关
    if (request === listRequest) loading.value = false
  })
}

/** 查询门店下拉选项 */
function getStoreOptions() {
  listStoreOptions().then(response => {
    storeOptions.value = response.rows
  }).catch(() => {
    // 只有 kangaroo:job:* 权限、没有 kangaroo:store:list 的运营也会进这个页面，
    // 门店下拉拉不到时让列表照常可看（门店名后端已 join 好），不要弹一个他们无能为力的报错
    storeOptions.value = []
  })
}

// 住宿视频（V66）：打开弹窗时库里的值。它跟岗位一起保存，传完没点确定就关，这次改动不生效
const lodgingVideoOrigin = ref("")
function hasUnsavedLodgingVideo() {
  return open.value && hasHousing.value && videoChanged(lodgingVideoOrigin.value, form.value.lodgingVideo)
}

/** 视频传完没保存就关弹窗：问一句。isLeavable 在确认后再查一次，弹框期间状态可能变了 */
async function confirmUnsavedVideo(display, isLeavable) {
  if (!display?.hasUnsavedVideo?.() && !(display === storeDisplayRef.value && hasUnsavedLodgingVideo())) return true
  try {
    await proxy.$modal.confirm(VIDEO_UNSAVED_CONFIRM)
  } catch (_) {
    return false
  }
  return isLeavable()
}

/** 取消按钮 */
async function cancel() {
  if (!canLeaveJob() || !(await confirmUnsavedVideo(storeDisplayRef.value, canLeaveJob))) return
  open.value = false
  reset()
}
function canLeaveJob() {
  if (jobSaving.value) return false
  if (jobMediaUploading.value || storeDisplayRef.value?.hasPendingMedia?.()) {
    proxy.$modal.msgWarning('图片或视频正在上传，请完成或取消上传后再操作')
    return false
  }
  return true
}
async function beforeJobClose(done) {
  if (!canLeaveJob() || !(await confirmUnsavedVideo(storeDisplayRef.value, canLeaveJob))) return
  open.value = false
  reset()
  done()
}
function canLeavePublish() {
  if (publishing.value) return false
  if (publishMediaUploading.value || publishDisplayRef.value?.hasPendingMedia?.()) {
    proxy.$modal.msgWarning('图片或视频正在上传，请完成或取消上传后再操作')
    return false
  }
  return true
}
async function closePublish() {
  if (canLeavePublish() && await confirmUnsavedVideo(publishDisplayRef.value, canLeavePublish)) publishOpen.value = false
}
async function beforePublishClose(done) {
  if (canLeavePublish() && await confirmUnsavedVideo(publishDisplayRef.value, canLeavePublish)) { publishOpen.value = false; done() }
}

/** 表单重置 */
function reset() {
  editVersion.value++
  salaryExtras.value = []
  onlineLocked.value = false
  originStoreId.value = null
  lastStoreId.value = null
  lodgingVideoOrigin.value = ""
  form.value = {
    jobId: undefined,
    sortNo: 100,
    storeId: undefined,
    recruitStoreId: null,
    jobType: undefined,
    workKind: "",
    title: undefined,
    cover: undefined,
    images: "",
    imageList: "",
    city: undefined,
    address: undefined,
    salaryType: "none",
    salaryMin: undefined,
    salaryMax: undefined,
    salaryUnit: undefined,
    bonusDesc: undefined,
    commissionDesc: undefined,
    settleDesc: undefined,
    startDate: undefined,
    minDays: undefined,
    dailyHours: undefined,
    shiftDesc: undefined,
    shiftTime: undefined,
    boardType: "none",
    boardDesc: undefined,
    genderPref: "", genderCountsEnabled: false, genderMaleCount: null, genderFemaleCount: null,
    restMode: "",
    roomType: "",
    mealAllowance: "",
    mealAllowanceUnit: "day",
    petStatus: "",
    petImageList: "",
    lodgingImageList: "",
    lodgingVideo: "",
    lodgingVideoCover: "",
    insuranceFlag: "1",
    monthRedpacket: "1",
    headcount: 1,
    tags: undefined,
    content: undefined,
    requirement: undefined,
    reqAge: "",
    reqPersonality: [],
    trainDesc: undefined,
    probation: undefined,
    benefits: undefined,
    deliverDesc: undefined,
    estHours: undefined,
    remoteFlag: "1",
    publisherName: undefined,
    remark: undefined
  }
  proxy.resetForm("jobRef")
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
  // 从「商家需求」跳来时筛选项是表单初始化前填的，resetForm 会把它们当初始值还原，这里手动清掉
  queryParams.value.storeId = undefined
  queryParams.value.jobType = undefined
  focusJobId.value = null
  if (route.query.jobId) router.replace({ query: {} })
  handleQuery()
}

/** 多选框选中数据 */
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.jobId)
  single.value = selection.length != 1
  multiple.value = !selection.length
}

/** 新增按钮操作 */
function handleAdd() {
  if (!canLeaveJob()) return
  reset()
  open.value = true
  title.value = "添加岗位"
}

/** 修改按钮操作 */
function handleUpdate(row) {
  if (!canLeaveJob()) return
  reset()
  const version = editVersion.value
  const jobId = row.jobId || ids.value
  getJob(jobId).then(response => {
    if (version !== editVersion.value) return
    form.value = response.data
    form.value.sortNo = response.data.sortNo ?? 100
    form.value.genderCountsEnabled = form.value.jobType === "volunteer" && form.value.genderMaleCount != null && form.value.genderFemaleCount != null
    // 岗位照片（V49）：库里是 JSON 数组，图片上传组件要逗号分隔的路径
    form.value.imageList = imagesToText(form.value.images)
    // 餐补、宠物、住宿（V66）：没填过的是 null，统一成空串；两组照片和岗位照片一样，库里是 JSON 数组，上传组件要逗号分隔
    form.value.mealAllowance = form.value.mealAllowance || ""
    form.value.mealAllowanceUnit = form.value.mealAllowanceUnit || "day"
    form.value.petStatus = form.value.petStatus || ""
    form.value.petImageList = imagesToText(form.value.petImages)
    form.value.lodgingImageList = imagesToText(form.value.lodgingImages)
    form.value.lodgingVideo = form.value.lodgingVideo || ""
    form.value.lodgingVideoCover = form.value.lodgingVideoCover || ""
    lodgingVideoOrigin.value = form.value.lodgingVideo
    // 年龄、性格（V67）：从要求里拆出来放进两个下拉框，框里只留其他要求；线上任务没有这两项，原样不拆
    const req = form.value.jobType === "online" ? { age: "", personality: [], rest: form.value.requirement || "" } : splitRequirement(form.value.requirement)
    form.value.reqAge = req.age
    form.value.reqPersonality = req.personality
    form.value.requirement = req.rest
    originStoreId.value = form.value.storeId
    lastStoreId.value = form.value.storeId
    onlineLocked.value = form.value.jobType === 'online'
    if (onlineLocked.value) {
      // 与后端保存时的归一一致（按单计佣、元/单、上限 = 佣金），打开就显示将要保存的样子；
      // 早期从岗位管理直接建的线上岗位可能是别的计薪方式，结算一直按薪资下限算
      form.value.salaryType = 'piece'
      form.value.salaryUnit = '元/单'
      form.value.salaryMax = form.value.salaryMin
    }
    salaryExtras.value = [ ...(form.value.bonusDesc ? ['bonus'] : []), ...(form.value.commissionDesc ? ['commission'] : []) ]
    open.value = true
    title.value = "修改岗位"
  }).catch(() => {
    // 取详情失败就别打开对话框，否则运营会在一个空表单上编辑并提交出一条新岗位
  })
}

/**
 * 餐补、宠物、住宿（V66）提交给接口的值：照片传 JSON 字符串（接口字段是字符串，传数组会报错）；
 * null 或不带是「保持原值」，只有空串才清空，所以当前不适用的也要明确传空（后端也会再收口一次）。
 * 单独算、不写回表单：保存失败时表单要留着，切回去金额还在，也不会把单位下拉框清空。
 */
function jobExtrasBody() {
  const f = form.value
  const meal = hasMealAllowance.value ? String(f.mealAllowance ?? "").trim() : ""
  const pet = f.jobType === "volunteer" ? (f.petStatus || "") : ""
  const video = hasHousing.value ? (f.lodgingVideo || "") : ""
  return {
    mealAllowance: meal,
    mealAllowanceUnit: meal ? (f.mealAllowanceUnit || "day") : "",
    petStatus: pet,
    petImages: JSON.stringify(pet === "yes" ? textToImages(f.petImageList) : []),
    lodgingImages: JSON.stringify(hasHousing.value ? textToImages(f.lodgingImageList) : []),
    lodgingVideo: video,
    lodgingVideoCover: video ? (f.lodgingVideoCover || "") : ""
  }
}

/** 提交按钮 */
function syncGenderCounts() {
  if (!form.value.genderCountsEnabled || form.value.jobType !== 'volunteer') return
  const male = Number(form.value.genderMaleCount) || 0, female = Number(form.value.genderFemaleCount) || 0
  form.value.headcount = male + female
  form.value.genderPref = male === 0 ? 'F' : female === 0 ? 'M' : ''
}
function toggleGenderCounts(enabled) {
  if (enabled) {
    const total = Number(form.value.headcount) || 1
    form.value.genderMaleCount = form.value.genderPref === 'F' ? 0 : form.value.genderPref === 'M' ? total : Math.ceil(total / 2)
    form.value.genderFemaleCount = total - form.value.genderMaleCount
    syncGenderCounts()
  } else {
    form.value.genderMaleCount = null
    form.value.genderFemaleCount = null
    form.value.headcount = Math.min(99, Math.max(1, form.value.headcount || 1))
  }
}
function submitForm() {
  if (form.value.jobType === 'volunteer' && form.value.genderCountsEnabled) {
    const values = [form.value.genderMaleCount, form.value.genderFemaleCount]
    if (values.some(n => !Number.isInteger(n) || n < 0 || n > 99) || values[0] + values[1] < 1 || values[0] + values[1] > 99) {
      proxy.$modal.msgError('请填写男生、女生人数（不招填 0），合计 1–99 人')
      return
    }
    syncGenderCounts()
  }

  if (!open.value || !canLeaveJob()) return
  const version = editVersion.value
  proxy.$refs["jobRef"].validate(async (valid, invalidFields) => {
    if (!valid) {
      if (open.value && version === editVersion.value) {
        // 视频和岗位是一起保存的，岗位没过校验时视频也没存，要说清楚
        const suffix = storeDisplayRef.value?.hasUnsavedVideo?.() || hasUnsavedLodgingVideo() ? '。改好后点确定，视频才会一起保存' : ''
        revealFirstFormError(proxy.$refs["jobRef"], invalidFields, text => proxy.$modal.msgError(text), suffix)
      }
      return
    }
    if (open.value && version === editVersion.value && canLeaveJob()) {
      jobSaving.value = true
      let profileSaved = false
      try {
        profileSaved = await storeDisplayRef.value?.saveIfDirty()
      form.value.bonusDesc = salaryExtras.value.includes('bonus') ? String(form.value.bonusDesc || '').trim() : null
      form.value.commissionDesc = salaryExtras.value.includes('commission') ? String(form.value.commissionDesc || '').trim() : null
      // 被 disabled 的字段必须显式清空再提交。
      //
      // 这些输入框只是 :disabled，值还留在 form 里；而 form 是 getJob 整对象回填的，
      // 后端的全量 update 语句又无条件写这几列 —— 运营把计薪方式改成「无薪资」保存，
      // 库里就留下一条 salary_type='none' 却还带着 120 元/天的行，
      // 小程序的兼职列表照着这些字段渲染，显示的是已经不存在的薪资。
      // 后端 validate() 里也做了同样的清空（那是所有写入路径的必经之地），
      // 这里一并清是为了保存后重新打开时看到的就是清空后的样子。
      if (form.value.salaryType === "none") {
        form.value.salaryMin = null
        form.value.salaryMax = null
        form.value.salaryUnit = null
        form.value.settleDesc = null
      }
      if (form.value.boardType === "none") {
        form.value.boardDesc = null
      }
      // 换工类型：点了清空时下拉框给的是 undefined，提交时会被省略，后端按「没带这个字段」保持原值；
      // 这里统一成空串，清空才真的生效。非换工岗位一律空串（后端也会再清一次）
      form.value.workKind = form.value.jobType === "volunteer" ? (form.value.workKind || "") : ""
      // 筛选条件（V48）：同上，清空给的是 undefined，统一成空串清空才生效；超出适用范围的（兼职的性别、
      // 线上任务的排班、不包住的房型）提交空串（后端也会再收口一次）
      form.value.genderPref = form.value.jobType === "volunteer" ? (form.value.genderPref || "") : ""
      form.value.restMode = form.value.jobType !== "online" ? (form.value.restMode || "") : ""
      form.value.roomType = hasHousing.value ? (form.value.roomType || "") : ""
      // 岗位照片（V49）：上传组件给的逗号分隔路径 → JSON 数组（后端只收平台上传的 /profile/upload/…，最多 9 张）；有照片时封面就是第一张
      const photos = textToImages(form.value.imageList)
      form.value.images = JSON.stringify(photos)
      if (photos.length) form.value.cover = photos[0]
      // 线上任务：上限跟随佣金；交付日期后端一律按截止时间重算，提交什么都不认
      if (form.value.jobType === "online") {
        form.value.salaryType = "piece"
        form.value.salaryUnit = "元/单"
        form.value.salaryMax = form.value.salaryMin
      }
      // 年龄、性格（V67）合回要求的前两行再提交；不写回表单（保存失败时下拉框里的选择还在）
      const { reqAge, reqPersonality, ...fields } = form.value
      const requirement = fields.jobType === "online" ? fields.requirement : joinRequirement(reqAge, reqPersonality, fields.requirement)
      const body = { ...fields, requirement, ...jobExtrasBody() }
      if (form.value.jobId != undefined) {
        const res = await updateJob(body)
        const moved = Number((res && res.movedApps) || 0)
        proxy.$modal.msgSuccess(moved > 0 ? "修改成功，" + moved + " 条还没走完流程的报名已一起转到新门店" : "修改成功")
      } else {
        await addJob(body)
        proxy.$modal.msgSuccess("新增成功，岗位已保存为草稿")
      }
      open.value = false
      getList()
      } catch (_) {
        // 两个独立资源分步保存；岗位失败时保留表单并明确门店配置已保存，重试不会重复提交。
        if (profileSaved) proxy.$modal.msgWarning('门店配置已保存，岗位提交失败，请保留表单并重试')
      } finally {
        jobSaving.value = false
      }
    }
  })
}

/** 删除按钮操作 */
function handleDelete(row) {
  const jobIds = row.jobId || ids.value
  proxy.$modal.confirm('是否确认删除岗位编号为"' + jobIds + '"的数据项？').then(function() {
    return delJob(jobIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

async function confirmPublish() {
  if (!publishOpen.value || !canLeavePublish()) return
  const row = publishRow.value
  publishing.value = true
  let profileSaved = false
  try {
    profileSaved = await publishDisplayRef.value?.saveIfDirty()
    await changeJobStatus(row.jobId, 'published')
    proxy.$modal.msgSuccess('配置已保存，岗位已上架')
    publishOpen.value = false
    getList()
  } catch (_) {
    if (profileSaved) proxy.$modal.msgWarning('门店配置已保存，上架失败，可重试上架')
  } finally {
    publishing.value = false
  }
}

/** 上下架操作（发布/暂停/关闭） */
function handleChangeStatus(row, status) {
  if (status === 'published' && row.jobType !== 'online') {
    if (!canLeavePublish()) return
    if (!textToImages(imagesToText(row.images)).length) {
      proxy.$modal.msgError('请至少上传 1 张岗位照片后再上架')
      handleUpdate(row)
      return
    }
    publishRow.value = { ...row }
    publishOpen.value = true
    return
  }
  const text = { published: "发布", paused: "暂停", closed: "关闭" }[status]
  // 关闭会连带结束还没录用的报名（后端同一事务处理并通知候选人），确认框里先说清楚
  const tip = status !== "closed"
    ? '确认要' + text + '岗位"' + row.title + '"吗？'
    : row.jobType === "online"
      ? '关闭后任务不能再恢复。还没审核的接单申请会一并结束，并通知申请人（已通过的接单照常交付、结算）。确认关闭"' + row.title + '"吗？'
      : '关闭后岗位不能再恢复。还没录用的报名会一并结束，并通知候选人（已确认录用的照常签约入职）。确认关闭"' + row.title + '"吗？'
  proxy.$modal.confirm(tip).then(function() {
    return changeJobStatus(row.jobId, status)
  }).then(res => {
    getList()
    const ended = Number((res && res.endedApps) || 0)
    proxy.$modal.msgSuccess(ended > 0
      ? "已关闭，" + ended + (row.jobType === "online" ? " 条还没审核的接单申请已结束并通知了申请人" : " 条还没录用的报名已结束并通知了候选人")
      : text + "成功")
  }).catch(() => {
    // 非法流转由后端状态机拒绝，request.js 已经把 msg 弹出来了，这里只负责不让 promise 悬着
  })
}

/** 门店提交的草稿审核不通过：原因必填，会发给门店并记进岗位备注 */
function handleReject(row) {
  proxy.$modal.prompt('请填写"' + row.title + '"不通过的原因（必填，会发给门店，方便他们改好后重新发布）').then(({ value }) => {
    const reason = (value || "").trim()
    if (!reason) {
      proxy.$modal.msgError("不通过必须填写原因")
      return Promise.reject("emptyReason")
    }
    if (reason.length > 200) {
      proxy.$modal.msgError("原因不超过 200 字（当前 " + reason.length + " 字）")
      return Promise.reject("tooLong")
    }
    return changeJobStatus(row.jobId, "closed", reason)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("已标记不通过，原因已发给门店")
  }).catch(() => {})
}

/** 到期关闭的线上任务继续开启：填新的预计完成时间（留空 = 7 天后 18:00），上过架的回到招聘中，没上过架的回到待审核 */
function handleReopenOnline(row) {
  const d = new Date(Date.now() + 7 * 86400000)
  const pad = n => String(n).padStart(2, "0")
  const fallback = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " 18:00"
  proxy.$modal.prompt('继续开启"' + row.title + '"：请填新的预计完成时间（格式 ' + fallback + '，留空就用 ' + fallback + '，至少晚于现在 2 小时）').then(({ value }) => {
    const deadline = (value || "").trim() || fallback
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(deadline)) {
      proxy.$modal.msgError("时间格式不对，例如 " + fallback)
      return Promise.reject("badFormat")
    }
    return reopenOnlineTask(row.jobId, deadline)
  }).then(res => {
    getList()
    proxy.$modal.msgSuccess((res && res.msg) || "已继续开启")
  }).catch(() => {})
}

/** 导出按钮操作 */
/**
 * 按报名明细重算名额计数。勾了行就只重算勾选的那一条，没勾就全量。
 * 全量重算会逐行更新 kg_job，所以二次确认里要写清楚范围。
 */
function handleRecalc() {
  const one = ids.value.length === 1 ? ids.value[0] : null
  const tip = one
    ? "确认按报名明细重算岗位编号为「" + one + "」的已报名 / 已录用人数吗？"
    : "确认按报名明细【全量】重算所有岗位的已报名 / 已录用人数吗？这会逐行更新岗位表。"
  proxy.$modal.confirm(tip).then(function () {
    return recalcJobCounters(one)
  }).then(res => {
    proxy.$modal.msgSuccess("重算完成，更新了 " + ((res && res.data) || 0) + " 个岗位")
    getList()
  }).catch(() => {})
}

function handleExport() {
  proxy.download("kangaroo/job/export", {
    ...queryParams.value
  }, `job_${new Date().getTime()}.xlsx`)
}

// 从「商家需求」点岗位ID 过来：筛到这家店这一类，并标出这一行（上架、修改都在这一行上）
const route = useRoute()
const router = useRouter()
const focusJobId = ref(null)
function jobRowClass({ row }) {
  return focusJobId.value !== null && Number(row.jobId) === focusJobId.value ? 'job-focus-row' : ''
}
function applyRouteFocus() {
  const focus = parseJobFocus(route.query)
  if (!focus) return false
  dateRange.value = []
  Object.assign(queryParams.value, { pageNum: 1, title: undefined, workKind: undefined, city: undefined, status: undefined, storeId: focus.storeId, jobType: focus.jobType })
  focusJobId.value = focus.jobId
  return true
}

applyRouteFocus()
getStoreOptions()
getList()
// 页面被标签页缓存时不会重新加载，换了链接要在这里接住
watch(() => route.fullPath, () => { if (route.name === 'KgJob' && applyRouteFocus()) getList() })
</script>

<style scoped>
.recruitment-tip { width: 100%; margin-top: 6px; font-size: 12px; line-height: 1.6; color: var(--el-text-color-secondary); }
.meal-allowance { display: flex; gap: 8px; width: 100%; }
.meal-allowance .el-input { flex: 1; min-width: 0; }
.meal-allowance .el-select { flex: none; width: 96px; }
.job-video-jump { margin: 0 0 16px; padding: 8px 12px; background: var(--el-color-primary-light-9); border-radius: 4px; font-size: 13px; line-height: 1.7; color: var(--el-text-color-regular); }
:deep(.job-focus-row > td.el-table__cell) { background: var(--el-color-warning-light-9); }
.gender-count-inputs{width:100%;display:flex;flex-wrap:wrap;gap:12px;margin-top:10px}.gender-count-inputs .el-input-number{width:128px}.gender-count-inputs .recruitment-tip{width:100%}
</style>
