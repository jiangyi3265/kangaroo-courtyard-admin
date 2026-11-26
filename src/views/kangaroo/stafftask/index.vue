<template>
  <div class="app-container staff-tasks">
    <!-- 2026-11-03（V74）主人：「任务派发，需要有个流转过程，不能只单向发送，派发任务，可以一键发送给所有全体员工。我还可以给某一个岗位，单独的发布任务」 -->
    <div class="task-heading"><div><h2>员工任务派发</h2><p>派发任务（点名、发给全体员工、按岗位）→ 员工接收、可以回复提问、申请延期或说明做不了 → 提交图片和完成说明 → 管理员审核。每一步双方都能看到时间线；员工有新动作时这里显示「待处理」。</p></div><el-button type="primary" icon="Plus" v-hasPermi="['kangaroo:stafftask:add']" @click="openAssign">派发任务</el-button></div>
    <div class="view-switch">
      <el-radio-group v-model="view" @change="switchView"><el-radio-button value="people">按人看</el-radio-button><el-radio-button value="batches">按批次看</el-radio-button></el-radio-group>
      <el-tag v-if="query.batchId" closable type="info" @close="clearBatch">批次：{{ batchTitle }}</el-tag>
    </div>
    <template v-if="view==='people'">
      <el-form inline class="task-search" @submit.prevent="search">
        <el-form-item label="任务状态"><el-select v-model="query.status" style="width:170px" @change="search"><el-option label="全部状态" value=""/><el-option :label="'待处理'+(attentionCount?'（'+attentionCount+'）':'')" value="attention"/><el-option label="未结束" value="open"/><el-option v-for="(label,key) in statuses" :key="key" :value="key" :label="label"/></el-select></el-form-item>
        <el-form-item label="岗位"><el-select v-model="query.roleCode" style="width:150px" clearable placeholder="全部岗位" @change="search"><el-option v-for="r in ROLE_OPTIONS" :key="r.value" :value="r.value" :label="r.label"/></el-select></el-form-item>
        <el-form-item label="搜索"><el-input v-model="query.keyword" placeholder="任务、员工或门店" clearable @keyup.enter="search"/></el-form-item>
        <el-form-item><el-button type="primary" @click="search">查询</el-button><el-button icon="Refresh" @click="loadList">刷新</el-button></el-form-item>
      </el-form>
      <el-alert v-if="attentionCount&&query.status!=='attention'" :title="'有 '+attentionCount+' 条任务员工有新动作（回复、申请延期、做不了或已提交），等你处理'" type="warning" show-icon :closable="false" class="attention-alert"><el-button link type="primary" @click="query.status='attention';search()">只看待处理</el-button></el-alert>
      <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
      <el-table :data="rows" v-loading="loading" :empty-text="error || '暂无任务，点击右上方“派发任务”开始'">
        <el-table-column prop="taskId" label="编号" width="85"/><el-table-column prop="title" label="任务" min-width="200" show-overflow-tooltip/>
        <el-table-column label="负责人" min-width="140"><template #default="{row}">{{ row.nickname || '账号' + row.assigneeId }}<small>#{{ row.assigneeId }}</small></template></el-table-column>
        <el-table-column prop="roleLabel" label="岗位" width="110"/>
        <el-table-column prop="storeName" label="门店" min-width="140" show-overflow-tooltip/>
        <el-table-column label="状态" width="150"><template #default="{row}"><el-tag :type="tones[row.status]">{{ statuses[row.status] || row.status }}</el-tag><el-tag v-if="row.adminAttention==='1'" type="danger" effect="plain" class="attention-tag">待处理</el-tag></template></el-table-column>
        <el-table-column label="截止日期" min-width="130"><template #default="{row}">{{ row.dueDate || '未设置' }}<small v-if="row.requestedDueDate" class="warn">申请延到 {{ row.requestedDueDate }}</small></template></el-table-column>
        <el-table-column prop="updateTime" label="最近更新" width="170"/>
        <el-table-column label="操作" width="100" fixed="right"><template #default="{row}"><el-button link type="primary" v-hasPermi="['kangaroo:stafftask:query']" @click="openDetail(row.taskId)">{{ row.adminAttention==='1' ? '去处理' : '查看详情' }}</el-button></template></el-table-column>
      </el-table>
      <pagination v-show="total>0" :total="total" v-model:page="query.pageNum" :limit="20" @pagination="loadList"/>
    </template>
    <template v-else>
      <el-form inline class="task-search" @submit.prevent="loadBatches(true)">
        <el-form-item label="搜索"><el-input v-model="batchQuery.keyword" placeholder="任务标题" clearable @keyup.enter="loadBatches(true)"/></el-form-item>
        <el-form-item><el-button type="primary" @click="loadBatches(true)">查询</el-button><el-button icon="Refresh" @click="loadBatches(false)">刷新</el-button></el-form-item>
      </el-form>
      <el-alert v-if="batchError" :title="batchError" type="error" :closable="false" show-icon />
      <el-table :data="batches" v-loading="batchLoading" :empty-text="batchError || '还没有派发过任务'">
        <el-table-column prop="title" label="任务" min-width="200" show-overflow-tooltip/>
        <el-table-column prop="scopeLabel" label="派给" min-width="160" show-overflow-tooltip/>
        <el-table-column label="完成" min-width="170"><template #default="{row}"><div class="progress"><span>{{ row.done }}/{{ row.tasks }}</span><el-progress :percentage="row.tasks ? Math.round(row.done*100/row.tasks) : 0" :show-text="false" :stroke-width="8"/></div></template></el-table-column>
        <el-table-column label="待审核" width="80"><template #default="{row}">{{ row.waiting }}</template></el-table-column>
        <el-table-column label="待处理" width="80"><template #default="{row}"><span :class="{warn:row.attention>0}">{{ row.attention }}</span></template></el-table-column>
        <el-table-column label="做不了 / 关闭" width="110"><template #default="{row}">{{ row.stopped }}</template></el-table-column>
        <el-table-column label="派发" width="170"><template #default="{row}">{{ row.createBy }}<small>{{ row.createTime }}</small></template></el-table-column>
        <el-table-column label="操作" width="110" fixed="right"><template #default="{row}"><el-button link type="primary" @click="openBatch(row)">看每个人</el-button></template></el-table-column>
      </el-table>
      <pagination v-show="batchTotal>0" :total="batchTotal" v-model:page="batchQuery.pageNum" :limit="20" @pagination="loadBatches(false)"/>
    </template>

    <el-drawer v-model="assignOpen" title="派发员工任务" size="min(620px, 100%)" :before-close="closeAssign" :close-on-click-modal="false" :close-on-press-escape="!saving" :show-close="!saving">
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" :disabled="saving">
        <el-form-item label="派给谁">
          <el-radio-group v-model="form.mode" @change="refreshAudience"><el-radio-button value="pick">点名</el-radio-button><el-radio-button value="all">全体员工</el-radio-button><el-radio-button value="role">按岗位</el-radio-button></el-radio-group>
        </el-form-item>
        <template v-if="form.mode==='pick'">
          <el-form-item label="选人" prop="grantIds">
            <div class="pick-row"><el-select v-model="pickRole" clearable placeholder="全部岗位" style="width:150px" @change="searchRecipients(peopleKeyword)"><el-option v-for="r in ROLE_OPTIONS" :key="r.value" :value="r.value" :label="r.label"/></el-select>
            <el-select v-model="form.grantIds" multiple filterable remote :remote-method="searchRecipients" :loading="recipientLoading" :multiple-limit="100" placeholder="搜索员工昵称或门店，可多选" class="pick-select"><el-option v-for="person in people" :key="person.grantId" :value="person.grantId" :label="(person.nickname || '账号'+person.appUserId)+' · '+person.roleLabel+' · '+person.storeName+' (#'+person.appUserId+')'"/></el-select></div>
            <el-button v-if="peopleMore" link type="primary" :loading="recipientLoading" @click="loadPeople(true)">加载更多</el-button><small>一次最多点名 100 人，每人独立接收、提交、审核。人多请用「全体员工」或「按岗位」。</small>
          </el-form-item>
        </template>
        <template v-else>
          <el-form-item v-if="form.mode==='role'" label="岗位" prop="roleCode"><el-select v-model="form.roleCode" placeholder="选一个岗位" style="width:100%" @change="refreshAudience"><el-option v-for="r in roles" :key="r.roleCode" :value="r.roleCode" :label="r.label+'（'+r.people+' 人）'"/></el-select></el-form-item>
          <div class="pick-row">
            <el-form-item label="只发某个城市（可不填）"><el-input v-model="form.city" clearable placeholder="例如：大理" @input="clearAudience" @change="refreshAudience"/></el-form-item>
            <el-form-item label="只发某家门店（可不填）"><el-select v-model="form.storeId" clearable filterable placeholder="全部门店" @change="refreshAudience"><el-option v-for="s in stores" :key="s.storeId" :value="s.storeId" :label="s.storeName"/></el-select></el-form-item>
          </div>
          <el-alert v-if="audience" :type="audience.count>audience.max||!audience.count ? 'error' : 'info'" :closable="false" show-icon :title="audience.count ? '将发给 '+audience.count+' 人（一人一条）'+(audience.count>audience.max ? '，超过一次 '+audience.max+' 人的上限，请按城市或门店分开发' : '') : '没有符合条件的在职员工'"><p v-if="audience.sample.length" class="sample">{{ audience.sample.map(p=>(p.nickname||'账号'+p.appUserId)+'（'+p.roleLabel+' · '+p.storeName+'）').join('、') }}{{ audience.count>audience.sample.length ? ' 等' : '' }}</p></el-alert>
          <el-button v-if="audienceError" link type="primary" @click="refreshAudience">重新读取收件人</el-button>
          <small>全体员工 = 换工主理人、小院主理人、线上任务专员、商家服务人、城市负责人（合作商家不算）。一人有好几个岗位、好几家店，只发一条。</small>
        </template>
        <el-form-item label="任务标题" prop="title"><el-input v-model="form.title" maxlength="100" show-word-limit placeholder="例如：补充本周门店实拍资料"/></el-form-item>
        <el-form-item label="任务要求" prop="description"><el-input v-model="form.description" type="textarea" :rows="6" maxlength="3000" show-word-limit placeholder="写清要完成什么、图片拍哪些内容，以及通过审核的标准"/></el-form-item>
        <el-form-item label="截止日期（可不填）"><el-date-picker v-model="form.dueDate" type="date" value-format="YYYY-MM-DD" :disabled-date="beforeToday" placeholder="选择日期"/></el-form-item>
        <p class="form-tip">确认派发后，员工在员工端会收到提醒；可以接收、回复提问、申请延期或说明做不了，完成时填写说明并上传1至9张图片。</p>
      </el-form>
      <template #footer><el-button :disabled="saving" @click="assignOpen=false">取消</el-button><el-button type="primary" :loading="saving" :disabled="!assignCount" @click="assign">确认派发{{ assignCount ? '（'+assignCount+'人）' : '' }}</el-button></template>
    </el-drawer>

    <el-drawer v-model="detailOpen" title="任务详情与流转记录" size="min(780px, 100%)" :close-on-click-modal="!working" :close-on-press-escape="!working" :show-close="!working">
      <div v-loading="detailLoading"><template v-if="detail">
        <div class="detail-heading"><h3>{{ detail.title }}</h3><div><el-tag :type="tones[detail.status]">{{ statuses[detail.status] || detail.status }}</el-tag><el-tag v-if="detail.adminAttention==='1'" type="danger" effect="plain" class="attention-tag">待处理</el-tag></div></div>
        <p>{{ detail.nickname || '账号'+detail.assigneeId }} · {{ detail.roleLabel }} · {{ detail.storeName }}</p><p class="muted">截止：{{ detail.dueDate || '未设置' }} · 派发人：{{ detail.createBy }}</p>
        <el-alert v-if="detail.requestedDueDate" type="warning" :closable="false" show-icon :title="'员工申请把截止日期延到 '+detail.requestedDueDate+'，在下面「改截止日期」里处理'"/>
        <h4>任务要求</h4><p class="pre">{{ detail.description }}</p>
        <h4>流转记录</h4>
        <el-timeline class="timeline">
          <el-timeline-item v-for="e in detail.events" :key="e.eventId" :timestamp="e.createTime" placement="top" :type="e.actorType==='admin' ? 'primary' : 'success'">
            <p class="event-head"><b>{{ e.actorName || (e.actorType==='admin' ? '管理员' : '员工') }}</b>（{{ e.actorType==='admin' ? '后台' : '员工' }}）{{ e.actionLabel }}<span v-if="e.dueDate" class="muted"> · {{ e.action==='extend_request' ? '希望延到' : '截止' }} {{ e.dueDate }}</span></p>
            <p v-if="e.content" class="pre event-body">{{ e.content }}</p>
            <div v-if="e.images.length" class="proof-images"><el-image v-for="(img,n) in e.images" :key="img.fileId" :src="imageUrl(img.url)" :preview-src-list="e.images.map(v=>imageUrl(v.url))" :initial-index="n" fit="cover" preview-teleported /></div>
          </el-timeline-item>
        </el-timeline>
        <el-empty v-if="!detail.events.length" description="还没有流转记录" :image-size="60"/>
        <section v-if="detail.canReview" v-hasPermi="['kangaroo:stafftask:audit']" class="review-form">
          <h4>审核最新提交</h4><el-input v-model="reviewNote" :disabled="working" type="textarea" :rows="3" maxlength="1000" show-word-limit placeholder="驳回时必须写清修改原因；通过时可填写审核意见"/>
          <div class="review-actions"><el-button type="danger" plain :disabled="working" @click="review('reject')">驳回，通知修改</el-button><el-button type="primary" :loading="working" @click="review('approve')">通过审核</el-button></div>
        </section>
        <section v-if="handleActions.length" v-hasPermi="['kangaroo:stafftask:handle']" class="review-form">
          <h4>处理</h4>
          <el-radio-group v-model="handleForm.action" class="handle-actions"><el-radio-button v-for="a in handleActions" :key="a.value" :value="a.value">{{ a.label }}</el-radio-button></el-radio-group>
          <el-date-picker v-if="handleForm.action==='extend'" v-model="handleForm.dueDate" type="date" value-format="YYYY-MM-DD" :disabled-date="beforeToday" placeholder="新的截止日期" class="handle-field"/>
          <el-select v-if="handleForm.action==='reassign'" v-model="handleForm.grantId" filterable remote :remote-method="searchReassign" :loading="recipientLoading" placeholder="搜索要转给的员工" class="handle-field"><el-option v-for="person in reassignPeople" :key="person.grantId" :value="person.grantId" :label="(person.nickname || '账号'+person.appUserId)+' · '+person.roleLabel+' · '+person.storeName"/></el-select>
          <el-input v-model="handleForm.content" :disabled="working" type="textarea" :rows="3" maxlength="1000" show-word-limit :placeholder="HANDLE_TIPS[handleForm.action]" class="handle-field"/>
          <div class="review-actions"><el-button type="primary" :loading="working" @click="handle">{{ (handleActions.find(a=>a.value===handleForm.action)||{}).button || '确认' }}</el-button></div>
        </section>
        <el-collapse v-if="detail.submissions.length" class="submissions"><el-collapse-item :title="'完成回执（'+detail.submissions.length+' 次提交）'">
          <section v-for="(submission,i) in detail.submissions" :key="submission.submissionId" class="submission">
            <div class="detail-heading"><h4>{{ i===0 ? '最新完成回执' : '历史完成回执' }}</h4><el-tag :type="tones[submission.status]">{{ statuses[submission.status] }}</el-tag></div>
            <p class="muted">提交于 {{ submission.createTime }}</p><p class="pre">{{ submission.content }}</p>
            <div class="proof-images"><el-image v-for="(img,n) in submission.images" :key="img.fileId" :src="imageUrl(img.url)" :preview-src-list="submission.images.map(v=>imageUrl(v.url))" :initial-index="n" fit="cover" preview-teleported /></div>
            <p v-if="submission.reviewNote" class="review-note">{{ submission.status==='rejected' ? '驳回原因' : '审核意见' }}：{{ submission.reviewNote }}</p>
          </section>
        </el-collapse-item></el-collapse>
      </template></div>
    </el-drawer>
  </div>
</template>
<script setup name="KgStaffTask">
import {ref,reactive,computed,onMounted,onBeforeUnmount} from 'vue'
import {ElMessage,ElMessageBox} from 'element-plus'
import {listStaffTasks,taskRecipients,getStaffTask,assignStaffTask,reviewStaffTask,listTaskBatches,taskRoles,taskAudience,handleStaffTask} from '@/api/kangaroo/stafftask'
import {listStoreOptions} from '@/api/kangaroo/job'
import {imageUrl} from '@/utils/imageUrl'
const statuses={pending:'待接收',accepted:'进行中',submitted:'待审核',approved:'已完成',rejected:'已驳回',declined:'做不了',closed:'已关闭'}
const tones={pending:'info',accepted:'primary',submitted:'warning',approved:'success',rejected:'danger',declined:'danger',closed:'info'}
const ROLE_OPTIONS=[{value:'manager',label:'换工主理人'},{value:'keeper',label:'小院主理人'},{value:'online_staff',label:'线上任务专员'},{value:'merchant_service',label:'商家服务人'},{value:'city_lead',label:'城市负责人'}]
const HANDLE_TIPS={reply:'回复员工的提问或留言（必填）',extend:'说明（可不填），例如：同意延期',reassign:'转派说明（可不填），原负责人和新负责人都会收到',close:'关闭原因（可不填），员工会收到',reopen:'说明（可不填），任务会回到「待接收」'}
const view=ref('people'),rows=ref([]),total=ref(0),loading=ref(false),error=ref(''),attentionCount=ref(0),query=reactive({pageNum:1,status:'',keyword:'',roleCode:'',batchId:null}),batchTitle=ref('')
let listSeq=0,detailSeq=0,peopleSeq=0,audienceSeq=0,batchSeq=0,timer
async function loadList(){
  const seq=++listSeq
  loading.value=true
  error.value=''
  try{
    const r=await listStaffTasks({...query})
    if(seq===listSeq){rows.value=r.data.rows;total.value=r.data.total;attentionCount.value=Number(r.data.attentionCount||0)}
  }catch{
    if(seq===listSeq){rows.value=[];total.value=0;attentionCount.value=0;error.value='任务读取失败，请点击刷新重试'}
  }finally{if(seq===listSeq)loading.value=false}
}
function search(){query.pageNum=1;loadList()}
const batches=ref([]),batchTotal=ref(0),batchLoading=ref(false),batchError=ref(''),batchQuery=reactive({pageNum:1,keyword:''})
async function loadBatches(reset){
  if(reset)batchQuery.pageNum=1
  const seq=++batchSeq
  batchLoading.value=true
  batchError.value=''
  try{
    const r=await listTaskBatches({...batchQuery})
    if(seq===batchSeq){batches.value=r.data.rows;batchTotal.value=r.data.total}
  }catch{
    if(seq===batchSeq){batches.value=[];batchTotal.value=0;batchError.value='批次读取失败，请刷新重试'}
  }finally{if(seq===batchSeq)batchLoading.value=false}
}
function switchView(v){if(v==='batches')loadBatches(false);else loadList()}
function openBatch(row){query.batchId=row.batchId;batchTitle.value=row.title;query.status='';view.value='people';search()}
function clearBatch(){query.batchId=null;batchTitle.value='';search()}

const assignOpen=ref(false),saving=ref(false),formRef=ref(),form=reactive({mode:'pick',grantIds:[],roleCode:'',city:'',storeId:null,title:'',description:'',dueDate:null,requestId:''})
const rules={grantIds:[{validator:(r,v,cb)=>form.mode!=='pick'||(v&&v.length)?cb():cb(new Error('请选择至少一位员工')),trigger:'change'}],roleCode:[{validator:(r,v,cb)=>form.mode!=='role'||v?cb():cb(new Error('请选择岗位')),trigger:'change'}],title:[{required:true,whitespace:true,message:'请填写任务标题',trigger:'blur'}],description:[{required:true,whitespace:true,message:'请填写任务要求',trigger:'blur'}]}
const people=ref([]),recipientLoading=ref(false),peopleMore=ref(false),pickRole=ref(''),roles=ref([]),stores=ref([]),audience=ref(null),audienceError=ref(false);let peoplePage=1,peopleKeyword=''
const assignCount=computed(()=>form.mode==='pick'?form.grantIds.length:(audience.value&&audience.value.count<=audience.value.max?audience.value.count:0))
function beforeToday(date){const today=new Date();today.setHours(0,0,0,0);return date<today}
function newRequestId(){return globalThis.crypto?.randomUUID?.() || Date.now().toString(36)+'_'+Math.random().toString(36).slice(2)+'_'+Math.random().toString(36).slice(2)}
function openAssign(){Object.assign(form,{mode:'pick',grantIds:[],roleCode:'',city:'',storeId:null,title:'',description:'',dueDate:null,requestId:newRequestId()});people.value=[];peopleKeyword='';peoplePage=1;pickRole.value='';clearAudience();assignOpen.value=true;loadPeople();taskRoles().then(r=>{roles.value=r.data}).catch(()=>{});if(!stores.value.length)listStoreOptions().then(r=>{stores.value=(r.rows||[])}).catch(()=>{})}
function closeAssign(done){if(!saving.value)done()}
async function loadPeople(more=false){const seq=++peopleSeq;if(more)peoplePage++;recipientLoading.value=true;try{const r=await taskRecipients({keyword:peopleKeyword,roleCode:pickRole.value||undefined,pageNum:peoplePage});if(seq!==peopleSeq)return;const keep=more?people.value:people.value.filter(p=>form.grantIds.includes(p.grantId));people.value=[...new Map([...keep,...r.data.rows].map(p=>[p.grantId,p])).values()];peopleMore.value=r.data.hasMore}catch(e){if(seq===peopleSeq&&more)peoplePage--}finally{if(seq===peopleSeq)recipientLoading.value=false}}
function searchRecipients(q){peopleKeyword=q||'';peoplePage=1;loadPeople()}
function clearAudience(){audienceSeq++;audience.value=null;audienceError.value=false}
async function refreshAudience(){
  clearAudience()
  const seq=audienceSeq
  formRef.value?.clearValidate?.()
  if(form.mode==='pick'||(form.mode==='role'&&!form.roleCode))return
  try{
    const r=await taskAudience({mode:form.mode,roleCode:form.mode==='role'?form.roleCode:undefined,city:form.city||undefined,storeId:form.storeId||undefined})
    if(seq===audienceSeq)audience.value=r.data
  }catch{if(seq===audienceSeq)audienceError.value=true}
}
async function assign(){
  if(saving.value)return
  saving.value=true
  try{
    await formRef.value.validate()
    const pick=form.mode==='pick'
    if(!pick){
      if(!audience.value||!audience.value.count||audience.value.count>audience.value.max)return
      try{await ElMessageBox.confirm('将给 '+audience.value.count+' 位员工每人派一条「'+form.title.trim()+'」，确认派发？','确认派发',{type:'warning',confirmButtonText:'确认派发',cancelButtonText:'再看看'})}catch{return}
    }
    const body={...form,grantIds:pick?[...form.grantIds]:undefined,roleCode:form.mode==='role'?form.roleCode:undefined,
      city:pick?undefined:(form.city||undefined),storeId:pick?undefined:(form.storeId||undefined),audienceVersion:pick?undefined:audience.value.version}
    try{
      const r=await assignStaffTask(body)
      ElMessage.success('已派发 '+r.data.count+' 个任务，员工端会收到提醒')
    }catch(error){
      // 业务拒绝后重新核对收件人。网络中断时沿用原确认内容和提交编号取回回执。
      if(!pick && error?.isBusinessError)await refreshAudience()
      return
    }
    assignOpen.value=false
    query.pageNum=1;query.status='';query.batchId=null;batchTitle.value='';view.value='people'
    await loadList()
  }catch{/* 表单显示对应校验错误。 */}finally{saving.value=false}
}

const detailOpen=ref(false),detailLoading=ref(false),detail=ref(null),reviewNote=ref(''),working=ref(false),handleForm=reactive({action:'reply',content:'',dueDate:null,grantId:null}),reassignPeople=ref([])
const handleActions=computed(()=>{const d=detail.value;if(!d)return[];const out=[];if(d.canReply)out.push({value:'reply',label:'回复',button:'发送回复'});if(d.canExtend)out.push({value:'extend',label:'改截止日期',button:'确认修改'});if(d.canReassign)out.push({value:'reassign',label:'转派',button:'确认转派'});if(d.canReopen)out.push({value:'reopen',label:'退回重新处理',button:'退回给员工'});if(d.canClose)out.push({value:'close',label:'关闭任务',button:'关闭任务'});return out})
function resetHandle(d){Object.assign(handleForm,{action:(d&&d.canReply)?'reply':(d&&d.canReopen?'reopen':'reply'),content:'',dueDate:d&&d.requestedDueDate?d.requestedDueDate:null,grantId:null});reassignPeople.value=[]}
async function openDetail(id){const seq=++detailSeq;detail.value=null;reviewNote.value='';detailOpen.value=true;detailLoading.value=true;try{const r=await getStaffTask(id);if(seq===detailSeq){detail.value=r.data;resetHandle(r.data)}}catch(e){if(seq===detailSeq)ElMessage.error('详情读取失败，请关闭后重试')}finally{if(seq===detailSeq)detailLoading.value=false}}
async function searchReassign(q){const seq=++peopleSeq;recipientLoading.value=true;try{const r=await taskRecipients({keyword:q||'',pageNum:1});if(seq===peopleSeq)reassignPeople.value=r.data.rows}catch(e){/* 请求层已提示 */}finally{if(seq===peopleSeq)recipientLoading.value=false}}
async function review(action){if(working.value||!detail.value)return;const target=detail.value;if(action==='reject'&&!reviewNote.value.trim()){ElMessage.warning('请填写驳回原因，告诉员工需要修改什么');return}try{await ElMessageBox.confirm(action==='approve'?'确认通过本次完成回执？':'确认驳回本次提交？员工将收到原因并可以修改重交。','审核确认',{type:action==='reject'?'warning':'info',confirmButtonText:'确认',cancelButtonText:'取消'})}catch{return}if(detail.value!==target||working.value)return;working.value=true;try{const r=await reviewStaffTask(target.taskId,{version:target.version,action,reason:reviewNote.value.trim()});detail.value=r.data;resetHandle(r.data);reviewNote.value='';ElMessage.success(action==='approve'?'审核已通过':'已驳回并通知员工');await loadList()}catch(e){/* 保留审核意见；状态冲突时可重新打开回执核对。 */}finally{working.value=false}}
async function handle(){
  if(working.value||!detail.value)return
  const target=detail.value,a=handleForm.action,content=handleForm.content.trim()
  if(a==='reply'&&!content){ElMessage.warning('请填写回复内容');return}
  if(a==='extend'&&!handleForm.dueDate){ElMessage.warning('请选择新的截止日期');return}
  if(a==='reassign'&&!handleForm.grantId){ElMessage.warning('请选择要转给的员工');return}
  if(['close','reassign','reopen'].includes(a)){const text={close:'关闭后员工不能再提交，确认关闭这个任务？',reassign:'转派后原负责人看不到这个任务，新负责人从「待接收」开始，确认转派？',reopen:'任务会回到「待接收」，员工重新接收后继续做，确认退回？'}[a];try{await ElMessageBox.confirm(text,'确认',{type:'warning',confirmButtonText:'确认',cancelButtonText:'取消'})}catch{return}}
  if(detail.value!==target||working.value)return
  working.value=true
  try{const r=await handleStaffTask(target.taskId,{version:target.version,action:a,content,dueDate:a==='extend'?handleForm.dueDate:undefined,grantId:a==='reassign'?handleForm.grantId:undefined});detail.value=r.data;resetHandle(r.data);ElMessage.success({reply:'已回复，员工会收到提醒',extend:'截止日期已修改并通知员工',reassign:'已转派并通知双方',close:'任务已关闭',reopen:'已退回给员工重新处理'}[a]);await loadList()}catch(e){/* 请求层已提示；内容保留，版本冲突时重新打开详情核对 */}finally{working.value=false}
}
onMounted(()=>{loadList();timer=setInterval(()=>{if(document.hidden||detailOpen.value||assignOpen.value)return;if(view.value==='people')loadList();else loadBatches(false)},30000)})
onBeforeUnmount(()=>{listSeq++;detailSeq++;peopleSeq++;audienceSeq++;batchSeq++;clearInterval(timer)})
</script>
<style scoped>
.task-heading,.detail-heading { display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap; }
.task-heading { margin-bottom:18px; }.task-heading h2 { margin:0 0 8px;font-size:22px; }.task-heading p,.form-tip { color:var(--el-text-color-secondary);line-height:1.7;max-width:80ch; }
.view-switch { display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px; }
small { display:block;color:var(--el-text-color-secondary);line-height:1.7; }.warn { color:var(--el-color-danger); }.pre { white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.8; }.muted { color:var(--el-text-color-secondary);font-size:13px; }
.attention-tag { margin-left:6px; }.attention-alert { margin-bottom:14px; }
.progress { display:flex;align-items:center;gap:10px; }.progress span { min-width:46px; }.progress :deep(.el-progress) { flex:1; }
.pick-row { display:flex;gap:10px;flex-wrap:wrap;width:100%; }.pick-select { flex:1;min-width:240px; }.sample { margin:6px 0 0;line-height:1.7; }
.timeline { padding-left:2px;margin-top:10px; }.event-head { margin:0;line-height:1.7; }.event-body { margin:6px 0 0; }
.submission { padding:16px 0;border-top:1px solid var(--el-border-color-lighter); }.submission h4,.review-form h4 { margin:0 0 10px; }.submissions { margin-top:10px; }
.proof-images { display:flex;flex-wrap:wrap;gap:10px;margin:10px 0; }.proof-images :deep(.el-image) { width:96px;height:96px;border-radius:6px; }
.review-note { padding:12px;background:var(--el-fill-color-light);line-height:1.7;white-space:pre-wrap;overflow-wrap:anywhere; }
.review-actions { display:flex;justify-content:flex-end;flex-wrap:wrap;gap:12px;margin-top:16px; }.review-actions :deep(.el-button) { margin:0; }
.review-form { border-top:1px solid var(--el-border-color-lighter);padding:18px 0; }.handle-actions { flex-wrap:wrap;margin-bottom:12px; }.handle-field { display:block;width:100%;margin-top:10px; }
.detail-heading h3 { max-width:100%;overflow-wrap:anywhere; }
@media(max-width:767px){.task-heading h2{font-size:20px}.proof-images :deep(.el-image){width:80px;height:80px}.task-search :deep(.el-form-item){margin-right:10px}}
</style>
