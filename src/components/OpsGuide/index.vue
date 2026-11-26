<template>
  <div class="ops-guide-root">
    <button
      type="button"
      class="ops-guide-trigger"
      :class="{ 'is-active': open, 'is-mobile': isMobile }"
      :aria-expanded="open"
      aria-label="打开操作向导"
      @click="toggleDrawer"
    >
      <el-icon class="ops-guide-trigger__icon"><Guide /></el-icon>
      <span class="ops-guide-trigger__label">{{ isMobile ? '向导' : '操作向导' }}</span>
    </button>

    <el-drawer
      v-model="open"
      direction="rtl"
      append-to-body
      :size="isMobile ? '100%' : '420px'"
      :modal="isMobile"
      :modal-penetrable="!isMobile"
      :lock-scroll="isMobile"
      :with-header="false"
      class="ops-guide-drawer"
    >
      <!-- 面板（含 23 条流程文字）第一次点开时才下载，不拖慢后台首屏 -->
      <component :is="panel" v-if="panel" @close="open = false" />
      <div v-else class="ops-guide-state">
        <el-button link class="ops-guide-state__close" aria-label="关闭操作向导" @click="open = false">
          <el-icon><Close /></el-icon>
        </el-button>
        <template v-if="loadFailed">
          <p>{{ failCount > 1 ? '还是没加载出来。' : '向导内容没加载出来，可能是网络不太好。' }}</p>
          <p class="ops-guide-state__tip">如果正在填表，请先保存，再点「刷新页面」（刷新会清掉没保存的内容）。</p>
          <div class="ops-guide-state__actions">
            <el-button v-if="failCount < 2" type="primary" @click="loadPanel">重试</el-button>
            <el-button :type="failCount < 2 ? 'default' : 'primary'" @click="reloadPage">刷新页面</el-button>
          </div>
        </template>
        <p v-else v-loading="true" class="ops-guide-state__loading">正在打开向导…</p>
      </div>
    </el-drawer>
  </div>
</template>

<script setup name="OpsGuide">
import { computed, markRaw, ref, shallowRef } from 'vue'
import { Close, Guide } from '@element-plus/icons-vue'
import useAppStore from '@/store/modules/app'

const appStore = useAppStore()

const open = ref(false)
const panel = shallowRef(null)
const loading = ref(false)
const loadFailed = ref(false)
const failCount = ref(0)
const isMobile = computed(() => appStore.device === 'mobile')

// 面板按需加载；网络不好没下载下来时给「重试」，不会一直空白
async function loadPanel() {
  if (panel.value || loading.value) return
  loading.value = true
  loadFailed.value = false
  try {
    const mod = await import('./GuidePanel.vue')
    panel.value = markRaw(mod.default)
  } catch (err) {
    console.error('操作向导加载失败', err)
    failCount.value += 1
    loadFailed.value = true
  } finally {
    loading.value = false
  }
}

function reloadPage() {
  window.location.reload()
}

function toggleDrawer() {
  open.value = !open.value
  if (open.value) loadPanel()
}
</script>

<style lang="scss" scoped>
.ops-guide-root {
  display: flex;
  align-items: center;
  height: 100%;
  flex-shrink: 0;
}

.ops-guide-trigger {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  margin: 0 6px 0 4px;
  padding: 0 11px;
  border: 1px solid var(--el-border-color);
  border-radius: 15px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;

  &:hover,
  &.is-active {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
  }

  &.is-mobile {
    height: 28px;
    padding: 0 9px;
    margin: 0 4px;
    font-size: 12px;
  }

  &__icon {
    font-size: 15px;
  }
}

.ops-guide-state {
  position: relative;
  padding: 56px 20px 24px;
  color: var(--el-text-color-regular);
  font-size: 14px;
  line-height: 1.7;
  text-align: center;

  &__close {
    position: absolute;
    top: 14px;
    right: 16px;
    padding: 4px;
    font-size: 18px;
    color: var(--el-text-color-secondary);
  }

  &__tip {
    margin: 8px 0 0;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  &__actions {
    display: flex;
    justify-content: center;
    gap: 10px;
    margin-top: 12px;
  }

  &__loading {
    min-height: 80px;
    margin: 0;
    color: var(--el-text-color-secondary);
  }
}
</style>

<style lang="scss">
.ops-guide-drawer {
  border-left: 1px solid var(--el-border-color-light);
  box-shadow: var(--el-box-shadow-light);

  .el-drawer__body {
    padding: 0;
    overflow: hidden;
  }
}
</style>
