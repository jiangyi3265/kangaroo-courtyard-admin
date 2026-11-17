<template>
  <div><el-alert class="room-guide" title="先选择所属房源，再设置可售房型" type="info" :closable="false" show-icon><p>例如「平潭小院」是房源，「女生多人间床位」是它下面的房型。所属房源可搜索名称，不用填写门店编号。价格直接填1间房或1个床位住7晚的总价，例如每晚17元，七天填写119元。自营（直营）房源按填写价格销售，免平台服务费；合作、加盟、代运营房源沿用逐晚加价5%。运营类型在门店管理中设置，变更仅影响新报价，历史订单沿用原规则。长住优惠按预订明细展示。设好售价、可住人数和库存后，将房型状态设为「上架」。</p><p>只改名称或库存、不改7天总价时，会保留原周末差价。房型上架后，还需房源本身审核上线、所属门店正常启用，用户才可以找到。默认库存为 0 或某天关房时，对应日期无法预订；单日价格和库存可在房态价格中调整。</p></el-alert><ext-crud entity="roomtype" /></div>
</template>

<script setup name="KgExtRoomType">
import ExtCrud from '../ExtCrud.vue'
</script>
<style scoped>.room-guide{margin:20px 20px 0;width:auto}p{line-height:1.7;margin:6px 0}</style>
