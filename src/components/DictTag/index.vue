<template>
  <div>
    <template v-for="(item, index) in options">
      <template v-if="isValueMatch(item.value)">
        <span
          v-if="(item.elTagType == 'default' || item.elTagType == '') && (item.elTagClass == '' || item.elTagClass == null)"
          :key="item.value"
          :index="index"
          :class="item.elTagClass"
        >{{ item.label + " " }}</span>
        <el-tag
          v-else
          :disable-transitions="true"
          :key="item.value + ''"
          :index="index"
          :type="item.elTagType"
          :class="item.elTagClass"
        >{{ item.label + " " }}</el-tag>
      </template>
    </template>
    <template v-if="unmatch && showValue">
      {{ handleArray(unmatchArray) }}
    </template>
  </div>
</template>

<script setup>
// 记录未匹配的项
const unmatchArray = ref([])

const props = defineProps({
  // 数据
  options: {
    type: Array,
    default: null,
  },
  // 当前的值
  value: [Number, String, Array],
  // 当未找到匹配的数据时，显示value
  showValue: {
    type: Boolean,
    default: true,
  },
  separator: {
    type: String,
    default: ",",
  }
})

const values = computed(() => {
  if (props.value === null || typeof props.value === 'undefined' || props.value === '') return []
  if (typeof props.value === 'number' || typeof props.value === 'boolean') return [props.value]
  return Array.isArray(props.value) ? props.value.map(item => '' + item) : String(props.value).split(props.separator)
})

const unmatch = computed(() => {
  unmatchArray.value = []
  // 没有value不显示
  if (props.value === null || typeof props.value === 'undefined' || props.value === '' || !Array.isArray(props.options) || props.options.length === 0) return false
  // 传入值为数组
  let unmatch = false // 添加一个标志来判断是否有未匹配项
  values.value.forEach(item => {
    if (!props.options.some(v => v.value == item)) {
      unmatchArray.value.push(item)
      unmatch = true // 如果有未匹配项，将标志设置为true
    }
  })
  return unmatch // 返回标志的值
})

// 未匹配时的兜底回显。
// 原来模板里写的是 Vue2 过滤器语法 `{{ unmatchArray | handleArray }}`，但 Vue3 已经移除了过滤器，
// 这个表达式会被当成按位或求值：Number(['xxx']) 得到 NaN，NaN | 0 的结果是 0，
// 于是任何非数字的脏值（袋鼠的业务字典全是 published/volunteer 这种英文码）都被渲染成字面量 0。
// 0 恰好又是 sys_normal_disable 里"正常"的字典值，运营看到一列 0 会以为是合法取值，
// 完全察觉不到数据已经漂移。所以这里必须改成普通函数调用，把未匹配的原始码原样显示出来。
function handleArray(array) {
  if (array.length === 0) return ""
  return array.reduce((pre, cur) => {
    return pre + " " + cur
  })
}

function isValueMatch(itemValue) {
  return values.value.some(val => val == itemValue)
}
</script>

<style scoped>
.el-tag + .el-tag {
  margin-left: 10px;
}
</style>
