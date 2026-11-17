<template>
  <section class="execution">
    <el-alert title="会员履约管理" type="info" :closable="false" show-icon description="奖励依据完成的真实服务自动入账；所有房型默认开放免费间夜，底价未设置时按日常价预订。此处调整对应间夜、核对节假日、处理领取申请及审核凭证。补贴需完成实际支付后录入支付凭证，提交核销不会自动转账。" />
    <el-tabs v-model="tab" @tab-change="changeTab"><el-tab-pane v-for="t in tabs" :key="t.key" :label="t.name" :name="t.key" /></el-tabs>
    <div v-if="tab!=='reviewQueue'" class="tools"><el-button @click="load" :loading="loading">刷新</el-button><el-button v-if="tab==='calendar'" v-hasPermi="['kangaroo:memberlevel:edit']" type="primary" @click="edit('calendar',{})">配置全年节假日</el-button><el-button v-if="tab==='cases'" v-hasPermi="['kangaroo:memberlevel:edit']" @click="edit('caseCreate',{})">新增违规通知</el-button></div>
    <el-alert v-if="tab==='rooms'" type="info" :closable="false" title="按门店、房型分别定价" description="每个房型单独保存会员底价，修改一个房型不会影响其他房型。待设置的房型按日常价预订；所有房型默认开放免费间夜。会员底价不叠加其他折扣或免费间夜。"/><el-alert v-if="error" :title="error" type="error" :closable="false" />
    <el-alert v-if="tab==='reviews' && photoReview.message" :title="photoReview.message" :type="photoReview.ready?'info':'warning'" :closable="false" show-icon />
    <review-queue v-if="tab==='reviewQueue'" @create-case="createFromReport" />
    <el-table v-else v-loading="loading" :data="rows" stripe empty-text="暂无记录">
      <template v-if="tab==='requests'">
        <el-table-column prop="requestId" label="编号" width="80"/><el-table-column prop="appUserId" label="会员ID" width="100"/>
        <el-table-column label="权益" width="140"><template #default="{row}">{{ label(row.requestType) }}<span v-if="row.amountFen"> ¥{{ (row.amountFen/100).toFixed(2) }}</span></template></el-table-column>
        <el-table-column prop="content" label="使用说明" min-width="240"/><el-table-column prop="status" label="状态" :formatter="statusFormat" width="100"/>
        <el-table-column prop="proof" label="履约凭证" min-width="160"/><el-table-column prop="reviewNote" label="处理说明" min-width="160"/>
        <el-table-column label="操作" width="120"><template #default="{row}"><el-button v-if="row.status==='pending'" v-hasPermi="['kangaroo:memberlevel:edit']" link type="primary" @click="edit('fulfill',row)">处理申请</el-button></template></el-table-column>
      </template>
      <template v-else-if="tab==='reviews'">
        <el-table-column prop="reviewId" label="评价ID" width="90"/><el-table-column prop="appUserId" label="会员ID" width="90"/><el-table-column prop="content" label="评价内容" min-width="300"/>
        <el-table-column label="照片" width="150"><template #default="{row}"><el-image v-for="(src,i) in pictures(row.images)" :key="src" :src="src" :preview-src-list="pictures(row.images)" :initial-index="i" preview-teleported style="width:44px;height:44px;margin:2px" fit="cover" /></template></el-table-column>
        <el-table-column prop="reason" label="评选结果" min-width="180"/><el-table-column prop="imageNote" label="照片核验依据" min-width="180"/><el-table-column prop="checkedBy" label="照片核验人" width="130"/><el-table-column label="操作" width="160"><template #default="{row}"><el-button v-hasPermi="['kangaroo:memberlevel:edit']" link @click="edit('verify',row)">核验实拍图</el-button><el-button v-hasPermi="['kangaroo:memberlevel:edit']" link @click="edit('archive',row)">归档</el-button></template></el-table-column>
      </template>
      <template v-else-if="tab==='rooms'"><el-table-column prop="roomTypeId" label="房型ID" width="100"/><el-table-column prop="stayName" label="小院"/><el-table-column prop="typeName" label="房型"/><el-table-column label="可用免费间夜"><template #default="{row}">{{ label(row.effectiveRoomCode) }}<small v-if="!row.memberRoomCode || row.memberRoomCode==='auto'">（自动匹配）</small></template></el-table-column><el-table-column label="会员底价"><template #default="{row}">{{ row.memberPriceFen ? '¥'+(row.memberPriceFen/100).toFixed(2):'未设置' }}</template></el-table-column><el-table-column label="操作"><template #default="{row}"><el-button v-hasPermi="['kangaroo:memberlevel:edit']" link @click="edit('room',row)">配置</el-button></template></el-table-column></template>
      <template v-else-if="tab==='activities'"><el-table-column prop="activityId" label="活动ID" width="100"/><el-table-column prop="title" label="活动"/><el-table-column label="全职培训"><template #default="{row}">{{ row.memberTraining==='1'?'是':'否' }}</template></el-table-column><el-table-column label="支持免费活动权益"><template #default="{row}">{{ row.memberFree==='1'?'是':'否' }}</template></el-table-column><el-table-column label="操作"><template #default="{row}"><el-button v-hasPermi="['kangaroo:memberlevel:edit']" link @click="edit('activity',row)">配置</el-button></template></el-table-column></template>
      <template v-else-if="tab==='posts'"><el-table-column prop="postId" label="帖子ID" width="100"/><el-table-column prop="appUserId" label="会员ID" width="100"/><el-table-column prop="content" label="内容" min-width="300"/><el-table-column prop="officialRepostTime" label="已登记官方转发" width="180"/><el-table-column label="操作" width="160"><template #default="{row}"><el-button v-if="!row.officialRepostTime&&row.status==='online'" v-hasPermi="['kangaroo:memberlevel:edit']" link @click="edit('repost',row)">登记真实转发</el-button></template></el-table-column></template>
      <template v-else-if="tab==='calendar'"><el-table-column prop="holidayDate" label="禁用免费间夜日期"/><el-table-column prop="createBy" label="维护人"/></template>
      <template v-else-if="tab==='cases'"><el-table-column prop="caseId" label="编号" width="80"/><el-table-column prop="appUserId" label="会员ID" width="100"/><el-table-column prop="severity" label="级别" width="80"/><el-table-column prop="facts" label="事实依据" min-width="180"/><el-table-column prop="appeal" label="会员申诉" min-width="180"/><el-table-column prop="appealDeadline" label="申诉截止时间" width="170"/><el-table-column prop="status" label="状态" :formatter="statusFormat" width="100"/><el-table-column label="操作" width="120"><template #default="{row}"><el-button v-if="['notified','appealed'].includes(row.status)" v-hasPermi="['kangaroo:memberlevel:edit']" link @click="edit('caseDecide',row)">处理</el-button></template></el-table-column></template>
      <template v-else><el-table-column prop="createTime" label="操作时间"/><el-table-column prop="operator" label="操作人"/><el-table-column prop="action" label="动作"/><el-table-column prop="targetId" label="目标编号"/><el-table-column prop="note" label="依据" min-width="280"/></template>
    </el-table>
    <el-pagination v-if="total>20&&tab!=='calendar'&&tab!=='reviewQueue'" v-model:current-page="page" :page-size="tab==='audit'?30:20" :total="total" layout="prev,pager,next" @current-change="load"/>
    <el-dialog v-model="open" :title="dialogTitle" width="min(640px,94vw)" :close-on-click-modal="false">
      <el-form label-position="top" @submit.prevent>
        <el-alert v-if="action==='room'" :title="target.stayName+' · '+target.typeName" description="本次仅修改这个门店的这个房型。填0表示会员底价待设置，不表示免费住宿。" type="info" :closable="false"/>
        <template v-if="action==='fulfill'"><el-form-item label="处理结果"><el-radio-group v-model="form.approve"><el-radio :value="true">已实际履约，确认核销</el-radio><el-radio :value="false">驳回，退回可用权益</el-radio></el-radio-group></el-form-item><el-form-item v-if="form.approve" label="发货单号 / 服务记录 / 实际支付凭证（必填）"><el-input v-model="form.proof" maxlength="1000" type="textarea" :rows="3"/></el-form-item></template>
        <template v-if="action==='room'"><el-form-item label="此房型支持的免费间夜"><el-select v-model="form.roomCode"><el-option label="默认开放，自动匹配房型" value="auto"/><el-option label="暂停免费间夜" value="disabled"/><el-option v-for="c in ['night4','night2','night1']" :key="c" :label="label(c)" :value="c"/></el-select></el-form-item><el-form-item label="会员底价（元 / 间或床 / 晚，0为暂未设置）"><el-input-number v-model="form.price" :min="0" :max="1000000" :precision="2"/></el-form-item></template>
        <template v-if="action==='activity'"><el-form-item label="活动属性"><el-checkbox v-model="form.training">全职培训（实际签到且培训结束后奖励15分）</el-checkbox><el-checkbox v-model="form.free">可使用会员免费活动权益</el-checkbox></el-form-item></template>
        <el-form-item v-if="action==='verify'" label="照片核验"><el-radio-group v-model="form.real"><el-radio :value="true">有依据确认是实际体验照片</el-radio><el-radio :value="false">未通过实拍核验</el-radio></el-radio-group></el-form-item>
        <template v-if="action==='calendar'"><el-form-item label="年份（北京时间）"><el-input-number v-model="form.year" :min="year" :max="year+1" @change="calendarYear"/></el-form-item><el-form-item label="全部法定节假日，每行一个 YYYY-MM-DD"><el-input v-model="form.dates" type="textarea" :rows="10"/></el-form-item><el-checkbox v-model="form.confirmed">已核对该年份全部法定节假日</el-checkbox><el-form-item label="调休上班日期，每行一个 YYYY-MM-DD，没有调休可留空"><el-input v-model="form.workdates" type="textarea" :rows="5"/></el-form-item><el-checkbox v-model="form.workdaysConfirmed">已核对该年份全部调休上班日期，用于3工作日复核期限</el-checkbox></template>
        <template v-if="action==='caseCreate'"><el-form-item label="会员ID"><el-input-number v-model="form.userId" :min="1"/></el-form-item><el-form-item label="评价ID（一级处理必填）"><el-input-number v-model="form.reviewId" :min="1"/></el-form-item><el-form-item label="处理级别"><el-select v-model="form.severity"><el-option v-for="s in [1,2,3,4]" :key="s" :value="s" :label="s+'级'"/></el-select></el-form-item><el-alert type="warning" :closable="false" title="通知后保留7天申诉期；本操作不会立即扣分或冻结。"/></template>
        <el-form-item v-if="action==='caseDecide'" label="复核结果"><el-radio-group v-model="form.execute"><el-radio :value="false">撤销通知</el-radio><el-radio :value="true">确认事实，申诉期结束后执行</el-radio></el-radio-group></el-form-item>
        <el-form-item label="处理依据 / 说明（必填）"><el-input v-model="form.note" type="textarea" :rows="3" maxlength="500" show-word-limit/></el-form-item>
        <el-alert v-if="saveError" :title="saveError" type="error" :closable="false"/>
      </el-form>
      <template #footer><el-button :disabled="saving" @click="open=false">取消</el-button><el-button type="primary" :loading="saving" @click="save">确认提交</el-button></template>
    </el-dialog>
  </section>
</template>
<script setup>
import { ref,computed } from 'vue'
import request from '@/utils/request'
import { checkPermi } from '@/utils/permission'
import ReviewQueue from './ReviewQueue.vue'
const tabs=[{key:'reviewQueue',name:'待人工复核'},{key:'requests',name:'领取与核销'},{key:'rooms',name:'住宿权益配置'},{key:'activities',name:'活动与培训'},{key:'reviews',name:'评价奖励'},{key:'posts',name:'官方转发'},{key:'calendar',name:'节假日'},{key:'cases',name:'通知与申诉'},{key:'audit',name:'操作记录'}].filter(item=>item.key!=='reviewQueue'||checkPermi(['kangaroo:report:query']))
const tab=ref('requests'),page=ref(1),total=ref(0),rows=ref([]),loading=ref(false),error=ref(''),open=ref(false),action=ref(''),form=ref({}),target=ref({}),saving=ref(false),saveError=ref('')
const workdayCalendars=ref([]),photoReview=ref({})
let loadGeneration=0
const year=Number(new Intl.DateTimeFormat('en',{timeZone:'Asia/Shanghai',year:'numeric'}).format(new Date()))
const labels={night4:'四人间免费间夜',night2:'双人间免费间夜',night1:'单人间免费间夜',subsidy:'出游补贴',merch:'周边任选一',giftbox:'年度礼包',activity:'免费活动',upgrade:'房型升级',support:'专属服务',merchant:'合作店核销',recommend:'优先推荐',booking:'优先预订'}
const states={pending:'待处理',completed:'已履约',rejected:'已驳回',cancelled:'已撤销',notified:'申诉期内',appealed:'待复核',executed:'已执行'}
const label=c=>labels[c]||'未开放',statusFormat=(r,c,v)=>states[v]||v
const dialogTitle=computed(()=>({fulfill:'处理会员申请',room:'配置住宿权益',activity:'配置活动权益',verify:'核验实拍照片',archive:'归档评价（不扣积分）',repost:'登记官方转发',calendar:'设置法定节假日',caseCreate:'创建违规通知',caseDecide:'复核通知与申诉'}[action.value]))
function pictures(v){let a=[];try{a=JSON.parse(v||'[]')}catch{a=String(v||'').split(',')}return (Array.isArray(a)?a:[]).filter(Boolean).map(x=>/^https?:/.test(x)?x:import.meta.env.VITE_APP_BASE_API+x)}
async function load(){
  const current=++loadGeneration
  if(tab.value==='reviewQueue'){rows.value=[];total.value=0;error.value='';loading.value=false;return}
  const requestedTab=tab.value
  loading.value=true;error.value=''
  try{
    const r=await request({url:'/kangaroo/membership',params:{tab:requestedTab,pageNum:page.value}})
    if(current!==loadGeneration)return
    rows.value=r.data.rows||[];total.value=r.data.total||0
    if(requestedTab==='calendar')workdayCalendars.value=r.data.workdayCalendars||[]
    if(requestedTab==='reviews')photoReview.value=r.data.photoReview||{}
  }catch(e){if(current===loadGeneration)error.value=e.message||'加载失败'}
  finally{if(current===loadGeneration)loading.value=false}
}
function changeTab(){page.value=1;load()}
function edit(a,row){action.value=a;target.value=row;form.value={note:'',proof:'',approve:false,real:false,execute:false,roomCode:row.memberRoomCode||'auto',price:(row.memberPriceFen||0)/100,training:row.memberTraining==='1',free:row.memberFree==='1',year,dates:'',confirmed:false,workdates:'',workdaysConfirmed:false,severity:1,userId:undefined,reviewId:undefined};saveError.value='';if(a==='calendar')calendarYear();open.value=true}
function createFromReport(row){edit('caseCreate',{});form.value.userId=row.userId;form.value.reviewId=row.reviewId;form.value.note=row.note}
function calendarYear(){form.value.dates=rows.value.filter(r=>String(r.holidayDate).startsWith(String(form.value.year))).map(r=>String(r.holidayDate).slice(0,10)).join('\n');form.value.confirmed=false;const working=workdayCalendars.value.find(item=>item.year===form.value.year);form.value.workdates=working?.dates||'';form.value.workdaysConfirmed=false}
async function save(){if(saving.value)return;saveError.value='';if(form.value.note.trim().length<2){saveError.value='请填写处理依据';return}let url='',data={...form.value};const r=target.value,a=action.value
if(a==='fulfill')url='/requests/'+r.requestId;else if(a==='room'){url='/config/rooms/'+r.roomTypeId;data.priceFen=Math.round(data.price*100)}else if(a==='activity')url='/config/activities/'+r.activityId;else if(['verify','archive'].includes(a)){url='/reviews/'+r.reviewId;data.action=a}else if(a==='repost')url='/posts/'+r.postId+'/repost';else if(a==='calendar')url='/calendar';else if(a==='caseCreate')url='/cases';else if(a==='caseDecide')url='/cases/'+r.caseId
saving.value=true;try{await request({url:'/kangaroo/membership'+url,method:'post',data});open.value=false;await load()}catch(e){saveError.value=e.message||'提交失败，请重试'}finally{saving.value=false}}
load()
</script>
<style scoped>.execution{padding:20px}.tools{display:flex;gap:10px;margin-bottom:16px}.el-pagination{margin-top:20px}.el-alert{margin-bottom:16px}.el-checkbox{white-space:normal;height:auto;min-height:32px}</style>
