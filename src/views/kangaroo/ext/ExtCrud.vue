<template>
  <div class="app-container">
    <notification-guide v-if="['jobsub', 'substpl', 'sublog'].includes(props.entity)" :context="props.entity" />
    <p v-if="props.entity === 'city'" class="city-guide">上传换工群二维码：找到对应城市，点击操作列「地区群码」，上传群二维码并填写有效期后保存。用户在「保险与地区群」查看岗位所在地区的群码；群码过期后自动隐藏，请及时更新。负责人资料点「修改」，员工权限在「员工授权」设置。</p>
    <el-alert v-if="metaError" title="页面配置读取失败" type="error" :closable="false" show-icon><el-button link type="primary" @click="initialize">重新加载页面</el-button></el-alert>
    <el-alert v-if="listError" :title="listError" type="error" :closable="false" show-icon><el-button link type="primary" @click="getList">重新加载</el-button></el-alert>
    <el-form :model="query" :inline="true" v-show="showSearch" class="ext-search">
      <el-form-item v-for="f in searchFields" :key="f.name" :label="f.label">
        <el-date-picker
          v-if="f.search === 'range'"
          v-model="ranges[f.name]"
          type="daterange"
          value-format="YYYY-MM-DD"
          range-separator="-"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          style="width: 240px"
        />
        <el-select v-else-if="f.type === 'select' || f.type === 'switch'" v-model="query[f.name]" placeholder="全部" clearable style="width: 180px">
          <el-option v-for="o in optionsOf(f)" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
        <el-input v-else v-model="query[f.name]" placeholder="请输入" clearable style="width: 180px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5" v-if="meta.allowAdd">
        <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="[perm('add')]">新增</el-button>
      </el-col>
      <el-col :span="1.5" v-if="meta.allowDelete">
        <el-button type="danger" plain icon="Delete" :disabled="!ids.length" @click="handleDelete()" v-hasPermi="[perm('remove')]">删除</el-button>
      </el-col>
      <el-col :span="1.5" v-if="['onlinesubmit', 'onlinesettle'].includes(entity)"><el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="[perm('export')]">导出表格</el-button></el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="rows" @selection-change="onSelect">
      <el-table-column type="selection" width="50" align="center" v-if="meta.allowDelete" />
      <el-table-column label="编号" :prop="meta.pk" width="80" align="center" />
      <!-- 每列按内容给最小宽度（colMins）；列多放不下时「状态」跟「操作」一起固定在右边（pinStatus），中间的列横向拖动查看 -->
      <el-table-column v-for="f in listFields" :key="f.name" :label="f.label" :prop="f.name" align="center" :show-overflow-tooltip="true"
        :min-width="colMins[f.name]" :fixed="f.name === 'status' && pinStatus ? 'right' : false">
        <template #default="scope">
          <template v-if="f.type === 'select' || f.type === 'switch'">
            <el-tag v-if="scope.row[f.name] !== null && scope.row[f.name] !== undefined && scope.row[f.name] !== ''" :type="tagType(f, scope.row[f.name])">{{ labelOf(f, scope.row[f.name]) }}</el-tag>
            <!-- 后端给行补的状态说明（如支付单的「退款中」：状态还是已支付，但退款已经在路上） -->
            <el-tag v-if="f.name === 'status' && scope.row.extNote" type="warning" style="margin-left: 4px">{{ scope.row.extNote }}</el-tag>
          </template>
          <span v-else-if="props.entity === 'roomtype' && roomPeriodField(f.name) && scope.row[f.name] == null">按逐晚计算</span>
          <span v-else-if="f.type === 'money'">{{ yuan(scope.row[f.name]) }}</span>
          <template v-else-if="f.type === 'image' || f.type === 'images'">
            <image-preview v-if="!props.expandImages.includes(f.name) || imageList(scope.row[f.name]).length" :src="firstImage(scope.row[f.name])" :width="44" :height="44" />
            <span v-if="props.expandImages.includes(f.name) && imageList(scope.row[f.name]).length > 1" class="ext-image-count">共 {{ imageList(scope.row[f.name]).length }} 张</span>
          </template>
          <!-- 2026-10-17 R3：media = 照片或视频（逗号分隔可多个）；照片放缩略图，视频放「▶ 视频」链接，点开在新标签页播放 -->
          <template v-else-if="f.type === 'media'">
            <image-preview v-if="mediaItems(scope.row[f.name]).length && !isVideo(mediaItems(scope.row[f.name])[0])" :src="mediaItems(scope.row[f.name])[0]" :width="44" :height="44" />
            <el-link v-else-if="mediaItems(scope.row[f.name]).length" type="primary" :href="imageUrl(mediaItems(scope.row[f.name])[0])" target="_blank">▶ 视频{{ mediaItems(scope.row[f.name]).length > 1 ? ' ×' + mediaItems(scope.row[f.name]).length : '' }}</el-link>
          </template>
          <!-- 页面传了 links 的列：有目标就是链接（如商家需求的岗位ID 到岗位管理），没有目标或没权限就是普通文字 -->
          <el-link v-else-if="linkOf(f, scope.row)" type="primary" @click="router.push(linkOf(f, scope.row))">{{ displayRecordField(props.entity, f.name, scope.row) }}</el-link>
          <span v-else>{{ displayRecordField(props.entity, f.name, scope.row) }}</span>
        </template>
      </el-table-column>
      <!-- 「操作」列固定在右边：列多的页面（社区活动、Vlog 审核等）在 1366/1440 宽下按钮不再跑到屏幕外 -->
      <el-table-column label="操作" align="center" class-name="small-padding fixed-width" fixed="right" :width="opWidth">
        <template #default="scope">
          <el-button link type="primary" icon="Edit" v-if="meta.allowEdit" @click="handleUpdate(scope.row)" v-hasPermi="[perm('edit')]">修改</el-button>
          <el-button link type="primary" v-if="props.entity === 'city' && meta.allowEdit" @click="handleUpdate(scope.row, 'group')" v-hasPermi="[perm('edit')]">地区群码</el-button>
          <el-button link type="primary" icon="View" v-if="!meta.allowEdit || !checkPermi([perm('edit')])" @click="handleView(scope.row)" v-hasPermi="[perm('query')]">详情</el-button>
          <template v-for="a in meta.actions" :key="a.key">
            <!-- 四眼原则：登记了 notSelf（或 hideForSelf）的动作，经办过上一步的人自己不能再点（如结算申请「通过」的人不能再「登记打款」），
                 按钮置灰并说明原因，免得点了才收到一句看不懂的拒绝 -->
            <el-tooltip v-if="actionVisible(a, scope.row) && selfBlocked(a, scope.row)" :content="selfTip(a)" placement="top">
              <span v-hasPermi="[a.perm]" style="margin: 0 12px"><el-button link type="primary" disabled>{{ a.label }}</el-button></span>
            </el-tooltip>
            <el-button link type="primary" v-else-if="actionVisible(a, scope.row)" @click="runAction(a, scope.row)" v-hasPermi="[a.perm]">{{ a.label }}</el-button>
          </template>
          <el-button link type="danger" icon="Delete" v-if="meta.allowDelete" @click="handleDelete(scope.row)" v-hasPermi="[perm('remove')]">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="query.pageNum" v-model:limit="query.pageSize" @pagination="getList" />

    <el-dialog :title="dialogTitle" v-model="open" width="680px" append-to-body :before-close="beforeEditorClose" :close-on-click-modal="false" :close-on-press-escape="!saving" :show-close="!saving">
      <p v-if="props.entity === 'substpl' && !viewOnly" class="template-guide">保存模板不会立即发送通知。用户授权后，还需对应业务触发；发送结果可在「订阅发送记录」核对。</p>
      <el-radio-group v-if="props.entity === 'city'" v-model="cityEditorSection" :disabled="saving || mediaUploading" aria-label="城市资料分类" style="margin-bottom:20px"><el-radio-button value="coordinator">负责人资料</el-radio-button><el-radio-button value="group">地区换工群</el-radio-button><el-radio-button value="city">城市设置</el-radio-button></el-radio-group>
      <div v-if="props.entity === 'city' && cityEditorSection === 'group'" class="city-group-guide"><strong>{{ form.name || '请先填写城市名称' }} · 地区换工群</strong><p>在微信中打开当地换工群 → 群聊信息 → 群二维码，保存图片后在下方上传。有效期请按二维码页面填写；同地区岗位共用这张群码，保存后用户重新打开即可获取。</p></div>
      <!-- 后端给这条记录补的说明（如结算申请「余额不足：当前 -97.00」），详情里也看得到 -->
      <el-alert v-if="viewOnly && form.extNote" :title="form.extNote" type="warning" :closable="false" show-icon style="margin-bottom: 16px" />
      <!-- 120px：放得下 7 个字的标签（如「折扣或优惠说明」），110px 时会折行压到下一项的标签上 -->
      <el-form :key="editorVersion" ref="formRef" :model="form" :rules="rules" :disabled="saving" label-width="120px" :label-position="isMobile ? 'top' : 'right'">
        <display-material-checklist v-if="props.entity === 'stay'" :items="stayMaterials" inherited-label="沿用封面" inherited-hint="未单独设置视频封面时，前端沿用房源封面。生活碎片内容在「生活碎片」中维护，评价由用户提交。" @locate="focusDisplayField(formRef?.$el, $event)" />
        <el-form-item v-for="f in formFields" :key="f.name" :label="props.entity === 'stay' && f.name === 'latitude' ? '地图定位' : (props.labels[f.name] || (props.entity === 'city' && cityGroupLabels[f.name]) || f.label)" :prop="f.name" :required="props.entity === 'roomtype' && f.name === 'weekTotalFen' ? true : undefined" :data-display-field="f.name">
          <stay-cancel-policy-editor v-if="props.entity === 'stay' && f.name === 'cancelPolicyConfig'" v-model="form.cancelPolicyConfig" :disabled="viewOnly || saving || !f.editable" />
          <stay-booking-notice-editor v-else-if="props.entity === 'stay' && f.name === 'bookingNoticeConfig'" v-model="form.bookingNoticeConfig" :default-value="f.editorDefault" :disabled="viewOnly || saving || !f.editable" />
          <place-location-input v-else-if="props.entity === 'stay' && f.name === 'latitude'" :latitude="form.latitude" :longitude="form.longitude" :address="form.address || ''" :city="form.city || ''" :disabled="viewOnly || saving || !f.editable" empty-hint="不单独设置时沿用所属门店定位；门店也未定位时，需要先补充。" @change="Object.assign(form, $event)" />
          <template v-else-if="viewOnly || !f.editable || (form[meta.pk] && f.createOnly) || (props.fieldLocked && props.fieldLocked(form, f))">
            <el-tag v-if="(f.type === 'select' || f.type === 'switch') && form[f.name] !== null && form[f.name] !== undefined && form[f.name] !== ''" :type="tagType(f, form[f.name])">{{ labelOf(f, form[f.name]) }}</el-tag>
            <span v-else-if="props.entity === 'roomtype' && roomPeriodField(f.name) && form[f.name] == null">按逐晚计算</span>
            <span v-else-if="f.type === 'money'">{{ yuan(form[f.name]) }}</span>
            <arrival-ticket-preview v-else-if="props.entity === 'arrival' && f.name === 'tickets' && form[f.name]" :app-id="form[meta.pk]" :src="form[f.name]" />
            <div v-else-if="props.expandImages.includes(f.name) && form[f.name]" class="ext-media">
              <el-image v-for="(u, i) in imageList(form[f.name])" :key="u + i" :src="imageUrl(u)" fit="cover" class="ext-media__image" :preview-src-list="imageList(form[f.name]).map(imageUrl)" :initial-index="i" preview-teleported />
            </div>
            <image-preview v-else-if="(f.type === 'image' || f.type === 'images') && form[f.name]" :src="form[f.name]" :width="80" :height="80" />
            <div v-else-if="f.type === 'media' && form[f.name]" class="ext-media">
              <template v-for="u in mediaItems(form[f.name])" :key="u">
                <video v-if="isVideo(u)" :src="imageUrl(u)" controls preload="metadata" class="ext-media__video" />
                <image-preview v-else :src="u" :width="80" :height="80" />
              </template>
            </div>
            <span v-else style="white-space: pre-wrap">{{ form[f.name] }}</span>
          </template>
          <!-- 读不到门店列表（没有门店列表权限或请求失败）：只显示门店编号，不能填也不能改，弹窗里其余内容照常能改。
               新增也不能手填：填完看不到店名，后端只查这家店存在且启用，填错会静默挂到别的门店，有订单后还改不回来 -->
          <template v-else-if="f.name === 'storeId' && ['stay', 'activity'].includes(props.entity) && storesUnavailable">
            <el-input-number v-model="form[f.name]" :precision="0" :min="1" disabled controls-position="right" placeholder="门店编号" style="width:100%" />
            <p class="ext-field-tip">{{ form[meta.pk] ? '当前读不到门店列表，这里显示的是门店编号。' : '读不到门店列表，请找有门店权限的运营新增，或稍后重试。' }}</p>
          </template>
          <el-select v-else-if="f.name === 'storeId' && ['stay', 'activity'].includes(props.entity)" v-model="form[f.name]" filterable clearable placeholder="搜索并选择所属门店" style="width:100%">
            <el-option v-for="store in stores" :key="store.storeId" :value="store.storeId" :label="store.storeName + '（' + (store.city || '未设城市') + '）'" />
          </el-select>
          <reference-select v-else-if="props.entity === 'homepick' && f.name === 'targetId'" v-model="form.targetId" kind="home" :section="form.section" :current-title="form.targetTitle" />
          <reference-select v-else-if="['roomtype', 'staydiary'].includes(props.entity) && f.name === 'stayId'" v-model="form.stayId" kind="room" />
          <!-- 展示城市的意思按栏目说：全职培训横幅留空 = 所有城市都显示（之前一律写「全国首页」，配培训横幅时看不懂） -->
          <el-input v-else-if="props.entity === 'homepick' && f.name === 'city'" v-model="form.city" :placeholder="form.section === 'training' ? '留空 = 所有城市都显示；填城市 = 用户选了这个城市才显示' : '留空表示未选城市时的全国首页'" :maxlength="32" clearable />
          <el-select v-else-if="f.type === 'select'" v-model="form[f.name]" :disabled="f.name === 'mediaType' && mediaUploading" placeholder="请选择" clearable style="width: 100%" @change="onFieldChange(f.name)">
            <el-option v-for="o in formOptions(f)" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
          <el-switch v-else-if="f.type === 'switch'" v-model="form[f.name]" active-value="1" inactive-value="0" />
          <el-input-number v-else-if="f.type === 'int'" v-model="form[f.name]" :precision="0" :min="f.min ?? undefined" :max="f.max ?? undefined" controls-position="right" style="width: 100%" />
          <el-input v-else-if="props.entity === 'roomtype' && roomPeriodField(f.name)" v-model="moneyForm[f.name]" inputmode="decimal" clearable placeholder="不设置请留空" :maxlength="10"><template #append>元/{{ roomPeriodField(f.name).nights }}晚</template></el-input>
          <el-input-number v-else-if="f.type === 'money'" v-model="moneyForm[f.name]" :min="f.min != null ? f.min / 100 : 0" :max="f.max != null ? f.max / 100 : undefined" :precision="2" controls-position="right" style="width: 100%" />
          <el-date-picker v-else-if="f.type === 'date'" v-model="form[f.name]" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
          <el-date-picker v-else-if="f.type === 'datetime'" v-model="form[f.name]" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" />
          <image-upload v-else-if="f.type === 'image'" v-model="form[f.name]" :disabled="saving" :limit="1" @busy="imageBusy[f.name] = $event" />
          <image-upload v-else-if="f.type === 'images'" v-model="form[f.name]" :disabled="saving" :limit="9" @busy="imageBusy[f.name] = $event" />
          <image-upload v-else-if="props.entity === 'staydiary' && f.name === 'mediaUrl' && form.mediaType !== 'video'" v-model="form.mediaUrl" :disabled="saving" :limit="1" @busy="imageBusy[f.name] = $event" />
          <admin-video-upload v-else-if="videoKind(f.name) && open" :key="props.entity + ':' + f.name + ':' + (form[meta.pk] || 'new')" v-model="form[f.name]" :kind="videoKind(f.name)" :active="open" :cover="form[VIDEO_COVER_FIELDS[videoKind(f.name)]] || ''" @busy="videoBusy[f.name] = $event" />
          <!-- 其他只读媒体继续保留原地址预览。 -->
          <div v-else-if="f.type === 'media'" style="width: 100%">
            <el-input v-model="form[f.name]" :maxlength="f.maxLen" clearable placeholder="填写已上传的媒体地址；清空可移除" />
            <video v-if="form[f.name] && isVideo(mediaItems(form[f.name])[0])" :src="imageUrl(mediaItems(form[f.name])[0])" controls preload="metadata" class="ext-media__video" />
          </div>
          <el-input v-else-if="f.type === 'textarea'" v-model="form[f.name]" type="textarea" :rows="props.entity === 'appnotice' ? 10 : 3" :maxlength="f.maxLen" show-word-limit />
          <el-input v-else v-model="form[f.name]" :maxlength="f.maxLen" />
          <p v-if="props.entity === 'city' && f.name === 'regionGroupQr' && !viewOnly" class="ext-field-tip">仅上传一张完整、清晰的地区换工群二维码，不要上传住客群或门店工作群。</p>
          <p v-if="props.entity === 'city' && f.name === 'regionGroupExpire'" class="ext-field-tip">二维码可使用的最后一天，按北京时间计算。到期后用户端隐藏，更新群码时也请更新此日期。</p>
          <p v-if="props.entity === 'roomtype' && f.name === 'weekTotalFen' && !viewOnly" class="ext-field-tip">填写1{{ form.unitLabel || '间' }}住7晚的合计房费，例如每晚17元，七天填写119元。修改总价后均分到7晚，七晚合计不变；不改总价会保留原周末差价。单日房态价格仍可单独调整。</p>
          <p v-if="props.entity === 'roomtype' && roomPeriodField(f.name) && !viewOnly" class="ext-field-tip">填写1{{ form.unitLabel || '间' }}住{{ roomPeriodField(f.name).nights }}晚的合计房费，仅用于预订{{ roomPeriodField(f.name).nights }}晚。不填或清空则按逐晚计算，房态单日改价优先。已设总价不再叠加连住折扣。</p>
          <div v-if="displayRecordField(props.entity, f.name, form) !== form[f.name]" style="width:100%;margin-top:6px;color:#80756b;font-size:12px;white-space:pre-wrap">用户端显示：{{ displayRecordField(props.entity, f.name, form) }}<br />上方保留原文；称呼更新仅用于展示，不改写记录。</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" v-if="!viewOnly" :loading="saving" :disabled="mediaUploading" @click="submitForm">确 定</el-button>
          <el-button :disabled="saving" @click="closeEditor">{{ viewOnly ? '关 闭' : '取 消' }}</el-button>
        </div>
      </template>
    </el-dialog>
    <el-dialog :title="reviewContext.title || '举报原文'" v-model="contextOpen" width="680px" append-to-body>
      <div style="white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.7">{{ reviewContext.text }}</div>
      <el-table v-if="reviewContext.roomTypes" :data="reviewContext.roomTypes" style="margin-top:16px">
        <el-table-column prop="typeName" label="该房源的房型" />
        <el-table-column label="状态"><template #default="s">{{ s.row.status === '0' ? '已上架' : '已下架' }}</template></el-table-column>
        <el-table-column prop="stock" label="默认库存" />
        <el-table-column label="7天总价"><template #default="s">{{ yuan(roomWeekTotalFen(s.row)) }}</template></el-table-column>
      </el-table>
      <!-- 凭证可能有多张：image-preview 只出第一张缩略图，这里每张都给一个，点开可左右翻页 -->
      <div v-if="ctxImages.length" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px"><el-image v-for="(u, i) in ctxImages" :key="u + i" :src="u" fit="cover" style="width:100px;height:100px;border-radius:5px" :preview-src-list="ctxImages" :initial-index="i" preview-teleported /></div>
      <template #footer><el-button v-if="reviewContext.stayId" type="primary" @click="openRooms(reviewContext.stayId)" v-hasPermi="['kangaroo:roomtype:list']">管理这些房型</el-button><el-button @click="contextOpen = false">关闭</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import ArrivalTicketPreview from './ArrivalTicketPreview.vue'
import StayCancelPolicyEditor from './stay/StayCancelPolicyEditor.vue'
import StayBookingNoticeEditor from './stay/StayBookingNoticeEditor.vue'
import { stayNoticeError } from '@/utils/stayBookingNotice'
import { stayPolicyError } from '@/utils/stayCancelPolicy'
import NotificationGuide from '@/components/NotificationGuide/index.vue'
import DisplayMaterialChecklist from '@/components/DisplayMaterialChecklist/index.vue'
import PlaceLocationInput from '@/components/PlaceLocationInput/index.vue'
import AdminVideoUpload from '@/components/AdminVideoUpload/index.vue'
import { stayDisplayMaterials, focusDisplayField } from '@/utils/displayMaterials'
/**
 * 扩展模块后台页的通用实现：表格、搜索、表单、自定义动作全部由后端实体登记（/kangaroo/ext/{entity}/meta）驱动。
 * 每个业务页只写 <ext-crud entity="xxx" />。写操作成功后一律重新拉列表（与其余后台页同一规矩）。
 */
import { getCurrentInstance, reactive, ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ReferenceSelect from './ReferenceSelect.vue'
import { listStore } from '@/api/kangaroo/store'
import { getDicts } from '@/api/system/dict/data'
import { checkPermi } from '@/utils/permission'
import useUserStore from '@/store/modules/user'
import useAppStore from '@/store/modules/app'
import { getExtMeta, listExt, getExt, addExt, updateExt, delExt, runExtAction } from '@/api/kangaroo/ext'
import { imageUrl } from '@/utils/imageUrl'
import { VIDEO_UNSAVED_CONFIRM, videoChanged } from '@/utils/interviewVideo'
import { revealFirstFormError } from '@/utils/formErrors'
import { displayRecordField } from '@/utils/displayWording'
import { ROOM_PERIOD_PRICES, roomPeriodInputFen, roomPeriodPayload, roomWeekTotalFen, roomWeekInputFen, roomWeekPayload } from '@/utils/roomWeekPrice'

const props = defineProps({
  entity: { type: String, required: true },
  // 列表里做成链接的列：{ 字段名: row => 路由地址或 null }
  links: { type: Object, default: () => ({}) },
  // 弹窗里没有值就不显示的字段（如老申请才有的「想招的人」）
  hideWhenEmpty: { type: Array, default: () => [] },
  // 弹窗里换个短一点的标签：{ 字段名: 标签 }（超过 8 个字会折行压到下一项）
  labels: { type: Object, default: () => ({}) },
  // 这一行的这个字段在弹窗里只读：(row, field) => boolean（如商家需求有岗位后，标题和说明要到岗位管理改）
  fieldLocked: { type: Function, default: null },
  // 打开页面时默认带的筛选（如小院评论默认看待审）；点「重置」也回到这里。没传就和原来一样什么都不筛
  defaultQuery: { type: Object, default: () => ({}) },
  // 标签颜色：{ 字段名: { 值: 'danger' | 'warning' | 'success' | 'info' } }，没写的照旧
  tagTypes: { type: Object, default: () => ({}) },
  // 审核要一张张看的图片字段：列表标总张数，详情每张都铺开（原来只放第一张，后面的要点开才知道有）
  expandImages: { type: Array, default: () => [] },
  // 列表显示哪些列、什么顺序（字段名数组）；审核要先看到的列放前面。没传就按后端登记的顺序全部显示
  listColumns: { type: Array, default: null }
})
const emit = defineEmits(['changed'])
function linkOf(f, row) { const link = props.links[f.name]; return link ? link(row) : null }
const formRef = ref()
const stayMaterials = computed(() => stayDisplayMaterials(form.value))
const videoBusy = reactive({})
const imageBusy = reactive({})
const mediaUploading = computed(() => Object.values(videoBusy).some(Boolean) || Object.values(imageBusy).some(Boolean))
const editorVersion = ref(0)
function videoKind(field) {
  if (props.entity === 'stay' && field === 'introVideo') return 'intro'
  if (props.entity === 'roomtype' && field === 'videoUrl') return 'room'
  if (props.entity === 'staydiary' && field === 'mediaUrl' && form.value.mediaType === 'video') return 'diary'
  return ''
}
const VIDEO_COVER_FIELDS = { intro: 'introVideoCover', room: 'videoCover', diary: 'coverUrl' }
// 打开弹窗时的视频，关弹窗时比对「传完没保存」
const videoOrigin = ref({})
function rememberVideoOrigin() {
  videoOrigin.value = Object.fromEntries(meta.value.fields.filter(f => videoKind(f.name)).map(f => [f.name, form.value[f.name] || '']))
}
function hasUnsavedVideo() {
  return !viewOnly.value && meta.value.fields.some(f => videoKind(f.name) && videoChanged(videoOrigin.value[f.name], form.value[f.name]))
}
async function confirmUnsavedVideo() {
  if (!hasUnsavedVideo()) return true
  try {
    await proxy.$modal.confirm(VIDEO_UNSAVED_CONFIRM)
  } catch (_) {
    return false
  }
  return canLeaveEditor()
}
function onFieldChange(field) {
  if (props.entity === 'homepick' && field === 'section') resetTarget()
  if (props.entity === 'staydiary' && field === 'mediaType') { form.value.mediaUrl = ''; form.value.coverUrl = '' }
}
const { proxy } = getCurrentInstance()
const userStore = useUserStore()
// 手机（宽度 < 992，布局里 ResizeHandler 判定）：表单标签放上面、操作列收窄、「状态」列不再固定在右边（否则两列固定列把屏幕占满，中间的列滑不出来）
const isMobile = computed(() => useAppStore().device === 'mobile')
const route = useRoute()
const router = useRouter()
const routeStayId = () => /^\d+$/.test(String(route.query.stayId || '')) ? Number(route.query.stayId) : undefined
// 首页「退款待审核」点进来带 ?status=refund_pending，旅居订单 / 服务订单按状态筛好
const STATUS_ROUTES = { stayorder: 'KgExtStayOrder', shoporder: 'KgExtShopOrder' }
const routeStatus = () => /^[a-z_]{1,32}$/.test(String(route.query.status || '')) ? String(route.query.status) : undefined
function openRooms(stayId) { contextOpen.value = false; router.push({ name: 'KgExtRoomType', query: { stayId } }) }

const meta = ref({ fields: [], actions: [], pk: 'id', allowAdd: false, allowEdit: false, allowDelete: false, perm: '' })
const dicts = reactive({})
const memberLevels = ref([])
function resetTarget() { form.value.targetId = undefined; form.value.targetTitle = '' }
const stores = ref([])
const storesUnavailable = ref(false)
// 门店只是下拉选项，读不到不能拦住弹窗（只有房源权限的账号也要能换小院视频）。没有权限时不发请求，免得弹一句「没有权限」
async function loadStores() {
  if (!['stay', 'activity'].includes(props.entity)) return
  stores.value = []
  storesUnavailable.value = false
  if (!checkPermi(['kangaroo:store:list'])) {
    storesUnavailable.value = true
    return
  }
  let pageNum = 1
  try {
    do {
      const res = await listStore({ pageNum, pageSize: 100, status: '0' })
      const batch = res.rows || []
      stores.value.push(...batch)
      if (!batch.length || stores.value.length >= Number(res.total || batch.length)) break
      pageNum++
    } while (pageNum <= 100)
  } catch (_) {
    // 具体错误 request.js 已经弹过；读到一部分时下拉照用，当前值不在选项里也会显示编号
    storesUnavailable.value = !stores.value.length
  }
}
const rows = ref([])
const total = ref(0)
const loading = ref(false)
const listError = ref('')
const metaError = ref(false)
const cityEditorSection = ref('coordinator')
const cityGroupLabels = { regionGroupName: '群名称', regionGroupQr: '群二维码', regionGroupExpire: '有效期至', regionGroupNote: '入群说明' }
let listRequest = 0
const showSearch = ref(window.innerWidth > 768)  // 手机上搜索栏先收起，点右边放大镜再展开
const ids = ref([])
const open = ref(false)
const saving = ref(false)
const contextOpen = ref(false)
const reviewContext = ref({})
const ctxImages = computed(() => String(reviewContext.value.images || '').split(',').map(s => s.trim()).filter(Boolean).map(imageUrl))
const viewOnly = ref(false)
const dialogTitle = ref('')
const form = ref({})
const moneyForm = ref({})
const roomPeriodField = name => ROOM_PERIOD_PRICES.find(period => period.key === name)
const query = reactive({ pageNum: 1, pageSize: 10, ...props.defaultQuery })
const ranges = reactive({})

const perm = (a) => meta.value.perm + ':' + a
const searchFields = computed(() => meta.value.fields.filter(f => f.search && f.search !== 'none'))
const listFields = computed(() => props.listColumns
  ? props.listColumns.map(name => meta.value.fields.find(f => f.name === name && f.inList)).filter(Boolean)
  : meta.value.fields.filter(f => f.inList))
const formFields = computed(() => {
  const fields = meta.value.fields.filter(f => (viewOnly.value || form.value[meta.value.pk] || f.editable) && !(props.entity === 'stay' && f.name === 'longitude') && !(props.entity === 'staydiary' && f.name === 'coverUrl' && form.value.mediaType !== 'video') && !(props.hideWhenEmpty.includes(f.name) && (form.value[f.name] === null || form.value[f.name] === undefined || form.value[f.name] === '')))
  if (props.entity !== 'city') return fields
  const first = ['name', 'coordinatorName', 'coordinatorAvatar', 'coordinatorIntro']
  if (cityEditorSection.value === 'coordinator') return first.map(name => fields.find(f => f.name === name)).filter(Boolean)
  if (cityEditorSection.value === 'group') return fields.filter(f => f.name.startsWith('regionGroup'))
  return fields.filter(f => !f.name.startsWith('coordinator') && !f.name.startsWith('regionGroup'))
})
const rules = computed(() => {
  const r = {}
  meta.value.fields.forEach(f => {
    if (f.required && f.editable && !(form.value[meta.value.pk] && f.createOnly) && f.type !== 'money') r[f.name] = [{ required: true, message: f.label + '不能为空', trigger: 'blur' }]
    if (props.entity === 'stay' && f.name === 'cancelPolicyConfig') r[f.name] = [{ validator: (rule, value, callback) => { const error = stayPolicyError(value); callback(error ? new Error(error) : undefined) }, trigger: 'change' }]
    if (props.entity === 'stay' && f.name === 'bookingNoticeConfig') r[f.name] = [{ validator: (rule, value, callback) => { const error = stayNoticeError(value); callback(error ? new Error(error) : undefined) }, trigger: 'change' }]
    if (props.entity === 'roomtype' && f.name === 'weekTotalFen') r[f.name] = [{ validator: (rule, value, callback) => { try { roomWeekInputFen(moneyForm.value.weekTotalFen); callback() } catch (error) { callback(error) } }, trigger: 'change' }]
    if (props.entity === 'roomtype' && roomPeriodField(f.name)) r[f.name] = [{ validator: (rule, value, callback) => { try { roomPeriodInputFen(moneyForm.value[f.name], roomPeriodField(f.name).nights); callback() } catch (error) { callback(error) } }, trigger: 'change' }]
  })
  return r
})

function optionsOf(f) {
  if (props.entity === 'memberbenefit' && f.name === 'minLevel' && memberLevels.value.length) return memberLevels.value.map(level => ({ value: String(level.level), label: Number(level.level) === 0 ? '所有成长会员' : level.levelName + '及以上' }))
  if (f.type === 'switch') return [{ value: '1', label: '是' }, { value: '0', label: '否' }]
  if (f.options) return f.options.split(',').map(kv => { const [value, label] = kv.split(':'); return { value, label } })
  return (dicts[f.dict] || []).map(d => ({ value: d.dictValue, label: d.dictLabel, cls: d.listClass }))
}
function formOptions(f) {
  const list = optionsOf(f)
  return props.entity === 'activity' && f.name === 'source' && !form.value[meta.value.pk] ? list.filter(o => o.value !== 'user') : list
}
function labelOf(f, v) {
  const o = optionsOf(f).find(x => String(x.value) === String(v))
  return o ? o.label : v
}
function tagType(f, v) {
  const custom = props.tagTypes[f.name] && props.tagTypes[f.name][String(v)]
  if (custom) return custom
  const o = optionsOf(f).find(x => String(x.value) === String(v))
  const t = o && o.cls
  return t && t !== 'default' ? t : 'primary'
}
function yuan(v) {
  if (v === null || v === undefined || v === '') return ''
  return '¥' + (Number(v) / 100).toFixed(2)
}
function firstImage(v) {
  return v ? String(v).split(',')[0] : ''
}
function imageList(v) {
  return v ? String(v).split(',').map(s => s.trim()).filter(Boolean) : []
}
// 2026-10-17 R3：media 字段（照片或视频，逗号分隔）拆成列表；按扩展名认视频（平台视频上传接口只出 .mp4 / .mov）
function mediaItems(v) {
  return v ? String(v).split(',').map(s => s.trim()).filter(Boolean) : []
}
function isVideo(u) {
  return /\.(mp4|mov)(\?|$)/i.test(String(u || ''))
}

async function loadMeta() {
  const res = await getExtMeta(props.entity)
  meta.value = res.data
  // 此时间在没有匹配岗位时也会更新，不能把任务检查时间标成已推送时间。
  if (props.entity === 'jobsub') meta.value.fields = meta.value.fields.map(f => f.name === 'lastNotifiedTime' ? { ...f, label: '上次检查' } : f)
  const types = [...new Set(meta.value.fields.filter(f => f.dict).map(f => f.dict))]
  await Promise.all(types.map(async t => { dicts[t] = (await getDicts(t)).data || [] }))
}

function queryFilters() {
  const params = { ...query }
  Object.keys(ranges).forEach(k => {
    if (ranges[k] && ranges[k].length === 2) { params[k + 'Begin'] = ranges[k][0]; params[k + 'End'] = ranges[k][1] }
  })
  return params
}
function handleExport() {
  proxy.download(`kangaroo/ext/${props.entity}/export`, queryFilters(), `${meta.value.title}_${Date.now()}.xlsx`)
}
function getList() {
  const request = ++listRequest
  loading.value = true
  listError.value = ''
  ids.value = []
  return listExt(props.entity, queryFilters()).then(res => {
    if (request !== listRequest) return
    rows.value = res.rows || []
    total.value = res.total || 0
    // 带筛选审核时最后一页审完就空了（待审的行审完离开列表）：退回还有内容的那一页，不留一张空表
    const lastPage = Math.ceil(total.value / query.pageSize)
    if (!rows.value.length && lastPage >= 1 && lastPage < query.pageNum) {
      query.pageNum = lastPage
      return getList()
    }
  }).catch(() => {
    if (request !== listRequest) return
    rows.value = []; total.value = 0
    listError.value = '列表读取失败，请重新加载'
  }).finally(() => { if (request === listRequest) loading.value = false })
}
function handleQuery() { query.pageNum = 1; getList() }
function resetQuery() {
  Object.keys(query).forEach(k => { if (k !== 'pageNum' && k !== 'pageSize') delete query[k] })
  Object.keys(ranges).forEach(k => { ranges[k] = null })
  Object.assign(query, props.defaultQuery)
  handleQuery()
}
function onSelect(sel) { ids.value = sel.map(r => r[meta.value.pk]) }

function fillMoney(src) {
  moneyForm.value = {}
  meta.value.fields.filter(f => f.type === 'money').forEach(f => {
    const value = props.entity === 'roomtype' && f.name === 'weekTotalFen' ? roomWeekTotalFen(src) : src[f.name]
    moneyForm.value[f.name] = value === null || value === undefined ? undefined : Number(value) / 100
  })
}
function canLeaveEditor() {
  if (saving.value) return false
  if (mediaUploading.value) { proxy.$modal.msgWarning('图片或视频正在上传，请完成或取消上传后再操作'); return false }
  return true
}
async function closeEditor() {
  if (!canLeaveEditor() || !(await confirmUnsavedVideo())) return
  editorVersion.value++
  open.value = false
}
async function beforeEditorClose(done) {
  if (!canLeaveEditor() || !(await confirmUnsavedVideo())) return
  editorVersion.value++
  open.value = false
  done()
}
async function handleAdd() {
  if (!canLeaveEditor()) return
  cityEditorSection.value = 'city'
  const version = ++editorVersion.value
  await loadStores()
  if (version !== editorVersion.value) return
  form.value = props.entity === 'activity' ? { source: 'yard', feeMode: 'free', insured: '0', pinned: '0', capacity: 10, category: '生活体验' } : props.entity === 'faq' ? { status: '0', sort: 0, category: 'other' } : {}
  if (props.entity === 'staydiary') form.value = { mediaType: 'image', status: '0' }
  if (props.entity === 'homepick') form.value = { section: 'activity', city: '', sort: 0, status: '0' }
  if (props.entity === 'memberbenefit') form.value = { minLevel: '0', category: 'other', status: '1', sort: 0 }
  // 小程序公告：默认面向所有人、进小程序弹窗一次、直接上线
  if (props.entity === 'appnotice') form.value = { audience: 'all', popup: '1', status: '0', sort: 0 }
  if (props.entity === 'roomtype') form.value = { status: '1', unitLabel: '间', sort: 0, stayId: query.stayId ? Number(query.stayId) : undefined }
  fillMoney({})
  rememberVideoOrigin()
  viewOnly.value = false
  dialogTitle.value = '新增' + meta.value.title
  open.value = true
}
async function handleUpdate(row, section = 'coordinator') {
  if (!canLeaveEditor()) return
  cityEditorSection.value = section
  const version = ++editorVersion.value
  await loadStores()
  if (version !== editorVersion.value) return
  getExt(props.entity, row[meta.value.pk]).then(res => {
    if (version !== editorVersion.value) return
    form.value = res.data
    if (form.value.storeId != null) form.value.storeId = Number(form.value.storeId)
    if (form.value.stayId != null) form.value.stayId = Number(form.value.stayId)
    if (form.value.minLevel != null) form.value.minLevel = String(form.value.minLevel)
    fillMoney(res.data)
    rememberVideoOrigin()
    viewOnly.value = false
    dialogTitle.value = '修改' + meta.value.title
    open.value = true
  }).catch(() => {})
}
function handleView(row) {
  cityEditorSection.value = 'coordinator'
  if (!canLeaveEditor()) return
  const version = ++editorVersion.value
  getExt(props.entity, row[meta.value.pk]).then(res => {
    if (version !== editorVersion.value) return
    form.value = res.data
    viewOnly.value = true
    dialogTitle.value = meta.value.title + '详情'
    open.value = true
  }).catch(() => {})
}
function submitForm() {
  if (!open.value || !canLeaveEditor()) return
  if (props.entity === 'city' && !String(form.value.name || '').trim()) {
    cityEditorSection.value = 'city'; proxy.$modal.msgError('请先填写城市简称，再保存地区群资料'); return
  }
  if (props.entity === 'city' && form.value.regionGroupQr && !form.value.regionGroupExpire) {
    cityEditorSection.value = 'group'; proxy.$modal.msgError('请填写地区群码有效期至'); return
  }
  const version = editorVersion.value
  proxy.$refs.formRef.validate((valid, invalidFields) => {
    // 房源弹窗很长，错误常在视口外：滚过去并提示，否则看起来像「确定」没反应
    if (!valid && open.value && version === editorVersion.value) revealFirstFormError(proxy.$refs.formRef, invalidFields, text => proxy.$modal.msgError(text))
    if (!valid || !open.value || version !== editorVersion.value || !canLeaveEditor()) return
    saving.value = true
    let data = {}
    meta.value.fields.forEach(f => {
      if (!f.editable || (form.value[meta.value.pk] && f.createOnly)) return
      if (f.type === 'money') {
        const y = moneyForm.value[f.name]
        data[f.name] = y === undefined || y === null || y === '' ? null : Math.round(Number(y) * 100)
      } else {
        data[f.name] = form.value[f.name] === undefined ? null : form.value[f.name]
      }
    })
    const pk = meta.value.pk
    if (props.entity === 'roomtype') {
      try {
        data = roomWeekPayload(data, form.value, moneyForm.value.weekTotalFen, !!form.value[pk])
        data = roomPeriodPayload(data, form.value, moneyForm.value, !!form.value[pk])
      }
      catch (error) { saving.value = false; proxy.$modal.msgError(error.message); return }
    }
    const req = form.value[pk] ? updateExt(props.entity, { ...data, [pk]: form.value[pk] }) : addExt(props.entity, data)
    req.then(() => {
      if (version !== editorVersion.value) return
      proxy.$modal.msgSuccess(props.entity === 'substpl' ? '模板已保存；保存不会发送通知，请在业务触发后查看发送记录' : '保存成功')
      open.value = false
      getList()
      emit('changed')
    }).catch(() => {
      // 请求层已显示错误，保留当前输入，允许重试。
    }).finally(() => { if (version === editorVersion.value) saving.value = false })
  })
}
onBeforeUnmount(() => { editorVersion.value++; listRequest++ })
function handleDelete(row) {
  const target = row ? row[meta.value.pk] : ids.value
  proxy.$modal.confirm('确认删除编号为"' + target + '"的' + meta.value.title + '？').then(() => delExt(props.entity, target)).then(() => {
    getList()
    proxy.$modal.msgSuccess('删除成功')
  }).catch(() => {})
}

function actionVisible(a, row) {
  // 后端按行收起的动作（如支付单退款还在路上时的「全额退款」，再点只会被拒）
  if (Array.isArray(row.extHiddenActions) && row.extHiddenActions.includes(a.key)) return false
  if (!a.showIf) return true
  return Object.keys(a.showIf).every(k => a.showIf[k].indexOf(String(row[k])) >= 0)
}
/**
 * 动作登记了 notSelf（行里记录上一步经办人的字段名）时，经办人本人不能做这一步。
 * 有的模块登记的是 hideForSelf（如结算申请「登记打款」的 hideForSelf='auditedBy'），按同样规则处理：置灰并说明原因。
 * 经办人按后台账号名记，后端 op() 写的是 "admin:" + 用户名，两种写法都认
 */
function selfBlocked(a, row) {
  const field = a.notSelf || a.hideForSelf
  if (!field) return false
  const by = String(row[field] ?? '').trim()
  const me = userStore.name
  return !!by && !!me && (by === me || by === 'admin:' + me)
}
function selfTip(a) {
  if (a.notSelfTip) return a.notSelfTip
  return a.hideForSelf ? '这笔是你审批通过的，登记打款需要换另一位有结算权限的后台账号' : '上一步是你经办的，这一步需要换另一个后台账号来做'
}
/**
 * 「操作」列固定在右边，宽度按本页各行实际会出现的按钮估算：每个字约 14px，带图标的按钮再加 20px，
 * 文字按钮自带的左右内边距和边框再加 6px（原先漏了这 6px，房源管理等页的最后一个按钮会掉到第二行），按钮间隔 12px，
 * 置灰按钮外面包了一层 span 再加 24px。最窄 120px，最宽 360px（再多就在格子里换行）
 */
const opWidth = computed(() => {
  const w = (label, icon) => String(label || '').length * 14 + (icon ? 20 : 0) + 6
  const base = [w('修改', true)]
  if (props.entity === 'city' && meta.value.allowEdit && checkPermi([perm('edit')])) base.push(w('地区群码')) // 「修改」和「详情」只会出现一个
  if (meta.value.allowDelete) base.push(w('删除', true))
  let widest = 0
  ;(rows.value.length ? rows.value : [{}]).forEach(row => {
    const list = base.concat((meta.value.actions || []).filter(a => actionVisible(a, row)).map(a => w(a.label) + (selfBlocked(a, row) ? 24 : 0)))
    widest = Math.max(widest, list.reduce((s, x) => s + x, 0) + 12 * (list.length - 1))
  })
  // 手机上最宽 150px，按钮在格子里换行，留出地方左右滑看其它列
  return Math.min(Math.max(widest + 24, 120), isMobile.value ? 150 : 360)
})
/**
 * 各列最小宽度按本页实际内容估算：中文约 14px 一个字，数字字母约 8px，空格和 - : . , / 约 5px；标签字小一号（12px / 7px）
 * 再加 20px 内边距；格子左右内边距共 24px。表头最多按 5 个字算（再长折行），文字列最宽 180px（再长看悬停提示），图片列 70px。
 * 原先各列都不给宽度，列多的页面（社区活动有 17 列）平均下来每列只剩 80px：标题只剩两三个字，开始时间只剩「2026-…」
 */
const textPx = (s, cjk = 14, other = 8) => [...String(s ?? '')].reduce((n, c) => n + (c.charCodeAt(0) > 0x2e80 ? cjk : /[\s\-:.,/]/.test(c) ? 5 : other), 0)
const colMins = computed(() => {
  const out = {}
  listFields.value.forEach(f => {
    if (f.type === 'image' || f.type === 'images') { out[f.name] = 70; return }
    if (f.type === 'media') { out[f.name] = 90; return }
    const tag = f.type === 'select' || f.type === 'switch'
    let w = Math.min(textPx(f.label), 70)
    rows.value.forEach(row => {
      const v = row[f.name]
      if (v === null || v === undefined || v === '') return
      let px = tag ? textPx(labelOf(f, v), 12, 7) + 20 : textPx(f.type === 'money' ? yuan(v) : v)
      if (tag && f.name === 'status' && row.extNote) px += 4 + textPx(row.extNote, 12, 7) + 20
      w = Math.max(w, px)
    })
    // 格子内边距 24px，再留 4px 余量：估算偶尔少一两像素时标签 / 数字后面会多出「…」
    out[f.name] = Math.max(Math.min(w + 28, 180), 64)
  })
  return out
})
/**
 * 所有列加起来比 1366 宽屏幕下表格能用的宽度（约 1120px）还宽时，「状态」列固定在右边、紧挨着「操作」，
 * 不管中间的列怎么横向拖动都看得见（原先社区活动、城市字典在 1366 / 1440 下「状态」都在屏幕外）。放得下的页面列顺序不变
 */
const pinStatus = computed(() => {
  if (isMobile.value) return false
  const sum = listFields.value.reduce((s, f) => s + colMins.value[f.name], 0)
  return sum + 80 + (meta.value.allowDelete ? 50 : 0) + opWidth.value > 1120
})
function runAction(a, row) {
  if (a.method === 'route') { openRooms(row.stayId); return }
  const url = a.url.replace(/\{(\w+)\}/g, (_, k) => encodeURIComponent(row[k]))
  const go = (data) => runExtAction(a.method, url, data).then(res => {
    if (res?.data?.reviewContext) {
      reviewContext.value = res.data.reviewContext
      contextOpen.value = true
      return
    }
    // 私有文件等：后端签发短时链接，新窗口打开（链接本身带签名，不需要登录态）
    if (res && res.data && res.data.openUrl) window.open(import.meta.env.VITE_APP_BASE_API + res.data.openUrl, '_blank')
    proxy.$modal.msgSuccess((res && res.msg && res.msg !== '操作成功' ? res.msg : a.label + '成功'))
    getList()
    emit('changed')
  }, e => {
    // 业务拒绝（如列表打开后余额才变负）：刷新列表，让行上的最新说明和确认框跟上
    if (e && e.isBusinessError) getList()
    return Promise.reject(e)
  })
  // 后端按行要求的二次确认（如结算申请余额不足时「登记打款」）：row.extConfirm[动作] = { text, param }，确认后带上 param=true 再提交
  const extra = row.extConfirm && row.extConfirm[a.key]
  const send = (data) => extra ? proxy.$modal.confirm(extra.text).then(() => go({ ...data, [extra.param]: true })) : go(data)
  if (a.prompt) {
    const label = a.promptLabel || '请填写原因/说明'
    return proxy.$modal.prompt((a.confirm ? a.confirm + '\n' : '') + label).then(({ value }) => {
      const reason = (value || '').trim()
      if (!reason) { proxy.$modal.msgError(a.promptLabel ? label : '必须填写原因'); return Promise.reject('empty') }
      // 后端各表的原因列宽是 255，留余量；超长先在这里拦住，不让它变成一个不透明的 500
      if (reason.length > 200) { proxy.$modal.msgError('原因不超过 200 字（当前 ' + reason.length + ' 字）'); return Promise.reject('too long') }
      return send({ reason })
    }).catch(() => {})
  } else if (a.confirm) {
    return proxy.$modal.confirm(a.confirm).then(() => send({})).catch(() => {})
  } else {
    // HTTP 拦截器已展示失败原因；收尾拒绝，避免按钮事件留下未处理异常或重复提示。
    return send({}).catch(() => {})
  }
}

async function initialize() {
  metaError.value = false
  try {
    await loadMeta()
    if (props.entity === 'roomtype') query.stayId = routeStayId()
    if (STATUS_ROUTES[props.entity] && routeStatus()) query.status = routeStatus()
    if (props.entity === 'memberbenefit') { const res = await runExtAction('get', '/kangaroo/homecontent/member-levels'); memberLevels.value = res.data || [] }
    await getList()
  } catch { metaError.value = true; rows.value = []; total.value = 0 }
}
onMounted(initialize)
defineExpose({ getList })
watch(() => route.query.stayId, () => { if (props.entity === 'roomtype' && route.name === 'KgExtRoomType') { query.stayId = routeStayId(); handleQuery() } })
// 页面已开着（keep-alive）时再从首页点进来，也要按新带的状态重新筛
watch(() => route.query.status, () => { if (STATUS_ROUTES[props.entity] && route.name === STATUS_ROUTES[props.entity] && routeStatus()) { query.status = routeStatus(); handleQuery() } })
</script>

<style scoped>
.template-guide { margin: 0 0 18px; line-height: 1.7; color: var(--el-text-color-regular); }
.city-group-guide { margin: 0 0 20px; line-height: 1.7; color: var(--el-text-color-regular); }
.city-group-guide p { margin: 6px 0 0; font-size: 13px; }
.city-guide{margin:0 0 18px;line-height:1.7;color:var(--el-text-color-regular);max-width:76ch}
/* 搜索栏标签按字数自然变宽、不折行：原来写死 84px，「收款人（小程序用户ID）」这类长标签会折成几行、被下面的按钮压住；
   短标签仍至少 84px，和原来一样对齐 */
.ext-search :deep(.el-form-item__label) {
  min-width: 84px;
  white-space: nowrap;
}
.ext-field-tip { width: 100%; margin: 4px 0 0; font-size: 12px; line-height: 1.6; color: var(--el-text-color-secondary); }
/* 2026-10-17 R3：media 字段的视频预览 */
.ext-media {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.ext-media__video {
  display: block;
  margin-top: 6px;
  width: 320px;
  max-width: 100%;
  border-radius: 6px;
  background: #000;
}
.ext-media__image {
  width: 80px;
  height: 80px;
  border-radius: 6px;
}
.ext-image-count {
  display: block;
  font-size: 12px;
  line-height: 1.4;
  color: var(--el-text-color-secondary);
}
</style>
