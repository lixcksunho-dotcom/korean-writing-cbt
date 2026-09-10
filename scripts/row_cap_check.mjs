// 1000행 조용한 상한에 얼마나 가까운지 본다.
//   npm run check:row-cap
//
// 왜 필요한가: PostgREST 는 limit 을 얼마로 적든 한 번에 1000행에서 조용히 자른다. 오류가 없고
// 화면은 멀쩡하니 숫자가 틀린 채로 아무도 모른다 — 이 저장소의 30일 방문 통계가 그래서
// 며칠치만 나왔었다(커밋 b80e086). 관리자 화면이 `.limit(1000)`·`perPage: 1000` 을
// 박아 두면, 행이 그 선을 넘는 순간부터 매출·회원 수가 조용히 작아진다.
// 회원·결제 화면과 current_members.mjs 는 2026-09-08 에 페이지 단위로 바꿨다(src/lib/adminPaging.ts).
// 이 검사는 실제 행 수를 세어 상한 대비 몇 % 인지 말하고, 80% 를 넘으면 exit 1 로 알린다.
//
// 읽기 전용 — 서비스 키로 count 만 읽는다. 화면 코드는 건드리지 않는다.
import fs from 'node:fs'
import path from 'node:path'

const ENV = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8').split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] })
)
const URL_ = ENV.NEXT_PUBLIC_SUPABASE_URL
const KEY = ENV.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }

const CAP = 1000
const WARN_AT = 0.8

/** 테이블 전체 행 수 — HEAD + count=exact 라 행을 내려받지 않는다. */
async function countRows(table) {
  const res = await fetch(`${URL_}/rest/v1/${table}?select=id`, { method: 'HEAD', headers: { ...H, Prefer: 'count=exact', Range: '0-0' } })
  const cr = res.headers.get('content-range') ?? ''   // 예: 0-0/1234
  const total = Number(cr.split('/')[1])
  return Number.isFinite(total) ? total : null
}

/** 회원 총원 — GoTrue admin 목록의 total. 없으면 1000장을 받아 세되 '1000 이상'으로 표기. */
async function countMembers() {
  const res = await fetch(`${URL_}/auth/v1/admin/users?page=1&per_page=1`, { headers: H })
  const j = await res.json()
  if (Number.isFinite(j?.total)) return { n: j.total, exact: true }
  const full = await fetch(`${URL_}/auth/v1/admin/users?page=1&per_page=${CAP}`, { headers: H })
  const users = (await full.json())?.users ?? []
  return { n: users.length, exact: users.length < CAP }
}

/** src·scripts 의 ts/tsx/mjs 파일 */
const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (/\.(ts|tsx|mjs)$/.test(e.name)) out.push(p)
  }
  return out
}
// 1) 아직 상한을 박아 둔 자리 — 줄 번호가 아니라 '파일 + 그 줄에 들어 있는 글'로 적는다.
//    예전에는 `파일:줄`로 적어 두어서, 위쪽에 코드가 몇 줄 늘기만 해도 목록이 실물과
//    어긋난 것으로 잡혀 검사가 늘 빨간불이었다(5ffd258 이 24→26, 93→97 로 밀었다).
//    그러면 진짜 신호 — 상한이 80%에 닿았다 — 가 소음에 묻힌다. 줄 번호는 소스에서 찾는다.
const CAPPED = [
  { file: 'src/app/admin/(protected)/page.tsx', match: '.limit(1000)', what: 'subscriptions .limit(1000)', table: 'subscriptions' },
  // 아래 넷은 9/7 목록에 빠져 있던 자리 — 이번 대조 규칙이 찾아냈다. 화면 밖(리포트·탈퇴)이라 별도 항목으로.
  { file: 'src/lib/subscriberReport.ts', match: 'perPage: 1000', what: 'listUsers perPage 1000 (검증 계정 거르기)', table: '(auth users)' },
  { file: 'src/lib/accountDeletion.ts', match: 'perPage: 1000', what: 'listUsers perPage 1000 × 10쪽 반복 — 10,000명까지는 안전', table: '(auth users)', cap: 10000 },
  { file: 'scripts/free_to_paid.mjs', match: 'per_page=1000', what: 'admin/users per_page=1000', table: '(auth users)' },
  { file: 'scripts/inflow_to_payment.mjs', match: 'per_page=1000', what: 'admin/users per_page=1000', table: '(auth users)' },
  { file: 'scripts/today_pulse_check.mjs', match: 'per_page=1000', what: 'admin/users per_page=1000 × 10쪽 반복 — 10,000명까지는 안전', table: '(auth users)', cap: 10000 },
]
// 위 목록이 실물과 어긋나면(자리가 사라졌거나 새로 생겼거나) 검사가 거짓말을 한다 — 소스에서 대조한다.
const capRe = /\.limit\(1000\)|perPage:\s*1000|per_page=1000/
const capSpots = []
for (const file of ['src', 'scripts'].flatMap((d) => walk(d))) {
  if (file.endsWith('row_cap_check.mjs')) continue
  const rel = path.relative('.', file).replace(/\\/g, '/')
  fs.readFileSync(file, 'utf-8').split('\n').forEach((l, i) => {
    if (capRe.test(l) && !/^\s*(\/\/|\*)/.test(l)) capSpots.push({ file: rel, line: i + 1, text: l.trim() })
  })
}

const counts = {}
counts.subscriptions = await countRows('subscriptions')
const m = await countMembers()
counts['(auth users)'] = m.n

let bad = 0
console.log(`1000행 상한 대비 (경고선 ${WARN_AT * 100}%)\n`)
// 목록 ↔ 소스 짝짓기: 같은 파일에서 적어 둔 글이 들어 있는 줄을 찾는다(한 자리에 하나씩).
const unclaimed = [...capSpots]
for (const c of CAPPED) {
  const i = unclaimed.findIndex((s) => s.file === c.file && s.text.includes(c.match))
  c.at = i >= 0 ? unclaimed.splice(i, 1)[0].line : null
}
const gone = CAPPED.filter((c) => c.at == null).map((c) => `${c.file}(${c.match})`)
const added = unclaimed.map((s) => `${s.file}:${s.line}`)
if (gone.length || added.length) {
  const parts = []
  if (added.length) parts.push(`목록에 없는 새 자리: ${added.join(', ')}`)
  if (gone.length) parts.push(`소스에서 사라진 자리: ${gone.join(', ')}`)
  console.log(`  ✖ 상한 자리 목록이 실물과 다르다 — ${parts.join(' / ')}\n`)
  bad++
}
for (const c of CAPPED) {
  const n = counts[c.table]
  const where = `${c.file}:${c.at ?? '?'}`
  if (n == null) { console.log(`  ?  ${where}  ${c.what} — 행 수를 못 읽었다`); bad++; continue }
  const cap = c.cap ?? CAP
  const ratio = n / cap
  const mark = ratio >= 1 ? '✖' : ratio >= WARN_AT ? '△' : '○'
  if (ratio >= WARN_AT) bad++
  const exact = c.table === '(auth users)' && !m.exact ? '+ (1000 이상, 정확한 총원 미상)' : ''
  console.log(`  ${mark}  ${where}  ${c.what}  →  ${n}${exact} / ${cap} (${Math.round(ratio * 100)}%)`)
}

// 2) 덤: 전량을 읽는 select 중 큰 테이블을 가리키는 자리 — 나열만 한다(수정 금지).
//    한 문장(.from(...) 부터 다음 세미콜론/빈 줄까지)에 range·limit·single·head 가 없으면 전량 읽기로 본다.
const unbounded = []
for (const file of walk('src')) {
  const text = fs.readFileSync(file, 'utf-8')
  const re = /\.from\('([a-z_]+)'\)[\s\S]*?(?=\n\s*\n|;)/g
  let mm
  while ((mm = re.exec(text))) {
    const stmt = mm[0]
    if (!/\.select\(/.test(stmt)) continue
    if (/\.(range|limit|single|maybeSingle)\(|head:\s*true|count:\s*'exact'/.test(stmt)) continue
    const line = text.slice(0, mm.index).split('\n').length
    unbounded.push({ table: mm[1], where: `${path.relative('.', file).replace(/\\/g, '/')}:${line}` })
  }
}
const tables = [...new Set(unbounded.map((u) => u.table))]
for (const t of tables) if (counts[t] === undefined) counts[t] = await countRows(t)
const big = unbounded.filter((u) => (counts[u.table] ?? 0) >= CAP * 0.5)

console.log(`\n전량 읽기 select ${unbounded.length}곳 (테이블 ${tables.length}개) 중 행 수가 500 이상인 테이블을 가리키는 자리 ${big.length}곳:`)
for (const t of tables.filter((t) => (counts[t] ?? 0) >= CAP * 0.5)) {
  console.log(`  ${t}: ${counts[t]}행`)
  for (const u of big.filter((u) => u.table === t)) console.log(`    - ${u.where}`)
}
if (!big.length) console.log('  없음 — 지금은 어느 자리도 상한에 걸릴 크기가 아니다')
console.log('  (필터가 붙은 조회는 실제 행이 더 적을 수 있다 — 자리 목록이지 결함 목록이 아니다)')

console.log(`\n${bad ? `경고 ${bad}건 — 상한 전에 페이지네이션을 넣을 것` : '상한까지 여유 있음'}`)
process.exit(bad ? 1 : 0)
