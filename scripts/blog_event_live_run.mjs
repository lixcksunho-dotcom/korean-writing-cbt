// 블로그 후기 이벤트를 실제 글로 끝까지 돌린다 — 신청 → 자동 심사 → 지급 → 사후 감사 → (글 내린 뒤) 회수.
//   node --experimental-strip-types --no-warnings scripts/blog_event_live_run.mjs submit <네이버 글 주소>
//   node --experimental-strip-types --no-warnings scripts/blog_event_live_run.mjs audit                 # 감사 라우트 호출 + 지급 상태
//   node --experimental-strip-types --no-warnings scripts/blog_event_live_run.mjs cleanup               # 검사 계정·지급 행 삭제
//
// 왜 필요한가: check:blog-promo 는 '못 읽는 주소'로 접수 경로만 본다. 조건을 갖춘 진짜 글로 자동 통과·지급이
// 실제로 나는지는 한 번도 본 적이 없었다(2026-09-08 운영자 지시 "직접 돌려봐"). 계정은 이 스크립트가 만들고,
// 상태는 .blog-event-live.json 에 남겨 다음 단계가 이어받는다. 결제·AI 채점은 건드리지 않는다.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { chromium } = await import(pathToFileURL(path.join(ROOT, 'node_modules', 'playwright', 'index.mjs')).href)
const ENV = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, '.env.local'), 'utf-8').split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }),
)
const SB = ENV.NEXT_PUBLIC_SUPABASE_URL, SVC = ENV.SUPABASE_SERVICE_ROLE_KEY
const api = (p, init) => fetch(`${SB}${p}`, { ...init, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(init?.headers || {}) } })
const BASE = (process.env.PAGE_SWEEP_BASE || 'https://kptest.cloud').replace(/\/+$/, '')
const STATE = path.join(ROOT, '.blog-event-live.json')
const state = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {}
const save = () => fs.writeFileSync(STATE, JSON.stringify(state, null, 2))
const [mode, arg] = process.argv.slice(2)

async function login(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  for (let i = 0; i < 40 && page.url().includes('/login'); i++) await page.waitForTimeout(1000)
  return !page.url().includes('/login')
}

async function grantStatus() {
  const subs = await (await api(`/rest/v1/subscriptions?user_id=eq.${state.userId}&order=created_at.desc&select=order_id,status,expires_at,payment_key`)).json()
  const fb = await (await api(`/rest/v1/feedback?user_id=eq.${state.userId}&order=created_at.desc&limit=1&select=id,message,resolved,contact`)).json()
  return { subs: Array.isArray(subs) ? subs : [], feedback: Array.isArray(fb) ? fb[0] : null }
}

if (mode === 'submit') {
  if (!arg) { console.error('글 주소를 주세요'); process.exit(1) }
  const stamp = String(Date.now())
  const email = `eventlive+${stamp}@kptest.cloud`, password = `Live-${stamp}-aA1!`
  const created = await (await api('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email, password, email_confirm: true }) })).json()
  if (!created.id) { console.error('계정 생성 실패', JSON.stringify(created).slice(0, 160)); process.exit(1) }
  Object.assign(state, { userId: created.id, email, password, url: arg, submittedAt: new Date().toISOString() })
  save()

  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const errs = []
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 120)))
  if (!(await login(page, email, password))) { console.error('로그인 실패'); await browser.close(); process.exit(1) }
  await page.goto(`${BASE}/event/blog-review`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  const input = page.locator('input[type="url"], input[placeholder*="blog"], input[placeholder*="주소"]').first()
  await input.fill(arg)
  await page.locator('button[type="submit"]').first().click()
  // 자동 심사는 네이버를 읽어 오므로 십수 초 걸릴 수 있다.
  let text = ''
  for (let i = 0; i < 45; i++) {
    await page.waitForTimeout(1000)
    text = await page.evaluate(() => document.body.innerText)
    if (/접수|이용권|신청|이미|고쳐/.test(text) && !/확인 중|심사 중/.test(text) && i > 3) break
  }
  const panel = text.split('\n').filter((l) => /✓|✗|접수|이용권|신청|조건|광고|사진|글자|낱말|주소/.test(l)).slice(0, 25)
  console.log('--- 화면 결과')
  for (const l of panel) console.log('  ' + l.trim())
  if (errs.length) console.log('  브라우저 오류:', errs.slice(0, 2).join(' | '))
  await browser.close()

  const g = await grantStatus()
  console.log('--- 서버 실물')
  console.log('  접수 행:', g.feedback ? `${g.feedback.id.slice(0, 8)} · ${String(g.feedback.message).slice(0, 100)}` : '없음')
  console.log('  이용권:', g.subs.length ? g.subs.map((s) => `${s.order_id} ${s.status} ~${s.expires_at.slice(0, 10)}`).join(' / ') : '없음')
  console.log(`  계정 ${email} 는 남겨 둔다(감사·회수 확인용). 끝나면 cleanup.`)
} else if (mode === 'audit') {
  if (!state.userId) { console.error('먼저 submit'); process.exit(1) }
  const r = await fetch(`${BASE}/api/cron/blog-review-audit`)
  console.log('--- 감사 라우트', r.status)
  console.log(' ', (await r.text()).slice(0, 600))
  const g = await grantStatus()
  console.log('--- 지급 상태:', g.subs.length ? g.subs.map((s) => `${s.order_id} ${s.status} key=${s.payment_key}`).join(' / ') : '없음')
} else if (mode === 'cleanup') {
  if (state.userId) {
    await api(`/rest/v1/subscriptions?user_id=eq.${state.userId}`, { method: 'DELETE' })
    await api(`/rest/v1/feedback?user_id=eq.${state.userId}`, { method: 'DELETE' })
    const d = await api(`/auth/v1/admin/users/${state.userId}`, { method: 'DELETE' })
    console.log('계정·지급·접수 삭제', d.status)
    fs.rmSync(STATE, { force: true })
  } else console.log('지울 상태 없음')
} else {
  console.log('사용법: submit <url> | audit | cleanup')
}
