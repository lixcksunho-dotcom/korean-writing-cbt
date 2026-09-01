// 행사 코드가 이용권으로 바뀌는지, 그리고 재사용이 막히는지 본다.
//   npm run check:promo
//
// 왜 필요한가: 블로그 홍보 답례로 코드를 뿌리는 행사를 주기적으로 돌린다. 코드가
// 안 먹히면 홍보해 준 사람이 빈손으로 돌아가고, 반대로 재사용이 뚫리면 한 코드로
// 무한 발급이 된다. 둘 다 조용히 일어나므로 실제 화면으로 확인한다.
//
//   1) 로그인해 /subscribe에서 코드를 넣는다 → 이용권이 생기는가
//   2) DB에 무료 발급(금액 0)으로 남는가 — 매출 집계에 섞이면 안 된다
//   3) 같은 코드를 다시 넣으면 막히는가
//   4) 없는 코드는 거절하는가
//
// 검사가 만든 계정과 그 계정의 발급만 지운다.

import fs from 'node:fs'
import { chromium } from 'playwright'

const ENV = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8').split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] }),
)
const BASE = process.env.PROMO_BASE ?? 'https://kptest.cloud'
const CODE = process.env.PROMO_CODE ?? 'BLOG30'
const api = (p, init) => fetch(`${ENV.NEXT_PUBLIC_SUPABASE_URL}${p}`, {
  ...init,
  headers: {
    apikey: ENV.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${ENV.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json', Prefer: 'return=representation', ...(init?.headers ?? {}),
  },
})

const stamp = String(Date.now())
const email = `promo+${stamp}@kptest.cloud`
const password = `Chk-${stamp}-aA1!`
let uid = null
let failed = false
const ok = (n, d = '') => console.log(`  ○ ${n}${d ? ` — ${d}` : ''}`)
const bad = (n, d = '') => { console.error(`  × ${n}${d ? ` — ${d}` : ''}`); failed = true }

async function apply(page, code) {
  await page.fill('#promo-code', code)
  await page.locator('form:has(#promo-code) button[type="submit"]').click()
  await page.waitForTimeout(2500)
  return page.evaluate(() => {
    const okBox = [...document.querySelectorAll('[role="status"]')].find(e => /이용권/.test(e.textContent ?? ''))
    const err = [...document.querySelectorAll('p')].find(e => /코드예요|마감|입력해|로그인한/.test(e.textContent ?? ''))
    return { ok: !!okBox, okText: (okBox?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 80), err: (err?.textContent ?? '').trim().slice(0, 60) }
  })
}

const browser = await chromium.launch()
try {
  console.log(`\n행사 코드 — ${BASE} · ${CODE}\n`)

  uid = (await (await api('/auth/v1/admin/users', {
    method: 'POST', body: JSON.stringify({ email, password, email_confirm: true }),
  })).json()).id
  if (!uid) throw new Error('검사용 계정을 만들지 못했다')

  const ctx = await browser.newContext()
  await ctx.addInitScript(() => { try { sessionStorage.setItem('silyong_mode_intro_v1', '1') } catch { /* 막혀도 진행 */ } })
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
  }
  if (!logged) throw new Error('로그인이 되지 않음')

  await page.goto(`${BASE}/subscribe`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(1200)
  if (await page.locator('#promo-code').count() === 0) throw new Error('코드 입력칸이 화면에 없다')

  // ── 없는 코드는 거절 ────────────────────────────────────────────────────
  const wrong = await apply(page, 'NOPE9999')
  if (wrong.ok) bad('없는 코드 거절', '엉뚱한 코드로도 발급됐다')
  else if (/없는 코드/.test(wrong.err)) ok('없는 코드는 거절한다', wrong.err)
  else bad('없는 코드 거절', `안내가 이상하다: "${wrong.err}"`)

  // ── 진짜 코드 ──────────────────────────────────────────────────────────
  // 발급되면 서버 액션이 화면을 다시 그려 '구독 중' 화면으로 바뀐다 — 성공 띠 대신
  // 그 전환도 성공으로 본다(처음엔 띠만 찾다가 실제 발급을 실패로 읽었다).
  const good = await apply(page, CODE)
  const nowSubscribed = await page.evaluate(() => /구독 중이에요/.test(document.body.innerText))
  if (good.ok || nowSubscribed) ok('코드를 넣으면 이용권이 나온다', good.okText || '구독 중 화면으로 전환됨')
  else bad('코드 사용', `발급되지 않았다: "${good.err}"`)

  // ── DB 기록: 무료 발급으로 남아야 한다 ──────────────────────────────────
  const subs = await (await api(`/rest/v1/subscriptions?user_id=eq.${uid}&select=order_id,amount,status,expires_at`)).json()
  const row = Array.isArray(subs) ? subs.find(s => String(s.order_id).startsWith(`promo-${CODE}-`)) : null
  if (!row) bad('발급 기록', 'subscriptions에 행사 발급이 없다')
  else if (row.amount !== 0) bad('무료 발급으로 기록', `금액이 ${row.amount}원 — 매출에 섞인다`)
  else {
    const days = Math.round((new Date(row.expires_at) - Date.now()) / 86400000)
    ok('무료 발급(0원)으로 남는다', `${days}일 · ${row.status}`)
  }

  // ── 재사용 차단 ────────────────────────────────────────────────────────
  // 이용권이 생기면 /subscribe는 '구독 중' 화면이라 입력칸이 없다. 재사용 차단은
  // 화면이 아니라 액션 자체를 다시 불러 확인해야 한다 — 코드 경로가 진짜 방어선이다.
  await page.goto(`${BASE}/subscribe`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  const box = await page.locator('#promo-code').count()
  if (box > 0) {
    const again = await apply(page, CODE)
    if (again.ok) bad('재사용 차단', '같은 코드로 또 발급됐다')
    else if (/이미 사용/.test(again.err)) ok('같은 코드는 다시 못 쓴다', again.err)
    else bad('재사용 차단', `막히긴 했는데 안내가 다르다: "${again.err}"`)
  } else {
    // 같은 order_id를 직접 한 번 더 넣어 DB의 unique 제약이 실제로 막는지 본다.
    const dup = await api('/rest/v1/subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        user_id: uid, payment_key: `promo:${CODE}`, order_id: `promo-${CODE}-${uid}`,
        amount: 0, status: 'active', expires_at: new Date(Date.now() + 86400000).toISOString(),
      }),
    })
    if (dup.ok) bad('재사용 차단', 'order_id가 겹치는데도 또 들어갔다 — unique 제약이 없다')
    else {
      const body = await dup.text()
      if (body.includes('23505')) ok('같은 코드는 다시 못 쓴다', 'order_id unique 제약이 막는다')
      else bad('재사용 차단', `막히긴 했는데 이유가 다르다: ${body.slice(0, 90)}`)
    }
  }

  const after = await (await api(`/rest/v1/subscriptions?user_id=eq.${uid}&select=id`)).json()
  if (Array.isArray(after) && after.length === 1) ok('발급은 한 건뿐이다')
  else bad('발급 건수', `${Array.isArray(after) ? after.length : '?'}건 — 중복 발급`)

  await ctx.close()
} catch (e) {
  bad('실행', String(e?.message ?? e).slice(0, 300))
} finally {
  await browser.close()
  if (uid) {
    await api(`/rest/v1/subscriptions?user_id=eq.${uid}`, { method: 'DELETE' }).catch(() => {})
    await api(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' }).catch(() => {})
  }
}
console.log(failed ? '\n행사 코드에 구멍이 있다.' : '\n코드는 한 번만, 무료 발급으로 나간다.')
process.exit(failed ? 1 : 0)
