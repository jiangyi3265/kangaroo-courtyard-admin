<template>
  <div class="app-container finance">
    <header><div><h2>商家分成结算</h2><p>按月核对服务费分成，违规处罚自动计入应付金额。</p></div><el-button @click="load">刷新</el-button><el-button v-if="canEdit" type="primary" @click="create">录入月度分成</el-button></header>
    <el-alert type="info" :closable="false" title="金额以财务对账依据为准；同月50%处罚不重复叠加。月份结束后复核、登记付款凭证。登记付款不会发起银行转账。"/>
    <el-alert v-if="error" type="error" :title="error" :closable="false"/>
    <el-table :data="rows" v-loading="loading">
      <el-table-column prop="feeMonth" label="账期" width="110"/><el-table-column prop="storeName" label="门店" min-width="150"/>
      <el-table-column label="应分成"><template #default="{row}">{{money(row.grossFen)}}</template></el-table-column>
      <el-table-column label="处罚扣除"><template #default="{row}">{{row.penaltyBp===5000?'50% · ':''}}{{money(row.deductionFen)}}</template></el-table-column>
      <el-table-column label="扣除后应付"><template #default="{row}">{{money(row.netFen)}}</template></el-table-column>
      <el-table-column label="状态"><template #default="{row}">{{states[row.status]}}</template></el-table-column>
      <el-table-column label="操作" width="110"><template #default="{row}"><el-button link type="primary" @click="view(row.settlementId)">查看账单</el-button></template></el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page" :total="total" :page-size="20" layout="prev,pager,next,total" @current-change="load"/>
    <el-dialog v-model="open" title="月度服务费分成" width="min(720px,94vw)" :close-on-click-modal="false">
      <el-form label-position="top" @submit.prevent>
        <el-form-item label="合作门店"><el-select v-model="form.storeId" filterable :disabled="!!detail"><el-option v-for="s in stores" :key="s.storeId" :value="s.storeId" :label="s.storeName"/></el-select></el-form-item>
        <el-form-item label="账期"><el-date-picker v-model="form.month" type="month" value-format="YYYY-MM" :disabled="!!detail"/></el-form-item>
        <el-form-item label="处罚前应分成（元）"><el-input v-model="form.yuan" inputmode="decimal" :disabled="!canEdit||!!detail&&detail.status!=='draft'" placeholder="填写实际对账金额，最多两位小数"/></el-form-item>
        <el-form-item label="对账依据（至少10字）"><el-input v-model="form.basis" type="textarea" :rows="3" maxlength="2000" :disabled="!canEdit||!!detail&&detail.status!=='draft'" placeholder="合同、订单汇总、账期、分成比例或对账单编号"/></el-form-item>
        <p v-if="detail">处罚：{{detail.penaltyBp===5000?'当月分成50%':'无'}}；应付：{{money(detail.netFen)}}；{{states[detail.status]}}</p>
        <template v-if="detail&&canEdit&&detail.status!=='paid'">
          <el-form-item label="复核 / 付款说明（至少5字）"><el-input v-model="form.note" type="textarea" maxlength="1000"/></el-form-item>
          <template v-if="detail.status==='approved'"><el-form-item label="实际付款金额（元）"><el-input v-model="form.paidYuan" inputmode="decimal"/></el-form-item><el-form-item label="付款流水号或凭证编号"><el-input v-model="form.proof" maxlength="500"/></el-form-item></template>
        </template>
        <p v-if="detail?.paidAt">付款登记：{{detail.paidAt}} · {{detail.paidProof}}</p>
        <el-alert v-if="saveError" type="error" :title="saveError" :closable="false"/>
        <el-timeline v-if="detail"><el-timeline-item v-for="(l,i) in detail.logs" :key="i" :timestamp="l.createTime"><p>{{l.actor}} · {{l.note}}</p></el-timeline-item></el-timeline>
      </el-form>
      <template #footer><el-button :disabled="busy" @click="open=false">关闭</el-button><template v-if="canEdit"><el-button v-if="!detail||detail.status==='draft'" type="primary" :loading="busy" @click="save">保存对账金额</el-button><el-button v-if="detail?.status==='draft'" :disabled="busy||detail.grossFen==null" @click="command('approve')">复核通过</el-button><el-button v-if="detail?.status==='approved'" :disabled="busy" @click="command('return')">退回核对</el-button><el-button v-if="detail?.status==='approved'" type="primary" :loading="busy" @click="command('paid')">登记实际付款</el-button></template></template>
    </el-dialog>
  </div>
</template>
<script setup>
import {ref} from 'vue';import request from '@/utils/request';import {checkPermi} from '@/utils/permission'
const canEdit=checkPermi(['kangaroo:merchantfinance:edit']),states={draft:'待核对',approved:'已复核 · 待付款',paid:'已登记付款'}
const rows=ref([]),stores=ref([]),page=ref(1),total=ref(0),loading=ref(false),error=ref(''),saveError=ref(''),open=ref(false),busy=ref(false),detail=ref(null),form=ref({})
const money=n=>n==null?'待录入':'¥'+(Number(n)/100).toFixed(2)
const api=(path,method='get',data)=>request({url:'/kangaroo/governance/'+path,method,...(method==='get'?{params:data}:{data})})
function fen(s){if(!/^\d+(\.\d{1,2})?$/.test(String(s)))throw Error('金额请填写非负数字，最多两位小数');const [a,b='']=String(s).split('.');const n=Number(a)*100+Number(b.padEnd(2,'0'));if(!Number.isSafeInteger(n)||n>100000000000)throw Error('金额超出允许范围');return n}
async function load(){loading.value=true;error.value='';try{const r=(await api('settlements','get',{pageNum:page.value})).data;rows.value=r.rows;total.value=r.total;stores.value=(await api('settlement-stores')).data}catch(e){error.value=e.message}finally{loading.value=false}}
function create(){detail.value=null;form.value={storeId:null,month:'',yuan:'',basis:'',version:0};saveError.value='';open.value=true}
async function view(id){try{detail.value=(await api('settlements/'+id)).data;const d=detail.value;form.value={storeId:d.storeId,month:d.feeMonth,yuan:d.grossFen==null?'':(d.grossFen/100).toFixed(2),basis:d.basis||'',version:d.version,note:'',paidYuan:'',proof:''};saveError.value='';open.value=true}catch(e){error.value=e.message}}
async function save(){if(busy.value)return;busy.value=true;saveError.value='';try{const id=(await api('settlements','post',{...form.value,grossFen:fen(form.value.yuan)})).data;await view(id);await load()}catch(e){saveError.value=e.message}finally{busy.value=false}}
async function command(action){if(busy.value)return;busy.value=true;saveError.value='';try{const b={version:form.value.version,note:form.value.note};if(action==='paid'){b.paidFen=fen(form.value.paidYuan);b.proof=form.value.proof}await api('settlements/'+detail.value.settlementId+'/'+action,'post',b);await view(detail.value.settlementId);await load()}catch(e){saveError.value=e.message}finally{busy.value=false}}
load()
</script>
<style scoped>header{display:flex;align-items:center;gap:12px;margin-bottom:20px}header>div{flex:1}h2{margin:0 0 10px}header p{color:#606266;margin:0}.el-alert,.el-pagination{margin:16px 0}.el-select{width:100%}.el-timeline{margin-top:24px}.el-timeline p{white-space:pre-wrap;overflow-wrap:anywhere}</style>
