<template>
  <div><el-alert title="选择所属房源，上传照片或短视频，填写一句话和拍摄日期后保存。设为显示的内容会同步到房源的近期生活碎片；同店岗位的店内日常也会读取这些内容。" type="info" :closable="false" show-icon style="margin:20px 20px 0;width:auto" /><ext-crud entity="staydiary" /></div>
</template>

<script setup name="KgExtStayDiary">
import ExtCrud from '../ExtCrud.vue'
</script>
