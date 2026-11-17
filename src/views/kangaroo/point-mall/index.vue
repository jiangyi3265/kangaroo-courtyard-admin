<template>
  <div class="app-container">
    <el-tabs v-model="tab" @tab-change="reset"
      ><el-tab-pane label="积分商品" name="goods" /><el-tab-pane label="兑换记录" name="orders"
    /></el-tabs>
    <div class="toolbar">
      <el-button
        v-if="tab === 'goods'"
        v-hasPermi="['kangaroo:pointmall:edit']"
        type="primary"
        @click="edit()"
        >新增商品</el-button
      >
      <el-select v-else v-model="status" placeholder="全部状态" clearable @change="reset"
        ><el-option v-for="(label, key) in states" :key="key" :label="label" :value="key"
      /></el-select>
      <el-button @click="load">刷新</el-button>
    </div>
    <el-table v-if="tab === 'goods'" :data="rows" v-loading="loading">
      <el-table-column prop="goodsId" label="编号" width="80" /><el-table-column
        prop="title"
        label="商品名称"
        min-width="180"
      />
      <el-table-column prop="pointsCost" label="兑换积分" /><el-table-column
        prop="stock"
        label="剩余库存"
      />
      <el-table-column label="配送"
        ><template #default="{ row }">{{
          row.deliveryMode === 'shipping' ? '包邮配送' : '到店领取'
        }}</template></el-table-column
      >
      <el-table-column label="状态"
        ><template #default="{ row }">{{
          row.status === 'online' ? '已上架' : '已下架'
        }}</template></el-table-column
      >
      <el-table-column label="操作"
        ><template #default="{ row }"
          ><el-button
            v-hasPermi="['kangaroo:pointmall:edit']"
            link
            type="primary"
            @click="edit(row)"
            >编辑</el-button
          ></template
        ></el-table-column
      >
    </el-table>
    <el-table v-else :data="rows" v-loading="loading">
      <el-table-column prop="orderId" label="兑换编号" width="100" /><el-table-column
        prop="appUserId"
        label="会员ID"
        width="90"
      />
      <el-table-column prop="title" label="商品" min-width="160" /><el-table-column
        prop="pointsCost"
        label="积分"
        width="90"
      />
      <el-table-column label="收货信息" min-width="240"
        ><template #default="{ row }"
          ><div>{{ row.recipient }} {{ row.phone }}</div>
          <div>{{ row.deliveryMode === 'shipping' ? row.address : row.pickupPlace }}</div></template
        ></el-table-column
      >
      <el-table-column label="状态 / 履约" min-width="200"
        ><template #default="{ row }"
          ><div>{{ states[row.status] }}</div>
          <div>{{ row.carrier }} {{ row.trackingNo }}</div>
          <div>{{ row.handleNote }}</div></template
        ></el-table-column
      >
      <el-table-column prop="createTime" label="兑换时间" width="170" />
      <el-table-column label="操作" width="180"
        ><template #default="{ row }"
          ><template v-if="row.status === 'pending'"
            ><el-button
              v-hasPermi="['kangaroo:pointmall:edit']"
              link
              type="primary"
              @click="handle(row, row.deliveryMode === 'shipping' ? 'ship' : 'pickup')"
              >{{ row.deliveryMode === 'shipping' ? '登记发货' : '核验领取' }}</el-button
            ><el-button
              v-hasPermi="['kangaroo:pointmall:edit']"
              link
              type="danger"
              @click="handle(row, 'cancel')"
              >取消并退积分</el-button
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
      v-model="editing"
      :title="form.goodsId ? '编辑商品' : '新增积分商品'"
      width="620px"
      :close-on-click-modal="false"
    >
      <el-form label-position="top">
        <el-form-item label="商品名称"
          ><el-input v-model="form.title" maxlength="80"
        /></el-form-item>
        <el-form-item label="封面图片"
          ><image-upload v-model="form.cover" :limit="1"
        /></el-form-item>
        <el-form-item label="兑换说明"
          ><el-input
            v-model="form.description"
            type="textarea"
            :rows="4"
            maxlength="2000"
            placeholder="说明商品规格、领取或配送安排"
        /></el-form-item>
        <el-form-item label="每件所需积分"
          ><el-input-number v-model="form.pointsCost" :min="1" :max="10000000" :precision="0"
        /></el-form-item>
        <el-form-item label="当前可兑换库存"
          ><el-input-number v-model="form.stock" :min="0" :max="1000000" :precision="0" /><span
            class="hint"
            >保存时校验库存版本，兑换中的库存变化会提示刷新。</span
          ></el-form-item
        >
        <el-form-item label="领取方式"
          ><el-radio-group v-model="form.deliveryMode"
            ><el-radio value="shipping" label="shipping">包邮配送</el-radio
            ><el-radio value="pickup" label="pickup">到店领取</el-radio></el-radio-group
          ></el-form-item
        >
        <el-form-item v-if="form.deliveryMode === 'pickup'" label="领取地点"
          ><el-input v-model="form.pickupPlace" maxlength="300"
        /></el-form-item>
        <el-form-item label="状态"
          ><el-radio-group v-model="form.status"
            ><el-radio value="offline" label="offline">下架</el-radio
            ><el-radio value="online" label="online">上架</el-radio></el-radio-group
          ></el-form-item
        >
      </el-form>
      <template #footer
        ><el-button :disabled="busy" @click="editing = false">取消</el-button
        ><el-button type="primary" :loading="busy" @click="save">保存</el-button></template
      >
    </el-dialog>
    <el-dialog
      v-model="handling"
      :title="action === 'ship' ? '登记发货' : action === 'pickup' ? '核验领取' : '取消并退回积分'"
      width="520px"
      :close-on-click-modal="false"
    >
      <p>{{ selected?.title }} · 兑换编号 {{ selected?.orderId }}</p>
      <el-form label-position="top">
        <template v-if="action === 'ship'"
          ><el-form-item label="快递公司"
            ><el-input v-model="fulfill.carrier" maxlength="40" /></el-form-item
          ><el-form-item label="快递单号"
            ><el-input v-model="fulfill.trackingNo" maxlength="80" /></el-form-item
        ></template>
        <el-form-item v-else :label="action === 'pickup' ? '领取核验记录' : '取消原因'"
          ><el-input
            v-model="fulfill.note"
            type="textarea"
            :rows="3"
            maxlength="500"
            :placeholder="
              action === 'pickup'
                ? '核对兑换编号和领取人后填写实际领取情况'
                : '会同时退回积分、恢复商品库存'
            "
        /></el-form-item>
      </el-form>
      <template #footer
        ><el-button :disabled="busy" @click="handling = false">返回</el-button
        ><el-button type="primary" :loading="busy" @click="confirm">确认</el-button></template
      >
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'
const tab = ref('goods'),
  status = ref(''),
  page = ref(1),
  total = ref(0),
  rows = ref([]),
  loading = ref(false),
  busy = ref(false)
const editing = ref(false),
  form = ref({}),
  handling = ref(false),
  selected = ref(null),
  action = ref(''),
  fulfill = ref({})
const states = {
  pending: '待发货 / 领取',
  shipped: '已发货',
  completed: '已完成',
  cancelled: '已取消并退还积分'
}
let loadGeneration = 0
async function load() {
  const generation = ++loadGeneration
  loading.value = true
  try {
    const r = await request({
      url: '/kangaroo/point-mall/' + tab.value,
      params: { pageNum: page.value, status: status.value }
    })
    if (generation !== loadGeneration) return
    rows.value = r.data.rows
    total.value = r.data.total
  } finally {
    if (generation === loadGeneration) loading.value = false
  }
}
function reset() {
  page.value = 1
  rows.value = []
  total.value = 0
  load()
}
function edit(row) {
  form.value = row
    ? { ...row }
    : {
        title: '',
        cover: '',
        description: '',
        pointsCost: undefined,
        stock: 0,
        deliveryMode: 'shipping',
        pickupPlace: '',
        status: 'offline'
      }
  editing.value = true
}
async function save() {
  busy.value = true
  try {
    await request({
      url: '/kangaroo/point-mall/goods' + (form.value.goodsId ? '/' + form.value.goodsId : ''),
      method: form.value.goodsId ? 'put' : 'post',
      data: form.value
    })
    editing.value = false
    ElMessage.success('商品已保存')
    await load()
  } finally {
    busy.value = false
  }
}
function handle(row, kind) {
  selected.value = row
  action.value = kind
  fulfill.value = { carrier: '', trackingNo: '', note: '' }
  handling.value = true
}
async function confirm() {
  busy.value = true
  try {
    await request({
      url: '/kangaroo/point-mall/orders/' + selected.value.orderId + '/' + action.value,
      method: 'post',
      data: fulfill.value
    })
    handling.value = false
    ElMessage.success('处理结果已保存')
    await load()
  } finally {
    busy.value = false
  }
}
onMounted(load)
</script>
<style scoped>
.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 18px;
}
.toolbar .el-select {
  width: 220px;
}
.hint {
  margin-left: 12px;
  color: #777;
}
.el-pagination {
  margin-top: 20px;
}
</style>
