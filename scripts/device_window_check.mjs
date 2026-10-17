import assert from 'node:assert/strict'
import { DEVICE_WINDOW_HOURS, deviceWindowStart, isDeviceBlocked } from '../src/lib/deviceWindow.ts'

let passed = 0
let failed = 0

function check(name, run) {
  try {
    run()
    passed++
    console.log(`PASS ${name}`)
  } catch (error) {
    failed++
    console.error(`FAIL ${name}: ${error.message}`)
  }
}

check('existing device remains allowed at and above the limit', () => {
  for (const limit of [2, 1]) {
    assert.equal(isDeviceBlocked({ seenDeviceIds: ['a', 'b'], currentDeviceId: 'a', limit }), false)
  }
})

check('new device is blocked at the limit', () => {
  assert.equal(isDeviceBlocked({ seenDeviceIds: ['a', 'b'], currentDeviceId: 'c', limit: 2 }), true)
})

check('new device is allowed below the limit', () => {
  assert.equal(isDeviceBlocked({ seenDeviceIds: ['a'], currentDeviceId: 'b', limit: 2 }), false)
  assert.equal(isDeviceBlocked({ seenDeviceIds: [], currentDeviceId: 'a', limit: 2 }), false)
})

check('duplicate IDs count once, including a one-shot iterable', () => {
  const seenDeviceIds = ['a', 'a'][Symbol.iterator]()
  assert.equal(isDeviceBlocked({ seenDeviceIds, currentDeviceId: 'b', limit: 2 }), false)
  assert.equal(isDeviceBlocked({ seenDeviceIds: ['a', 'a', 'b'], currentDeviceId: 'c', limit: 2 }), true)
})

const now = new Date('2026-09-12T00:30:12.345Z')

check('window start preserves exact millisecond arithmetic', () => {
  for (const hours of [0, 1.5, 24, 48]) {
    const start = deviceWindowStart(now, hours)
    assert.equal(Date.parse(start), now.getTime() - hours * 60 * 60 * 1000)
    assert.equal(start, new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString())
  }
  assert.equal(now.toISOString(), '2026-09-12T00:30:12.345Z')
})

check('24-hour ISO gte excludes a 25-hour-old record and includes the boundary', () => {
  assert.equal(DEVICE_WINDOW_HOURS, 24)
  const start = deviceWindowStart(now, DEVICE_WINDOW_HOURS)
  const boundary = now.getTime() - 24 * 60 * 60 * 1000
  for (const [timestamp, included] of [
    [now.getTime() - 25 * 60 * 60 * 1000, false],
    [boundary - 1, false],
    [boundary, true],
    [boundary + 1, true],
    [now.getTime(), true],
  ]) {
    const record = new Date(timestamp).toISOString()
    assert.equal(record >= start, included)
    assert.equal(record >= start, timestamp >= Date.parse(start))
  }
})

console.log(`Passed: ${passed}, Failed: ${failed}`)
process.exitCode = failed ? 1 : 0
