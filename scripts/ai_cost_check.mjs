// AI 채점 원가가 매출을 갉고 있지는 않은지 본다.
//   npm run check:ai-cost
//
// 왜 필요한가: 유료 이용권은 5,500원에 AI 채점 **무제한**이다. 한 사람이 많이 쓸수록
// 그 사람에게서 남는 돈이 줄고, 어느 지점을 넘으면 받은 돈보다 더 쓴다.
// 그 지점이 어디인지, 누가 거기 가까운지 지금까지 아무 데서도 안 보였다.
//
// 매출은 어드민에 보이는데 원가는 안 보인다 — 그러면 '늘고 있다'만 보고 판단하게 된다.

import fs from 'node:fs'
import { summarizeAiCost } from '../src/lib/aiGradingCost.ts'
import { summarizeSales } from '../src/lib/dailySales.ts'

const ENV = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8').split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] }),
)
const U = ENV.NEXT_PUBLIC_SUPABASE_URL, K = ENV.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: K, Authorization: `Bearer ${K}` }

let pass = 0, fail = 0
const ok = (n, d = '') => { pass++; console.log(`  ○ ${n}${d ? ` — ${d}` : ''}`) }
const bad = (n, d = '') => { fail++; console.log(`  × ${n}${d ? ` — ${d}` : ''}`) }

console.log('\nAI 채점 원가\n')

// ── 셈이 맞는가 ────────────────────────────────────────────────────────────
{
  const zero = summarizeAiCost({ essayCount: 0, manuscriptCount: 0, perUser: [] }, 0)
  if (zero.krw === 0 && zero.shareOfRevenue === null) ok('안 썼으면 0원이고 비율은 없다', '매출 0으로 나누지 않는다')
  else bad('빈 집계', JSON.stringify(zero))

  const one = summarizeAiCost({ essayCount: 1, manuscriptCount: 0, perUser: [] }, 5500)
  if (one.krw > 0 && one.krw < 200) ok('한 건 원가가 자릿수에 맞다', `${one.krw}원`)
  else bad('한 건 원가', `${one.krw}원 — 어림이 크게 어긋났다`)
  if (one.breakEvenCount > 10 && one.breakEvenCount < 1000) ok('손익분기 횟수가 자릿수에 맞다', `${one.breakEvenCount}건`)
  else bad('손익분기', `${one.breakEvenCount}건`)

  const heavy = summarizeAiCost(
    { essayCount: 500, manuscriptCount: 0, perUser: [{ userId: 'u1', count: 500 }] }, 5500,
  )
  if (heavy.heavy[0]?.overBreakEven) ok('많이 쓴 사람을 짚어 준다', `${heavy.heavy[0].count}건 · ${heavy.heavy[0].krw.toLocaleString('ko-KR')}원`)
  else bad('과다 사용 표시', '손익분기를 넘겨도 안 짚는다')
}

// ── 실제 값 ────────────────────────────────────────────────────────────────
const all = async (p) => {
  let out = [], from = 0
  for (;;) {
    const r = await fetch(U + p, { headers: { ...H, Range: `${from}-${from + 999}` } })
    const j = await r.json()
    if (!Array.isArray(j) || !j.length) break
    out.push(...j)
    if (j.length < 1000) break
    from += 1000
    if (from > 40000) break
  }
  return out
}

const since = new Date(Date.now() - 30 * 86400000).toISOString()
// quiz_answers 에는 시각 컬럼이 없다 — 세션의 완료 시각으로 기간을 가른다.
const sessions = await all(`/rest/v1/quiz_sessions?select=id,user_id,completed_at&completed_at=gte.${since}`)
const sessionUser = Object.fromEntries(sessions.map(s => [s.id, s.user_id]))
const graded = (await all('/rest/v1/quiz_answers?select=session_id&ai_score=not.is.null'))
  .filter(a => sessionUser[a.session_id])
const manuscripts = await all(`/rest/v1/manuscript_submissions?select=user_id&created_at=gte.${since}`)

const perUserMap = {}
for (const a of graded) {
  const u = sessionUser[a.session_id]
  perUserMap[u] = (perUserMap[u] ?? 0) + 1
}

const subs = await all('/rest/v1/subscriptions?select=created_at,amount,status,payment_key')
const sales = summarizeSales(subs, new Date())

const cost = summarizeAiCost(
  {
    essayCount: graded.length,
    manuscriptCount: manuscripts.length,
    perUser: Object.entries(perUserMap).map(([userId, count]) => ({ userId, count })),
  },
  sales.last30.amount,
)

console.log(`\n  최근 30일 — 채점 ${cost.totalCount}건(서술형 ${cost.essayCount} · 원고지 ${cost.manuscriptCount})`)
console.log(`  추정 원가 ${cost.krw.toLocaleString('ko-KR')}원 · 매출 ${sales.last30.amount.toLocaleString('ko-KR')}원`
  + (cost.shareOfRevenue !== null ? ` · 매출의 ${cost.shareOfRevenue}%` : ''))
console.log(`  한 건 ${cost.krwPerGrading}원 · 한 사람이 ${cost.breakEvenCount}건을 넘기면 받은 돈을 넘어선다`)
if (cost.heavy.length) {
  console.log('  많이 쓴 사람:')
  for (const h of cost.heavy) {
    console.log(`    ${String(h.count).padStart(4)}건 · ${String(h.krw).padStart(6)}원${h.overBreakEven ? '  ← 손익분기 넘음' : ''}`)
  }
}
console.log('')

// 원가가 매출의 절반을 넘으면 무제한이라는 약속을 다시 봐야 한다.
if (cost.shareOfRevenue === null) ok('매출이 없어 비율은 보지 않는다')
else if (cost.shareOfRevenue < 50) ok('원가가 매출을 갉지 않는다', `${cost.shareOfRevenue}%`)
else bad('원가가 매출의 절반을 넘었다', `${cost.shareOfRevenue}% — '무제한'을 다시 봐야 한다`)

const over = cost.heavy.filter(h => h.overBreakEven)
if (!over.length) ok('받은 돈보다 더 쓴 사람은 없다')
else bad(`손익분기를 넘긴 사람 ${over.length}명`, over.map(h => `${h.count}건`).join(', '))

console.log(`\n${fail ? '원가를 들여다봐야 한다.' : '원가는 아직 여유가 있다.'}`)
process.exitCode = fail ? 1 : 0
