<template>
  <section v-if="guide" class="notification-guide" aria-label="消息发送指引">
    <h2>{{ guide.title }}</h2>
    <p>{{ guide.summary }}</p>
    <p v-if="context === 'substpl' && readiness">发送通道：{{ readiness.mode === 'wx' ? '微信真实发送' : readiness.mode === 'mock' ? '本地模拟' : '未启用' }} · 跳转版本：{{ readiness.version === 'trial' ? '体验版' : readiness.version === 'developer' ? '开发版' : '正式版' }} · 已配置 {{ readiness.scenes.filter(s => s.configured).length }}/{{ readiness.scenes.length }} 类提醒</p>
    <p v-if="readinessError" class="notification-guide__note">{{readinessError}}</p>
    <details>
      <summary>查看发送步骤和结果说明</summary>
      <ol>
        <li v-for="step in guide.steps" :key="step">{{ step }}</li>
      </ol>
      <p class="notification-guide__note">{{ guide.note }}</p>
    </details>
    <nav v-if="links.length" aria-label="消息相关页面">
      <el-button v-for="link in links" :key="link.name" link type="primary" @click="router.push({ name: link.name })">{{ link.label }} →</el-button>
    </nav>
  </section>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import request from '@/utils/request'
import { useRouter } from 'vue-router'
import { checkPermi } from '@/utils/permission'

const props = defineProps({ context: { type: String, required: true } })
const readiness=ref(null),readinessError=ref('')
onMounted(async()=>{if(props.context!=='substpl')return;try{readiness.value=(await request({url:'/kangaroo/subscription/readiness',method:'get'})).data}catch(e){readinessError.value='发送通道状态暂时无法读取，请刷新重试'}})
const router = useRouter()
const destinations = {
  job: { name: 'KgJob', permission: 'kangaroo:job:list', label: '去岗位管理' },
  jobsub: { name: 'KgExtJobSub', permission: 'kangaroo:jobsub:list', label: '查看订阅人群' },
  message: { name: 'KgMessage', permission: 'kangaroo:message:list', label: '查看站内消息' },
  sublog: { name: 'KgExtSubLog', permission: 'kangaroo:sublog:list', label: '查看微信发送记录' },
  appnotice: { name: 'KgExtAppNotice', permission: 'kangaroo:appnotice:list', label: '发布小程序公告' }
}
const guides = {
  jobsub: {
    title: '岗位上新后，系统自动提醒订阅用户',
    summary: '这里查看用户的订阅条件。用户先在小程序订阅，后台再上架符合条件的新岗位，系统按订阅频率发送提醒，无需手动群发。',
    steps: [
      '确认接收人：核对用户ID、城市、岗位类型、关注门店及生效状态。用户可在小程序调整本人订阅，或关闭新机会提醒。',
      '触发提醒：在「岗位管理」上架新岗位。即时订阅约每10分钟检查一次；每日汇总在服务器时间每天9:00检查。只处理订阅后或上次检查后上架、且符合条件的岗位，普通编辑不会重复推送。',
      '核对结果：到「站内消息」按接收人ID和时间查消息。需要核对微信通知时，再到「订阅发送记录」查看结果和说明。'
    ],
    note: '“上次检查”表示系统检查过新岗位，不代表已发送。没有匹配岗位、订阅暂停、用户关闭提醒或处于免打扰时段，都可能没有新消息。',
    links: ['job', 'message', 'sublog']
  },
  substpl: {
    title: '模板保存后，等待业务触发发送',
    summary: '模板设置只决定微信通知的样式和内容。保存或启用模板不会立即给用户发送消息，也不会代替用户授权。',
    steps: [
      '完成配置：由负责人员配置真实微信模板、对应业务和字段，并开通服务器的微信发送通道。模板启用不代表通道已开通。',
      '确认接收条件：用户在微信小程序允许相应提醒，且仍有可用授权次数；新岗位提醒还需满足用户的订阅条件。',
      '等待业务发生：报名、线上任务、订单退款、保险、调解、日报周报和员工待办等事件进入发送队列，约30秒检查一次。到「订阅发送记录」按用户、业务和时间核对结果。',
      '字段映射按微信后台的真实字段填写，例如 thing1=scene、thing2=title、thing4=content、time3=now；scene 为业务名称，title 为通知标题，content 为摘要，now 为事件发生时间，platform 为平台名称。不能把金额、面试日期等字段填成发送时间。'
    ],
    note: '站内消息与微信通知分开记录。用户可以在小程序消息中心收到业务消息，但未授权或授权用完时，不一定收到微信服务通知。',
    links: ['jobsub', 'message', 'sublog']
  },
  sublog: {
    title: '在这里核对微信通知的发送结果',
    summary: '先按用户ID和时间找到记录，再查看“结果”和“说明”。这里展示微信订阅通知的投递记录，用户是否阅读请另行核实。',
    steps: [
      '已发送：查看说明确认是否为真实发送；“本地模拟通道”没有实际外发。发送成功也不代表用户已经阅读。',
      '未发送或失败：查看说明，核对模板是否启用、用户是否授权、授权是否用完，以及业务是否触发。',
      '结果待核对：先核实最终结果，不通过重复办理业务来重发。没有记录时，先到「站内消息」确认业务消息，再核对微信发送通道是否开通。'
    ],
    note: '站内消息中的“已读”只表示小程序内阅读情况，不能用来判断微信通知是否已读。',
    links: ['message', 'jobsub']
  },
  message: {
    title: '业务处理后，消息自动进入用户消息中心',
    summary: '报名审核、面试安排、客服回复和岗位订阅等业务会产生站内消息。这里用于查询接收对象与已读状态，不提供自由群发。',
    steps: [
      '发岗位上新提醒：用户先订阅，后台再上架符合条件的新岗位，由系统按订阅频率自动通知。',
      '回复某个用户的问题：到「用户服务 → 客服工单」打开对应工单并回复；面试、报名等通知在相应业务页面处理后自动产生。',
      '发布统一说明：到「用户服务 → 小程序公告」填写标题和正文、选择给谁看并上线。公告在小程序内展示，不等于向微信发送服务通知。'
    ],
    note: '查询时使用小程序账号ID。站内有消息不等于微信已推送；微信结果请到「订阅发送记录」核对。',
    links: ['jobsub', 'sublog', 'appnotice']
  }
}
const guide = computed(() => guides[props.context])
const links = computed(() => (guide.value?.links || []).map(key => destinations[key]).filter(link => checkPermi([link.permission]) && router.hasRoute(link.name)))
</script>

<style scoped>
.notification-guide { margin-bottom: 22px; padding: 16px 18px; border: 1px solid var(--el-border-color-lighter); border-radius: 6px; background: var(--el-fill-color-light); color: var(--el-text-color-regular); font-size: 14px; line-height: 1.75; }
h2 { margin: 0 0 6px; font-size: 16px; color: var(--el-text-color-primary); line-height: 1.5; }
p { margin: 0; max-width: 76ch; }
details { margin-top: 10px; max-width: 80ch; }
summary { cursor: pointer; color: var(--el-color-primary); width: fit-content; }
summary:focus-visible { outline: 2px solid var(--el-color-primary); outline-offset: 4px; }
ol { margin: 10px 0; padding-left: 22px; }
li + li { margin-top: 8px; }
.notification-guide__note { color: var(--el-text-color-secondary); }
nav { display: flex; flex-wrap: wrap; gap: 8px 18px; margin-top: 12px; }
nav :deep(.el-button) { margin: 0; min-height: 28px; white-space: normal; text-align: left; }
@media (max-width: 767px) { .notification-guide { padding: 14px; } nav :deep(.el-button) { min-height: 40px; } }
</style>
