<template>
  <!-- 系统提示 / 事件：居中灰字 -->
  <div v-if="isNotice" class="sc-notice" role="note">
    <span>{{ message.text || '（系统消息）' }}</span>
    <time v-if="message.time">{{ shortTime(message.time) }}</time>
  </div>

  <div v-else class="sc-row" :class="{ 'is-mine': mine }">
    <el-avatar class="sc-row__avatar" :size="32" :src="avatar || undefined">{{ initial }}</el-avatar>
    <div class="sc-row__body">
      <div class="sc-row__meta">
        <span class="sc-row__name">{{ name }}</span>
        <time v-if="message.time">{{ shortTime(message.time) }}</time>
      </div>

      <div v-if="message.kind === 'image'" class="sc-bubble sc-bubble--media">
        <auth-image
          :url="message.image?.url || ''"
          :local-src="message.localSrc || ''"
          :width="message.image?.width || 0"
          :height="message.image?.height || 0"
        />
      </div>

      <div v-else-if="message.kind === 'card'" class="sc-bubble sc-card">
        <div class="sc-card__tag">小程序页面</div>
        <div class="sc-card__title">{{ message.card?.title || message.text || '小程序卡片' }}</div>
        <div v-if="message.card?.pagePath" class="sc-card__path">{{ message.card.pagePath }}</div>
      </div>

      <div v-else class="sc-bubble">{{ message.text }}</div>

      <div v-if="extra" class="sc-row__extra">{{ extra }}</div>

      <div v-if="message.sendStatus === 'pending' && stale" class="sc-row__status is-warn">送达结果待核实（可在微信客服小助手里看用户是否收到）</div>
      <div v-else-if="message.sendStatus === 'pending'" class="sc-row__status">发送中…</div>
      <div v-else-if="message.sendStatus === 'failed'" class="sc-row__status is-failed">
        <span v-if="message.retrySame">不确定发出去没有{{ message.error ? '（' + message.error + '）' : '' }}</span>
        <span v-else>没发出去{{ message.error ? '：' + message.error : '' }}</span>
        <el-button v-if="retryable" link type="primary" size="small" @click="$emit('retry', message)">{{ message.retrySame ? '再试一次（不会重复发）' : '重发' }}</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import AuthImage from './AuthImage.vue'
import { shortTime } from './time.js'

const props = defineProps({
  message: { type: Object, required: true },
  mine: { type: Boolean, default: false },      // 我方（客服 / AI）在右边
  name: { type: String, default: '' },
  avatar: { type: String, default: '' },
  extra: { type: String, default: '' },        // 气泡下面的灰字（如 AI 的信息来源）
  retryable: { type: Boolean, default: false },
  stale: { type: Boolean, default: false }      // 「发送中」太久，改成提示人工核实
})
defineEmits(['retry'])

const isNotice = computed(() => props.message.sender === 'system' || props.message.kind === 'event')
const initial = computed(() => String(props.name || '?').trim().slice(0, 1) || '?')
</script>

<style lang="scss" scoped>
.sc-notice {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin: 10px 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);

  span {
    max-width: 80%;
    padding: 3px 10px;
    border-radius: 10px;
    background: var(--el-fill-color);
    text-align: center;
  }
}

.sc-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 12px 0;

  &.is-mine {
    flex-direction: row-reverse;

    .sc-row__body { align-items: flex-end; }
    .sc-row__meta { flex-direction: row-reverse; }
    .sc-bubble:not(.sc-bubble--media) {
      // 主题色是动态写进去的，浅色变量在深色模式下也是浅的，所以按背景色混合
      background: var(--el-color-primary-light-8);
      background: color-mix(in srgb, var(--el-color-primary) 16%, var(--el-bg-color));
      border-color: color-mix(in srgb, var(--el-color-primary) 30%, var(--el-bg-color));
    }
  }

  &__avatar {
    flex-shrink: 0;
    font-size: 13px;
    background: var(--el-color-primary-light-5);
    background: color-mix(in srgb, var(--el-color-primary) 55%, var(--el-bg-color));
    color: var(--el-color-white);
  }

  &__body {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    min-width: 0;
    max-width: min(70%, 560px);
  }

  &__meta {
    display: flex;
    gap: 8px;
    margin-bottom: 3px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  &__extra {
    margin-top: 3px;
    font-size: 12px;
    color: var(--el-text-color-placeholder);
  }

  &__status {
    margin-top: 3px;
    font-size: 12px;
    color: var(--el-text-color-secondary);

    &.is-failed { color: var(--el-color-danger); }
    &.is-warn { color: var(--el-color-warning); }
  }
}

.sc-bubble {
  padding: 8px 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  background: var(--el-bg-color);
  color: var(--el-text-color-primary);
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;

  &--media {
    padding: 0;
    border: 0;
    background: transparent;
  }
}

.sc-card {
  min-width: 180px;

  &__tag {
    font-size: 11px;
    color: var(--el-color-success);
  }

  &__title {
    font-weight: 500;
  }

  &__path {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    word-break: break-all;
  }
}
</style>
