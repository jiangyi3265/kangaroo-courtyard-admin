<template>
  <div>
    <p class="merchant-apply-guide">新提交的申请会自动开通门店和合作商家身份，显示「已入驻」；点「开通门店ID」可以补全门店资料。合作商家身份被撤销过或门店被停用的账号，申请会停在「待联系」，需要后台处理。</p>
    <p class="merchant-apply-guide">改跟进状态会给用户发站内消息：改成「已联系」告诉他在沟通；改成「暂不合作」时，这次在跟进备注里新写的内容会作为原因发给用户（以前的备注不发）；改成「已入驻」会同时开通门店和合作商家身份（已有就直接用）。以前开过又被撤销的账号，要先在「员工授权」恢复授权、启用门店，才能改成已入驻。</p>
    <ext-crud entity="merchantapply" :links="links" :hide-when-empty="['wantTypes', 'storeId', 'grantId']" :labels="{ wantTypes: '想招的人' }" />
  </div>
</template>

<script setup name="KgExtMerchantApply">
// 袋鼠小院 → 商家入驻申请（V56，V63 起提交即开通）：小程序「成为商家」交上来的申请；用户填的只读，后台改跟进状态、写跟进备注
import ExtCrud from '../ExtCrud.vue'
import { checkPermi } from '@/utils/permission'
import { storeLinkOf } from '@/utils/merchantRequest'

const router = useRouter()
// 链接过去是打开门店的修改弹窗，所以要有修改门店的权限
const links = { storeId: row => checkPermi(['kangaroo:store:edit']) && router.hasRoute('KgStore') ? storeLinkOf(row) : null }
</script>

<style scoped>
.merchant-apply-guide { margin: 0; padding: 20px 20px 0; max-width: 90ch; line-height: 1.7; color: var(--el-text-color-regular); }
</style>
