// 관리자 회원·결제 화면의 쪽 넘김이 실제로 되는지 눌러 본다.
//   npm run check:admin-paging
//
// 왜 필요한가: 회원 화면이 `listUsers({ perPage: 1000 })`, 결제 화면이 `.limit(1000)` 으로
// 전량을 한 번에 읽었다 — 1000을 넘는 순간 숫자가 조용히 틀린다. 2026-09-08 에 100명씩
// 이전/다음으로 바꾸면서 합계(총원·유료·매출)는 전체 기준을 지키도록 했다. 이 검사는
//   ① 1쪽 100명 · 마지막 쪽 나머지 · 이전/다음 단추의 활성 상태
//   ② 화면의 총원·유료 수가 DB 를 직접 센 값과 같은지(쪽만 세면 줄어든다)
//   ③ 검색이 마지막 쪽에 있는 회원도 찾는지(한 쪽 안에서만 거르면 못 찾는다)
//   ④ 범위 밖 page= 는 마지막 쪽으로
//   ⑤ 결제 화면의 이전/다음
// 을 admin_ui_check 와 같은 방식(임시 관리자 계정 · 로컬 운영빌드)으로 본다.
// 화면 안의 다른 단추(삭제·유료 토글·재발급)는 누르지 않는다.
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const ENV = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8').split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] })
)
const SB = ENV.NEXT_PUBLIC_SUPABASE_URL
const SVC = ENV.SUPABASE_SERVICE_ROLE_KEY
const PORT = Number(process.env.ADMIN_UI_PORT ?? 3118)
const BASE = `http://127.0.0.1:${PORT}`
const PAGE = 100

const admin = (p, init) => fetch(`${SB}${p}`, {
  ...init,
  headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
})

// ── 빌드가 소스보다 오래됐으면 다시 만든다(admin_ui_check 와 같은 규칙) ─────
function newestMtime(dir) {
  let newest = 0
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    newest = Math.max(newest, e.isDirectory() ? newestMtime(p) : fs.statSync(p).mtimeMs)
  }
  return newest
}
const nextBin = path.join('node_modules', 'next', 'dist', 'bin', 'next')
function run(args, env) {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [nextBin, ...args], { stdio: 'inherit', env: { ...process.env, ...env } })
    p.on('exit', (c) => (c === 0 ? resolve() : reject(new Error(`next ${args[0]} 실패 (${c})`))))
  })
}
const buildId = '.next/BUILD_ID'
if (!fs.existsSync(buildId) || fs.statSync(buildId).mtimeMs < newestMtime('src')) {
  console.log('빌드가 소스보다 오래됐습니다 — 다시 만듭니다.')
  await run(['build'])
}

// ── 임시 관리자 계정 ─────────────────────────────────────────────────────
const stamp = `${Date.now()}`
const acc = { email: `pagingcheck+${stamp}@kptest.cloud`, password: `Chk-${stamp}-aA1!` }
const mk = await admin('/auth/v1/admin/users', {
  method: 'POST',
  body: JSON.stringify({ email: acc.email, password: acc.password, email_confirm: true }),
})
if (!mk.ok) { console.error('검증용 계정을 만들지 못했습니다:', await mk.text()); process.exit(1) }
acc.uid = (await mk.json()).id

// ── 기대값: DB 를 직접 센다(화면이 쪽만 세면 여기와 어긋난다) ─────────────
const totalRes = await admin('/auth/v1/admin/users?page=1&per_page=1')
const memberTotal = Number(totalRes.headers.get('x-total-count') ?? (await totalRes.json())?.total)
const nowIso = new Date().toISOString()
const activeRes = await admin(`/rest/v1/subscriptions?select=user_id&status=eq.active&expires_at=gte.${encodeURIComponent(nowIso)}`, { headers: { Range: '0-9999' } })
const paidTotal = new Set((await activeRes.json()).map((r) => r.user_id)).size
const lastPage = Math.max(1, Math.ceil(memberTotal / PAGE))
const lastCount = memberTotal - (lastPage - 1) * PAGE
console.log(`기대값 — 회원 ${memberTotal}명(임시 계정 포함) · 유료 ${paidTotal}명 · ${lastPage}쪽, 마지막 쪽 ${lastCount}명`)

const server = spawn(process.execPath, [nextBin, 'start', '-p', String(PORT)], {
  stdio: 'ignore',
  env: { ...process.env, ADMIN_EMAILS: acc.email },
})
async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`${BASE}/admin/login`)).ok) return true } catch { /* 아직 안 뜸 */ }
    await new Promise((r) => setTimeout(r, 1000))
  }
  return false
}

const results = []
const ok = (name, pass, detail = '') => {
  results.push({ name, pass, detail })
  console.log(`  ${pass ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`)
}
const mask = (email) => email.replace(/^(.{3}).*@/, '$1…@')

const browser = await chromium.launch()
try {
  if (!await waitForServer()) throw new Error(`로컬 서버가 ${PORT}포트에 뜨지 않았습니다`)
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()

  // 로그인(admin_ui_check 와 같은 되튕김 재시도)
  let loggedIn = false
  for (let attempt = 0; attempt < 3 && !loggedIn; attempt++) {
    await page.goto(`${BASE}/admin/login`, { waitUntil: 'domcontentloaded' })
    await page.fill('input[type="email"]', acc.email)
    await page.fill('input[type="password"]', acc.password)
    await page.click('button[type="submit"]')
    for (let i = 0; i < 20 && !loggedIn; i++) {
      if (new URL(page.url()).pathname === '/admin') loggedIn = true
      else await page.waitForTimeout(1000)
    }
  }
  if (!loggedIn) throw new Error(`관리자로 들어가지 못했습니다 — ${page.url()}`)

  const rowCount = () => page.locator('div.divide-y > div').count()
  const pagerText = () => page.locator('nav[aria-label="페이지 이동"] p').innerText()
  const nextLink = () => page.locator('nav[aria-label="페이지 이동"] a', { hasText: '다음' })
  const prevLink = () => page.locator('nav[aria-label="페이지 이동"] a', { hasText: '이전' })
  const headerText = () => page.locator('h1:has-text("회원 관리") + p').innerText()

  // ① 1쪽
  await page.goto(`${BASE}/admin/members`, { waitUntil: 'load' })
  const rows1 = await rowCount()
  ok('회원 1쪽 100명', rows1 === Math.min(PAGE, memberTotal), `${rows1}명 (기대 ${Math.min(PAGE, memberTotal)})`)
  const pt1 = await pagerText()
  ok('회원 1쪽 안내 문구', pt1.includes(`전체 ${memberTotal}명`) && pt1.includes(`1/${lastPage}쪽`), pt1)
  ok('1쪽에서 이전 잠김', (await prevLink().count()) === 0)
  ok('1쪽에서 다음 열림', (await nextLink().count()) === (lastPage > 1 ? 1 : 0))

  // ② 합계는 전체 기준
  const head = await headerText()
  ok('총원·유료가 DB 와 같음', head.includes(`전체 ${memberTotal}명`) && head.includes(`유료 ${paidTotal}명`), head)

  // ①' 다음을 눌러 마지막 쪽까지, 이전으로 한 쪽 돌아오기
  let lastPageEmail = null
  if (lastPage > 1) {
    for (let p = 2; p <= lastPage; p++) {
      await Promise.all([page.waitForURL(`**/admin/members?page=${p}`), nextLink().click()])
    }
    const rowsLast = await rowCount()
    ok(`다음 눌러 ${lastPage}쪽 도달`, rowsLast === lastCount, `${rowsLast}명 (기대 ${lastCount}) · ${page.url()}`)
    ok('마지막 쪽에서 다음 잠김', (await nextLink().count()) === 0)
    lastPageEmail = (await page.locator('div.divide-y > div').last().locator('span.text-xs.text-gray-600.truncate').innerText()).trim()
    // 바로 앞 쪽 주소를 정확히 기다린다 — 느슨한 패턴은 지금 주소에 먼저 맞아 넘어가기 전에 통과해 버린다.
    const prevUrl = lastPage - 1 === 1 ? `${BASE}/admin/members` : `${BASE}/admin/members?page=${lastPage - 1}`
    await Promise.all([page.waitForURL(prevUrl), prevLink().click()])
    ok('이전 눌러 한 쪽 뒤로', page.url() === prevUrl, page.url())
  } else {
    ok('회원이 100명 이하라 쪽 넘김 없음(다음 잠김 확인)', (await nextLink().count()) === 0)
  }

  // ③ 검색 — 마지막 쪽의 회원을 검색으로 찾는다(전원 대상)
  const needle = lastPageEmail ?? acc.email
  await page.goto(`${BASE}/admin/members`, { waitUntil: 'load' })
  await page.fill('input[name="q"]', needle)
  await Promise.all([page.waitForURL(/\/admin\/members\?q=/), page.press('input[name="q"]', 'Enter')])
  const hitRows = await rowCount()
  const hitText = await page.locator('div.divide-y').innerText()
  ok('검색이 마지막 쪽의 회원을 찾음', hitRows >= 1 && hitText.includes(needle), `'${mask(needle)}' → ${hitRows}명`)

  // ④ 범위 밖 page=
  await page.goto(`${BASE}/admin/members?page=999`, { waitUntil: 'load' })
  const rowsClamp = await rowCount()
  const ptClamp = await pagerText()
  ok('범위 밖 page=999 → 마지막 쪽', rowsClamp === lastCount && ptClamp.includes(`${lastPage}/${lastPage}쪽`), `${rowsClamp}명 · ${ptClamp}`)

  // ⑤ 결제 화면
  await page.goto(`${BASE}/admin/payments`, { waitUntil: 'load', timeout: 60000 })
  const payNav = page.locator('nav[aria-label="페이지 이동"]')
  // 날짜별 판매에도 표가 있다 — 쪽 넘김이 붙은 절의 표만 센다
  const payRows = () => page.locator('section:has(nav[aria-label="페이지 이동"]) table tbody tr').count()
  const listErr = page.locator('text=결제 목록을 불러오지 못했습니다')
  if (await listErr.count()) {
    ok('결제 화면 — 목록 조회 실패라 쪽 넘김을 볼 수 없음', false, await listErr.innerText())
  } else if ((await payNav.count()) === 0) {
    ok('결제 화면 — 최근 결제 0건이라 쪽 넘김 없음', (await page.locator('text=최근 결제 내역이 없습니다').count()) === 1)
  } else {
    const pt = await payNav.locator('p').innerText()
    const m = pt.match(/전체 (\d+)건 · (\d+)\/(\d+)쪽/)
    const total = Number(m?.[1])
    const last = Number(m?.[3])
    const trs = await payRows()
    ok('결제 1쪽 20건씩', trs === Math.min(20, total), `${trs}건 · ${pt}`)
    if (last > 1) {
      await Promise.all([page.waitForURL('**/admin/payments?page=2'), payNav.locator('a', { hasText: '다음' }).click()])
      const trs2 = await payRows()
      ok('결제 다음 눌러 2쪽', trs2 === Math.min(20, total - 20), `${trs2}건 · ${page.url()}`)
      await Promise.all([page.waitForURL(`${BASE}/admin/payments`), payNav.locator('a', { hasText: '이전' }).click()])
      ok('결제 이전 눌러 1쪽', (await payRows()) === trs, page.url())
    } else {
      ok('결제 20건 이하라 다음 잠김', (await payNav.locator('a', { hasText: '다음' }).count()) === 0, pt)
    }
  }
  await ctx.close()
} catch (e) {
  ok('검사 중단', false, e.message)
} finally {
  await browser.close()
  server.kill()
  await admin(`/auth/v1/admin/users/${acc.uid}`, { method: 'DELETE' }).catch(() => {})
  console.log('\n검증용 계정 1개 삭제 · 로컬 서버 종료')
}

const fails = results.filter((r) => !r.pass)
console.log(`\n관리자 쪽 넘김 검사 — ${results.length}항목 중 통과 ${results.length - fails.length}`)
process.exit(fails.length ? 1 : 0)
