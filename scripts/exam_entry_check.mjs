// 시험을 처음 열었을 때 무엇이 보이고, 언제 기록이 생기는가.
//   npm run check:entry
//   PAGE_SWEEP_BASE=http://localhost:3111 npm run check:entry
//
// 왜 필요한가: 모의고사를 열고 한 문제도 안 푼 회차가 112건이었다(2026-09-08 check:dropoff).
// 풀다 그만둔 것은 6건뿐이라 사람이 돌아선 자리는 첫 화면이었고, 그때마다 세션 행이
// 만들어져 '시작'과 '열어봄'이 구분되지 않았다.
//
// 그래서 시작 안내를 두고, **시작을 누른 사람에게만** 기록이 생기게 바꿨다. 이 검사는
// 그 두 가지를 함께 본다 — 안내가 제대로 보이는가, 그리고 누르기 전에는 정말 아무것도
// 안 남는가. 답안은 제출하지 않고, 만든 계정·세션은 끝에 지운다.
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
  ...init, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
})

const results = []
const ok = (n, d = '') => results.push({ ok: true, n, d })
const bad = (n, d = '') => results.push({ ok: false, n, d })

const stamp = `${Date.now()}`
const acc = { email: `entrycheck+${stamp}@kptest.cloud`, password: `Chk-${stamp}-aA1x` }
let uid = null
let browser

const sessionCount = async () =>
  (await (await api(`/rest/v1/quiz_sessions?user_id=eq.${uid}&select=id`)).json()).length

try {
  const mk = await api('/auth/v1/admin/users', {
    method: 'POST', body: JSON.stringify({ email: acc.email, password: acc.password, email_confirm: true }),
  })
  uid = mk.ok ? (await mk.json()).id : null
  if (!uid) throw new Error(`검사용 계정 실패: ${(await mk.text()).slice(0, 120)}`)

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

  // 회차 목록에서 처음 온 사람이 밟는 길 그대로 들어간다
  await page.goto(`${BASE}/cbt`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  const href = await page.evaluate(() =>
    [...document.querySelectorAll('a[href*="/cbt/"]')].map(a => a.getAttribute('href'))
      .find(h => h && /\/cbt\/[^/?]+$/.test(h)) ?? null)
  if (!href) throw new Error('회차 목록에서 들어갈 링크를 못 찾았다')
  ok('회차 목록에서 시험으로 가는 길이 있다', href)

  // 1) 안내 화면
  await page.goto(`${BASE}${href}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)
  const intro = await page.evaluate(() => document.body.innerText)
  await page.screenshot({ path: path.join(ROOT, 'scripts', '_entry_intro.png') })
  if (/시작하기/.test(intro)) ok('열면 시작 안내가 먼저 뜬다')
  else bad('시작 안내', intro.replace(/\n+/g, ' | ').slice(0, 140))
  if (/시험 시간/.test(intro) && /\d+분/.test(intro)) ok('몇 분짜리인지 먼저 알려 준다', (intro.match(/\d+분/) ?? [''])[0])
  else bad('시험 시간 안내', '없다')
  if (/저장하고 나갈 수 있어요/.test(intro)) ok('중간에 나갈 수 있다고 미리 알려 준다')
  else bad('나갈 길 안내', '없다')
  if (/자동으로 제출/.test(intro)) ok('시간이 다 되면 자동 제출된다고 밝힌다', '실제 동작과 같은 말')
  else bad('자동 제출 고지', '없다 — 실제로는 자동 제출된다')

  // 2) 누르기 전에는 기록이 없어야 한다 (이 검사의 핵심)
  const before = await sessionCount()
  if (before === 0) ok('시작을 누르기 전에는 기록이 안 생긴다', '세션 0건')
  else bad('빈 세션', `열기만 했는데 ${before}건이 생겼다`)

  // 3) 시작하기
  await page.locator('a', { hasText: '시작하기' }).first().click()
  await page.waitForTimeout(3000)
  const playing = await page.evaluate(() => ({
    text: document.body.innerText,
    options: [...document.querySelectorAll('button, label, li')]
      .filter(el => /^[①②③④⑤]/.test((el.innerText || '').trim())).length,
  }))
  if (playing.options >= 4) ok('시작하면 첫 문항 보기가 바로 보인다', `${playing.options}개`)
  else bad('첫 문항', playing.text.replace(/\n+/g, ' | ').slice(0, 140))
  if (/\d{1,3}:\d{2}/.test(playing.text)) ok('남은 시간이 보인다', (playing.text.match(/\d{1,3}:\d{2}/) ?? [''])[0])
  else bad('타이머', '남은 시간이 안 보인다')
  if (/제출하기/.test(playing.text)) ok('제출 버튼이 있다')
  else bad('제출 버튼', '없다')

  const after = await sessionCount()
  if (after === 1) ok('시작을 눌러야 기록이 하나 생긴다', '세션 1건')
  else bad('세션 수', `${after}건`)

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  if (!overflow) ok('좁은 화면에서 가로로 밀리지 않는다')
  else bad('가로 넘침', '390px에서 화면이 밀린다')

  await page.screenshot({ path: path.join(ROOT, 'scripts', '_entry_playing.png') })
  if (errs.length) bad('콘솔 오류', errs.join(' / '))
  else ok('콘솔 오류 없음')
  await ctx.close()
} catch (e) {
  bad('실행', String(e?.message ?? e).slice(0, 200))
} finally {
  if (browser) await browser.close()
  if (uid) {
    const ids = await (await api(`/rest/v1/quiz_sessions?user_id=eq.${uid}&select=id`)).json().catch(() => [])
    for (const s of Array.isArray(ids) ? ids : []) {
      await api(`/rest/v1/quiz_answers?session_id=eq.${s.id}`, { method: 'DELETE' }).catch(() => {})
    }
    await api(`/rest/v1/quiz_sessions?user_id=eq.${uid}`, { method: 'DELETE' }).catch(() => {})
    await api(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' }).catch(() => {})
  }
}

console.log(`\n시험 첫 화면 — ${BASE}\n`)
for (const r of results) console.log(`${r.ok ? '  o' : '  x'} ${r.n}${r.d ? ` — ${r.d}` : ''}`)
const failed = results.filter(r => !r.ok).length
console.log(failed ? `\n${failed}건 손볼 것이 있습니다.` : '\n열어 보는 것과 시작하는 것이 구분된다.')
process.exit(failed ? 1 : 0)
