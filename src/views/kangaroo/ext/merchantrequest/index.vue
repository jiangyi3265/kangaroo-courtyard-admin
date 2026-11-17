<template>
  <div>
    <p class="merchant-request-guide">本城没有人接的需求排在最前面，状态是「等待平台安排」。先在「员工授权」给这个城市开通换工主理人或商家服务人，再点「重新派单」；也可以点岗位ID 到「岗位管理」直接发布。接手的人离职或卡住了也点「重新派单」换人；不做了点「关闭」，代运营、抖音卖房线下办完点「标记完成」。有岗位的需求，标题和说明到「岗位管理」改。</p>
    <ext-crud ref="crud" entity="merchantrequest" :links="links" :field-locked="jobTextLocked" @changed="notifyChanged" />
  </div>
</template>

<script setup name="KgExtMerchantRequest">
// 袋鼠小院 → 商家需求（V63）：商家发布的招募、线上任务、代运营、抖音卖房。列表和修改由后端 KgMerchantRequestModule 登记驱动
import ExtCrud from '../ExtCrud.vue'
import { checkPermi } from '@/utils/permission'
import { jobLinkOf, MERCHANT_REQUEST_CHANGED } from '@/utils/merchantRequest'

const router = useRouter()
const crud = ref()
const links = { jobId: row => checkPermi(['kangaroo:job:list']) && router.hasRoute('KgJob') ? jobLinkOf(row) : null }
// 上架和用户端用的是岗位上的内容，这里改了对不上（服务端同样拒绝）
const jobTextLocked = (row, f) => !!row.jobId && ['title', 'content'].includes(f.name)
function notifyChanged() {
  window.dispatchEvent(new CustomEvent(MERCHANT_REQUEST_CHANGED))
}
// 页面被标签页缓存：从铃铛或别的页面切回来时重新拉列表，不然看到的是旧数据
let firstActivation = true
onActivated(() => {
  if (firstActivation) { firstActivation = false; return }
  crud.value?.getList()
})
</script>

<style scoped>
.merchant-request-guide { margin: 0; padding: 20px 20px 0; max-width: 90ch; line-height: 1.7; color: var(--el-text-color-regular); }
</style>
