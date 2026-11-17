<template><div class="app-container"><header><h2>通知送达记录</h2><el-button :loading="loading" @click="load">刷新</el-button></header>
<el-alert v-if="error" :title="error" type="error" :closable="false"/>
<el-alert type="info" :closable="false" title="站内消息与外部提醒分开记录。短信以运营商回执确认送达；微信接口成功仅代表已受理，需收件人在微信核对。结果不明时不会自动重复发送。"/>
<el-descriptions v-if="data" :column="2" border><el-descriptions-item label="短信通道">{{data.sms.ready?'已配置':'待配置'}} · 凭据{{data.sms.credentials?'已配置':'缺失'}} / 应用{{data.sms.appId?'已配置':'缺失'}} / 签名{{data.sms.sign?'已配置':'缺失'}} / 模板{{data.sms.template?'已配置':'缺失'}}</el-descriptions-item><el-descriptions-item label="微信通道">{{data.wechatMode==='wx'?'真实微信':data.wechatMode==='mock'?'本地模拟（不外发）':'未启用'}}；{{data.templates.filter(t=>t.status==='0').length}} 个启用模板</el-descriptions-item></el-descriptions>
<el-tabs v-model="channel" @tab-change="page=1;load()"><el-tab-pane name="sms" label="短信"/><el-tab-pane name="wechat" label="微信订阅消息"/></el-tabs>
<el-table :data="rows" v-loading="loading"><el-table-column prop="msgId" label="站内消息编号" width="130"/><el-table-column prop="appUserId" label="接收账号ID" width="120"/><el-table-column prop="bizKey" label="业务类型" min-width="150"/><el-table-column label="状态" min-width="180"><template #default="{row}">{{row.channel==='mock'?'模拟，未外发':states[row.status]||row.status}}</template></el-table-column><el-table-column prop="detail" label="结果说明" min-width="250"/><el-table-column prop="createTime" label="创建时间" width="175"/><el-table-column v-if="channel==='sms'" prop="receivedAt" label="运营商送达时间" width="175"/></el-table>
<el-pagination v-model:current-page="page" :total="total" :page-size="20" layout="prev,pager,next,total" @current-change="load"/>
<p v-if="data&&!data.sms.ready">短信待填写已审核的签名、模板和服务器凭据。通知模板使用两个变量：流程类型、通知编号。用户须先验证手机号并在通知偏好中同意接收。</p>
<p>微信模板在「订阅消息模板」维护，权益及合作复核业务键为 governance_case；纠纷调解为 mediation，大众评审为 mediation_jury。用户每次授权仅增加相应模板的可发送次数。</p>
</div></template>
<script setup>
import {ref} from 'vue';import request from '@/utils/request'
const channel=ref('sms'),page=ref(1),total=ref(0),data=ref(null),rows=ref([]),loading=ref(false),error=ref('')
const states={queued:'等待发送',sending:'发送中',blocked:'配置未完成',skipped:'未发送',accepted:'已受理 · 待送达回执',sent:'微信已受理 · 待收件核对',delivered:'运营商确认送达',failed:'发送失败',unknown:'结果待人工核对'}
async function load(){loading.value=true;error.value='';try{const r=await request({url:'/kangaroo/governance/deliveries',params:{channel:channel.value,pageNum:page.value}});data.value=r.data;rows.value=r.data.records.rows;total.value=r.data.records.total}catch(e){error.value=e.message}finally{loading.value=false}}load()
</script><style scoped>header{display:flex;align-items:center;justify-content:space-between}.el-alert,.el-descriptions,.el-pagination{margin:18px 0}p{color:#606266;line-height:1.7}</style>
