<template>
  <section v-if="detail.canHqTakeover || detail.canHqFirstReview" v-hasPermi="['kangaroo:mediation:edit']">
    <h3>总部初审</h3>
    <template v-if="detail.canHqTakeover">
      <p>接手后由总部核实材料并发布初次裁决，原有材料和核实记录会保留。</p>
      <el-button type="primary" :loading="busy" @click="$emit('command','hqTakeover',{})">接手初审</el-button>
    </template>
    <el-form v-else-if="detail.status !== 'ready'" label-position="top" @submit.prevent>
      <el-form-item v-for="field in verificationFields" :key="field.key" :label="field.label" required>
        <el-input v-model="verification[field.key]" type="textarea" :rows="2" maxlength="5000" :placeholder="'至少' + field.min + '字'" />
      </el-form-item>
      <el-button type="primary" :loading="busy" :disabled="!complete(verificationFields,verification)" @click="$emit('command','verify',{...verification})">保存核实记录</el-button>
    </el-form>
    <el-form v-else label-position="top" @submit.prevent>
      <el-form-item v-for="field in decisionFields" :key="field.key" :label="field.label" required>
        <el-input v-model="decision[field.key]" type="textarea" :rows="2" :maxlength="field.key === 'creditImpact' ? 1000 : 5000" :placeholder="'至少' + field.min + '字'" />
      </el-form-item>
      <el-form-item label="执行时限（北京时间）" required>
        <el-date-picker v-model="deadline" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" />
      </el-form-item>
      <template v-if="detail.jury">
        <el-form-item label="是否采纳大众评审意见"><el-switch v-model="adopted"/></el-form-item>
        <el-form-item label="采纳或不采纳的依据" required><el-input v-model="juryReason" type="textarea" maxlength="2000" placeholder="至少5字"/></el-form-item>
      </template>
      <el-button type="primary" :loading="busy" :disabled="!complete(decisionFields,decision) || !deadline || (detail.jury && juryReason.trim().length < 5)" @click="submitDecision">发布初次裁决，交双方确认</el-button>
    </el-form>
  </section>
</template>

<script setup>
import { reactive, ref } from 'vue'

const props = defineProps({ detail: { type: Object, required: true }, busy: Boolean })
const emit = defineEmits(['command'])
const verificationFields = [
  { key: 'userStatement', label: '用户陈述', min: 10 },
  { key: 'merchantStatement', label: '店家陈述', min: 10 },
  { key: 'evidenceList', label: '核实的证据', min: 2 },
  { key: 'finding', label: '核实结论', min: 10 }
]
const decisionFields = [
  { key: 'decision', label: '责任判定', min: 10 },
  { key: 'basis', label: '裁决依据', min: 10 },
  { key: 'measures', label: '处理措施', min: 5 },
  { key: 'creditImpact', label: '信用及处罚影响', min: 2 }
]
const verification = reactive({}), decision = reactive({})
const deadline = ref(''), adopted = ref(false), juryReason = ref('')
const complete = (fields, values) => fields.every(field => (values[field.key] || '').trim().length >= field.min)
function submitDecision() {
  const body = { ...decision, executeDeadline: deadline.value }
  if (props.detail.jury) Object.assign(body, { juryAdopted: adopted.value, juryReason: juryReason.value })
  emit('command','decision',body)
}
</script>
<style scoped>
section { padding: 20px 0; border-bottom: 1px solid #e8e2d7; }
.el-form { max-width: 760px; }
</style>
