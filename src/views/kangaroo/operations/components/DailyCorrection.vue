<template>
  <el-dialog :model-value="modelValue" title="日报内容与修改记录" width="min(880px,95vw)" :close-on-click-modal="false" :before-close="close" @closed="clear">
    <div v-loading="loading">
      <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" />
      <template v-if="report">
        <p class="meta"><strong>{{ report.ownerName }}</strong> · {{ report.cityName }} · {{ report.bizDate }} · {{ report.status==='submitted'?'已提交':'待提交' }}</p>
        <el-tabs v-model="tab"><el-tab-pane v-if="canCorrect" label="修改日报" name="edit" /><el-tab-pane label="修改记录" name="history" /></el-tabs>
        <template v-if="tab==='edit' && canCorrect">
          <el-alert title="保存后员工和日报导出会显示修订内容，保留修改前后记录。自动统计、提交状态及已封存的月度总结保持不变。" type="info" :closable="false" show-icon />
          <el-form label-position="top" class="correction-form" :disabled="saving">
            <el-form-item v-for="f in fields" :key="f.key" :label="f.label" :required="report.status==='submitted' && f.required">
              <el-input v-model="manual[f.key]" :type="f.type==='textarea'?'textarea':'text'" :rows="3" :maxlength="f.maxLength" :placeholder="f.placeholder || (f.type==='number'?'非负数字，最多两位小数':'请填写')" show-word-limit />
            </el-form-item>
            <template v-if="report.roleCode==='keeper'">
              <el-form-item label="线下收入（元）" :required="report.status==='submitted'"><el-input v-model="manual.offlineIncome" placeholder="没有收入请填0" /></el-form-item>
              <h4>线下支出明细</h4>
              <div v-for="(e,i) in manual.expenses" :key="i" class="expense-row">
                <el-date-picker v-model="e.date" type="date" value-format="YYYY-MM-DD" placeholder="支出日期" /><el-input v-model="e.item" placeholder="支出项目" maxlength="100" /><el-input v-model="e.amount" placeholder="金额（元）" /><el-input v-model="e.handler" placeholder="经手人" maxlength="64" /><el-button type="danger" plain @click="manual.expenses.splice(i,1)">删除</el-button>
              </div>
              <el-button v-if="manual.expenses.length<100" plain @click="manual.expenses.push({date:report.bizDate,item:'',amount:'',handler:''})">添加支出</el-button>
            </template>
            <el-form-item v-for="p in report.progress || []" :key="p.targetId" :label="p.label+' · 补救计划'" :required="report.status==='submitted' && p.status==='severe'"><el-input v-model="manual.remedies[String(p.targetId)]" type="textarea" :rows="2" maxlength="1000" /></el-form-item>
            <el-form-item label="修改原因" required class="reason"><el-input v-model="reason" type="textarea" :rows="2" maxlength="300" show-word-limit placeholder="说明为什么修改，员工可以查看此说明" /></el-form-item>
          </el-form>
        </template>
        <template v-else>
          <el-empty v-if="!changes.length" description="还没有后台修改记录" />
          <el-collapse v-else><el-collapse-item v-for="c in changes" :key="c.changeId" :name="c.changeId" :title="c.createTime+' · '+c.operatorName+' · '+c.reason"><el-table :data="diff(c)" size="small"><el-table-column prop="label" label="项目" width="155" /><el-table-column prop="before" label="修改前"><template #default="{row}"><span class="pre">{{ row.before }}</span></template></el-table-column><el-table-column prop="after" label="修改后"><template #default="{row}"><span class="pre">{{ row.after }}</span></template></el-table-column></el-table></el-collapse-item></el-collapse>
        </template>
      </template>
    </div>
    <template #footer><el-button :disabled="saving" @click="close">关闭</el-button><el-button v-if="tab==='edit' && canCorrect && report" type="primary" :loading="saving" :disabled="loading" @click="save">保存修改并留痕</el-button></template>
  </el-dialog>
</template>
<script setup>
import { ref, computed, watch } from 'vue'
import request from '@/utils/request'
import { checkPermi } from '@/utils/permission'
import { ElMessage, ElMessageBox } from 'element-plus'
const props=defineProps({modelValue:Boolean,reportId:[Number,String],historyOnly:Boolean}),emit=defineEmits(['update:modelValue','saved'])
const report=ref(null),manual=ref({expenses:[],remedies:{}}),changes=ref([]),reason=ref(''),tab=ref('edit'),loading=ref(false),saving=ref(false),error=ref('')
const canCorrect=computed(()=>checkPermi(['kangaroo:operations:correct'])),fields=computed(()=>(report.value?.form?.fields||[]).filter(f=>f.enabled))
let seq=0,initial='',pending=null
const api=(path,method='get',data)=>request({url:'/kangaroo/operations'+path,method,data})
const parse=x=>typeof x==='string'?JSON.parse(x):x||{}
function formatted(key,v){if(v==null||v==='')return '未填写';if(key==='expenses')return v.map(e=>[e.date,e.item,e.amount+'元',e.handler].join(' · ')).join('\n')||'无';if(key==='remedies')return Object.entries(v).map(([k,x])=>(report.value?.progress?.find(p=>String(p.targetId)===k)?.label||'目标'+k)+'：'+x).join('\n')||'无';return String(v)}
function diff(c){const before=parse(c.beforeJson),after=parse(c.afterJson),form=parse(c.formJson),labels=Object.fromEntries((form.fields||[]).map(f=>[f.key,f.label]));Object.assign(labels,{offlineIncome:'线下收入（元）',expenses:'线下支出',remedies:'补救计划'});return [...new Set([...Object.keys(before),...Object.keys(after)])].filter(k=>!['offlineIncomeFen','offlineExpenseFen'].includes(k)&&JSON.stringify(before[k])!==JSON.stringify(after[k])).map(k=>({label:labels[k]||k,before:formatted(k,before[k]),after:formatted(k,after[k])}))}
watch(()=>[props.modelValue,props.reportId],async()=>{if(!props.modelValue)return;const n=++seq;loading.value=true;error.value='';report.value=null;changes.value=[];pending=null;reason.value='';tab.value=props.historyOnly||!canCorrect.value?'history':'edit';try{const [r,h]=await Promise.all([api('/daily/'+props.reportId),api('/daily/'+props.reportId+'/changes')]);if(n!==seq)return;report.value=r.data;manual.value=JSON.parse(JSON.stringify({...r.data.manual,expenses:r.data.manual?.expenses||[],remedies:r.data.manual?.remedies||{}}));initial=JSON.stringify(manual.value);changes.value=h.data||[]}catch(e){if(n===seq)error.value=e.message||'读取日报失败'}finally{if(n===seq)loading.value=false}})
async function close(done){if(saving.value)return;if(canCorrect.value&&report.value&&(initial!==JSON.stringify(manual.value)||reason.value.trim())){try{await ElMessageBox.confirm('尚未保存的修改会丢失。','关闭编辑',{confirmButtonText:'放弃修改',cancelButtonText:'继续编辑',type:'warning'})}catch{return}}emit('update:modelValue',false);if(typeof done==='function')done()}
function clear(){seq++;report.value=null;pending=null}
function uuid(){return globalThis.crypto?.randomUUID?.()||'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const n=Math.random()*16|0;return(c==='x'?n:(n&3|8)).toString(16)})}
async function save(){if(saving.value)return;if(!reason.value.trim())return ElMessage.warning('请填写修改原因');if(JSON.stringify(manual.value)===initial)return ElMessage.warning('内容没有变化');const b={revision:report.value.revision,manual:manual.value,reason:reason.value.trim()},signature=JSON.stringify(b);if(!pending||pending.signature!==signature)pending={signature,requestId:uuid()};saving.value=true;error.value='';try{const r=await api('/daily/'+props.reportId+'/correction','put',{...b,requestId:pending.requestId});initial=JSON.stringify(manual.value);reason.value='';ElMessage.success('日报已修改，修改记录已保存');emit('saved',r.data);emit('update:modelValue',false)}catch(e){error.value=e.message||'保存失败，内容已保留，可重试'}finally{saving.value=false}}
</script>
<style scoped>
.meta{line-height:1.8;color:var(--el-text-color-regular)}.correction-form{margin-top:20px}.expense-row{display:grid;grid-template-columns:150px 1fr 110px 110px auto;gap:8px;margin-bottom:10px}.expense-row :deep(.el-date-editor){width:100%}.reason{margin-top:26px}.pre{white-space:pre-wrap;word-break:break-word}@media(max-width:700px){.expense-row{grid-template-columns:1fr 1fr}.expense-row .el-button{justify-self:start}}
</style>
