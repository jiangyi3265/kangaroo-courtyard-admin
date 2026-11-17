<template>
  <div>
    <!-- 2026-10-19：主人自己的培训活动要显示在小程序「找机会 → 全职旅行」顶上的横幅里，横幅在「首页内容管理」里选；这里说一句怎么接过去 -->
    <el-alert class="ops-help" title="想把培训活动放到小程序「找机会 → 全职旅行」顶上的横幅？" type="info" :closable="false" show-icon><p>先在这里新建活动并点「通过」开放报名，再到「首页内容管理」点「新增」：首页栏目选「全职培训横幅」，推荐内容选这场活动。</p></el-alert>
    <ext-crud entity="activity" />
  </div>
</template>

<script setup name="KgExtActivity">
import ExtCrud from '../ExtCrud.vue'
</script>

<style scoped>.ops-help{margin:20px 20px 0;width:auto}p{margin:6px 0;line-height:1.7}</style>
