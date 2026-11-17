<template>
  <section class="community-switch" :aria-label="title + '开关'">
    <div class="community-switch__copy"><div class="community-switch__heading"><h2>{{ title }}</h2><el-tag :type="known ? (enabled ? 'success' : 'info') : 'warning'">{{ known ? (enabled ? '已开启' : '已关闭') : '状态待确认' }}</el-tag></div>
      <p>{{ description }}</p>
      <p class="community-switch__note">{{ qualification }}</p>
      <p v-if="updatedAt" class="community-switch__meta">最近修改：{{ updatedBy || '管理员' }} · {{ updatedAt }}</p>
      <p v-if="error" role="alert" class="community-switch__error">{{ error }}</p>
    </div>
    <div class="community-switch__actions"><el-button :loading="loading" :disabled="saving" @click="load">刷新状态</el-button><el-button :type="enabled ? 'warning' : 'primary'" :loading="saving" :disabled="!known || loading" @click="change">{{ enabled ? '隐藏并关闭' : '开启并显示' }}</el-button></div>
  </section>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'
const props=defineProps({feature:{type:String,required:true},title:{type:String,required:true},description:{type:String,required:true}})
const qualification=computed(()=>props.feature==='recruitment'?'取得「生活服务—求职/招聘」类目及所需资质后再开启。':props.feature==='stay-booking'?'取得「旅游服务—住宿服务」类目及所需资质后再开启。':props.feature==='private-chat'?'取得对应的「社交—陌生人交友」或「社交—熟人交友」类目及所需资质后再开启。':props.feature==='group-chat'?'群聊与入群需取得「社交—社区/论坛」类目及所需资质后再开启。':'所需类目及相关资质办理通过后再开启。')
const enabled=ref(false),known=ref(false),loading=ref(false),saving=ref(false),error=ref(''),updatedAt=ref(''),updatedBy=ref('')
function accept(data) { enabled.value=data?.enabled===true;known.value=typeof data?.enabled==='boolean';updatedAt.value=data?.updatedAt||'';updatedBy.value=data?.updatedBy||'' }
async function load() {
  loading.value=true;error.value=''
  try { accept((await request({url:'/kangaroo/features/'+props.feature,method:'get'})).data) }
  catch { known.value=false;error.value='无法确认开关状态，请刷新后重试。' }
  finally { loading.value=false }
}
async function change() {
  if(!known.value||saving.value)return
  const next=!enabled.value
  try { await ElMessageBox.confirm(next?'请确认此功能所需类目及相关资质已办理通过。开启后将对所有用户开放。':'关闭后对所有用户停止展示和使用。已有数据保留，历史订单的履约与退款仍可处理。',(next?'确认开启':'确认关闭')+props.title,{type:'warning',confirmButtonText:next?'已办妥，开启':'确认关闭',cancelButtonText:'取消'}) }
  catch { return }
  saving.value=true;error.value=''
  try {
    const response=await request({url:'/kangaroo/features/'+props.feature,method:'put',data:{enabled:next,expectedEnabled:enabled.value,categoryConfirmed:next}})
    accept(response.data);ElMessage.success(props.title+(next?'已开启':'已关闭'))
  } catch { known.value=false;error.value='操作结果未确认，请刷新状态后重试。' }
  finally { saving.value=false }
}
onMounted(load)
</script>
<style scoped>
.community-switch { display:flex;justify-content:space-between;align-items:center;gap:24px;padding:22px 24px;margin-bottom:24px;border:1px solid var(--el-border-color-light);border-radius:10px;background:var(--el-bg-color); }
.community-switch__heading {display:flex;align-items:center;gap:12px;}.community-switch h2{margin:0;font-size:18px;}.community-switch p{margin:9px 0 0;color:var(--el-text-color-regular);line-height:1.7;font-size:14px;}.community-switch .community-switch__note,.community-switch .community-switch__meta{color:var(--el-text-color-secondary);font-size:13px;}.community-switch .community-switch__error{color:var(--el-color-danger);}.community-switch__actions{display:flex;gap:10px;flex-shrink:0;}.community-switch__actions .el-button{margin:0;}@media(max-width:800px){.community-switch{align-items:stretch;flex-direction:column;padding:18px;}.community-switch__actions .el-button{flex:1;}}
</style>
