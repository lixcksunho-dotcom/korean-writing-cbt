// 재결제로 붙잡을 사람 수가 맞게 세지는지 본다.
//   npm run check:renewal
//
// 이 숫자를 보고 사장님이 누구에게 연락할지 정하므로, 틀리면 이미 연장한 사람을
// '떠난 사람'으로 세거나 아직 잡을 수 있는 사람을 놓친다.
import { summarizeRenewals, EXPIRING_WINDOW_DAYS, EXPIRED_WINDOW_DAYS } from '../src/lib/subscriptionRenewal.ts'

const DAY = 86400_000
const NOW = Date.parse('2026-08-24T09:00:00+09:00')
const at = (days) => new Date(NOW + days * DAY).toISOString()

const results = []
const eq = (name, got, want) => results.push({ ok: got === want, name, detail: `${got} (기대 ${want})` })

const soon = (rows) => summarizeRenewals(rows, NOW).expiringSoon
const gone = (rows) => summarizeRenewals(rows, NOW).expiredNotBack

eq('3일 뒤 끝남 → 붙잡을 사람', soon([{ user_id: 'a', expires_at: at(3) }]), 1)
eq('오늘 끝남(경계) → 붙잡을 사람', soon([{ user_id: 'a', expires_at: at(0) }]), 1)
eq(`${EXPIRING_WINDOW_DAYS}일째는 창 밖`, soon([{ user_id: 'a', expires_at: at(EXPIRING_WINDOW_DAYS) }]), 0)
eq('이미 끝난 사람은 붙잡을 사람이 아니다', soon([{ user_id: 'a', expires_at: at(-1) }]), 0)

eq('어제 끝나고 안 삼 → 떠난 사람', gone([{ user_id: 'a', expires_at: at(-1) }]), 1)
eq(`${EXPIRED_WINDOW_DAYS}일 넘게 지났으면 창 밖`, gone([{ user_id: 'a', expires_at: at(-EXPIRED_WINDOW_DAYS - 1) }]), 0)

// 가장 중요한 경계: 이미 연장한 사람을 '떠난 사람'으로 세면 안 된다.
const renewed = [{ user_id: 'a', expires_at: at(-2) }, { user_id: 'a', expires_at: at(28) }]
eq('연장한 사람은 떠난 사람이 아니다', gone(renewed), 0)
eq('연장한 사람은 아직 만료 임박도 아니다', soon(renewed), 0)
const renewedSoon = [{ user_id: 'a', expires_at: at(-40) }, { user_id: 'a', expires_at: at(2) }]
eq('연장분이 곧 끝나면 붙잡을 사람', soon(renewedSoon), 1)

// 사람 단위로 세는가 — 결제 건마다 세면 한 사람이 여러 번 잡힌다.
eq('한 사람이 두 번 세지지 않는다', gone([{ user_id: 'a', expires_at: at(-3) }, { user_id: 'a', expires_at: at(-2) }]), 1)
eq('다른 사람은 각각 센다', gone([{ user_id: 'a', expires_at: at(-3) }, { user_id: 'b', expires_at: at(-2) }]), 2)

// 날짜가 깨져도 그 사람이 '떠난 사람'으로 잡히면 안 된다.
// 주의: 이 항목은 Number.isFinite 가드를 지워도 통과한다 — NaN은 어느 쪽 비교에도 안 걸리기
// 때문이다(일부러 지워 보고 확인했다). 가드는 앞으로 비교식이 바뀌어도 안전하도록 남긴 것이고,
// 여기서 재는 건 '결과가 부풀지 않는다'는 행동이다.
eq('날짜가 깨진 행은 세지 않는다', gone([{ user_id: 'a', expires_at: '(없음)' }]), 0)
eq('빈 입력', gone([]), 0)

const failed = results.filter((r) => !r.ok)
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name} — ${r.detail}`)
console.log(`\n${results.length - failed.length}/${results.length} 통과`)
process.exit(failed.length ? 1 : 0)
