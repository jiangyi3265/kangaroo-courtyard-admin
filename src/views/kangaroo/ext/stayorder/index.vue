<template>
  <el-tabs v-model="tab" class="stay-order-tabs">
    <el-tab-pane label="旅居订单" name="orders"><ext-crud entity="stayorder" /></el-tab-pane>
    <el-tab-pane v-if="canReview" label="退房后退款申请" name="after" lazy><after-refunds /></el-tab-pane>
  </el-tabs>
</template>

<script setup name="KgExtStayOrder">
import ExtCrud from '../ExtCrud.vue'
import AfterRefunds from './AfterRefunds.vue'
import { ref } from 'vue'
import { checkPermi } from '@/utils/permission'
const tab=ref('orders')
const canReview=checkPermi(['kangaroo:stayorder:refund'])
</script>
