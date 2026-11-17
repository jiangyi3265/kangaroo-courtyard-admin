<template>
  <div>
    <div class="task-create">
      <el-button type="primary" icon="Plus" v-hasPermi="['kangaroo:job:add']" @click="showCreate">新增线上任务</el-button>
      <p>创建后为岗位草稿，在「岗位管理」审核上架；任务在小程序「首页 → 线上任务」全国展示，不限接单人所在城市，远程完成，无需到店或填写驻店天数。所属门店在员工端管理交付与结算。</p>
    </div>
    <ext-crud :key="revision" entity="onlinetask" />
    <el-dialog v-model="open" title="新增线上任务" width="680px" append-to-body :close-on-click-modal="!saving">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="所属门店" prop="storeId"><el-select v-model="form.storeId" filterable placeholder="搜索并选择门店" style="width:100%"><el-option v-for="s in stores" :key="s.storeId" :value="s.storeId" :label="s.storeName + ' · ' + s.city" /></el-select></el-form-item>
        <el-form-item label="任务标题" prop="title"><el-input v-model="form.title" maxlength="30" show-word-limit /></el-form-item>
        <el-form-item label="任务类型" prop="taskType"><el-select v-model="form.taskType"><el-option v-for="t in types" :key="t" :value="t" :label="t" /></el-select></el-form-item>
        <el-form-item label="交付物" prop="deliverables"><el-input v-model="form.deliverables" maxlength="100" placeholder="例如：3 篇原创图文" /></el-form-item>
        <el-form-item label="验收标准" prop="criteria"><el-input v-model="form.criteria" type="textarea" maxlength="200" show-word-limit /></el-form-item>
        <!-- 2026-11-03 主人：截止时间是预期（预计完成时间），到期自动停止接单，过期后在「岗位管理」或员工端「继续开启」 -->
        <el-form-item label="预计完成时间" prop="deadline"><el-date-picker v-model="form.deadline" type="datetime" format="YYYY-MM-DD HH:mm" value-format="YYYY-MM-DD HH:mm" placeholder="北京时间，至少 2 小时后；到期停止接单，可继续开启" /></el-form-item>
        <el-form-item label="每单佣金" prop="amount"><el-input-number v-model="form.amount" :min="1" :max="5000" :precision="2" /><span class="unit">元 / 单，门店线下结算</span></el-form-item>
        <el-form-item label="名额" prop="quota"><el-input-number v-model="form.quota" :min="1" :max="50" :precision="0" /></el-form-item>
        <el-form-item label="预计工时"><el-input v-model="form.estHours" maxlength="16" placeholder="例如：2–3 小时" /></el-form-item>
        <el-form-item label="任务说明"><el-input v-model="form.description" type="textarea" maxlength="300" show-word-limit /></el-form-item>
      </el-form>
      <template #footer><el-button :disabled="saving" @click="open=false">取消</el-button><el-button type="primary" :loading="saving" @click="save">保存草稿</el-button></template>
    </el-dialog>
  </div>
</template>
<script setup name="KgExtOnlineTask">
import { ref, getCurrentInstance } from 'vue'
import request from '@/utils/request'
import { listStore } from '@/api/kangaroo/store'
import ExtCrud from '../ExtCrud.vue'
const { proxy }=getCurrentInstance()
const types=['内容写作','图片设计','视频剪辑','社群运营','数据整理','其他']
const open=ref(false),saving=ref(false),revision=ref(0),stores=ref([]),form=ref({}),formRef=ref()
const rules=Object.fromEntries(['storeId','title','taskType','deliverables','criteria','deadline','amount','quota'].map(k=>[k,[{required:true,message:'请填写此项',trigger:'blur'}]]))
async function showCreate(){
  stores.value=[]
  for(let pageNum=1;pageNum<=100;pageNum++){
    const res=await listStore({pageNum,pageSize:100,status:'0'});const rows=res.rows||[];stores.value.push(...rows)
    if(!rows.length||stores.value.length>=Number(res.total||rows.length))break
  }
  form.value={taskType:'内容写作',quota:1,amount:100};open.value=true
}
async function save(){
  if(saving.value)return
  if(!await formRef.value.validate().catch(()=>false))return
  if(saving.value)return
  saving.value=true
  try{const res=await request({url:'/kangaroo/online-task',method:'post',data:{...form.value,commissionFen:Math.round(form.value.amount*100)}});proxy.$modal.msgSuccess(res.data.message);open.value=false;revision.value++}finally{saving.value=false}
}
</script>
<style scoped>.task-create{padding:20px 20px 0}.task-create p{color:#606266;font-size:14px;line-height:1.7;margin-bottom:0}.unit{margin-left:12px;color:#606266}</style>
