<template>
  <div><el-alert title="争议付款凭证更正" type="info" :closable="false" show-icon class="payout-guide" description="此处供查看与导出结算记录。接单人申诉未收款时，由负责这单付款的账号在小程序员工端「线上任务 → 交付与结算 → 核实并更正付款凭证」操作。可更正付款方式、流水号和凭证，需说明核实结果；原结算金额和历史证据保留，接单人重新核对并确认。该操作只登记凭证，不会转账。" /><ext-crud entity="onlinesettle" /></div>
</template>

<script setup name="KgExtOnlineSettle">
import ExtCrud from '../ExtCrud.vue'
</script>

<style scoped>.payout-guide { margin: 20px 20px 0; width: auto; }</style>
