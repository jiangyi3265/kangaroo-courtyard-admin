<template>
  <div class="reimburse-actions">
    <el-button v-if="!hideDetail" :link="link" :disabled="busy" @click="emit('detail')">详情</el-button>
    <template v-if="canApprove(row)">
      <el-button :link="link" type="danger" :plain="!link" :disabled="busy" @click="emit('reject')" v-hasPermi="['kangaroo:reimburse:audit']">驳回</el-button>
      <el-button :link="link" type="success" :disabled="busy" @click="emit('approve')" v-hasPermi="['kangaroo:reimburse:audit']">通过</el-button>
    </template>
    <el-button v-else-if="canMarkPaid(row)" :link="link" type="primary" :disabled="busy" @click="emit('paid')" v-hasPermi="['kangaroo:reimburse:audit']">标记已打款</el-button>
  </div>
</template>

<script setup>
// 一行报销能做的事：表格里是文字按钮（link），手机卡片和详情弹窗里是普通按钮。按钮挂 kangaroo:reimburse:audit，没这个权限的账号只看得到「详情」
import { canApprove, canMarkPaid } from '@/utils/reimburse'

defineProps({
  row: { type: Object, required: true },
  link: Boolean,
  busy: Boolean,
  hideDetail: Boolean
})
const emit = defineEmits(['detail', 'approve', 'reject', 'paid'])
</script>

<style scoped>
.reimburse-actions { display: inline-flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 6px 10px; }
.reimburse-actions .el-button + .el-button { margin-left: 0; }
</style>
