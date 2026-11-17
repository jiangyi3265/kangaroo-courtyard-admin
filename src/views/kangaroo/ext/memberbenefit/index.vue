<template><div><el-alert class="ops-help" title="会员店铺权益" type="info" :closable="false" show-icon><p>维护合作店名称、城市、图片、优惠说明、最低适用等级、使用限制和有效期。上架且在有效期内的权益，会展示在「小程序 → 我的 → 会员权益」。适用等级包含所选等级及以上。</p><p>合作店可以是咖啡店、餐厅、酒吧、住宿或体验店，无需先创建住宿房源。请填写真实的优惠和使用规则；此处展示到店权益，不会自动修改订房订单价格。</p></el-alert><ext-crud entity="memberbenefit" /></div></template>
<script setup name="MemberBenefit">import ExtCrud from '../ExtCrud.vue'</script>
<style scoped>.ops-help{margin:20px 20px 0;width:auto}p{margin:6px 0;line-height:1.7}</style>
