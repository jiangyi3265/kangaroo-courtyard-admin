<template>
  <section class="daily-forms" v-loading="loading">
    <div class="form-toolbar"><el-radio-group :model-value="role" @change="switchRole"><el-radio-button value="keeper" label="keeper">小院主理人</el-radio-button><el-radio-button value="manager" label="manager">换工主理人</el-radio-button></el-radio-group><span>当前表单版本 {{ form.revision }}</span><el-button @click="historyOpen=true">配置记录</el-button></div>
    <el-alert title="按身份统一设置每天的文字或数字填写项目，仅用于之后新生成的日报；已生成的日报保留原表单。线下收入、支出明细和任务补救计划沿用现有规则。" type="info" :closable="false" show-icon />
    <el-alert v-if="!globalAllowed" title="仅授权全部城市的后台账号可调整统一表单，当前账号可以查看。" type="warning" :closable="false" class="gap" />
    <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" class="gap" />
    <el-table :data="form.fields" class="gap" row-key="key" :row-class-name="({row})=>row.enabled?'':'disabled-row'">
      <el-table-column label="项目名称 / 填写提示" min-width="240"><template #default="{row}"><el-input v-model="row.label" maxlength="40" :disabled="!editable" placeholder="项目名称" /><el-input v-model="row.placeholder" maxlength="150" :disabled="!editable" placeholder="填写提示（选填）" class="hint" /></template></el-table-column>
      <el-table-column label="填写类型" width="160"><template #default="{row}"><el-select v-model="row.type" :disabled="!editable"><el-option value="textarea" label="多行文字" /><el-option value="text" label="单行文字" /><el-option v-if="row.key.startsWith('custom_')" value="number" label="非负数字（两位小数）" /></el-select></template></el-table-column>
      <el-table-column label="字数上限" width="150"><template #default="{row}"><el-input-number v-model="row.maxLength" :min="1" :max="2000" :precision="0" :disabled="!editable" controls-position="right" style="width:120px" /></template></el-table-column>
      <el-table-column label="显示" width="75"><template #default="{row}"><el-switch v-model="row.enabled" :disabled="!editable" :aria-label="row.label+'显示'" /></template></el-table-column>
      <el-table-column label="必填" width="75"><template #default="{row}"><el-switch v-model="row.required" :disabled="!editable||!row.enabled" :aria-label="row.label+'必填'" /></template></el-table-column>
      <el-table-column label="顺序 / 移除" width="170"><template #default="{row,$index}"><el-button link :disabled="!editable||$index===0" @click="move($index,-1)">上移</el-button><el-button link :disabled="!editable||$index===form.fields.length-1" @click="move($index,1)">下移</el-button><el-button v-if="row.key.startsWith('custom_')" link type="danger" :disabled="!editable" @click="remove($index)">删除</el-button><span v-else class="help">原有项可关闭</span></template></el-table-column>
    </el-table>
    <template v-if="editable"><el-button :disabled="form.fields.length>=30" @click="add">添加填写项目</el-button><el-form label-position="top" class="reason"><el-form-item label="调整说明" required><el-input v-model="reason" maxlength="300" show-word-limit type="textarea" :rows="2" placeholder="例如：增加每日回访记录，将今日问题改为选填" /></el-form-item></el-form><el-button type="primary" :loading="saving" @click="save">保存并用于新日报</el-button></template>
    <el-dialog v-model="historyOpen" title="表单配置记录" width="min(900px,95vw)"><el-empty v-if="!history.length" description="当前使用默认表单，尚未调整" /><el-collapse v-else><el-collapse-item v-for="h in history" :key="h.changeId" :title="h.createTime+' · '+h.operatorName+' · '+h.reason"><p>版本 {{ h.revision }}</p><el-table :data="parse(h.afterJson).fields" size="small"><el-table-column prop="label" label="项目" /><el-table-column label="显示"><template #default="{row}">{{ row.enabled?'显示':'已关闭' }}</template></el-table-column><el-table-column label="要求"><template #default="{row}">{{ row.required?'必填':'选填' }}</template></el-table-column><el-table-column prop="placeholder" label="填写提示" /></el-table></el-collapse-item></el-collapse></el-dialog>
  </section>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import { checkPermi } from '@/utils/permission'
import request from '@/utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'
const props=defineProps({globalAllowed:Boolean}),role=ref('keeper'),form=ref({revision:0,fields:[]}),reason=ref(''),history=ref([]),historyOpen=ref(false),loading=ref(false),saving=ref(false),error=ref('')
const editable=computed(()=>props.globalAllowed&&checkPermi(['kangaroo:operations:form'])&&!saving.value)
let initial='',seq=0
const parse=x=>typeof x==='string'?JSON.parse(x):x
const api=(path,method='get',data)=>request({url:'/kangaroo/operations/forms/'+path,method,data})
async function load(){const n=++seq;loading.value=true;error.value='';try{const [f,h]=await Promise.all([api(role.value),api(role.value+'/changes')]);if(n!==seq)return;form.value=f.data;history.value=h.data||[];initial=JSON.stringify(form.value.fields);reason.value=''}catch(e){error.value=e.message||'读取表单失败'}finally{if(n===seq)loading.value=false}}
async function switchRole(next){if(saving.value||next===role.value)return;if(initial!==JSON.stringify(form.value.fields)||reason.value.trim()){try{await ElMessageBox.confirm('切换后未保存的配置会丢失。','切换身份',{confirmButtonText:'放弃修改并切换',cancelButtonText:'继续编辑'})}catch{return}}role.value=next;await load()}
function add(){form.value.fields.push({key:'custom_'+Date.now().toString(36)+Math.random().toString(36).slice(2,9),label:'',type:'textarea',maxLength:1000,required:false,enabled:true,placeholder:''})}
function move(i,step){const fields=form.value.fields;[fields[i],fields[i+step]]=[fields[i+step],fields[i]]}
async function remove(i){try{await ElMessageBox.confirm('新生成的日报将不再显示该项目；历史日报内容保留。','删除填写项目',{type:'warning'});form.value.fields.splice(i,1)}catch{}}
async function save(){if(saving.value)return;if(!reason.value.trim())return ElMessage.warning('请填写调整说明');if(form.value.fields.some(f=>!f.label.trim()))return ElMessage.warning('请填写所有项目名称');if(initial===JSON.stringify(form.value.fields))return ElMessage.warning('表单配置没有变化');saving.value=true;error.value='';try{await api(role.value,'put',{revision:form.value.revision,fields:form.value.fields,reason:reason.value.trim()});ElMessage.success('表单已保存，将用于新生成的日报');await load()}catch(e){error.value=e.message||'保存失败，修改内容已保留'}finally{saving.value=false}}
async function canLeave(){if(saving.value)return false;if(initial===JSON.stringify(form.value.fields)&&!reason.value.trim())return true;try{await ElMessageBox.confirm('切换后未保存的配置会丢失。','离开表单配置',{confirmButtonText:'放弃修改',cancelButtonText:'继续编辑'});return true}catch{return false}}
defineExpose({canLeave})
onMounted(load)
</script>
<style scoped>
.form-toolbar{display:flex;align-items:center;flex-wrap:wrap;gap:14px;margin:10px 0 18px}.form-toolbar>span,.help{font-size:12px;color:var(--el-text-color-secondary)}.help{display:block;margin-top:4px}.hint{margin-top:8px}.gap{margin:16px 0}.reason{max-width:680px;margin-top:22px}:deep(.disabled-row){--el-table-tr-bg-color:var(--el-fill-color-light)}
</style>
