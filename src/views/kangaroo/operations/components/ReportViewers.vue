<template>
  <section v-loading="loading">
    <el-alert title="给指定小程序账号开通全部城市已提交报表的只读查阅。不会增加门店管理、审核、付款或修改权限；撤销后下次请求立即失效。" type="info" show-icon :closable="false" />
    <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" class="gap" />
    <el-form label-position="top" class="grant-form">
      <el-form-item label="选择小程序账号"><el-select v-model="pickedId" filterable remote :remote-method="search" :loading="searching" clearable placeholder="搜索昵称、用户ID或完整手机号" style="width:100%" :disabled="saving"><el-option v-for="u in candidates" :key="u.userId" :value="u.userId" :label="`${u.nickname || '未设置昵称'} · ID ${u.userId}${u.phoneHint?' · '+u.phoneHint:''}`" /></el-select></el-form-item>
      <el-form-item label="授权说明" required><el-input v-model="reason" maxlength="300" placeholder="例如：负责人手机查阅团队已提交的工作报表" :disabled="saving" /></el-form-item>
      <el-button type="primary" :loading="saving" :disabled="!pickedId" @click="grant">开通只读查阅</el-button>
    </el-form>
    <el-table :data="rows"><el-table-column prop="nickname" label="小程序昵称" min-width="130" /><el-table-column prop="userId" label="用户ID" width="100" /><el-table-column label="状态" width="100"><template #default="{row}"><el-tag :type="row.enabled?'success':'info'">{{ row.enabled?'已开通':'已撤销' }}</el-tag></template></el-table-column><el-table-column prop="reason" label="说明" min-width="180" /><el-table-column prop="updateBy" label="操作人" width="110" /><el-table-column prop="updateTime" label="操作时间" width="180" /><el-table-column label="操作" width="150"><template #default="{row}"><el-button v-if="row.enabled" link type="danger" :disabled="saving" @click="revoke(row)">撤销</el-button><el-button link type="primary" @click="showHistory(row)">记录</el-button></template></el-table-column></el-table>
    <el-empty v-if="!loading && !rows.length" description="尚未开通团队报表查阅账号" />
    <el-dialog v-model="historyOpen" title="查阅授权记录" width="min(760px,94vw)"><el-table :data="history"><el-table-column prop="createTime" label="时间" width="170" /><el-table-column label="动作" width="80"><template #default="{row}">{{ row.enabled?'开通':'撤销' }}</template></el-table-column><el-table-column prop="operatorName" label="操作人" /><el-table-column prop="reason" label="说明" min-width="220" /></el-table></el-dialog>
  </section>
</template>
<script setup>
import { ref,onMounted } from 'vue'
import request from '@/utils/request'
import { ElMessage,ElMessageBox } from 'element-plus'
const rows=ref([]),candidates=ref([]),pickedId=ref(null),reason=ref(''),loading=ref(false),saving=ref(false),searching=ref(false),error=ref(''),history=ref([]),historyOpen=ref(false)
let searchSeq=0
const api=(path='',method='get',data,params)=>request({url:'/kangaroo/operations/viewers'+path,method,data,params})
async function load(){loading.value=true;error.value='';try{rows.value=(await api()).data||[]}catch(e){error.value=e.message||'授权列表读取失败'}finally{loading.value=false}}
async function search(query){const n=++searchSeq;if(query.trim().length<2&&!/^\d+$/.test(query.trim())){candidates.value=[];searching.value=false;return}searching.value=true;try{const r=await api('/search','get',undefined,{query:query.trim()});if(n===searchSeq)candidates.value=r.data||[]}catch(e){if(n===searchSeq)error.value=e.message||'账号搜索失败'}finally{if(n===searchSeq)searching.value=false}}
async function update(userId,enabled,why,revision){saving.value=true;error.value='';try{await api('/'+userId,'put',{enabled,reason:why,revision});ElMessage.success(enabled?'已开通，用户可在小程序「我的 → 团队报表」查看':'已撤销查阅权限');pickedId.value=null;reason.value='';await load()}catch(e){error.value=e.message||'操作失败，请刷新确认授权状态后重试'}finally{saving.value=false}}
async function grant(){if(saving.value||!pickedId.value)return;if(!reason.value.trim())return ElMessage.warning('请填写授权说明');const old=rows.value.find(x=>x.userId===pickedId.value);if(old?.enabled)return ElMessage.warning('该账号已经开通');const u=candidates.value.find(x=>x.userId===pickedId.value);try{await ElMessageBox.confirm(`账号：${u?.nickname||''}（ID ${pickedId.value}）。开通后可在手机查看全部城市已提交的日报、周报和月度总结。`,'确认开通只读查阅',{confirmButtonText:'确认开通',cancelButtonText:'取消',type:'warning'})}catch{return}await update(pickedId.value,true,reason.value.trim(),old?.revision||0)}
async function revoke(row){try{const answer=await ElMessageBox.prompt(`撤销 ${row.nickname}（ID ${row.userId}）的手机报表查阅权限，请填写原因。`,'撤销查阅权限',{inputValidator:v=>!!v?.trim()&&v.trim().length<=300||'请输入1至300字的说明',confirmButtonText:'确认撤销',cancelButtonText:'取消'});await update(row.userId,false,answer.value.trim(),row.revision)}catch{}}
async function showHistory(row){try{history.value=(await api('/'+row.userId+'/changes')).data||[];historyOpen.value=true}catch(e){error.value=e.message||'记录读取失败'}}
onMounted(load)
</script>
<style scoped>.grant-form{max-width:600px;margin:24px 0}.gap{margin-top:16px}</style>
