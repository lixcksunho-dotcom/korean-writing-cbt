// 선착순 자리가 실제로 막히는지 본다 — 자리가 다 차면 어디까지 닫히는가.
//   npm run check:quota-cap
//   PAGE_SWEEP_BASE=http://localhost:3000 npm run check:quota-cap
//
// 왜 필요한가: 한도를 5명으로 줄였다(운영자 지시 2026-09-08). 한도는 숫자를 바꿔 놓는 것으로
// 끝나지 않는다 — 다 차면 안내 화면·이벤트 카드·자동 지급이 함께 닫혀야 한다. 한 곳이라도
// 열려 있으면 "신청했는데 아무 일도 안 일어난다"가 된다. 7일 이용권 하나가 AI 채점 210회를
// 쓸 수 있어, 안 막히면 그대로 비용이다.
//
// 검사가 만든 계정과 자리 채우기용 행만 만들고 지운다. 진짜 참가자의 행은 건드리지 않는다.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { MAX_REWARDS, REWARD_DAYS } from '../src/lib/blogPromoRules.ts'

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
const quota = () => fetch(`${BASE}/api/promo/quota`, { cache: 'no-store' }).then((r) => r.json())

const stamp = String(Date.now())
const fillerIds = []
let userId = null
let browser

try {
  const before = await quota()
  if (before.total === MAX_REWARDS) ok('화면이 보는 한도가 코드와 같다', `${before.total}명`)
  else bad('한도가 코드와 다르다', `화면 ${before.total} vs 코드 ${MAX_REWARDS}`)
  if (!before.closed) ok('지금은 열려 있다', `${before.used}/${before.total} 씀 · ${before.left}자리 남음`)
  else bad('이미 마감 상태다 — 이 검사로는 열림/닫힘을 견줄 수 없다', JSON.stringify(before))

  // 손님 눈으로 열린 상태를 먼저 본다.
  const email = `capcheck+${stamp}@kptest.cloud`
  const password = `Chk-${stamp}-aA1!`
  const u = await (await api('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email, password, email_confirm: true }) })).json()
  userId = u.id
  if (!userId) throw new Error('계정 생성 실패: ' + JSON.stringify(u).slice(0, 160))

  browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  for (let i = 0; i < 40 && page.url().includes('/login'); i++) await page.waitForTimeout(1000)

  const read = async (url) => {
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)   // 이벤트 카드는 열린 뒤에 자리 수를 물어본다
    return page.evaluate(() => document.body.innerText)
  }

  const openEvent = await read(`${BASE}/event/blog-review`)
  if (openEvent.includes(`${before.left}자리 남음`)) ok('안내 화면이 남은 자리를 말한다', `${before.left}자리`)
  else bad('안내 화면의 남은 자리', openEvent.slice(0, 120).replace(/\n/g, ' | '))
  if (openEvent.includes(`${MAX_REWARDS}명`)) ok('안내 화면이 선착순 인원을 말한다', `${MAX_REWARDS}명`)
  else bad('안내 화면의 인원 수', openEvent.slice(0, 160).replace(/\n/g, ' | '))

  const openDash = await read(`${BASE}/dashboard`)
  const CARD = `블로그에 후기를 쓰면 이용권 ${REWARD_DAYS}일을 드려요`
  const cardOpen = openDash.includes(CARD)
  if (cardOpen) ok('대시보드에 후기 이벤트 카드가 있다')
  else bad('대시보드 이벤트 카드', openDash.slice(0, 200).replace(/\n/g, ' | '))

  // 남은 자리를 전부 채운다 — 진짜 참가자 행과 섞이지 않게 order_id 를 따로 쓴다.
  for (let i = 0; i < before.left; i++) {
    const row = await (await api('/rest/v1/subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId, payment_key: 'promo:blog-review', order_id: `review-capcheck-${stamp}-${i}`,
        amount: 0, status: 'active', expires_at: new Date(Date.now() + 86400_000).toISOString(),
      }),
    })).json()
    if (Array.isArray(row) && row[0]?.id) fillerIds.push(row[0].id)
  }
  if (fillerIds.length === before.left) ok('남은 자리를 채웠다', `${fillerIds.length}자리`)
  else bad('자리 채우기', `${fillerIds.length}/${before.left}`)

  const full = await quota()
  if (full.closed && full.left === 0) ok('자리가 다 차면 마감으로 바뀐다', `${full.used}/${full.total}`)
  else bad('마감 판정', JSON.stringify(full))

  const closedEvent = await read(`${BASE}/event/blog-review`)
  if (closedEvent.includes('마감')) ok('안내 화면이 마감을 알린다')
  else bad('안내 화면 마감 표시', closedEvent.slice(0, 160).replace(/\n/g, ' | '))

  const closedDash = await read(`${BASE}/dashboard`)
  if (!closedDash.includes(CARD)) ok('마감이면 대시보드 카드가 사라진다')
  else bad('마감인데 대시보드 카드가 남아 있다', closedDash.slice(0, 200).replace(/\n/g, ' | '))

  await ctx.close()
} catch (e) {
  bad('검사 진행', String(e).slice(0, 200))
} finally {
  if (browser) await browser.close()
  for (const id of fillerIds) await api(`/rest/v1/subscriptions?id=eq.${id}`, { method: 'DELETE' })
  if (userId) {
    await api(`/rest/v1/subscriptions?user_id=eq.${userId}`, { method: 'DELETE' })
    await api(`/auth/v1/admin/users/${userId}`, { method: 'DELETE' })
  }
  // 되돌아왔는지까지 확인한다 — 검사가 남의 자리를 먹고 끝나면 안 된다.
  try {
    const after = await quota()
    if (!after.closed) results.push({ ok: true, name: '검사가 채운 자리를 되돌렸다', detail: `${after.used}/${after.total} 씀` })
    else results.push({ ok: false, name: '자리가 아직 막혀 있다 — 확인 필요', detail: JSON.stringify(after) })
  } catch (e) {
    results.push({ ok: false, name: '되돌림 확인 실패', detail: String(e).slice(0, 120) })
  }
}

console.log(`\n블로그 후기 선착순 한도 검사 — ${BASE}\n`)
for (const r of results) console.log(`${r.ok ? '  OK' : '  !!'}  ${r.name}${r.detail ? ` — ${r.detail}` : ''}`)
const failed = results.filter((r) => !r.ok)
console.log(failed.length ? `\n${failed.length}건 고칠 것이 있습니다.` : '\n고친 것이 사이트에 있습니다.')
process.exit(failed.length ? 1 : 0)
