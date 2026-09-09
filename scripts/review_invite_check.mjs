// 시험을 끝낸 사람에게 후기를 청하는 자리가 실제로 뜨는가.
//   npm run check:review-invite
//   PAGE_SWEEP_BASE=http://localhost:3111 npm run check:review-invite
//
// 왜 필요한가: 후기는 구독 화면의 사회적 증거로 쓰이는데 지금까지 0건이었다. 쓰는 자리가
// 대시보드 오른쪽 위 버튼 하나뿐이라, 결과 화면을 지난 111명 중 후기 근처까지 간 사람은
// 9명이었다(2026-09-09 page_views 실측). 그래서 점수를 막 확인한 자리에 청유를 두었다.
//
// 두 가지를 본다 — 안 쓴 사람에게는 뜨는가, 이미 쓴 사람에게는 안 뜨는가.
// (두 번 권하면 그건 부탁이 아니라 성가심이다.)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { chromium } = await import(pathToFileURL(path.join(ROOT, 'node_modules', 'playwright', 'index.mjs')).href)
const ENV = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, '.env.local'), 'utf-8').split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] }),
)
const SB = ENV.NEXT_PUBLIC_SUPABASE_URL
const SVC = ENV.SUPABASE_SERVICE_ROLE_KEY
const BASE = (process.env.PAGE_SWEEP_BASE || 'https://kptest.cloud').replace(/\/+$/, '')
const api = (p, init) => fetch(`${SB}${p}`, {
  ...init, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(init?.headers ?? {}) },
})

const results = []
const ok = (n, d = '') => results.push({ ok: true, n, d })
const bad = (n, d = '') => results.push({ ok: false, n, d })

const stamp = `${Date.now()}`
const acc = { email: `reviewcheck+${stamp}@kptest.cloud`, password: `Chk-${stamp}-aA1x` }
let uid = null
let sessionId = null
let reviewId = null
let browser

try {
  const mk = await api('/auth/v1/admin/users', {
    method: 'POST', body: JSON.stringify({ email: acc.email, password: acc.password, email_confirm: true }),
  })
  uid = mk.ok ? (await mk.json()).id : null
  if (!uid) throw new Error(`검사용 계정 실패: ${(await mk.text()).slice(0, 120)}`)

  // 끝낸 회차 하나를 심는다 — 결과 화면은 완료된 세션에만 열린다.
  const s = await (await api('/rest/v1/quiz_sessions', {
    method: 'POST',
    body: JSON.stringify({
      user_id: uid, program: 'silyong', year: 2025, round: 1, score: 21, total: 30,
      started_at: new Date(Date.now() - 40 * 60_000).toISOString(),
      completed_at: new Date().toISOString(),
    }),
  })).json()
  sessionId = Array.isArray(s) ? s[0]?.id : null
  if (!sessionId) throw new Error('세션 생성 실패: ' + JSON.stringify(s).slice(0, 140))

  browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await ctx.addInitScript(() => { try { localStorage.setItem('silyong_mode_intro_v1', '1') } catch { /* 막혀도 진행 */ } })
  const page = await ctx.newPage()
  const errs = []
  page.on('pageerror', e => errs.push(String(e).slice(0, 120)))

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  await page.fill('input[type="email"]', acc.email)
  await page.fill('input[type="password"]', acc.password)
  await page.click('button[type="submit"]')
  for (let i = 0; i < 40 && page.url().includes('/login'); i++) await page.waitForTimeout(1000)
  if (page.url().includes('/login')) throw new Error('로그인이 안 됐다')

  const resultUrl = `${BASE}/cbt/2025-1/result?session=${sessionId}`
  await page.goto(resultUrl, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)
  const before = await page.evaluate(() => document.body.innerText)
  if (/풀어 보니 어떠셨어요/.test(before)) ok('아직 안 쓴 사람에게는 후기 청유가 뜬다')
  else bad('후기 청유', before.replace(/\n+/g, ' | ').slice(0, 160))
  if (/5,000원 환급/.test(before)) ok('점수 인증 환급을 함께 알려 준다')
  else bad('환급 안내', '없다 — 쓸 이유가 약해진다')

  // 버튼이 실제로 창을 여는가
  await page.locator('button', { hasText: '후기 남기기' }).first().click()
  await page.waitForTimeout(1200)
  const modal = await page.evaluate(() => document.body.innerText)
  if (/후기/.test(modal) && /별점|점수 인증|한 줄|어떠셨/.test(modal)) ok('버튼을 누르면 후기 창이 열린다')
  else bad('후기 창', modal.replace(/\n+/g, ' | ').slice(0, 160))
  await page.screenshot({ path: path.join(ROOT, 'scripts', '_review_invite.png') })

  // 이미 쓴 사람에게는 안 보여야 한다
  const rev = await (await api('/rest/v1/reviews', {
    method: 'POST',
    body: JSON.stringify({ user_id: uid, display_name: '검사계정', content: '검사용 후기입니다. 지워집니다.', rating: 5 }),
  })).json()
  reviewId = Array.isArray(rev) ? rev[0]?.id : null
  if (!reviewId) bad('후기 심기', JSON.stringify(rev).slice(0, 140))
  else {
    await page.goto(resultUrl, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    const after = await page.evaluate(() => document.body.innerText)
    if (!/풀어 보니 어떠셨어요/.test(after)) ok('이미 쓴 사람에게는 다시 권하지 않는다')
    else bad('중복 권유', '후기를 쓴 뒤에도 계속 뜬다')
  }

  if (errs.length) bad('콘솔 오류', errs.join(' / '))
  else ok('콘솔 오류 없음')
  await ctx.close()
} catch (e) {
  bad('실행', String(e?.message ?? e).slice(0, 200))
} finally {
  if (browser) await browser.close()
  if (reviewId) await api(`/rest/v1/reviews?id=eq.${reviewId}`, { method: 'DELETE' }).catch(() => {})
  if (sessionId) await api(`/rest/v1/quiz_sessions?id=eq.${sessionId}`, { method: 'DELETE' }).catch(() => {})
  if (uid) await api(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' }).catch(() => {})
}

console.log(`\n결과 화면의 후기 청유 — ${BASE}\n`)
for (const r of results) console.log(`${r.ok ? '  o' : '  x'} ${r.n}${r.d ? ` — ${r.d}` : ''}`)
const failed = results.filter(r => !r.ok).length
console.log(failed ? `\n${failed}건 손볼 것이 있습니다.` : '\n쓸 자리가 보이고, 쓴 사람에겐 다시 묻지 않는다.')
process.exit(failed ? 1 : 0)
