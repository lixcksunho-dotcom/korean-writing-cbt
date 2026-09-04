// 무료로 써 본 사람이 유료로 넘어가는지 센다 — 무료 회차 수를 유지할지 판단하려면 이 숫자가 있어야 한다.
//   npm run report:free-to-paid
//   npm run report:free-to-paid -- --from 2026-06-01
//
// 백로그 전제는 "subscriptions 에서 무료 발급(amount=0)을 받은 사람 중 이후 유료 결제까지 간 사람".
// 실물 대조(2026-09-05): amount=0 행은 전체 29행 중 **1행**(goodwill, 6/16)뿐이다. 이 서비스의 "무료 체험"은
// 구독 행으로 나가는 게 아니라 ①모의고사 무료 회차(programs.ts freeRounds: 실용글쓰기 1~2회차, 로그인만 하면
// 구독 없이 풀 수 있다) ②무료 AI 분석 3회(aiTrial.ts FREE_AI_TRIAL) 로 열려 있다. 그래서 세 층을 따로 낸다:
//   ① 지시문 그대로 — amount=0 발급 → 이후 유료 결제. (표본이 한 자릿수라 인원수만 적는다)
//   ② 무료 회차 → 유료 — quiz_sessions 에서 무료 회차(round ≤ freeRounds) 세션을 결제 '전에' 시작한 사람이
//      이후 결제했는지, 첫 무료 세션부터 결제까지 며칠 걸렸는지. 결제한 사람 중 무료 회차를 안 거친 사람도 센다.
//   ③ 무료 AI 분석 → 유료 — page_views 의 #event/ai_trial_used(visitor_id=u:<userId>) 를 결제 전에 남긴 사람.
// 결제 사실은 포트원 원장(PAID·CANCELLED·PARTIAL_CANCELLED, customer.id = 회원 id)에서만 본다 —
// subscriptions 유료 행은 원장과 어긋난 수기 행(sub_a336·demo-promo)이 있어 원장이 기준이다.
//
// 읽기 전용 — DB 쓰기·포트원 파괴적 호출 없음. 개인정보는 id 앞 8자만 출력한다.
import fs from 'node:fs'
import { PortOneClient } from '@portone/server-sdk'
import { getProgram } from '../src/lib/programs.ts'

const ENV = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8').split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] })
)

const argv = process.argv.slice(2)
const FROM = (argv.includes('--from') && argv[argv.indexOf('--from') + 1]) ? argv[argv.indexOf('--from') + 1] : '2026-01-01'
if (!/^\d{4}-\d{2}-\d{2}$/.test(FROM)) {
  console.error(`날짜 형식이 아니다: ${FROM} (YYYY-MM-DD)`)
  process.exit(1)
}
const fromIso = new Date(`${FROM}T00:00:00+09:00`).toISOString()
const nowIso = new Date().toISOString()

const SB = ENV.NEXT_PUBLIC_SUPABASE_URL
const KEY = ENV.SUPABASE_SERVICE_ROLE_KEY
const SB_HEADERS = { apikey: KEY, Authorization: `Bearer ${KEY}` }

const DAY = 24 * 3600_000
const id8 = (v) => String(v ?? '-').slice(0, 8)
const kst = (t) => (t ? new Date(new Date(t).getTime() + 9 * 3600_000).toISOString().slice(0, 10) : '-')
const days = (a, b) => Math.floor((new Date(b).getTime() - new Date(a).getTime()) / DAY)
const median = (xs) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }
// 표본 10명 미만이면 비율을 쓰지 않는다 — 작은 표본에 %를 붙이면 과대해석된다.
const share = (n, d) => (d >= 10 ? ` (${Math.round((n / d) * 100)}%)` : '')

// PostgREST 는 한 번에 1000행만 준다 — Range 로 넘긴다(revenue_integrity_check 와 같은 방식).
async function all(path) {
  const out = []
  for (let start = 0; ; start += 1000) {
    const res = await fetch(`${SB}/rest/v1/${path}`, { headers: { ...SB_HEADERS, Range: `${start}-${start + 999}` } })
    const rows = await res.json()
    if (!Array.isArray(rows)) throw new Error(`${path.split('?')[0]} 조회 실패: ${JSON.stringify(rows).slice(0, 140)}`)
    out.push(...rows)
    if (rows.length < 1000) return out
  }
}

// ── 회원(현재 존재하는 계정만) — 탈퇴 계정의 결제는 회원 활동과 이어 붙일 수 없어 따로 센다
const userRes = await fetch(`${SB}/auth/v1/admin/users?per_page=1000`, { headers: SB_HEADERS })
const users = (await userRes.json())?.users ?? []
const userById = new Map(users.map((u) => [u.id, u]))

// ── 포트원 원장: 사람별 첫 결제 시각
const client = PortOneClient({ secret: ENV.PORTONE_API_SECRET })
const payments = []
for (let page = 0; ; page++) {
  const res = await client.payment.getPayments({
    page: { number: page, size: 100 },
    filter: { storeId: ENV.NEXT_PUBLIC_PORTONE_STORE_ID, from: fromIso, until: nowIso },
  })
  const got = res?.items ?? []
  payments.push(...got)
  if (got.length < 100) break
}
const ledger = payments.filter((p) => p.paidAt && ['PAID', 'CANCELLED', 'PARTIAL_CANCELLED'].includes(p.status))
const firstPaidAt = new Map() // userId → 첫 결제 시각(ISO)
const firstPaidStatus = new Map() // 첫 결제가 취소(환불)된 건이면 표시한다 — 전환으로 세되 매출은 아니다
for (const p of ledger) {
  const uid = p.customer?.id ?? p.customer?.customerId
  if (!uid) continue
  if (!firstPaidAt.has(uid) || p.paidAt < firstPaidAt.get(uid)) { firstPaidAt.set(uid, p.paidAt); firstPaidStatus.set(uid, p.status) }
}
const mark = (uid) => (firstPaidStatus.get(uid) === 'PAID' ? '' : ' [취소됨]')
const payersGone = [...firstPaidAt.keys()].filter((uid) => !userById.has(uid)).length
const payers = new Set([...firstPaidAt.keys()].filter((uid) => userById.has(uid)))

// ── DB 조회(전부 GET)
const subs = await all(`subscriptions?select=id,user_id,order_id,amount,status,started_at&started_at=gte.${fromIso}&order=started_at`)
const sessions = await all(`quiz_sessions?select=user_id,program,round,started_at,completed_at&started_at=gte.${fromIso}&order=started_at`)
const aiTrials = await all(`page_views?select=visitor_id,created_at&path=eq.${encodeURIComponent('#event/ai_trial_used')}&created_at=gte.${fromIso}&order=created_at`)

console.log(`\n무료 → 유료 전환 (${FROM} ~ 오늘, KST) — 결제 사실은 포트원 원장 기준`)
console.log(`  회원 ${users.length}명 · 원장 결제자 ${firstPaidAt.size}명(현재 회원 ${payers.size}명${payersGone ? `, 탈퇴·검증 계정 ${payersGone}명 제외` : ''})`)

// ───────────── ① 지시문 그대로: 무료 발급(amount=0) → 유료 결제 ─────────────
const freeSubs = subs.filter((s) => (s.amount ?? 0) === 0)
const freeFirst = new Map() // userId → 첫 무료 발급 행
for (const s of freeSubs) if (!freeFirst.has(s.user_id)) freeFirst.set(s.user_id, s)

console.log(`\n① 무료 발급(subscriptions.amount=0) 받은 사람 → 이후 유료 결제`)
console.log(`   무료 발급 ${freeSubs.length}건 / ${freeFirst.size}명 (subscriptions 전체 ${subs.length}행)`)
if (!freeFirst.size) {
  console.log('   (무료 발급 행 없음 — 이 층으로는 잴 것이 없다)')
} else {
  let converted = 0
  for (const [uid, s] of freeFirst) {
    const paid = firstPaidAt.get(uid)
    const kind = String(s.order_id).split(/[-:]/)[0] // admin-grant·promo·review·goodwill 등 발급 종류만
    const paidBefore = paid && paid < s.started_at
    const after = paid && !paidBefore
    if (after) converted += 1
    const verdict = after ? `→ 유료 결제 ${kst(paid)} (${days(s.started_at, paid)}일 뒤)${mark(uid)}`
      : paidBefore ? `— 결제(${kst(paid)})가 무료 발급보다 먼저였다: 전환이 아니라 사후 보상`
      : userById.has(uid) ? '— 이후 결제 없음' : '— 이후 결제 없음(탈퇴 계정)'
    console.log(`   user=${id8(uid)} 무료 ${kind.padEnd(11)} ${kst(s.started_at)} ${verdict}`)
  }
  console.log(`   ⇒ 무료 발급 ${freeFirst.size}명 중 이후 유료 결제 ${converted}명${share(converted, freeFirst.size)}`)
  if (freeFirst.size < 10) console.log('   ⚠ 표본 10명 미만 — 비율을 내지 않는다. 이 층으로는 결론을 낼 수 없다')
}

// ───────────── ② 대리 지표: 무료 회차 → 유료 ─────────────
// KBS 는 별도 서비스로 떼어 냈고(programs.ts 주석) 남은 세션 몇 건은 옛 기록이다. 그때 무료는 1회차였다(src/app/page.tsx 주석).
const freeRoundsOf = (program) => (program === 'kbs' ? 1 : getProgram(program).freeRounds)
const firstFree = new Map()   // userId → 첫 무료 회차 세션 시각
const firstAny = new Map()    // userId → 첫 세션 시각(회차 무관)
for (const s of sessions) {
  if (!firstAny.has(s.user_id)) firstAny.set(s.user_id, s.started_at)
  if (s.round <= freeRoundsOf(s.program) && !firstFree.has(s.user_id)) firstFree.set(s.user_id, s.started_at)
}
// "결제 전에 무료 회차를 풀어 본 사람"만 체험자로 친다 — 결제한 뒤 1·2회차를 푸는 것은 체험이 아니다.
const triers = [...firstFree].filter(([uid, t]) => !firstPaidAt.has(uid) || t < firstPaidAt.get(uid))
const trierConverted = triers.filter(([uid]) => payers.has(uid))
const gaps = trierConverted.map(([uid, t]) => days(t, firstPaidAt.get(uid)))
const buckets = [['당일', (d) => d === 0], ['1~3일', (d) => d >= 1 && d <= 3], ['4~7일', (d) => d >= 4 && d <= 7], ['8~14일', (d) => d >= 8 && d <= 14], ['15일+', (d) => d >= 15]]
const trierIds = new Set(triers.map(([uid]) => uid))
const paidNoTrial = [...payers].filter((uid) => !trierIds.has(uid))
const paidNoSession = paidNoTrial.filter((uid) => !firstAny.has(uid))

console.log(`\n② 무료 회차(실용글쓰기 1~${getProgram('silyong').freeRounds}회차)를 결제 전에 풀어 본 사람 → 이후 유료 결제  [대리 지표]`)
console.log(`   모의고사 세션 ${sessions.length}건 / ${firstAny.size}명 · 그중 결제 전에 무료 회차를 시작한 사람 ${triers.length}명`)
console.log(`   ⇒ 무료 회차 체험 ${triers.length}명 중 이후 유료 결제 ${trierConverted.length}명${share(trierConverted.length, triers.length)}`)
if (gaps.length) {
  console.log(`      첫 무료 세션 → 첫 결제: 중앙값 ${median(gaps)}일 · 최소 ${Math.min(...gaps)}일 · 최대 ${Math.max(...gaps)}일`)
  console.log(`      분포: ${buckets.map(([label, f]) => `${label} ${gaps.filter(f).length}명`).join(' · ')}`)
  for (const [uid, t] of trierConverted) console.log(`        user=${id8(uid)} 무료 ${kst(t)} → 결제 ${kst(firstPaidAt.get(uid))} (${days(t, firstPaidAt.get(uid))}일)${mark(uid)}`)
}
console.log(`   결제자 ${payers.size}명 쪽에서 보면: 무료 회차를 먼저 풀어 본 사람 ${trierConverted.length}명${share(trierConverted.length, payers.size)}, 안 풀고 바로 결제 ${paidNoTrial.length}명(그중 모의고사 기록이 아예 없는 사람 ${paidNoSession.length}명)`)

// ───────────── ③ 대리 지표: 무료 AI 분석 → 유료 ─────────────
const firstAi = new Map()
for (const r of aiTrials) {
  const uid = String(r.visitor_id ?? '').startsWith('u:') ? r.visitor_id.slice(2) : null
  if (uid && userById.has(uid) && !firstAi.has(uid)) firstAi.set(uid, r.created_at)
}
const aiTriers = [...firstAi].filter(([uid, t]) => !firstPaidAt.has(uid) || t < firstPaidAt.get(uid))
const aiConverted = aiTriers.filter(([uid]) => payers.has(uid))
const aiGaps = aiConverted.map(([uid, t]) => days(t, firstPaidAt.get(uid)))
console.log(`\n③ 무료 AI 분석(3회)을 결제 전에 써 본 사람 → 이후 유료 결제  [대리 지표, #event/ai_trial_used 기준]`)
console.log(`   이벤트 ${aiTrials.length}건 / 현재 회원 ${firstAi.size}명 · 그중 결제 전에 쓴 사람 ${aiTriers.length}명`)
console.log(`   ⇒ 무료 AI 체험 ${aiTriers.length}명 중 이후 유료 결제 ${aiConverted.length}명${share(aiConverted.length, aiTriers.length)}`)
if (aiGaps.length) console.log(`      첫 사용 → 첫 결제: 중앙값 ${median(aiGaps)}일 · 최소 ${Math.min(...aiGaps)}일 · 최대 ${Math.max(...aiGaps)}일`)
if (aiTriers.length && aiTriers.length < 10) console.log('   ⚠ 표본 10명 미만 — 비율을 내지 않는다')

console.log('\n읽는 법: ①은 지시문 그대로의 층이고 ②③은 이 서비스의 실제 무료 체험 경로다. 세 층의 모집단은 서로 다르며 합치지 않는다.')
console.log('        비율(%)은 표본 10명 이상일 때만 붙였다. 결제 여부는 포트원 원장에서만 읽었다(무료 발급 행은 매출이 아니다).\n')
