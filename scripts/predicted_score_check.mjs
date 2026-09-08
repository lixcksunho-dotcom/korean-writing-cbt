// 대시보드 'AI 예상 점수' 칸이 네 경우 모두에서 무엇을 보여 주는지 본다.
//   npm run check:predicted
//   PAGE_SWEEP_BASE=http://localhost:3000 npm run check:predicted
//
// 왜 필요한가: 이 카드는 완료한 모의고사가 있어야만 떴다. 그래서 가입만 하고 아직 안 푼 회원
// (2026-09-08 실측 144명 중 81명)에게는 칸이 통째로 사라져, 결제를 부르는 자리도 다음 할 일도
// 없었다. 지금은 네 경우에 각각 다른 것을 보여 주므로, 그 네 가지가 실제로 맞게 나오는지 본다.
//
// 검사가 만든 계정·이용권·세션만 만들고 지운다.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

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
const made = []          // 지울 것: {kind, id}
const accounts = {}

async function makeUser(tag, paid) {
  const email = `predcheck+${tag}${stamp}@kptest.cloud`
  const password = `Chk-${stamp}-aA1!`
  const u = await (await api('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email, password, email_confirm: true }) })).json()
  if (!u.id) throw new Error(`계정 생성 실패(${tag}): ` + JSON.stringify(u).slice(0, 160))
  made.push({ kind: 'user', id: u.id })
  if (paid) {
    const sub = await (await api('/rest/v1/subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        user_id: u.id, payment_key: `check-pred-${stamp}`, order_id: `chk-pred-${tag}-${stamp}`,
        amount: 0, status: 'active',
        started_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 86400_000).toISOString(),
      }),
    })).json()
    if (!Array.isArray(sub) || !sub[0]?.id) throw new Error(`이용권 생성 실패(${tag}): ` + JSON.stringify(sub).slice(0, 160))
    made.push({ kind: 'sub', id: sub[0].id })
  }
  return { email, password, id: u.id }
}

// 완료한 모의고사 한 회를 심는다 — 객관식 24/40(=60%)이면 예상 600점.
async function seedExam(userId) {
  const started = new Date(Date.now() - 30 * 60_000).toISOString()
  const s = await (await api('/rest/v1/quiz_sessions', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, program: 'silyong', year: 2025, round: 1, score: 24, total: 40, started_at: started, completed_at: new Date().toISOString() }),
  })).json()
  if (!Array.isArray(s) || !s[0]?.id) throw new Error('세션 생성 실패: ' + JSON.stringify(s).slice(0, 160))
  made.push({ kind: 'session', id: s[0].id })
}

async function login(page, acc) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  await page.fill('input[type="email"]', acc.email)
  await page.fill('input[type="password"]', acc.password)
  await page.click('button[type="submit"]')
  for (let i = 0; i < 40 && page.url().includes('/login'); i++) await page.waitForTimeout(1000)
}

// 로그인한 뒤엔 /login 이 대시보드로 튕겨서 다시 로그인할 수 없다 — 대시보드만 다시 연다.
async function dashboardText(page) {
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)
  return page.evaluate(() => document.body.innerText)
}

// SHOT=1 이면 카드만 잘라 그림으로 남긴다(사람이 눈으로 확인할 때).
async function shot(page, name) {
  if (!process.env.SHOT) return
  const el = page.locator('h2:has-text("AI 예상 점수")').locator('xpath=ancestor::*[contains(@class,"rounded-2xl")][1]')
  try { await el.screenshot({ path: path.join(ROOT, 'scripts', `_predicted_${name}.png`) }) } catch { /* 카드가 없으면 그냥 넘어간다 */ }
}

// 'AI 예상 점수' 카드만 잘라 본다 — 대시보드 다른 문구에 걸려 통과하는 일이 없게.
function card(text) {
  const i = text.indexOf('AI 예상 점수')
  return i < 0 ? '' : text.slice(i, i + 400)
}

let browser
try {
  accounts.free = await makeUser('free', false)
  accounts.paid = await makeUser('paid', true)

  browser = await chromium.launch()

  for (const [who, acc] of Object.entries(accounts)) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await ctx.newPage()
    const errs = []
    page.on('pageerror', (e) => errs.push(String(e).slice(0, 120)))

    // 1) 아직 한 회도 안 푼 상태
    await login(page, acc)
    let c = card(await dashboardText(page))
    await shot(page, `${who}-noexam`)
    if (!c) bad(`${who}·기록없음: 카드가 아예 없다`)
    else if (who === 'free' && c.includes('구독하고 내 점수 예측해보기')) ok('무료·기록없음 → 구독하고 내 점수 예측해보기')
    else if (who === 'paid' && c.includes('모의고사 쳐보기')) ok('유료·기록없음 → 모의고사 쳐보기')
    else bad(`${who}·기록없음`, c.replace(/\n/g, ' | ').slice(0, 160))
    // 기록이 없는데 점수처럼 보이는 숫자를 지어내면 안 된다.
    if (/\d{3}점/.test(c)) bad(`${who}·기록없음: 없는 점수를 보여 준다`, c.slice(0, 120))

    // 2) 한 회 푼 뒤
    await seedExam(acc.id)
    c = card(await dashboardText(page))
    await shot(page, `${who}-exam`)
    if (who === 'free') {
      if (c.includes('구독하고 예상 점수 확인')) ok('무료·기록있음 → 흐린 미리보기 + 구독 유도')
      else bad('무료·기록있음', c.replace(/\n/g, ' | ').slice(0, 160))
    } else {
      if (c.includes('600점') || /\b600\n?점/.test(c)) ok('유료·기록있음 → 실제 예상 점수 600점')
      else bad('유료·기록있음(600점 기대)', c.replace(/\n/g, ' | ').slice(0, 160))
    }

    if (errs.length) bad(`${who}: 콘솔 오류`, errs.join(' / '))
    else ok(`${who}: 콘솔 오류 없음`)
    await ctx.close()
  }
} catch (e) {
  bad('검사 진행', String(e).slice(0, 200))
} finally {
  if (browser) await browser.close()
  for (const m of made.reverse()) {
    if (m.kind === 'user') await api(`/auth/v1/admin/users/${m.id}`, { method: 'DELETE' })
    if (m.kind === 'sub') await api(`/rest/v1/subscriptions?id=eq.${m.id}`, { method: 'DELETE' })
    if (m.kind === 'session') await api(`/rest/v1/quiz_sessions?id=eq.${m.id}`, { method: 'DELETE' })
  }
}

console.log(`\n대시보드 예상 점수 카드 검사 — ${BASE}\n`)
for (const r of results) console.log(`${r.ok ? '  OK' : '  !!'}  ${r.name}${r.detail ? ` — ${r.detail}` : ''}`)
const failed = results.filter((r) => !r.ok)
console.log(failed.length ? `\n${failed.length}건 고칠 것이 있습니다.` : '\n고친 것이 사이트에 있습니다.')
process.exit(failed.length ? 1 : 0)
