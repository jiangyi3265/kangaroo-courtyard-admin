<template>
  <el-dialog v-model="visible" :title="'业务城市授权 · ' + account" width="560px" append-to-body :close-on-click-modal="false">
    <el-alert title="角色决定操作权限，城市授权决定数据范围。未授权时不能访问业务数据。" type="info" :closable="false" show-icon />
    <el-form v-loading="loading" label-position="top" style="margin-top:20px">
      <el-form-item label="授权范围"><el-radio-group v-model="allCities"><el-radio :value="false">指定城市</el-radio><el-radio :value="true">全部城市（平台运营）</el-radio></el-radio-group></el-form-item>
      <el-form-item v-if="!allCities" label="可管理的城市（可多选）"><el-select v-model="cityIds" multiple filterable clearable placeholder="未选择即无业务数据权限" style="width:100%"><el-option v-for="c in cities" :key="c.cityId" :value="Number(c.cityId)" :label="c.name + (c.fullName && c.fullName !== c.name ? ' · '+c.fullName : '')" /></el-select></el-form-item>
      <p v-if="allCities">该账号可访问所有城市的业务数据。功能操作仍受角色权限限制。</p>
    </el-form>
    <template #footer><el-button @click="visible=false" :disabled="saving">取消</el-button><el-button type="primary" :loading="saving" :disabled="loading" @click="save">保存授权</el-button></template>
  </el-dialog>
</template>
<script setup>
import { ref } from 'vue'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'
const visible=ref(false),loading=ref(false),saving=ref(false),account=ref(''),userId=ref(0),allCities=ref(false),cityIds=ref([]),cities=ref([])
async function openFor(user) {
  account.value=user.nickName || user.userName; userId.value=user.userId; loading.value=true; visible.value=true
  allCities.value=false; cityIds.value=[]; cities.value=[]
  try { const {data}=await request({url:'/kangaroo/admin-city-scope/'+userId.value}); allCities.value=!!data.allCities;cityIds.value=(data.cityIds||[]).map(Number);cities.value=data.cities||[] }
  catch { visible.value=false } finally {loading.value=false}
}
async function save() {
  if(saving.value || loading.value)return
  saving.value=true
  try {await request({url:'/kangaroo/admin-city-scope/'+userId.value,method:'put',data:{allCities:allCities.value,cityIds:allCities.value?[]:cityIds.value}});ElMessage.success('城市授权已保存，下次请求即生效');visible.value=false} finally {saving.value=false}
}
defineExpose({openFor})
</script>
