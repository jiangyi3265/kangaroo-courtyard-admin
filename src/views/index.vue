<template>
  <div class="app-container">
    <social-switch v-if="canManageCommunity" feature="stay-booking" title="旅居住宿预订" description="控制房源、房型、房态、报价与新预订。关闭后对所有用户隐藏住宿入口；已有订单的查看、取消、入住退房及退款继续保留。" />
    <social-switch v-if="canManageCommunity" feature="recruitment" title="求职招聘" description="统一控制换宿、兼职、全职、线上任务，以及岗位搜索、分享、新报名和招聘发布。关闭后对所有用户停用，已有报名的履约与退款记录保留。" />
    <community-switch v-if="canManageCommunity" />
    <social-switch v-if="canManageCommunity" feature="wish" title="心愿互助" description="控制心愿广场、发布和接单。关闭后隐藏这些入口，历史订单的交付、取消与退款继续保留。" />
    <social-switch v-if="canManageCommunity" feature="group-chat" title="群聊与入群" description="控制群聊、建群及活动群、门店群、地区群入口。关闭后保留业务沟通、客服、报名和订单服务。" />
    <social-switch v-if="canManageCommunity" feature="private-chat" title="用户私信与交友互动" description="控制用户私信、交换联系方式、关注用户和同行交友。关闭后隐藏入口并停用历史私聊；招聘、接单等业务沟通及客服继续保留。" />
    <!-- 有「数据看板」权限的账号，首页直接看看板；没有的显示一句欢迎和操作提示 -->
    <dashboard-panel v-if="canView" />
    <div v-else class="home-welcome">
      <h2>欢迎使用袋鼠全球青年管理后台</h2>
      <p>{{ device === 'mobile' ? '点左上角的「☰」打开菜单，选择要管理的模块。' : '从左边的菜单选择要管理的模块。' }}</p>
    </div>
  </div>
</template>

<script setup>
import DashboardPanel from '@/views/kangaroo/dashboard/DashboardPanel.vue'
import SocialSwitch from '@/views/kangaroo/dashboard/SocialSwitch.vue'
import CommunitySwitch from '@/views/kangaroo/dashboard/CommunitySwitch.vue'
import { checkPermi } from '@/utils/permission'
import useAppStore from '@/store/modules/app'

const canView = computed(() => checkPermi(['kangaroo:dashboard:view']))
const canManageCommunity = computed(() => checkPermi(['system:config:edit']))
const device = computed(() => useAppStore().device)
</script>

<style scoped>
.home-welcome {
  padding: 24px 4px;
  color: var(--el-text-color-regular);
}
.home-welcome h2 {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.home-welcome p {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
}
</style>
