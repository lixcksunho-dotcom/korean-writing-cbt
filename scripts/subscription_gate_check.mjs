// 이용권이 살아 있을 때만 유료 회차가 열리는지 확인한다.
//   npm run check:sub-gate
//
// 이 문은 두 방향으로 샌다.
//   만료됐는데 열려 있으면  → 돈을 안 내도 계속 쓴다(매출 누수)
//   살아 있는데 잠겨 있으면 → 돈을 낸 사람이 못 쓴다(환불·이탈)
// 두 번째가 훨씬 나쁜데, 유료 회차가 막히는지만 보는 검사는 그걸 통과시켜 버린다.
// 그래서 같은 계정에 이용권을 붙였다 뗐다 하며 양쪽을 다 본다.
//
// 결제는 하지 않는다. subscriptions 행을 service_role로 직접 넣고 지운다.
// amount는 0으로 둔다 — 매출 집계(amount > 0)에 섞이면 안 된다.
import fs from 'node:fs'
import { chromium } from 'playwright'
import { dismissIntros } from './ui_audit_rules.mjs'

const ENV = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8').split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const SB = ENV.NEXT_PUBLIC_SUPABASE_URL
const SVC = ENV.SUPABASE_SERVICE_ROLE_KEY
const BASE = process.env.SUB_GATE_BASE ?? 'https://kptest.cloud'

const admin = (p, init) => fetch(`${SB}${p}`, {
  ...init,
  headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
})

const stamp = String(Date.now())
const email = `uicheck+${stamp}@kptest.cloud`
const password = `Chk-${stamp}-aA1!`
const mk = await admin('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email, password, email_confirm: true }) })
if (!mk.ok) { console.error('검증용 계정을 만들지 못했습니다:', await mk.text()); process.exit(1) }
const uid = (await mk.json()).id

const results = []
const ok = (n, d) => results.push({ ok: true, n, d })
const bad = (n, d) => results.push({ ok: false, n, d })

const DAY = 24 * 3600 * 1000
async function setPass(kind) {
  await admin(`/rest/v1/subscriptions?user_id=eq.${uid}`, { method: 'DELETE' })
  if (kind === 'none') return
  const now = Date.now()
  const [start, end] = kind === 'active'
    ? [now - 3 * DAY, now + 27 * DAY]
    : [now - 60 * DAY, now - 30 * DAY]   // 만료
  const res = await admin('/rest/v1/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      user_id: uid,
      payment_key: `check-${stamp}-${kind}`,
      order_id: `check-${stamp}-${kind}`,
      amount: 0,                       // 매출 집계에 섞이지 않게
      status: 'active',                // 만료는 status가 아니라 expires_at으로 판정돼야 한다
      started_at: new Date(start).toISOString(),
      expires_at: new Date(end).toISOString(),
    }),
  })
  if (!res.ok) throw new Error(`이용권 행을 넣지 못했습니다(${kind}): ${await res.text()}`)
}

// 유료 회차를 열었을 때 실제로 풀 수 있는 상태인지. 잠기면 /subscribe로 보낸다.
async function openPaidRound(page) {
  await page.goto(`${BASE}/cbt/2025-5`, { waitUntil: 'domcontentloaded', timeout: 40000 }).catch(() => {})
  // 잠긴 회차는 클라이언트에서 한 박자 뒤에 /subscribe로 넘긴다. '주소가 안 바뀌면 끝'으로
  // 보면 넘어가기 직전을 재게 되어 '열려 있다'고 오판한다 — 넘어갈 시간을 넉넉히 준다.
  for (let i = 0; i < 25; i++) {
    if (new URL(page.url()).pathname === '/subscribe') break
    await page.waitForTimeout(400)
  }
  await page.waitForTimeout(600)
  const path = new URL(page.url()).pathname
  const choices = await page.locator('button').filter({ hasText: /^[①②③④⑤]/ }).count()
  return { path, choices }
}

// 서술형 연습 화면에서 AI 버튼이 무엇을 말하고 있는지만 읽는다(누르지 않는다).
async function readAiButton(page) {
  await page.goto(`${BASE}/practice/report`, { waitUntil: 'load', timeout: 40000 }).catch(() => {})
  await page.waitForTimeout(2500)
  return await page.evaluate(() => {
    const el = [...document.querySelectorAll('button, a')]
      .find((e) => /AI 분석|AI 채점|구독하고/.test(e.textContent ?? ''))
    return (el?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 60)
  }).catch(() => '')
}

const browser = await chromium.launch()
try {
  const ctx = await browser.newContext()
  await ctx.addInitScript(dismissIntros)
  const page = await ctx.newPage()

  let logged = false
  for (let a = 0; a < 3 && !logged; a++) {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', password)
    await page.click('button[type="submit"]')
    for (let i = 0; i < 30; i++) {
      if (!new URL(page.url()).pathname.includes('/login')) { logged = true; break }
      await page.waitForTimeout(1000)
    }
    if (!logged) await page.waitForTimeout(4000)
  }
  if (!logged) { bad('로그인', '들어가지 못함'); throw new Error('로그인 실패') }

  // 1) 이용권 없음 → 잠겨야 한다
  await setPass('none')
  {
    const r = await openPaidRound(page)
    if (r.path === '/subscribe' && r.choices === 0) ok('이용권 없음', '유료 회차가 잠긴다')
    else bad('이용권 없음', `유료 회차가 열렸다 — 도착 ${r.path}, 선택지 ${r.choices}개`)
  }

  // 2) 살아 있는 이용권 → 열려야 한다 (이게 통과해야 1·3이 의미가 있다)
  await setPass('active')
  {
    const r = await openPaidRound(page)
    if (r.path === '/subscribe') bad('이용권 있음', '이용권이 살아 있는데 /subscribe로 막혔다 — 돈을 낸 사람이 못 쓴다')
    else if (r.choices === 0) bad('이용권 있음', `유료 회차가 열리긴 했는데 선택지가 없다 — 도착 ${r.path}`)
    else ok('이용권 있음', `유료 회차가 열린다 (선택지 ${r.choices}개)`)
  }

  // 3) 만료된 이용권 → 다시 잠겨야 한다. status는 그대로 'active'다 —
  //    만료 판정이 날짜가 아니라 status로만 돼 있으면 여기서 걸린다.
  await setPass('expired')
  {
    const r = await openPaidRound(page)
    if (r.path === '/subscribe' && r.choices === 0) ok('이용권 만료', '만료되면 다시 잠긴다')
    else bad('이용권 만료', `만료됐는데 열려 있다 — 도착 ${r.path}, 선택지 ${r.choices}개`)
  }
  // 4) AI 무료 체험 횟수를 다 쓰면 잠겨야 한다.
  //    여기가 새면 비용이 바로 외부 API로 나간다. 버튼은 **절대 누르지 않는다** —
  //    화면이 무엇을 내주는지만 읽는다.
  await setPass('none')
  {
    const before = await readAiButton(page)
    if (/무료로 AI 분석 체험/.test(before)) ok('AI 체험 남음', '무료 체험 버튼이 보인다')
    else bad('AI 체험 남음', `무료 체험 버튼이 안 보인다 — "${before}"`)

    // 체험 횟수를 소진한 상태로 만든다(결제·API 호출 없음)
    await admin(`/auth/v1/admin/users/${uid}`, {
      method: 'PUT',
      body: JSON.stringify({ app_metadata: { ai_trial_used: 99 } }),
    })
    const after = await readAiButton(page)
    if (/무료로 AI 분석 체험/.test(after)) bad('AI 체험 소진', `다 썼는데 여전히 무료 체험 버튼이 보인다 — "${after}"`)
    else if (/구독/.test(after)) ok('AI 체험 소진', '구독 안내로 바뀐다')
    else bad('AI 체험 소진', `무료 버튼도 구독 안내도 아니다 — "${after}"`)
  }
} catch (e) {
  bad('검사 진행', String(e).slice(0, 160))
} finally {
  await browser.close()
  await admin(`/rest/v1/subscriptions?user_id=eq.${uid}`, { method: 'DELETE' }).catch(() => {})
  for (const t of ['quiz_answers', 'quiz_sessions', 'device_usage']) {
    await admin(`/rest/v1/${t}?user_id=eq.${uid}`, { method: 'DELETE' }).catch(() => {})
  }
  await admin(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' }).catch(() => {})
}

console.log('\n이용권 문 점검\n')
for (const r of results) console.log(`  ${r.ok ? '○' : '×'} ${r.n} — ${r.d}`)
const fails = results.filter((r) => !r.ok)
console.log(`\n통과 ${results.length - fails.length} / ${results.length}`)
if (fails.length) process.exitCode = 1
