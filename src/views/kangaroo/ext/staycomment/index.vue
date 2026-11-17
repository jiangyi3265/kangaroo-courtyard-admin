<template>
  <div>
    <p class="stay-comment-guide">小伙伴写的小院评论都要先在这里审，通过后才公开。默认只看待审核的；要看全部，把「状态」清空再搜索。通过前请确认：内容合规、不含联系方式；图片或视频里有别人出镜的，已取得本人授权。「风险」标了含联系方式的要特别看。内容看不全点「详情」，每张图和视频都在里面。</p>
    <ext-crud ref="crud" entity="staycomment" :default-query="defaultQuery" :tag-types="tagTypes" :expand-images="expandImages" :list-columns="listColumns" :hide-when-empty="hideWhenEmpty" :labels="labels" />
  </div>
</template>

<script setup name="KgExtStayComment">
// 旅居 → 小院评论审核（V65）：只读列表加通过、驳回、下架，字段和按钮都由后端 KgStayModule 登记驱动。由平台审，待审内容不发给门店
import ExtCrud from '../ExtCrud.vue'

const crud = ref()
const defaultQuery = { status: 'pending' }
const expandImages = ['images']
// 身份、风险、内容排在最前面：1366 宽的屏幕不用横着拖就看得到；房源ID、作者ID 在详情里看，搜索也还能用
const listColumns = ['stayName', 'sourceType', 'riskFlag', 'content', 'images', 'videoUrl', 'reported', 'createTime', 'status']
const hideWhenEmpty = ['images', 'videoUrl', 'videoCover', 'auditReason', 'auditBy', 'auditTime']
const labels = { portraitConfirmed: '肖像确认', riskFlag: '风险标记', sourceType: '作者身份' }
// 风险最显眼；身份里「未核实」用灰色，审核时一眼分得开
const tagTypes = {
  status: { pending: 'warning', online: 'success', rejected: 'danger', offline: 'info' },
  riskFlag: { none: 'info', contact: 'danger', word: 'warning' },
  sourceType: { guest: 'success', volunteer: 'primary', unverified: 'info' },
  portraitConfirmed: { 1: 'success', 0: 'info' }
}
// 页面被标签页缓存：切回来时重新拉，不然看到的是旧的待审列表
let firstActivation = true
onActivated(() => {
  if (firstActivation) { firstActivation = false; return }
  crud.value?.getList()
})
</script>

<style scoped>
.stay-comment-guide { margin: 0; padding: 20px 20px 0; max-width: 90ch; line-height: 1.7; color: var(--el-text-color-regular); }
</style>
