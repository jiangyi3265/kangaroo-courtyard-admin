<template>
  <div>
    <el-tabs v-model="tab" class="appnotice-tabs"><el-tab-pane label="发布公告" name="publish" /><el-tab-pane v-if="canQuery" label="用户回复" name="replies" /></el-tabs>
    <template v-if="tab === 'publish'">
    <el-alert type="info" :closable="false" show-icon class="appnotice-tip" title="小程序公告怎么用">
      <template #default>
        <div class="appnotice-tip__body">
          <p>· 公告上线后，用户可在小程序「消息 → 系统通知 → 公告」查看全文，并在下方「联系管理员」回复；切换本页「用户回复」即可继续沟通。对话仅该用户和管理员可见。</p>
          <p>· 「进小程序时」选「弹窗提醒一次」：用户打开小程序进首页或岗位列表时弹出来，点「我知道了」后不再弹；改了标题或正文，版本号自动 +1，看过的人会再弹一次新内容。只改排序、状态不会再弹。</p>
          <p>· 「给谁看」选「关注线上任务的人」：只向订阅过线上任务提醒、或报过名线上任务的用户展示（没登录的游客看不到弹窗，但打开须知链接照样能看）。这是小程序内公告，不会向微信服务通知群发。</p>
          <p>· 「固定标识」是给小程序页面直接打开用的，可以不填。online-guide 是线上任务页「线上兼职须知」打开的那一条：内容可以改，标识不能改，也不能删除，不想展示请把状态改成「下线」。</p>
        </div>
      </template>
    </el-alert>
    <ext-crud entity="appnotice" />
    </template>
    <notice-replies v-else-if="canQuery" />
  </div>
</template>

<script setup>
import ExtCrud from '../ExtCrud.vue'
import { ref } from 'vue'
import { checkPermi } from '@/utils/permission'
import NoticeReplies from './replies.vue'
const tab = ref('publish')
const canQuery = checkPermi(['kangaroo:appnotice:query'])
</script>

<style scoped>
.appnotice-tip { margin: 20px 20px 0; width: auto; }
.appnotice-tabs { margin: 12px 20px 0; }
.appnotice-tip__body p { margin: 2px 0; line-height: 1.7; }
</style>
