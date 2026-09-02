// 날짜별 판매 집계가 맞는지 본다.
//   npm run check:sales
//
// 매출 숫자는 틀려도 화면이 안 깨진다 — 그래서 조용히 틀린 채로 오래 간다.
// 특히 세 가지가 섞이기 쉽다: 무료 발급(행사·답례), 취소된 건, 그리고 날짜 경계.
// 한국 시간으로 안 끊으면 밤 9시 이후 결제가 전부 다음 날로 넘어간다.

import fs from 'node:fs'
import { summarizeSales, kstDate } from '../src/lib/dailySales.ts'

let pass = 0, fail = 0
const ok = (n, d = '') => { pass++; console.log(`  ○ ${n}${d ? ` — ${d}` : ''}`) }
const bad = (n, d = '') => { fail++; console.log(`  × ${n}${d ? ` — ${d}` : ''}`) }

console.log('\n날짜별 판매 집계\n')

const NOW = new Date('2026-09-03T05:00:00Z') // 한국 시간 9/3 14:00

// ── 날짜 경계 ──────────────────────────────────────────────────────────────
if (kstDate('2026-09-02T14:59:59Z') === '2026-09-02') ok('UTC 자정 전은 그날로 센다')
else bad('날짜 경계', kstDate('2026-09-02T14:59:59Z'))
if (kstDate('2026-09-02T15:00:00Z') === '2026-09-03') ok('한국 시간 자정에 날짜가 넘어간다', 'UTC 15:00 = KST 00:00')
else bad('한국 시간 경계', kstDate('2026-09-02T15:00:00Z'))

// ── 무료·취소를 매출에서 뺀다 ──────────────────────────────────────────────
{
  const rows = [
    { created_at: '2026-09-03T01:00:00Z', amount: 5500, status: 'active', payment_key: 'StdpayCARD1' },
    { created_at: '2026-09-03T02:00:00Z', amount: 5500, status: 'active', payment_key: 'StdpayCARD2' },
    { created_at: '2026-09-03T03:00:00Z', amount: 5500, status: 'cancelled', payment_key: 'StdpayCARD3' },
    { created_at: '2026-09-03T04:00:00Z', amount: 0, status: 'active', payment_key: 'promo:blog-review' },
  ]
  const s = summarizeSales(rows, NOW)
  if (s.today.count === 2 && s.today.amount === 11000) ok('오늘 매출을 맞게 센다', `${s.today.count}건 ${s.today.amount}원`)
  else bad('오늘 집계', `${s.today.count}건 ${s.today.amount}원`)
  if (s.cancelledTotal === 1 && s.today.cancelled === 1) ok('취소는 매출에서 빼고 따로 센다')
  else bad('취소 처리', `취소 ${s.cancelledTotal}`)
  if (s.freeTotal === 1 && s.today.free === 1) ok('무료 발급은 매출에서 빼고 따로 센다', '행사·답례가 매출로 잡히면 안 된다')
  else bad('무료 처리', `무료 ${s.freeTotal}`)
}

// ── 판매가 0인 날도 칸이 있어야 한다 ───────────────────────────────────────
{
  const s = summarizeSales([], NOW)
  if (s.days.length === 30) ok('최근 30일 칸이 모두 있다', '빈 날을 빼면 그래프가 거짓말을 한다')
  else bad('빈 날', `${s.days.length}칸`)
  if (s.days[s.days.length - 1].date === kstDate(NOW)) ok('마지막 칸이 오늘이다')
  else bad('마지막 칸', s.days[s.days.length - 1].date)
  if (s.today.amount === 0 && s.all.amount === 0) ok('판매가 없으면 0으로 답한다', '없는 매출을 지어내지 않는다')
  else bad('빈 집계', JSON.stringify(s.today))
}

// ── 시드·데모 건은 드러낸다 ────────────────────────────────────────────────
{
  const rows = [
    { created_at: '2026-09-02T01:00:00Z', amount: 5500, status: 'active', payment_key: 'demo-promo-key' },
    { created_at: '2026-09-02T02:00:00Z', amount: 5500, status: 'active', payment_key: 'StdpayCARD9' },
  ]
  const s = summarizeSales(rows, NOW)
  if (s.suspicious.length === 1 && s.suspicious[0].key === 'demo-promo-key') ok('결제로 보기 어려운 건을 짚어 준다', '조용히 빼면 숫자 차이를 못 밝힌다')
  else bad('시드 표시', JSON.stringify(s.suspicious))
  if (s.all.count === 2) ok('짚어 주되 빼지는 않는다', '빼려면 사람이 판단해야 한다')
  else bad('시드 제외', `${s.all.count}건`)
}

// ── 30일 밖의 건도 전체 합계에는 들어간다 ─────────────────────────────────
{
  const rows = [
    { created_at: '2026-06-01T01:00:00Z', amount: 5000, status: 'active', payment_key: 'old1' },
    { created_at: '2026-09-02T01:00:00Z', amount: 5500, status: 'active', payment_key: 'StdpayCARD1' },
  ]
  const s = summarizeSales(rows, NOW)
  if (s.all.amount === 10500 && s.last30.amount === 5500) ok('전체와 최근 30일을 갈라 센다', `전체 ${s.all.amount} / 30일 ${s.last30.amount}`)
  else bad('기간 구분', `전체 ${s.all.amount} / 30일 ${s.last30.amount}`)
}

// ── 실제 원장으로 한 번 돌려 본다 ─────────────────────────────────────────
{
  const ENV = Object.fromEntries(
    fs.readFileSync('.env.local', 'utf-8').split('\n')
      .filter(l => l.includes('=') && !l.trim().startsWith('#'))
      .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] }),
  )
  const res = await fetch(
    `${ENV.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/subscriptions?select=created_at,amount,status,payment_key&order=created_at.desc&limit=1000`,
    { headers: { apikey: ENV.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${ENV.SUPABASE_SERVICE_ROLE_KEY}` } },
  )
  const rows = await res.json()
  if (Array.isArray(rows)) {
    const s = summarizeSales(rows, new Date())
    const byHand = rows
      .filter(r => Number(r.amount) > 0 && r.status !== 'cancelled')
      .reduce((sum, r) => sum + Number(r.amount), 0)
    if (s.all.amount === byHand) ok('실제 원장에서도 합계가 맞는다', `${s.all.count}건 ${s.all.amount.toLocaleString('ko-KR')}원`)
    else bad('실제 합계', `집계 ${s.all.amount} / 손계산 ${byHand}`)
    console.log(`     오늘 ${s.today.amount.toLocaleString('ko-KR')}원 · 7일 ${s.last7.amount.toLocaleString('ko-KR')}원 · 30일 ${s.last30.amount.toLocaleString('ko-KR')}원`)
    if (s.suspicious.length) console.log(`     확인 필요: ${s.suspicious.map(x => x.key).join(', ')}`)
  } else {
    bad('원장 조회', JSON.stringify(rows).slice(0, 120))
  }
}

console.log(`\n${fail ? '매출 집계에 구멍이 있다.' : '매출이 맞게 집계된다.'}`)
process.exit(fail ? 1 : 0)
