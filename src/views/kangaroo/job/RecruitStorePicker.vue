<template>
  <el-form-item label="实际招聘门店">
    <el-select :model-value="modelValue" :disabled="disabled" filterable clearable placeholder="本店招聘（与发布门店相同）" style="width:100%" @update:model-value="select">
      <el-option v-for="store in options.filter(s => String(s.storeId) !== String(publisherStoreId))" :key="store.storeId" :value="store.storeId" :label="`${store.storeName} · ${store.city || '城市待补充'}`" />
    </el-select>
    <div class="recruit-help">代其他民宿招聘时请选择实际招聘门店。采访、店长、设施和营业执照使用这家店的资料；报名仍由发布门店管理。</div>
    <el-button v-if="canCreate" link type="primary" :disabled="disabled" @click="openNew">＋ 新建招聘门店</el-button>
    <span v-else class="recruit-help">没有找到招聘门店时，请有门店新增权限的管理员先建档。</span>
  </el-form-item>
  <el-dialog v-model="creating" title="新建招聘门店" width="520px" append-to-body :close-on-click-modal="false" :close-on-press-escape="!saving" :show-close="!saving" :before-close="beforeClose">
    <el-form ref="formRef" :model="draft" :rules="rules" :disabled="saving" label-position="top">
      <el-form-item label="民宿 / 门店名称" prop="storeName"><el-input v-model="draft.storeName" maxlength="64" placeholder="填写真实招聘门店的名称" /></el-form-item>
      <el-form-item label="所在城市" prop="city"><el-input v-model="draft.city" maxlength="32" placeholder="如：平潭" /></el-form-item>
      <el-form-item label="详细地址" prop="address"><el-input v-model="draft.address" maxlength="255" placeholder="填写实际工作地点" /></el-form-item>
      <el-alert type="info" :closable="false" title="建档后可在本页补充采访、店长、亮点和营业执照。不会自动授予员工权限，也不会自动认证。" />
    </el-form>
    <template #footer><el-button :disabled="saving" @click="creating=false">取消</el-button><el-button type="primary" :loading="saving" @click="create">创建并选择</el-button></template>
  </el-dialog>
</template>
<script setup>
import { ref, getCurrentInstance } from 'vue'
import { addStore } from '@/api/kangaroo/store'
const props = defineProps({ modelValue: [Number, String], publisherStoreId: [Number, String], options: { type: Array, default: () => [] }, disabled: Boolean })
const emit = defineEmits(['update:modelValue', 'change', 'created'])
const { proxy } = getCurrentInstance()
const canCreate = proxy.$auth.hasPermi('kangaroo:store:add')
const creating=ref(false), saving=ref(false), formRef=ref(), draft=ref({})
const rules=Object.fromEntries([['storeName','请填写招聘门店名称'],['city','请填写城市'],['address','请填写实际工作地点']].map(([key,message])=>[key,[{required:true,whitespace:true,message,trigger:'blur'}]]))
function select(value) { const id=value || null; emit('update:modelValue',id); emit('change',id) }
function openNew() { draft.value={storeName:'',city:'',address:''}; creating.value=true }
function beforeClose(done) { if (!saving.value) done() }
async function create() {
  if (saving.value || !await formRef.value.validate().catch(()=>false)) return
  saving.value=true
  try {
    const body=Object.fromEntries(Object.entries(draft.value).map(([k,v])=>[k,v.trim()]))
    const {data}=await addStore(body)
    const store={...body,storeId:data}
    emit('created',store)
    select(data)
    creating.value=false
    proxy.$modal.msgSuccess('招聘门店已创建，请继续补充岗位和门店资料')
  } finally { saving.value=false }
}
</script>
<style scoped>.recruit-help{width:100%;font-size:12px;line-height:1.7;color:#606266;margin-top:6px}</style>
