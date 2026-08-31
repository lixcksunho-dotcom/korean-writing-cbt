// 무료로 풀던 답안이 결제 뒤에도 그대로 이어지는지 본다.
//   npm run check:free-to-paid
//
// 왜 필요한가: 무료로 체험해 보다 결제하는 것이 이 서비스의 주된 길이다. 그런데 무료
// 구간에서는 서버 저장이 안 되고 브라우저 임시본(kptest_exam_draft_<sessionId>)만 남는다.
// 결제 뒤에 세션이 새로 잡히거나 목록이 다른 세션을 가리키면, 임시본은 남아 있는데
// 아무도 그것을 찾지 못한다 — 사람은 방금 푼 답이 통째로 사라진 것으로 본다.
// 돈을 낸 직후에 잃는 것이라 가장 나쁜 종류다.
//
// 실제 브라우저로 그대로 해 본다.
//   1) 무료 계정으로 시험을 열어 몇 문항 고른다
//   2) 탭을 닫는다(저장 버튼을 누르지 않는다 — 사람들은 안 누른다)
//   3) 이용권을 붙인다(결제 대신 subscriptions 행을 직접 넣는다. 결제는 하지 않는다)
//   4) 다시 들어와 이어풀기가 뜨고, 고른 답이 그대로 있는지 본다
//
// 검사가 만든 계정·세션만 지운다. amount는 0으로 둬 매출 집계에 섞이지 않게 한다.

import fs from 'node:fs'
import { chromium } from 'playwright'

const ENV = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8').split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] }),
)
const BASE = process.env.FREE_TO_PAID_BASE ?? 'https://kptest.cloud'
const api = (p, init) => fetch(`${ENV.NEXT_PUBLIC_SUPABASE_URL}${p}`, {
  ...init,
  headers: {
    apikey: ENV.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${ENV.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json', Prefer: 'return=representation', ...(init?.headers ?? {}),
  },
})

const stamp = String(Date.now())
const email = `freepaid+${stamp}@kptest.cloud`
const password = `Chk-${stamp}-aA1!`
let uid = null
let failed = false
const ok = (n, d = '') => console.log(`  ○ ${n}${d ? ` — ${d}` : ''}`)
const bad = (n, d = '') => { console.error(`  × ${n}${d ? ` — ${d}` : ''}`); failed = true }

async function dismissModals(page) {
  for (let i = 0; i < 3; i++) {
    const dialog = page.locator('[role="dialog"]')
    if (await dialog.count() === 0) break
    const close = dialog.locator('button').filter({ hasText: /닫기|시작|확인|나중에/ }).first()
    if (await close.count()) await close.click().catch(() => {})
    else await page.keyboard.press('Escape')
    await page.waitForTimeout(600)
  }
}

async function login(ctx) {
  const page = await ctx.newPage()
  for (let a = 0; a < 3; a++) {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', password)
    await page.click('button[type="submit"]')
    for (let i = 0; i < 30; i++) {
      if (!new URL(page.url()).pathname.includes('/login')) return page
      await page.waitForTimeout(1000)
    }
  }
  throw new Error('로그인이 되지 않음')
}

const browser = await chromium.launch()
try {
  uid = (await (await api('/auth/v1/admin/users', {
    method: 'POST', body: JSON.stringify({ email, password, email_confirm: true }),
  })).json()).id
  if (!uid) throw new Error('검사용 계정을 만들지 못했다')

  console.log(`\n무료로 풀던 답안이 결제 뒤에도 이어지는가 — ${BASE}\n`)

  // ── 1) 무료로 풀기 ───────────────────────────────────────────────────────
  const ctx = await browser.newContext()
  await ctx.addInitScript(() => { try { localStorage.setItem('silyong_mode_intro_v1', '1') } catch { /* 막혀도 진행 */ } })
  let page = await login(ctx)

  await page.goto(`${BASE}/cbt/2025-1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await dismissModals(page)
  const choice = page.locator('button').filter({ hasText: /^[①②③④⑤]/ })
  await choice.first().waitFor({ timeout: 30000 })
  await choice.nth(2).click()          // 1번 문항의 3번 보기
  await page.waitForTimeout(1200)

  const draftBefore = await page.evaluate(() => {
    const k = Object.keys(localStorage).find(x => x.startsWith('kptest_exam_draft_'))
    return k ? { key: k, value: localStorage.getItem(k) } : null
  })
  if (!draftBefore) bad('푸는 동안 브라우저에 저장됨', '임시본이 만들어지지 않았다')
  else ok('푸는 동안 브라우저에 저장됨', `${Object.keys(JSON.parse(draftBefore.value).answers).length}문항`)

  // ── 2) 저장 버튼 없이 그냥 나간다 ────────────────────────────────────────
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(800)

  // ── 3) 결제한 셈 친다(결제는 하지 않는다) ────────────────────────────────
  const now = Date.now()
  const sub = await api('/rest/v1/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      user_id: uid, payment_key: `chk-${stamp}`, order_id: `chk-${stamp}`,
      amount: 0, status: 'active',
      started_at: new Date(now - 60_000).toISOString(),
      expires_at: new Date(now + 30 * 86400_000).toISOString(),
    }),
  })
  if (!sub.ok) throw new Error(`이용권을 넣지 못했다: ${await sub.text()}`)

  // ── 4) 돌아와서 이어지는지 ───────────────────────────────────────────────
  await page.goto(`${BASE}/cbt`, { waitUntil: 'networkidle' })
  await dismissModals(page)
  await page.waitForTimeout(1200)

  const body = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '))
  if (/이어풀기|이어서/.test(body)) ok('결제 뒤 목록에 이어풀기가 보인다')
  else bad('결제 뒤 목록에 이어풀기가 없다', '무료로 풀던 것을 찾을 길이 없다')

  await page.goto(`${BASE}/cbt/2025-1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await dismissModals(page)
  await choice.first().waitFor({ timeout: 30000 })
  await page.waitForTimeout(2500)

  // 무엇이 떠 있는지 먼저 본다 — 복구를 사람이 눌러야 하는 구조일 수 있다.
  const scene = await page.evaluate(() => ({
    text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 220),
    draftKeys: Object.keys(localStorage).filter(k => k.startsWith('kptest_exam_draft_')),
  }))
  // 임시본은 묻지 않고 덮어쓰지 않는다 — '불러오기'를 눌러야 복원된다. 좋은 설계이므로
  // 검사도 사람이 하는 대로 누른다. (이걸 안 눌러 '답이 사라졌다'고 오판한 적이 있다.)
  if (!/남아 있어요|불러오기/.test(scene.text)) {
    bad('이어풀기 안내가 없다', scene.text.slice(0, 80))
  } else {
    ok('들어오면 이어풀기를 묻는다', '작성하던 답안이 남아 있다고 알려 준다')
    const load = page.locator('button').filter({ hasText: /^불러오기$/ }).first()
    if (await load.count() === 0) bad('불러오기 버튼이 없다')
    else { await load.click(); await page.waitForTimeout(1500) }
  }

  const picked = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter(b => /^[①②③④⑤]/.test(b.textContent ?? ''))
    return {
      total: btns.length,
      selected: btns.filter(b => b.getAttribute('aria-pressed') === 'true' || /border-\[#1e3a5f\]/.test(b.className)).length,
      at: btns.findIndex(b => b.getAttribute('aria-pressed') === 'true' || /border-\[#1e3a5f\]/.test(b.className)),
    }
  })
  if (picked.total === 0) bad('결제 뒤 시험 화면', '보기 버튼을 못 찾았다')
  else if (picked.selected === 1 && picked.at === 2) ok('무료로 고른 답이 그대로 남아 있다', `보기 ${picked.total}개 중 3번째`)
  else bad('무료로 고른 답이 사라졌다', `선택된 것 ${picked.selected}개(자리 ${picked.at + 1})`)

  await ctx.close()
} catch (e) {
  bad('실행', String(e?.message ?? e).slice(0, 200))
} finally {
  await browser.close()
  if (uid) {
    await api(`/rest/v1/subscriptions?user_id=eq.${uid}`, { method: 'DELETE' }).catch(() => {})
    for (const t of ['quiz_answers', 'quiz_sessions']) {
      await api(`/rest/v1/${t}?user_id=eq.${uid}`, { method: 'DELETE' }).catch(() => {})
    }
    await api(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' }).catch(() => {})
  }
}
console.log(failed ? '\n막히는 데가 있다.' : '\n무료에서 결제로 넘어가도 풀던 것이 이어진다.')
process.exit(failed ? 1 : 0)
