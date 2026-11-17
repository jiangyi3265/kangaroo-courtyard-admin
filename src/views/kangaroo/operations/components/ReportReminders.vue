<template>
  <section class="reminders" aria-label="日报周报催报">
    <el-alert title="发送到小程序员工端「消息 → 平台通知」，点击通知可打开对应报表。日报 18:00 后提交；周报按所选日期所在周填报。" type="info" show-icon :closable="false" />
    <el-form inline class="reminder-filters" @submit.prevent="preview">
      <el-form-item label="报表"><el-radio-group v-model="filters.kind" :disabled="sending"><el-radio-button value="daily" label="daily">日报</el-radio-button><el-radio-button value="weekly" label="weekly">周报</el-radio-button></el-radio-group></el-form-item>
      <el-form-item :label="filters.kind==='daily'?'日报日期':'周内日期'"><el-date-picker v-model="filters.date" type="date" value-format="YYYY-MM-DD" :clearable="false" :disabled="sending" :disabled-date="futureDate" style="width:155px" /></el-form-item>
      <el-form-item label="城市"><el-select v-model="filters.cityId" filterable placeholder="选择授权城市" :disabled="sending" style="width:160px"><el-option v-for="c in cities" :key="c.cityId" :label="c.name" :value="c.cityId" /></el-select></el-form-item>
      <el-form-item label="身份"><el-select v-model="filters.roleCode" clearable placeholder="全部身份" :disabled="sending" style="width:140px"><el-option label="小院主理人" value="keeper" /><el-option label="换工主理人" value="manager" /></el-select></el-form-item>
      <el-form-item><el-button type="primary" :loading="loading" :disabled="sending||!filters.cityId" @click="preview">预览催报对象</el-button></el-form-item>
    </el-form>
    <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" class="space" />
    <template v-if="result">
      <div class="recipient-head"><div><h3>{{ result.kind==='daily'?'日报':'周报' }} · {{ result.periodStart }}{{ result.kind==='weekly'?' 起的一周':'' }}</h3><p>共 {{ result.total }} 项填报任务，{{ result.eligibleCount }} 项可催报。已提交及今天已催报的任务自动跳过。</p></div><el-input v-model="person" clearable placeholder="搜索人员姓名" aria-label="搜索人员姓名" style="width:200px" :disabled="sending" /></div>
      <el-table ref="recipientTable" :data="visibleRows" row-key="targetKey" @selection-change="selectionChanged" stripe empty-text="没有符合条件的填报人员，请核对城市及有效授权。">
        <el-table-column type="selection" width="48" :selectable="row=>row.eligible&&!sending" reserve-selection />
        <el-table-column prop="recipientName" label="接收人" min-width="110" />
        <el-table-column label="身份" width="120"><template #default="{row}">{{ roleLabel(row.roleCode) }}</template></el-table-column>
        <el-table-column prop="targetName" label="填报范围" min-width="180" show-overflow-tooltip />
        <el-table-column label="状态" min-width="140"><template #default="{row}"><el-tag :type="row.reportStatus==='submitted'?'success':'info'">{{ row.reportStatus==='submitted'?'已提交':row.reportStatus==='missing'?'待建立草稿':'待提交' }}</el-tag></template></el-table-column>
        <el-table-column label="催报说明" min-width="215"><template #default="{row}">{{ row.reason||'可发送提醒' }}</template></el-table-column>
      </el-table>
      <div class="send-bar"><div><strong>已选 {{ selected.length }} 项待办 · {{ recipientCount }} 人</strong><p>每份报表每天最多手动催报一次。发送时再次核对权限和提交状态。</p></div><el-button v-hasPermi="['kangaroo:operations:remind']" type="primary" :disabled="!selected.length||selected.length>200" :loading="sending" @click="confirmSend">{{ retryBody?'重试发送':'发送催报提醒' }}</el-button></div>
    </template>
    <el-empty v-else description="选择城市和日期，先预览本次催报对象" :image-size="75" />
    <section class="history"><div class="recipient-head"><div><h3>发送记录</h3><p>显示所选城市最近 50 批。打开记录可查看最新已读和提交状态。</p></div><el-button :disabled="!filters.cityId" :loading="historyLoading" @click="loadHistory">刷新记录</el-button></div>
      <el-table :data="batches" v-loading="historyLoading" stripe empty-text="该城市暂无后台催报记录">
        <el-table-column prop="createdAt" label="发送时间" width="170" /><el-table-column label="报表" width="85"><template #default="{row}">{{ row.reportKind==='daily'?'日报':'周报' }}</template></el-table-column><el-table-column prop="periodStart" label="报表日期 / 周起始" width="165" /><el-table-column prop="operatorName" label="操作人" min-width="100" /><el-table-column prop="sentCount" label="已发送" width="85" /><el-table-column prop="skippedCount" label="已跳过" width="85" /><el-table-column label="跟进" width="130"><template #default="{row}"><el-button type="primary" plain size="small" @click="openBatch(row.batchId)">查看提交进度</el-button></template></el-table-column>
      </el-table>
    </section>
    <el-dialog v-model="confirmOpen" title="确认催报对象" width="min(680px,95vw)" :close-on-click-modal="!sending" :close-on-press-escape="!sending" :show-close="!sending">
      <p>将发送 {{ selected.length }} 项待办提醒给 {{ recipientCount }} 人。通知包含报表日期与填报范围，可直接打开报表。</p>
      <el-table :data="selected" max-height="300"><el-table-column prop="recipientName" label="接收人" width="120" /><el-table-column prop="targetName" label="填报范围" /></el-table>
      <el-alert v-if="sendError" :title="sendError" type="error" :closable="false" class="space" />
      <template #footer><el-button :disabled="sending" @click="confirmOpen=false">取消</el-button><el-button type="primary" :loading="sending" @click="send">{{ retryBody?'重试本次发送':'确认发送' }}</el-button></template>
    </el-dialog>
    <el-dialog v-model="detailOpen" title="催报跟进" width="min(1080px,96vw)">
      <template v-if="batch"><div class="tracking-summary"><span>已发送 <strong>{{ batch.sentCount }}</strong></span><span>已读 <strong>{{ batch.readCount }}</strong></span><span>已提交 <strong>{{ batch.submittedCount }}</strong></span><span>待提交 <strong>{{ batch.pendingCount }}</strong></span><el-button :loading="detailLoading" @click="openBatch(batch.batchId)">刷新进度</el-button></div>
        <p class="note">已读仅表示通知被标记为已读；提交状态以原始报表为准。同一份共享周报由有权限的人提交后，相关待办一并完成。</p>
        <el-table :data="batch.rows" stripe><el-table-column prop="recipientName" label="接收人" width="110" /><el-table-column prop="targetName" label="填报范围" min-width="160" /><el-table-column label="进度" width="135"><template #default="{row}"><el-tag :type="row.reportStatus==='submitted'?'success':row.deliveryStatus==='sent'?'warning':'info'">{{ row.trackingStatus }}</el-tag></template></el-table-column><el-table-column prop="submittedAt" label="提交时间" width="170" /><el-table-column prop="skipReason" label="跳过原因" min-width="155" /><el-table-column v-if="batch.reportKind==='daily'" label="报表" width="80"><template #default="{row}"><el-button v-if="row.reportId" link type="primary" @click="$emit('open-report','daily',row.reportId)">查看</el-button></template></el-table-column></el-table>
      </template>
      <template #footer><el-button @click="detailOpen=false">关闭</el-button></template>
    </el-dialog>
  </section>
</template>
<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'
const props=defineProps({cities:{type:Array,default:()=>[]}})
defineEmits(['open-report'])
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
const filters=reactive({kind:'daily',date:today,cityId:null,roleCode:''}), result=ref(null), person=ref(''), selected=ref([]), recipientTable=ref(null),loading=ref(false),sending=ref(false),error=ref(''),sendError=ref(''),confirmOpen=ref(false),retryBody=ref(null),batches=ref([]),historyLoading=ref(false),detailOpen=ref(false),detailLoading=ref(false),batch=ref(null)
let previewSeq=0,historySeq=0
const visibleRows=computed(()=>result.value?.rows.filter(r=>!person.value||r.recipientName.includes(person.value))||[]),recipientCount=computed(()=>new Set(selected.value.map(r=>r.recipientId)).size)
const roleLabel=r=>r==='keeper'?'小院主理人':'换工主理人',futureDate=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')>today
const api=(path='',method='get',data)=>request({url:'/kangaroo/operations/reminders'+path,method,...(method==='get'?{params:data}:{data}),headers:method==='post'?{repeatSubmit:false}:undefined})
watch(()=>props.cities,cs=>{if(!filters.cityId&&cs.length)filters.cityId=cs[0].cityId},{immediate:true})
watch(filters,()=>{previewSeq++;result.value=null;selected.value=[];retryBody.value=null;person.value='';error.value='';loading.value=false;confirmOpen.value=false})
watch(()=>filters.cityId,()=>{batches.value=[];loadHistory()},{immediate:true})
function selectionChanged(rows){selected.value=rows;retryBody.value=null;sendError.value=''}
async function preview(){if(!filters.cityId||!filters.date)return ElMessage.warning('请选择城市和日期');const seq=++previewSeq;loading.value=true;error.value='';try{const r=await api('/preview','get',{...filters});if(seq!==previewSeq)return;result.value=r.data;selected.value=[];retryBody.value=null;await nextTick();recipientTable.value?.clearSelection()}catch(e){if(seq===previewSeq){result.value=null;selected.value=[];error.value=e.message||'预览失败，请重试'}}finally{if(seq===previewSeq)loading.value=false}}
function confirmSend(){if(!selected.value.length)return;sendError.value='';confirmOpen.value=true}
async function send(){if(sending.value)return;sending.value=true;sendError.value='';if(!retryBody.value)retryBody.value={cityId:filters.cityId,kind:result.value.kind,date:result.value.periodStart,requestId:crypto.randomUUID(),targetKeys:selected.value.map(r=>r.targetKey)};try{const r=await api('','post',retryBody.value);batch.value=r.data;confirmOpen.value=false;detailOpen.value=true;retryBody.value=null;ElMessage.success('已发送 '+r.data.sentCount+' 条，跳过 '+r.data.skippedCount+' 条');await preview();await loadHistory()}catch(e){sendError.value=(e.message||'发送失败')+'。可重试本次请求，已送达的通知不会重复发送。'}finally{sending.value=false}}
async function loadHistory(){if(!filters.cityId)return;const seq=++historySeq;historyLoading.value=true;try{const r=await api('','get',{cityId:filters.cityId});if(seq===historySeq)batches.value=r.data}catch(e){if(seq===historySeq)error.value=e.message||'记录加载失败'}finally{if(seq===historySeq)historyLoading.value=false}}
async function openBatch(id){detailLoading.value=true;try{batch.value=(await api('/'+id)).data;detailOpen.value=true}catch(e){ElMessage.error(e.message||'跟进记录读取失败')}finally{detailLoading.value=false}}
</script>
<style scoped>
.reminder-filters{margin:20px 0 4px;padding:16px 16px 0;background:#f7f8f6;border:1px solid #e5e9e1;border-radius:8px}.recipient-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:22px 0 14px}.recipient-head h3{margin:0;font-size:17px}.recipient-head p,.send-bar p,.note{font-size:13px;line-height:1.7;color:#66706a;margin:6px 0 0}.send-bar{display:flex;align-items:center;justify-content:space-between;gap:20px;margin:16px 0;padding:16px;background:#f7f8f6;border:1px solid #e5e9e1;border-radius:8px}.history{border-top:1px solid #e5e9e1;margin-top:32px;padding-top:4px}.tracking-summary{display:flex;align-items:center;gap:24px;flex-wrap:wrap}.tracking-summary strong{font-size:22px;margin-left:6px}.note{margin:14px 0}.space{margin-top:16px}@media(max-width:768px){.recipient-head,.send-bar{align-items:flex-start;flex-direction:column}.tracking-summary{gap:12px}}
</style>
