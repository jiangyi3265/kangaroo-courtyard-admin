<template>
  <div><el-alert title="上架后在哪里查看？" type="info" :closable="false" show-icon><p>选择所属门店并上架后，用户可在对应房源详情 → 门店增值服务浏览；入住后在我的行程 → 增值服务预订。停用的服务或未开放的分类不会展示。</p></el-alert><ext-crud entity="shopservice" /></div>
</template>

<script setup name="KgExtShopService">
import ExtCrud from '../ExtCrud.vue'
</script>
