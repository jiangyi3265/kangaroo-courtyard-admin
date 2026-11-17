<template>
  <div class="app-container">
    <dashboard-panel />
  </div>
</template>

<script setup name="KgDashboard">
// 菜单「袋鼠小院 → 数据看板」（V55 登记，权限 kangaroo:dashboard:view）；首页也放同一块看板
import DashboardPanel from './DashboardPanel.vue'
</script>
