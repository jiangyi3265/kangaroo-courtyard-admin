<template>
  <div><el-alert title="青年营地双城群" description="编辑城市，分别上传企业微信同城群、目的地群的活码图片。留空时显示暂未开放；更换图片后用户重新点开卡片即可读取新码。请持续维护活码有效性。地区换工群仍使用原有独立配置。" type="info" :closable="false" show-icon style="margin-bottom:16px" /><ext-crud entity="city" /></div>
</template>

<script setup name="KgExtCity">
import ExtCrud from '../ExtCrud.vue'
</script>
