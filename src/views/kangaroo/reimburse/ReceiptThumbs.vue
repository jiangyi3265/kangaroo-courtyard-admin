<template>
  <div class="receipt-thumbs" :class="{ 'receipt-thumbs--wrap': !max }">
    <div v-for="(src, index) in thumbs.shown" :key="src + index" class="receipt-thumb" :style="{ width: size + 'px', height: size + 'px' }">
      <el-image :src="imageUrl(src)" fit="cover" loading="lazy" :alt="'凭证第 ' + (index + 1) + ' 张'" :preview-src-list="urls" :initial-index="index" preview-teleported hide-on-click-modal>
        <template #error><span class="receipt-thumb__broken">打不开</span></template>
      </el-image>
      <!-- 不挡点击：点这张一样打开大图，左右翻能看到全部 -->
      <span v-if="thumbs.more && index === thumbs.shown.length - 1" class="receipt-thumb__more">+{{ thumbs.more }}</span>
    </div>
    <span v-if="!thumbs.list.length" class="receipt-thumbs__none">没有凭证</span>
  </div>
</template>

<script setup>
// 报销凭证缩略图，点开看大图。max 不传时全部铺开（详情里用）
import { imageUrl } from '@/utils/imageUrl'
import { receiptThumbs } from '@/utils/reimburse'

const props = defineProps({
  receipts: { type: Array, default: () => [] },
  size: { type: Number, default: 36 },
  max: { type: Number, default: 0 }
})
const thumbs = computed(() => receiptThumbs(props.receipts, props.max))
const urls = computed(() => thumbs.value.list.map(imageUrl))
</script>

<style scoped>
.receipt-thumbs { display: flex; gap: 4px; align-items: center; }
.receipt-thumbs--wrap { flex-wrap: wrap; gap: 8px; }
.receipt-thumb { position: relative; flex: none; overflow: hidden; border-radius: 4px; background: var(--el-fill-color); cursor: pointer; }
.receipt-thumb .el-image { display: block; width: 100%; height: 100%; }
.receipt-thumb__more { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.5); color: #fff; font-size: 13px; font-weight: 600; pointer-events: none; }
.receipt-thumb__broken { display: flex; align-items: center; justify-content: center; height: 100%; font-size: 12px; color: var(--el-text-color-secondary); }
.receipt-thumbs__none { font-size: 12px; color: var(--el-text-color-secondary); }
</style>
