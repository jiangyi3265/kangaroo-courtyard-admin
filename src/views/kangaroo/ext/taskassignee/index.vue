<template>
  <div>
    <section v-if="allowed" class="app-container">
      <h3>总部待验收</h3>
      <el-alert v-if="error" type="error" :title="error" :closable="false" />
      <el-button :loading="loading" @click="load">刷新待办</el-button>
      <el-table v-if="!error" :data="rows" :empty-text="loading ? '正在查询' : '暂无需要总部验收的任务'">
        <el-table-column prop="storeName" label="门店" /><el-table-column prop="title" label="任务" />
        <el-table-column prop="nickname" label="执行人" /><el-table-column prop="acceptRule" label="验收标准" />
        <el-table-column label="操作"><template #default="{row}"><el-button link @click="review(row)">验收</el-button></template></el-table-column>
      </el-table>
      <el-dialog v-model="open" title="总部验收" :close-on-click-modal="false">
        <p>{{ current?.storeName }} · {{ current?.title }} · {{ current?.nickname }}</p>
        <el-form label-position="top">
          <el-form-item label="实际工时"><el-input-number v-model="form.hours" :min="0.5" :max="24" :step="0.5" /></el-form-item>
          <el-form-item label="评分"><el-rate v-model="form.rating" /></el-form-item>
          <el-form-item label="评语"><el-input v-model="form.comment" maxlength="200" type="textarea" /></el-form-item>
        </el-form>
        <template #footer><el-button :disabled="busy" @click="open=false">取消</el-button><el-button type="primary" :loading="busy" @click="submit">确认验收并发积分</el-button></template>
      </el-dialog>
    </section>
    <ext-crud :key="revision" entity="taskassignee" />
  </div>
</template>
<script setup name="KgExtTaskAssignee">
import ExtCrud from '../ExtCrud.vue'
import request from '@/utils/request'
import { checkPermi } from '@/utils/permission'
import useUserStore from '@/store/modules/user'
import { ElMessage } from 'element-plus'
const allowed = useUserStore().adminFeatures.includes('storeTaskReview') && checkPermi(['kangaroo:stafftask:audit']) && checkPermi(['kangaroo:taskassignee:list'])
const rows = ref([]), error = ref(''), current = ref(null), open = ref(false), busy = ref(false), revision = ref(0)
const form = reactive({ hours: 1, rating: 5, comment: '' })
const base = '/kangaroo/staff-task/store-reviews'
const loading = ref(false)
let listRequest = 0
async function load() {
  const id = ++listRequest
  loading.value = true
  try {
    const response = await request({ url: base })
    if (id !== listRequest) return
    rows.value = response.data
    error.value = ''
  } catch (e) {
    if (id === listRequest) error.value = e.message || '加载失败'
  } finally {
    if (id === listRequest) loading.value = false
  }
}
function review(row) {
  current.value = row
  Object.assign(form, { hours: Number(row.estHours) || 1, rating: 5, comment: '' })
  open.value = true
}
async function submit() {
  if (busy.value) return
  busy.value = true
  try {
    await request({ url: base + '/' + current.value.taskId, method: 'post', data: { ...form, userId: current.value.appUserId } })
    open.value = false; revision.value++; ElMessage.success('已验收，积分已发放')
  } finally { busy.value = false; await load() }
}
onMounted(() => { if (allowed) load() })
</script>
