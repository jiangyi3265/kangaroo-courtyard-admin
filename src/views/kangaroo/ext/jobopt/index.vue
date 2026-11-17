<template><div><el-alert class="ops-help" title="发布岗位时「年龄」「性格」能选的选项" type="info" :closable="false" show-icon><p>门店在小程序发布岗位、后台「岗位管理」修改岗位时，<b>年龄</b>从「年龄段」里选一个，<b>性格</b>从「性格」里最多选 3 个；选中的文字会显示在岗位详情的「换工要求 / 岗位要求」里。</p><p>点「新增」加选项（先选是年龄段还是性格，再写文字，比如「18-28岁」「爱干净」，最多 12 个字，不要带冒号、顿号、逗号）；「排序」小的排在前面；不想再让人选的改成「停用」。年龄段里的「不限」表示岗位上不写年龄。</p><p>改名、停用只影响以后发布的岗位，已经发出去的岗位照常显示原来的文字。</p></el-alert><ext-crud entity="jobopt" /></div></template>
<script setup name="KgExtJobOpt">import ExtCrud from '../ExtCrud.vue'</script>
<style scoped>.ops-help{margin:20px 20px 0;width:auto}p{margin:6px 0;line-height:1.7}</style>
