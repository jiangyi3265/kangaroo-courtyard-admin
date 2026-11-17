<template>
  <div class="app-container">
    <el-alert title="用户退房后填写金额与原因，平台核实后审批。批准后原路退款，入住记录保持已完成。" type="info" :closable="false" show-icon style="margin-bottom:16px" />
    <el-form inline @submit.prevent="load">
      <el-form-item label="审核状态"><el-select v-model="status" style="width:160px" @change="search"><el-option label="全部" value=""/><el-option label="待审核" value="pending"/><el-option label="已批准" value="approved"/><el-option label="已驳回" value="rejected"/></el-select></el-form-item>
      <el-form-item label="订单号"><el-input v-model="orderNo" placeholder="完整订单号" clearable @keyup.enter="search"/></el-form-item>
      <el-form-item><el-button type="primary" @click="search">查询</el-button><el-button @click="load">刷新</el-button></el-form-item>
    </el-form>
    <el-alert v-if="error" :title="error" type="error" :closable="false" style="margin-bottom:12px" />
    <el-table :data="rows" v-loading="loading" border>
      <el-table-column prop="orderNo" label="订单号" min-width="185"/>
      <el-table-column prop="storeName" label="门店" min-width="140"/>
      <el-table-column label="入住信息" min-width="230"><template #default="{row}"><div>预订：{{ row.checkIn }} 至 {{ row.checkOut }}</div><div>实际退房：{{ row.checkedOutTime || '未记录' }}</div></template></el-table-column>
      <el-table-column label="支付信息" width="150"><template #default="{row}"><div>实付 ¥{{ yuan(row.paidFen) }}</div><div>已退 ¥{{ yuan(row.refundedFen) }}</div><div>剩余 ¥{{ yuan(row.remainingFen) }}</div></template></el-table-column>
      <el-table-column label="申请金额" width="120"><template #default="{row}">¥{{ yuan(row.amountFen) }}</template></el-table-column>
      <el-table-column prop="reason" label="申请原因" min-width="180"/>
      <el-table-column label="状态" width="120"><template #default="{row}">{{ label(row) }}</template></el-table-column>
      <el-table-column prop="reviewNote" label="审核说明" min-width="150"/>
      <el-table-column prop="createTime" label="申请时间" width="165"/>
      <el-table-column prop="reviewedBy" label="审核人" width="110"/>
      <el-table-column label="操作" width="180" fixed="right"><template #default="{row}"><template v-if="row.status==='pending'"><el-button link type="primary" :disabled="busy" @click="review(row,true)">同意退款</el-button><el-button link type="danger" :disabled="busy" @click="review(row,false)">驳回</el-button></template></template></el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page" :page-size="20" :total="total" layout="total, prev, pager, next" @current-change="load" style="margin-top:18px"/>
  </div>
</template>
<script setup>
import { ref,onMounted } from 'vue'
import { ElMessageBox,ElMessage } from 'element-plus'
import request from '@/utils/request'
const rows=ref([]),status=ref('pending'),orderNo=ref(''),page=ref(1),total=ref(0),loading=ref(false),busy=ref(false),error=ref('')
let generation=0
const yuan=n=>(Number(n||0)/100).toFixed(2)
const label=r=>r.status==='pending'?'待平台审核':r.status==='rejected'?'已驳回':r.channelStatus==='success'?'已退款':r.channelStatus==='closed'?'退款未完成':'退款处理中'
async function load(){const g=++generation;loading.value=true;error.value='';try{const r=await request({url:'/kangaroo/stayops/after-refunds',params:{status:status.value,orderNo:orderNo.value.trim(),pageNum:page.value,pageSize:20}});if(g===generation){rows.value=r.data.rows;total.value=r.data.total}}catch(e){if(g===generation)error.value=e.message||'加载失败，请重试'}finally{if(g===generation)loading.value=false}}
function search(){page.value=1;load()}
async function review(row,approve){
  if(busy.value)return;busy.value=true
  try{
    let reason=''
    if(approve)await ElMessageBox.confirm(`订单 ${row.orderNo}：确认同意退款 ¥${yuan(row.amountFen)}？审核通过后提交原路退款，入住记录保持已完成。`,'审核退款',{type:'warning'})
    else{const answer=await ElMessageBox.prompt('请填写驳回原因，用户可以看到','驳回退款',{inputValidator:v=>!!v?.trim()&&v.trim().length<=200||'请填写1–200字的原因'});reason=answer.value.trim()}
    await request({url:`/kangaroo/stayops/after-refunds/${row.requestId}/${approve?'approve':'reject'}`,method:'put',data:{reason}})
    ElMessage.success(approve?'审核已通过，退款结果以支付渠道为准':'已驳回申请');await load()
  }catch(e){if(e!=='cancel'&&e!=='close')error.value=e.message||'处理失败，请刷新后重试'}finally{busy.value=false}
}
onMounted(load)
</script>
