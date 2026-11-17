<template>
  <div>
    <el-alert class="insurance-guide" title="小程序保险办理的方案在这里设置" type="info" :closable="false" show-icon>
      新增或编辑保险方案，填写保费（元）、保障天数并选择「上架」。店家在小程序选择方案并缴费，可使用微信或足额保险余额。修改方案不会改变已提交申请的金额与期限。缴费后仍需登记保险公司出具的真实保单，保障以实际保单及生效日期为准。
    </el-alert>
    <ext-crud entity="insplan" />
  </div>
</template>

<script setup name="KgExtInsPlan">
import ExtCrud from '../ExtCrud.vue'
</script>

<style scoped>
.insurance-guide{margin:20px 20px 0;width:auto}
</style>
