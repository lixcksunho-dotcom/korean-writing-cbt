// 최근 30일 결제 시도자가 어느 경로로 들어왔는지 센다 — 병목이 결제수단인지 유입인지 가르기 위해.
//   npm run report:inflow
//   npm run report:inflow -- --days 60
//
// 백로그 전제는 "가입 시 기록된 referrer·utm 이 있으면 그것, 없으면 미상"이다.
// 실물 대조(2026-09-05): 회원 레코드(auth.users 의 user_metadata·app_metadata)와 public 스키마
// 어느 테이블에도 유입 열이 없다. 유입 흔적은 오직 page_views.referrer 뿐이고, 그것도 익명
// visitor_id(브라우저 localStorage 난수)에 매달려 있어 회원 id·포트원 customerId 와 이어지지 않는다.
// 그래서 이 스크립트는 두 층을 따로 낸다:
//   ① 원장(포트원) 기준 결제 시도자 — 가입 시 유입 정보가 있으면 쓰고, 없으면 전원 "미상".
//      (있는지는 실행 시점에 회원 메타데이터 키를 다시 확인한다 — 나중에 남기기 시작하면 자동으로 잡힌다)
//   ② 비콘(page_views) 기준 대리 지표 — payment_started 를 찍은 브라우저의 '최초 방문 referrer'와
//      '결제 세션 첫 페이지 referrer'를 세고, 같은 브라우저가 purchase_success 를 찍었는지로 완결을 본다.
//      원장과 모집단이 다르다(비콘은 webdriver·애드블록을 거르고, 원장은 안 거른다). 숫자는 겹치지 않는다.
//
// 읽기 전용 — DB 쓰기·포트원 파괴적 호출 없음. 개인정보는 id 앞 8자만, referrer 는 호스트명만 출력한다.
import fs from 'node:fs'
import { PortOneClient } from '@portone/server-sdk'
import { summarizeAttempts } from '../src/lib/paymentAttemptFunnel.ts'

const ENV = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8').split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] })
)

const argv = process.argv.slice(2)
const DAYS = argv.includes('--days') ? Number(argv[argv.indexOf('--days') + 1]) : 30
if (!Number.isInteger(DAYS) || DAYS < 1 || DAYS > 365) {
  console.error(`--days 는 1~365 정수여야 한다: ${argv[argv.indexOf('--days') + 1]}`)
  process.exit(1)
}

const DAY = 24 * 3600_000
const until = new Date()
const from = new Date(until.getTime() - DAYS * DAY)
const kst = (d) => new Date(new Date(d).getTime() + 9 * 3600_000).toISOString().slice(0, 10)
// 한글은 두 칸을 차지한다 — padEnd 로만 맞추면 표가 흔들린다.
const width = (s) => [...s].reduce((n, ch) => n + (/[ᄀ-ᇿ㄰-㆏가-힯＀-￯]/.test(ch) ? 2 : 1), 0)
const padW = (s, n) => s + ' '.repeat(Math.max(0, n - width(s)))
const showPath = (p) => { try { return decodeURIComponent(p) } catch { return p } }

const SB = ENV.NEXT_PUBLIC_SUPABASE_URL
const KEY = ENV.SUPABASE_SERVICE_ROLE_KEY
const SB_HEADERS = { apikey: KEY, Authorization: `Bearer ${KEY}` }
const OWN_HOST = 'kptest.cloud' // src/app/sitemap.ts 의 SITE_URL 과 같다

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

// ───────────────────────── ① 원장 기준: 결제 시도자와 '가입 시 유입 정보' ─────────────────────────

// 회원 목록 — 회원 필터(report:payments 와 같은 규칙)와 유입 키 탐지에 같이 쓴다.
const userRes = await fetch(`${SB}/auth/v1/admin/users?per_page=1000`, { headers: SB_HEADERS })
const users = (await userRes.json())?.users ?? []
const INFLOW_KEY = /referr|utm|source|landing|inflow|channel/i
function inflowOf(u) {
  // 가입 시 남긴 유입 정보가 있으면 여기서 잡힌다. 지금은 없다(실측) — 남기기 시작하면 자동으로 잡힌다.
  for (const bag of [u.user_metadata, u.app_metadata]) {
    for (const [k, v] of Object.entries(bag ?? {})) {
      if (INFLOW_KEY.test(k) && typeof v === 'string' && v) return `${k}=${v.slice(0, 60)}`
    }
  }
  return null
}
const userById = new Map(users.map((u) => [u.id, u]))
const inflowKeysSeen = new Set(
  users.flatMap((u) => [...Object.keys(u.user_metadata ?? {}), ...Object.keys(u.app_metadata ?? {})]).filter((k) => INFLOW_KEY.test(k)),
)

const client = PortOneClient({ secret: ENV.PORTONE_API_SECRET })
const items = []
for (let page = 0; ; page++) {
  const res = await client.payment.getPayments({
    page: { number: page, size: 100 },
    filter: { storeId: ENV.NEXT_PUBLIC_PORTONE_STORE_ID, from: from.toISOString(), until: until.toISOString() },
  })
  const got = res?.items ?? []
  items.push(...got)
  if (got.length < 100) break
}
const cid = (p) => p.customer?.id ?? p.customer?.customerId ?? null
const dropped = items.filter((p) => !userById.has(cid(p) ?? ''))
const rows = items.filter((p) => userById.has(cid(p) ?? '')).map((p) => ({
  id: p.id, status: p.status, customerId: cid(p), requestedAt: p.requestedAt ?? null, paidAt: p.paidAt ?? null,
  failureReason: p.failure?.reason ?? null,
}))
const f = summarizeAttempts(rows)
const paidPeople = new Set(rows.filter((r) => ['PAID', 'CANCELLED', 'PARTIAL_CANCELLED'].includes(r.status)).map((r) => r.customerId))

// 경로별 집계 (사람 단위)
const ledgerByInflow = new Map()
for (const customerId of new Set(rows.map((r) => r.customerId))) {
  const label = inflowOf(userById.get(customerId)) ?? '미상'
  const b = ledgerByInflow.get(label) ?? { entered: 0, paid: 0 }
  b.entered += 1
  if (paidPeople.has(customerId)) b.paid += 1
  ledgerByInflow.set(label, b)
}

console.log(`유입 경로별 결제 전환 — 최근 ${DAYS}일 (${kst(from)} ~ ${kst(until)}, KST)`)
console.log('')
console.log('① 원장(포트원) 기준 결제 시도자 — "가입 시 기록된 유입 경로"로 나눔')
if (dropped.length) console.log(`   (탈퇴·검증 계정 ${dropped.length}건 제외 — 현재 회원 ${users.length}명 기준)`)
console.log(`   결제창 진입 ${f.attempts.total}건/${f.people.total}명 · 완결 ${f.attempts.paid}건/${f.people.paid}명`)
console.log('')
console.log('   경로                      진입(명)  완결(명)')
for (const [label, b] of [...ledgerByInflow].sort((a, b) => b[1].entered - a[1].entered)) {
  console.log(`   ${padW(label, 24)} ${String(b.entered).padStart(7)}  ${String(b.paid).padStart(7)}`)
}
if (!ledgerByInflow.size) console.log('   (기간 내 결제창 진입 0건)')
console.log('')
if (inflowKeysSeen.size === 0) {
  console.log('   ⚠ 가입 시 유입 정보(referrer·utm)는 수집 안 되고 있음 — 회원 메타데이터에 해당 키가 하나도 없다.')
  console.log('     그래서 결제 시도자 전원이 "미상"이다. 무엇을 남겨야 하는지는 REPORT.md 에 적었다(구현은 범위 밖).')
} else {
  console.log(`   가입 시 유입 키 발견: ${[...inflowKeysSeen].join(', ')}`)
}

// ───────────────────────── ② 비콘 기준 대리 지표: payment_started 를 찍은 브라우저의 유입 ─────────────────────────

const EVT = (name) => encodeURIComponent(`#event/${name}`)
const started = await all(
  `page_views?select=visitor_id,session_id,created_at&path=eq.${EVT('payment_started')}&created_at=gte.${from.toISOString()}&order=created_at.asc`,
)
const succeeded = await all(
  `page_views?select=visitor_id,created_at&path=eq.${EVT('purchase_success')}&created_at=gte.${from.toISOString()}`,
)
const successVisitors = new Set(succeeded.map((r) => r.visitor_id).filter((v) => v && v !== 'anon'))

function hostLabel(ref) {
  if (!ref) return '직접 유입 / 앱 (referrer 없음)'
  try {
    const h = new URL(ref).hostname.replace(/^www\./, '')
    if (h === OWN_HOST) return '내부 이동 (새 탭·재방문)'
    // 로컬 개발 서버에서 온 referrer 는 사람 유입이 아니라 개발자 브라우저 발자국이다 — 숨기지 않고 이름을 붙인다.
    if (h === '127.0.0.1' || h === 'localhost') return `로컬 개발 브라우저 (${h})`
    return h || '직접 유입 / 앱 (referrer 없음)'
  } catch {
    return '(형식 불명)'
  }
}

// 브라우저(visitor) 단위로 묶는다 — 한 사람이 창을 여러 번 열어도 한 명이다.
const startedByVisitor = new Map()
let anonStarted = 0
for (const r of started) {
  if (!r.visitor_id || r.visitor_id === 'anon') { anonStarted += 1; continue }
  if (!startedByVisitor.has(r.visitor_id)) startedByVisitor.set(r.visitor_id, r) // 가장 이른 시도의 세션을 쓴다
}

const firstTouch = new Map() // visitor → 그 브라우저의 첫 페이지뷰 (page_views 보관 시작 이후 기준)
const sessionTouch = new Map() // visitor → 결제 시도 세션의 첫 페이지뷰
for (const [vid, r] of startedByVisitor) {
  const [ft] = await all(`page_views?select=path,referrer,created_at&visitor_id=eq.${encodeURIComponent(vid)}&order=created_at.asc&limit=1`)
  firstTouch.set(vid, ft ?? null)
  if (r.session_id && r.session_id !== 'anon') {
    const [st] = await all(
      `page_views?select=path,referrer,created_at&visitor_id=eq.${encodeURIComponent(vid)}&session_id=eq.${encodeURIComponent(r.session_id)}&order=created_at.asc&limit=1`,
    )
    sessionTouch.set(vid, st ?? null)
  } else {
    sessionTouch.set(vid, null)
  }
}

function tally(touchMap) {
  const m = new Map()
  for (const [vid, t] of touchMap) {
    const label = t ? hostLabel(t.referrer) : '(기록 없음)'
    const b = m.get(label) ?? { entered: 0, paid: 0, landings: new Map() }
    b.entered += 1
    if (successVisitors.has(vid)) b.paid += 1
    if (t?.path && !t.path.startsWith('#')) b.landings.set(t.path, (b.landings.get(t.path) ?? 0) + 1)
    m.set(label, b)
  }
  return [...m].sort((a, b) => b[1].entered - a[1].entered)
}

function printTable(title, rowsT) {
  console.log(`   ${title}`)
  console.log('   경로                                  진입(명)  완결(명)  주 도착 페이지')
  for (const [label, b] of rowsT) {
    const top = [...b.landings].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([p, n]) => `${showPath(p)}×${n}`).join(', ')
    console.log(`   ${padW(label, 36)} ${String(b.entered).padStart(7)}  ${String(b.paid).padStart(7)}  ${top}`)
  }
  if (!rowsT.length) console.log('   (해당 없음)')
  console.log('')
}

console.log('')
console.log('② 비콘(page_views) 기준 대리 지표 — payment_started 를 찍은 브라우저의 유입 (원장과 모집단이 다르다)')
console.log(`   payment_started ${started.length}건/${startedByVisitor.size}브라우저 · purchase_success ${succeeded.length}건/${successVisitors.size}브라우저` +
  (anonStarted ? ` · 저장소 차단(anon) ${anonStarted}건 제외` : ''))
console.log('')
printTable('(a) 브라우저의 최초 방문 referrer — "처음에 어디서 왔나" (page_views 보관 시작 2026-06-17 이후 기준)', tally(firstTouch))
printTable('(b) 결제 시도 세션의 첫 페이지 referrer — "결제하러 온 그 방문은 어디서 시작했나"', tally(sessionTouch))

console.log('   ⚠ 한계 — 이 표로 "경로별 전환율"을 말하면 안 된다:')
console.log('     · 비콘은 webdriver·kpt_no_track·애드블록·sendBeacon 실패를 잃고, 원장은 아무것도 안 거른다. 두 층은 조인 키가 없어 이어지지 않는다.')
console.log('     · visitor_id 는 브라우저(localStorage) 단위다. 같은 사람이 폰과 PC를 쓰면 둘로, 저장소를 지우면 새 사람으로 센다.')
console.log('     · utm 파라미터는 어디에도 저장되지 않는다(비콘은 pathname 만 보낸다). 광고·게시글에 utm 을 붙여도 여기 안 나온다.')
console.log('     · "직접 유입"에는 진짜 직접 방문 외에 카카오톡·인스타 인앱 브라우저처럼 referrer 를 지우는 경로가 섞인다.')
console.log(`     · 표본이 ${startedByVisitor.size}브라우저다. 한 자릿수~십몇이면 비율(%)은 의미가 없어 인원수만 적었다.`)
