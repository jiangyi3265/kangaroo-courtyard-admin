import test from 'node:test'
import assert from 'node:assert/strict'
import { refundLabel } from './finance-format.js'

test('已核实零元区分待确认和已结案，普通驳回仍保留原状态', () => {
  assert.equal(refundLabel({ hqDeparture: true, verifiedDepartureDate: '2026-11-23', amountFen: 0, status: 'pending' }), '待总部核实离店日期并办理')
  const verified = { verifiedDepartureDate: '2026-11-23', policyNo: 'P1', amountFen: 0 }
  assert.equal(refundLabel({ ...verified, status: 'pending' }), '可退为零，待城市负责人确认')
  assert.equal(refundLabel({ ...verified, status: 'rejected' }), '可退为零，已结案')
  assert.equal(refundLabel({ ...verified, amountFen: 200, status: 'pending' }), '待城市负责人办理退款')
  assert.equal(refundLabel({ ...verified, amountFen: 200, approvedFen: 0, status: 'rejected' }), '可退为零，已结案')
  assert.equal(refundLabel({ status: 'rejected' }), '未通过')
})
