// 환불된 결제의 이용권이 실제로 회수되는지 본다.
//   npm run check:revoke
//
// 왜 필요한가: 발급에는 세 경로(success·웹훅·관리자 복구)가 있었는데 회수에는 하나도
// 없었다. 2026-06-19 결제 한 건이 포트원에서 전액 취소됐는데 subscriptions는
// status='active' 그대로였다 — 돈을 돌려받고도 30일을 쓸 수 있는 상태다.
//
// 돈이 걸린 규칙이라 판정은 순수 함수로 떼어 두고 여기서 표로 확인한다(네트워크·DB 없음).
// 판정만 맞아도 소용없는 두 가지는 파일을 읽어 같이 확인한다.
//   1) 회수한 상태값으로 실제 문이 닫히는가(이용권 게이트가 status='active'만 통과시키는가)
//   2) 취소 웹훅이 회수 경로에 연결돼 있는가
import fs from 'node:fs'
import path from 'node:path'
import { ACTIVE, REVOKED, decideRevocation } from '../src/lib/subscriptionRevocationPolicy.ts'

const results = []
const eq = (name, got, want) => results.push({ ok: got === want, name, detail: `${got} (기대 ${want})` })

const sub = (status) => ({ status })

// 1) 판정표 — 결제 상태 × 이용권 상태
const cases = [
  ['전액 취소 + 이용권 살아 있음 → 회수', { paymentStatus: 'CANCELLED', subscription: sub(ACTIVE) }, 'revoke'],
  ['전액 취소 + 이미 회수됨 → 멱등(웹훅 재시도·중복 수신)', { paymentStatus: 'CANCELLED', subscription: sub(REVOKED) }, 'already_revoked'],
  ['전액 취소 + 발급된 이용권 없음 → 할 일 없음', { paymentStatus: 'CANCELLED', subscription: null }, 'no_subscription'],
  ['부분 취소 → 자동으로 뺏지 않고 사람이 본다', { paymentStatus: 'PARTIAL_CANCELLED', subscription: sub(ACTIVE) }, 'review'],
  ['결제 유효(PAID) → 그대로 둔다', { paymentStatus: 'PAID', subscription: sub(ACTIVE) }, 'keep'],
  ['결제 상태를 못 읽음 → 회수하지 않고 사람이 본다', { paymentStatus: undefined, subscription: sub(ACTIVE) }, 'review'],
  ['빈 상태값 → 회수하지 않고 사람이 본다', { paymentStatus: '', subscription: sub(ACTIVE) }, 'review'],
  ['FAILED인데 이용권이 붙어 있음 → 이상하니 사람이 본다', { paymentStatus: 'FAILED', subscription: sub(ACTIVE) }, 'review'],
  ['모르는 상태값 → 회수하지 않는다', { paymentStatus: 'WHATEVER', subscription: sub(ACTIVE) }, 'review'],
]
for (const [name, input, want] of cases) eq(name, decideRevocation(input).action, want)

// 결제 상태를 못 읽었을 때 회수가 나오면 안 된다(장애로 멀쩡한 이용권을 뺏는 사고).
const neverRevoke = ['PAID', 'READY', 'PENDING', 'VIRTUAL_ACCOUNT_ISSUED', 'FAILED', 'PARTIAL_CANCELLED', '', undefined]
const wrongly = neverRevoke.filter((s) => decideRevocation({ paymentStatus: s, subscription: sub(ACTIVE) }).action === 'revoke')
results.push({ ok: wrongly.length === 0, name: '전액 취소가 아닌 상태로는 절대 회수하지 않는다', detail: wrongly.length ? `회수로 판정됨: ${wrongly.join(',')}` : `${neverRevoke.length}개 상태 모두 안전` })

// 2) 회수한 상태값으로 문이 실제로 닫히는가.
//    판정이 맞아도 게이트가 status를 안 보면 회수는 장부상의 일이 된다.
const gate = fs.readFileSync(path.join(import.meta.dirname, '../src/lib/subscription.ts'), 'utf-8')
results.push({
  ok: REVOKED !== ACTIVE && gate.includes(`status === '${ACTIVE}'`) && gate.includes(`.eq('status', '${ACTIVE}')`),
  name: `이용권 게이트가 status='${ACTIVE}'만 통과시킨다(회수하면 즉시 닫힘)`,
  detail: 'subscription.ts의 isActivePass·getActiveSubscription',
})

// 3) 취소 웹훅이 회수 경로에 연결돼 있는가.
//    주석은 지우고 본다 — 이벤트 이름이 설명 주석에도 적혀 있어서, 그냥 문자열을 찾으면
//    분기를 통째로 지워도 주석 때문에 통과한다(실제로 이 검사를 그렇게 짰다가 놓쳤다).
const hookSource = fs.readFileSync(path.join(import.meta.dirname, '../src/app/api/portone/webhook/route.ts'), 'utf-8')
const hookCode = hookSource.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')
results.push({
  ok: /webhook\.type === 'Transaction\.Cancelled'/.test(hookCode) && /revokeSubscriptionForPayment\(/.test(hookCode),
  name: '취소 웹훅(Transaction.Cancelled)이 회수를 부른다',
  detail: 'api/portone/webhook/route.ts',
})

const failed = results.filter((r) => !r.ok)
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name} — ${r.detail}`)
console.log(`\n${results.length - failed.length}/${results.length} 통과`)
process.exit(failed.length ? 1 : 0)
