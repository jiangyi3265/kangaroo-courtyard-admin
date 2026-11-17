<template>
  <div>
    <span v-if="loading">正在读取票据…</span>
    <template v-else-if="error"><span>{{ error }}</span><el-button link type="primary" @click="load">重新加载</el-button></template>
    <el-image v-for="url in images" v-else :key="url" :src="url" :preview-src-list="images" preview-teleported fit="cover" style="width:80px;height:80px;margin-right:8px" />
  </div>
</template>
<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'
import request from '@/utils/request'
const props=defineProps({appId:{type:[Number,String],required:true},src:{type:String,default:''}})
const images=ref([]),loading=ref(false),error=ref('')
let seq=0
function release(list){for(const url of list)URL.revokeObjectURL(url)}
async function load(){
  const current=++seq;release(images.value);images.value=[];error.value='';loading.value=true
  const urls=[]
  try{
    for(const file of props.src.split(',').filter(Boolean)){
      const blob=await request({url:`/kangaroo/arrival/${props.appId}/ticket`,method:'get',params:{file},responseType:'blob'})
      if(!blob.type.startsWith('image/')){
        let message='票据读取失败，请检查权限或重新登录'
        try{message=JSON.parse(await blob.text()).msg||message}catch{}
        throw new Error(message)
      }
      urls.push(URL.createObjectURL(blob))
    }
    if(current!==seq){release(urls);return}
    images.value=urls
  }catch(e){release(urls);if(current===seq)error.value=e?.message||'票据读取失败'}
  finally{if(current===seq)loading.value=false}
}
watch(()=>[props.appId,props.src],load,{immediate:true})
onBeforeUnmount(()=>{seq++;release(images.value)})
</script>
