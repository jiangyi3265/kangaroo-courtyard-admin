<template>
  <div class="app-container">
    <h2>商家线上任务发布费用</h2>
    <el-form inline class="config">
      <el-form-item label="启用收费"
        ><el-switch v-model="config.enabled" active-value="1" inactive-value="0"
      /></el-form-item>
      <el-form-item label="每条单价（元）"
        ><el-input-number v-model="amountYuan" :min="0" :max="100000" :precision="2"
      /></el-form-item>
      <el-form-item
        ><el-button
          v-hasPermi="['kangaroo:publicationfee:edit']"
          type="primary"
          :loading="busy"
          @click="saveConfig"
          >保存配置</el-button
        ></el-form-item
      >
    </el-form>
    <p class="hint">
      新任务按提交时确认的单价计费，审核上架后生成待付款费用。实际收款后填写凭证。同一任务修改或恢复上架只计一条费用。
    </p>
    <el-form inline
      ><el-form-item label="门店ID"
        ><el-input-number
          v-model="storeId"
          :min="1"
          :precision="0"
          controls-position="right" /></el-form-item
      ><el-button @click="search">查询</el-button
      ><el-button
        @click="clearStoreFilter"
        >全部</el-button
      ></el-form
    >
    <el-table :data="rows" v-loading="loading">
      <el-table-column prop="feeId" label="费用编号" width="100" /><el-table-column
        prop="storeName"
        label="商家"
        min-width="150"
      /><el-table-column prop="title" label="线上任务" min-width="180" />
      <el-table-column label="金额" width="110"
        ><template #default="{ row }"
          >¥{{ (row.amountFen / 100).toFixed(2) }}</template
        ></el-table-column
      >
      <el-table-column label="状态" width="130"
        ><template #default="{ row }">{{ states[row.status] }}</template></el-table-column
      >
      <el-table-column prop="publishedTime" label="计费时间" width="170" /><el-table-column
        prop="receiptNo"
        label="收款凭证编号"
        min-width="180"
      /><el-table-column prop="note" label="处理说明" min-width="200" />
      <el-table-column label="操作" width="180"
        ><template #default="{ row }"
          ><template v-if="row.status === 'due'"
            ><el-button
              v-hasPermi="['kangaroo:publicationfee:edit']"
              link
              type="primary"
              @click="open(row, 'receive')"
              >登记收款</el-button
            ><el-button
              v-hasPermi="['kangaroo:publicationfee:edit']"
              link
              @click="open(row, 'waive')"
              >减免</el-button
            ></template
          ></template
        ></el-table-column
      >
    </el-table>
    <el-pagination
      v-model:current-page="page"
      :page-size="20"
      :total="total"
      layout="prev,pager,next,total"
      @current-change="load"
    />
    <el-dialog
      v-model="dialog"
      :title="action === 'receive' ? '登记实际收款' : '减免发布费用'"
      width="520px"
      :close-on-click-modal="false"
    >
      <p>{{ selected?.title }} · ¥{{ ((selected?.amountFen || 0) / 100).toFixed(2) }}</p>
      <el-form label-position="top"
        ><template v-if="action === 'receive'"
          ><el-form-item label="收款凭证编号"
            ><el-input v-model="form.receiptNo" maxlength="100" /></el-form-item
          ><el-form-item label="凭证图片（选填）"
            ><image-upload v-model="form.proof" :limit="1" /></el-form-item></template
        ><el-form-item :label="action === 'receive' ? '收款说明' : '减免原因'"
          ><el-input v-model="form.note" type="textarea" :rows="3" maxlength="500" /></el-form-item
      ></el-form>
      <template #footer
        ><el-button :disabled="busy" @click="dialog = false">取消</el-button
        ><el-button type="primary" :loading="busy" @click="submit">确认登记</el-button></template
      >
    </el-dialog>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'
const config = ref({ enabled: '0', version: 0 }),
  amountYuan = ref(0),
  storeId = ref(),
  rows = ref([]),
  page = ref(1),
  total = ref(0),
  loading = ref(false),
  busy = ref(false)
const dialog = ref(false),
  action = ref(''),
  selected = ref(null),
  form = ref({})
const states = {
  pending: '待审核计费',
  due: '待付款',
  paid: '已收款',
  free: '免费发布',
  waived: '已减免',
  void: '未上架，已作废'
}
let loadGeneration = 0
async function load() {
  const generation = ++loadGeneration
  loading.value = true
  try {
    const r = await request({
      url: '/kangaroo/publication-fees',
      params: { storeId: storeId.value, pageNum: page.value }
    })
    if (generation !== loadGeneration) return
    rows.value = r.data.rows
    total.value = r.data.total
    config.value = r.data.config
    amountYuan.value = r.data.config.amountFen / 100
  } finally {
    if (generation === loadGeneration) loading.value = false
  }
}
function search() {
  page.value = 1
  rows.value = []
  total.value = 0
  load()
}
function clearStoreFilter() {
  storeId.value = undefined
  search()
}
async function saveConfig() {
  busy.value = true
  try {
    await request({
      url: '/kangaroo/publication-fees/config',
      method: 'put',
      data: {
        enabled: config.value.enabled,
        version: config.value.version,
        amountFen: Math.round(Number(amountYuan.value) * 100)
      }
    })
    ElMessage.success('发布费用配置已保存')
    await load()
  } finally {
    busy.value = false
  }
}
function open(row, kind) {
  selected.value = row
  action.value = kind
  form.value = { amountFen: row.amountFen, receiptNo: '', proof: '', note: '' }
  dialog.value = true
}
async function submit() {
  busy.value = true
  try {
    await request({
      url: '/kangaroo/publication-fees/' + selected.value.feeId + '/' + action.value,
      method: 'post',
      data: form.value
    })
    dialog.value = false
    ElMessage.success('处理结果已保存')
    await load()
  } finally {
    busy.value = false
  }
}
onMounted(load)
</script>
<style scoped>
.hint {
  color: #777;
  line-height: 1.8;
  margin: 0 0 24px;
}
.config {
  margin-top: 24px;
}
.el-pagination {
  margin-top: 20px;
}
</style>
