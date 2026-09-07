// 회원 탈퇴가 끝까지 도는지 본다 — 계정은 지워지고, 학습 기록은 사라지고, 결제 기록은 남는지.
//   npm run check:account
//   PAGE_SWEEP_BASE=http://localhost:3000 npm run check:account
//
// 왜 필요한가: 2026-09-07 "회원 탈퇴 하고 싶어요 어디서 신청하나요" 문의로 만들었다. 탈퇴는
// 되돌릴 수 없는 동작이라, 화면이 있다는 것만으로는 부족하다 — 지워야 할 것이 지워지고
// 남겨야 할 것(결제 기록, 전자상거래법 5년)이 남는지를 실제 사이트에서 매번 확인한다.
//
// 검사가 만든 계정·세션·결제 행만 만들고 지운다.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { DELETE_CONFIRM_WORD, WITHDRAWN_HOLDER_EMAIL } from '../src/lib/accountDeletionConstants.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { chromium } = await import(pathToFileURL(path.join(ROOT, 'node_modules', 'playwright', 'index.mjs')).href)

const ENV = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, '.env.local'), 'utf-8')
    .split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }),
)
const SB = ENV.NEXT_PUBLIC_SUPABASE_URL
const SVC = ENV.SUPABASE_SERVICE_ROLE_KEY
const BASE = (process.env.PAGE_SWEEP_BASE || 'https://kptest.cloud').replace(/\/+$/, '')
const api = (p, init) => fetch(`${SB}${p}`, {
  ...init,
  headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(init?.headers || {}) },
})

const results = []
const ok = (name, detail = '') => results.push({ ok: true, name, detail })
const bad = (name, detail = '') => results.push({ ok: false, name, detail })

const stamp = String(Date.now())
const email = `delcheck+${stamp}@kptest.cloud`
const password = `Chk-${stamp}-aA1!`
const orderId = `chk-del-${stamp}`
let userId = null
let subId = null

try {
  const created = await (await api('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email, password, email_confirm: true }) })).json()
  userId = created.id
  if (!userId) throw new Error('테스트 계정 생성 실패: ' + JSON.stringify(created).slice(0, 160))

  // 지워져야 할 것 하나(시험 세션)와 남아야 할 것 하나(결제 기록 0원)를 심는다.
  const ses = await (await api('/rest/v1/quiz_sessions', { method: 'POST', body: JSON.stringify({ user_id: userId, year: 2026, round: 999 }) })).json()
  const sessionMade = Array.isArray(ses) && ses[0]?.id
  const sub = await (await api('/rest/v1/subscriptions', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, payment_key: 'check-del', order_id: orderId, amount: 0, status: 'cancelled', expires_at: new Date().toISOString() }),
  })).json()
  subId = Array.isArray(sub) ? sub[0]?.id : null
  if (!subId) throw new Error('결제 행 생성 실패: ' + JSON.stringify(sub).slice(0, 160))

  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await ctx.addInitScript(() => { try { localStorage.setItem('kbspass_mode_intro_v1', '1') } catch { /* 무시 */ } })
  const page = await ctx.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 120)))

  // 개발 서버는 첫 컴파일이 느려 JS 가 붙기 전에 누르면 폼이 그냥 GET 으로 넘어간다 — 조용해질 때까지 기다린다.
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  for (let i = 0; i < 40 && page.url().includes('/login'); i++) await page.waitForTimeout(1000)

  await page.goto(`${BASE}/account`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)
  const text = await page.evaluate(() => document.body.innerText)
  if (text.includes('회원 탈퇴') && text.includes(email)) ok('계정 화면에 내 정보와 탈퇴 절이 있다')
  else bad('계정 화면', text.slice(0, 120))

  // 확인 낱말 없이는 버튼이 눌리지 않는다.
  const btn = page.locator('button[type="submit"]', { hasText: '탈퇴하기' })
  if (await btn.isDisabled()) ok('낱말을 안 적으면 탈퇴 버튼이 잠겨 있다')
  else bad('탈퇴 버튼 잠금', '빈 상태에서 눌린다')

  await page.locator('input[type="checkbox"]').first().check({ force: true })
  await page.fill('input[aria-label="탈퇴 확인 낱말"]', DELETE_CONFIRM_WORD)
  await btn.click()
  for (let i = 0; i < 30 && !page.url().includes('/account/deleted'); i++) await page.waitForTimeout(1000)
  if (page.url().includes('/account/deleted')) ok('탈퇴하면 완료 화면으로 간다', new URL(page.url()).pathname)
  else bad('탈퇴 진행', `도착: ${new URL(page.url()).pathname} · 화면: ${(await page.evaluate(() => document.body.innerText)).slice(0, 120)}`)

  // 로그인이 끊겼는지 — 대시보드는 로그인 화면으로 보내야 한다.
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1000)
  if (new URL(page.url()).pathname.includes('/login')) ok('탈퇴 뒤 로그인이 끊긴다')
  else bad('세션 종료', new URL(page.url()).pathname)
  await browser.close()

  // 서버 쪽 실물: 계정 없음 · 세션 없음 · 결제 행은 보관 계정으로 옮겨져 남아 있음.
  const gone = await api(`/auth/v1/admin/users/${userId}`)
  if (gone.status === 404) { ok('계정이 지워졌다'); userId = null } else bad('계정 삭제', `HTTP ${gone.status}`)
  if (sessionMade) {
    const left = await (await api(`/rest/v1/quiz_sessions?id=eq.${sessionMade}&select=id`)).json()
    if (Array.isArray(left) && left.length === 0) ok('학습 기록(시험 세션)이 함께 지워졌다')
    else bad('학습 기록 삭제', JSON.stringify(left).slice(0, 80))
  }
  const kept = await (await api(`/rest/v1/subscriptions?order_id=eq.${orderId}&select=id,user_id`)).json()
  if (Array.isArray(kept) && kept.length === 1) {
    const holder = await (await api(`/auth/v1/admin/users/${kept[0].user_id}`)).json()
    if (holder?.email === WITHDRAWN_HOLDER_EMAIL) ok('결제 기록은 남고 탈퇴 회원 보관 계정으로 옮겨졌다', WITHDRAWN_HOLDER_EMAIL)
    else bad('결제 기록 귀속', `user ${String(kept[0].user_id).slice(0, 8)} · ${holder?.email ?? '조회 실패'}`)
  } else bad('결제 기록 보존', `행 ${Array.isArray(kept) ? kept.length : '?'}개`)
  if (errs.length) bad('브라우저 오류', errs.slice(0, 2).join(' | '))
} catch (e) {
  bad('중단', String(e).slice(0, 200))
} finally {
  if (subId) await api(`/rest/v1/subscriptions?id=eq.${subId}`, { method: 'DELETE' })
  if (userId) await api(`/auth/v1/admin/users/${userId}`, { method: 'DELETE' })
}

console.log(`\n회원 탈퇴 — ${BASE}\n`)
for (const r of results) console.log(`  ${r.ok ? '○' : '✖'} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`)
const fail = results.filter((r) => !r.ok).length
console.log(`\n${fail ? `실패 ${fail}건` : '지울 것은 지워지고 남길 것은 남는다.'}`)
process.exitCode = fail ? 1 : 0
