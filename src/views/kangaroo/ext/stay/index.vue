<template>
  <div><el-alert title="房源类型控制订房入口" description="编辑房源选择自营或代运营：自营显示联系订房助手，代运营保留选日期和在线支付。房源类型与门店运营类型独立，后者仍用于结算。" type="info" :closable="false" show-icon style="margin-bottom:16px" /><el-alert class="stay-guide" title="房源是整家住宿介绍，房型是这处房源下可卖的房间或床位" type="info" :closable="false" show-icon><p>① 房源选择真实所属门店，补齐城市、地址和封面。② 点这一行的「管理房型」，为这处房源添加房型、价格、人数和库存，将房型设为上架。③ 员工端补齐资质后，可在此提交审核并审核上线。</p><p>两边不是按名称匹配：房型的「所属房源」必须指向这一处房源。只上架房型不会自动上线整处房源。点「展示检查」可查看当前缺项，房源已上线但门店停用也不会对用户展示。</p><p>旅居详情页的视频是「小院视频」：点这一行的「修改」就能换，已上线也能换，不用下架。它和门店的采访视频不互通，要单独传。</p></el-alert><el-tabs v-model="operationGroup" class="stay-tabs"><el-tab-pane label="全部房源" name="all"/><el-tab-pane label="自营小院" name="direct"/><el-tab-pane label="合作商家（含加盟、代运营）" name="partner"/></el-tabs><ext-crud :key="operationGroup" entity="stay" :default-query="{operationGroup}" /></div>
</template>

<script setup name="KgExtStay">
import ExtCrud from '../ExtCrud.vue'
import { ref } from 'vue'
const operationGroup = ref('all')
</script>
<style scoped>.stay-tabs{margin:16px 20px 0}.stay-guide{margin:20px 20px 0;width:auto}p{line-height:1.7;margin:6px 0}</style>
