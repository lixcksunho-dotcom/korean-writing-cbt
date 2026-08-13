// 결제 시도 집계가 맞는지 본다.
//   npm run check:attempts
//
// 이 숫자로 '결제창이 고장 났나'를 판단하게 되므로, 틀리면 없는 장애를 쫓거나
// 있는 장애를 놓친다. 네트워크 없이 표로 확인한다.
import { summarizeAttempts } from '../src/lib/paymentAttemptFunnel.ts'

const results = []
const eq = (name, got, want) => results.push({ ok: Object.is(got, want), name, detail: `${got} (기대 ${want})` })

const at = (sec) => new Date(Date.parse('2026-08-01T00:00:00Z') + sec * 1000).toISOString()

// 실제 데이터에서 가장 흔한 모양: 한 사람이 창을 두 번 열고 세 번째에 결제.
const oneRetrier = [
  { id: 'a', status: 'READY', customerId: 'u1', requestedAt: at(0) },
  { id: 'b', status: 'READY', customerId: 'u1', requestedAt: at(4) },
  { id: 'c', status: 'PAID', customerId: 'u1', requestedAt: at(60), paidAt: at(70) },
]
const one = summarizeAttempts(oneRetrier)
eq('건 단위로는 3건 중 1건만 결제', `${one.attempts.paid}/${one.attempts.total}`, '1/3')
eq('사람 단위로는 1명 중 1명이 결제', `${one.people.paid}/${one.people.total}`, '1/1')
eq('사람 단위 완결률 100%', one.people.ratio, 1)
eq('여러 번 시도한 끝에 결제한 사람으로 잡힌다', one.retriedThenPaid.length, 1)
eq('첫 시도부터 결제까지 70초', one.retriedThenPaid[0].secondsToPay, 70)
eq('이탈한 사람 없음', one.droppedPeople.length, 0)

// 포트원 목록은 최신이 먼저 온다. 그대로 두면 '결제하고 나서 또 창을 열었다'로 읽힌다.
const reversed = summarizeAttempts([...oneRetrier].reverse())
eq('시도 순서는 입력 순서와 무관하게 시간순', reversed.retriedThenPaid[0].statuses.join('>'), 'READY>READY>PAID')
eq('순서를 뒤집어도 걸린 시간은 같다', reversed.retriedThenPaid[0].secondsToPay, 70)

// 창만 열고 사라진 사람은 반드시 이탈로 남아야 한다 — 여기가 진짜 매출 누수다.
const mixed = summarizeAttempts([
  ...oneRetrier,
  { id: 'd', status: 'READY', customerId: 'u2', requestedAt: at(10) },
  { id: 'e', status: 'FAILED', customerId: 'u3', requestedAt: at(20), failureReason: '사용자가 결제를 취소하였습니다' },
  { id: 'f', status: 'FAILED', customerId: 'u4', requestedAt: at(30), failureReason: '사용자가 결제를 취소하였습니다' },
  { id: 'g', status: 'FAILED', customerId: 'u5', requestedAt: at(40), failureReason: '카드 한도 초과' },
])
eq('이탈한 사람 4명', mixed.droppedPeople.length, 4)
eq('사람 단위 완결률 1/5', `${mixed.people.paid}/${mixed.people.total}`, '1/5')
eq('실패 사유가 많은 순으로 모인다', mixed.failureReasons[0].reason, '사용자가 결제를 취소하였습니다')
eq('가장 많은 실패 사유 2건', mixed.failureReasons[0].count, 2)

// 환불된 건도 '결제창은 통과했다' — 완결률에서 빼면 결제창 문제로 오해한다.
const refunded = summarizeAttempts([{ id: 'h', status: 'CANCELLED', customerId: 'u9', requestedAt: at(0), paidAt: at(5) }])
eq('환불된 건은 결제 완료로 센다(완결률은 결제창 통과율)', refunded.people.paid, 1)

// 결제자를 못 읽는 건을 한 덩어리로 묶으면 남의 시도와 섞여 완결률이 거짓이 된다.
const anon = summarizeAttempts([
  { id: 'x', status: 'READY', customerId: null, requestedAt: at(0) },
  { id: 'y', status: 'READY', customerId: undefined, requestedAt: at(1) },
  { id: 'z', status: 'PAID', customerId: '', requestedAt: at(2), paidAt: at(3) },
])
eq('결제자 불명은 건별로 따로 센다(합치지 않는다)', anon.people.total, 3)

// 빈 입력에서 NaN이 새면 화면에 'NaN%'가 그대로 나간다.
const empty = summarizeAttempts([])
eq('시도가 없으면 비율은 0(NaN 아님)', empty.people.ratio, 0)
eq('빈 입력에서 건 단위 비율도 0', empty.attempts.ratio, 0)

const failed = results.filter((r) => !r.ok)
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name} — ${r.detail}`)
console.log(`\n${results.length - failed.length}/${results.length} 통과`)
process.exit(failed.length ? 1 : 0)
