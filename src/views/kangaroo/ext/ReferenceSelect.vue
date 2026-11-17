<template><el-select :model-value="modelValue" @update:model-value="$emit('update:modelValue',$event)" filterable remote :remote-method="search" :loading="loading" :placeholder="kind === 'room' ? '搜索房源名称，选择所属房源' : '搜索已发布的活动或岗位'" style="width:100%" @visible-change="visible => visible && search('')"><el-option v-for="item in options" :key="item.id" :value="Number(item.id)" :label="item.title + '（' + (item.city || '全国') + ' · #' + item.id + '）'" /><el-option v-if="modelValue && !options.some(item => Number(item.id) === Number(modelValue))" :value="Number(modelValue)" :label="(currentTitle || '当前记录') + '（#' + modelValue + '）'" /></el-select><small v-if="error" class="reference-error">{{ error }}</small></template>
<script setup>
import {ref,watch} from 'vue'
import request from '@/utils/request'
const props=defineProps({modelValue:[Number,String],kind:String,section:String,currentTitle:String})
defineEmits(['update:modelValue'])
const options=ref([]),loading=ref(false),error=ref('');let sequence=0
async function search(keyword){const token=++sequence;loading.value=true;error.value='';options.value=[];try{const res=await request({url:props.kind==='room'?'/kangaroo/stayops/options':'/kangaroo/homecontent/options',params:{keyword,section:props.section}});if(token===sequence)options.value=res.data || []}catch(e){if(token===sequence)error.value='选项读取失败，请重新打开选择框'}finally{if(token===sequence)loading.value=false}}
watch(()=>[props.kind,props.section],()=>search(''),{immediate:true})
</script>
<style scoped>.reference-error{color:var(--el-color-danger)}</style>
