<template>
  <section class="community-switch" aria-label="社区内容功能开关">
    <div class="community-switch__copy"><div class="community-switch__heading"><h2>社区内容功能</h2><el-tag :type="known ? (enabled ? 'success' : 'info') : 'warning'">{{ known ? (enabled ? '已开启' : '已关闭') : '状态待确认' }}</el-tag></div>
      <p>管理找搭子、旅居日常、经验分享和用户公开活动。关闭后停止公开展示与发布，已有内容保留。</p>
      <p class="community-switch__note">办理并通过「社交—笔记」类目及相关资质后，再开启此功能。</p>
      <p v-if="updatedAt" class="community-switch__meta">最近修改：{{ updatedBy || '管理员' }} · {{ updatedAt }}</p>
      <p v-if="error" role="alert" class="community-switch__error">{{ error }}</p>
    </div>
    <div class="community-switch__actions"><el-button :loading="loading" :disabled="saving" @click="load">刷新状态</el-button><el-button :type="enabled ? 'warning' : 'primary'" :loading="saving" :disabled="!known || loading" @click="change">{{ enabled ? '关闭社区内容' : '开启社区内容' }}</el-button></div>
  </section>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'
const enabled=ref(false),known=ref(false),loading=ref(false),saving=ref(false),error=ref(''),updatedAt=ref(''),updatedBy=ref('')
function accept(data) { enabled.value=data?.communityEnabled===true;known.value=typeof data?.communityEnabled==='boolean';updatedAt.value=data?.updatedAt||'';updatedBy.value=data?.updatedBy||'' }
async function load() {
  loading.value=true;error.value=''
  try { accept((await request({url:'/kangaroo/features/community',method:'get'})).data) }
  catch { known.value=false;error.value='无法确认开关状态，请刷新后重试。' }
  finally { loading.value=false }
}
async function change() {
  if(!known.value||saving.value)return
  const next=!enabled.value
  try { await ElMessageBox.confirm(next?'请确认「社交—笔记」类目及相关资质已办理通过。开启后，所有用户都可以浏览和发布社区内容。':'关闭后，所有用户的社区公开内容和发布功能将停用。已有内容保留，订单和已报名活动的处理不受影响。',next?'确认开启社区内容':'确认关闭社区内容',{type:'warning',confirmButtonText:next?'已办妥，开启':'确认关闭',cancelButtonText:'取消'}) }
  catch { return }
  saving.value=true;error.value=''
  try {
    const response=await request({url:'/kangaroo/features/community',method:'put',data:{enabled:next,expectedEnabled:enabled.value,categoryConfirmed:next}})
    accept(response.data);ElMessage.success(next?'社区内容已开启':'社区内容已关闭')
  } catch { known.value=false;error.value='操作结果未确认，请刷新状态后重试。' }
  finally { saving.value=false }
}
onMounted(load)
</script>
<style scoped>
.community-switch {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border-top: 1px solid var(--el-border-color-light);
}
.community-switch__heading, .community-switch__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.community-switch h2 {
  margin: 0;
  font-size: var(--el-font-size-medium);
}
.community-switch p {
  margin: 6px 0 0;
  color: var(--el-text-color-regular);
  line-height: 1.6;
  font-size: var(--el-font-size-base);
}
.community-switch .community-switch__note, .community-switch .community-switch__meta {
  color: var(--el-text-color-secondary);
  font-size: var(--el-font-size-small);
}
.community-switch .community-switch__error { color: var(--el-color-danger); }
.community-switch__actions .el-button { margin: 0; }
</style>
