// 첫 화면 이벤트 팝업이 제대로 뜨고 제대로 안 뜨는지 본다.
//   npm run check:popup
//
// 팝업은 두 방향으로 망가진다. 안 떠서 아무도 이벤트를 모르거나, 너무 떠서 미움받거나.
// 특히 '이미 돈 낸 사람에게 무료로 받으라고 권하는 것'은 조용히 일어나는 사고다.
//
// 검사가 만든 계정·발급만 지운다.

import fs from 'node:fs'
import { chromium } from 'playwright'

const ENV = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8').split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] }),
)
const SB = ENV.NEXT_PUBLIC_SUPABASE_URL
const KEY = ENV.SUPABASE_SERVICE_ROLE_KEY
const BASE = process.env.POPUP_BASE ?? 'http://localhost:3399'

let pass = 0, fail = 0
const ok = (n, d = '') => { pass++; console.log(`  ○ ${n}${d ? ` — ${d}` : ''}`) }
const bad = (n, d = '') => { fail++; console.log(`  × ${n}${d ? ` — ${d}` : ''}`) }

const api = (p, init) => fetch(`${SB}${p}`, {
  ...init,
  headers: {
    apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json',
    Prefer: 'return=representation', ...(init?.headers ?? {}),
  },
})

const stamp = Date.now()
const email = `popup+${stamp}@example.com`
const password = `Pop-${stamp}-aA1!`
let uid = null

console.log(`\n첫 화면 이벤트 팝업 — ${BASE}\n`)

const POPUP = '[role="dialog"][aria-labelledby="event-popup-title"]'

// 시험 일정 안내가 먼저 떠 있으면 그걸 닫아 준다 — 사람이 하는 순서와 같다.
// 자동으로 뜨는 창이 둘 겹치면 안 된다는 것 자체가 확인 대상이다.
const seen = async page => {
  await page.waitForTimeout(2000)
  const others = page.locator('[role="dialog"]:not([aria-labelledby="event-popup-title"])')
  if (await others.count()) {
    if (await page.locator(POPUP).count()) return 'overlap'
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
  }
  await page.waitForTimeout(2500)
  return (await page.locator(POPUP).count()) ? 1 : 0
}

const browser = await chromium.launch()
try {
  // 1) 처음 온 사람에게는 뜬다
  {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 })
    const first = await seen(page)
    if (first === 'overlap') bad('겹침', '시험 일정 안내와 같이 떴다')
    else if (first) ok('처음 온 사람에게는 뜬다', '앞선 안내가 닫힌 뒤에')
    else bad('첫 방문', '안 뜬다')

    const text = await page.locator(POPUP).innerText().catch(() => '')
    if (/7일/.test(text)) ok('지급 일수를 코드에서 읽어 보여 준다', '7일')
    else bad('지급 일수', text.slice(0, 60))
    if (/광고 표시/.test(text)) ok('광고 표시가 필요하다고 미리 알린다')
    else bad('광고 표시 고지', '안내가 없다')
    if (/글을 내리면/.test(text)) ok('내리면 꺼진다고 미리 알린다')
    else bad('회수 고지', '안내가 없다')

    // 2) '오늘 하루 보지 않기'를 누르면 다시 안 뜬다
    await page.getByRole('button', { name: '오늘 하루 보지 않기' }).click()
    await page.waitForTimeout(300)
    await page.reload({ waitUntil: 'domcontentloaded' })
    if (!(await seen(page))) ok('오늘 하루 보지 않기를 누르면 다시 안 뜬다')
    else bad('하루 숨기기', '또 뜬다')
    await ctx.close()
  }

  // 3) 그냥 닫으면 다음 방문에는 다시 뜬다(하루 숨기기와 구분돼야 한다)
  {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await seen(page)
    await page.locator(`${POPUP} button[aria-label="닫기"]`).click()
    await page.waitForTimeout(300)
    await page.reload({ waitUntil: 'domcontentloaded' })
    if (await seen(page)) ok('그냥 닫으면 다음 방문에 다시 뜬다')
    else bad('닫기 동작', '하루 숨기기처럼 동작한다')
    await ctx.close()
  }

  // 4) 이미 이용권이 있는 사람에게는 안 뜬다
  {
    uid = (await (await api('/auth/v1/admin/users', {
      method: 'POST', body: JSON.stringify({ email, password, email_confirm: true }),
    })).json()).id
    if (!uid) throw new Error('검사용 계정을 만들지 못했다')

    await api('/rest/v1/subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        user_id: uid, payment_key: 'promo:popup-check', order_id: `popup-check-${stamp}`,
        amount: 0, status: 'active',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    })

    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', password)
    await Promise.all([
      page.waitForURL(u => !u.pathname.includes('/login'), { timeout: 30000 }).catch(() => {}),
      page.click('button[type="submit"]'),
    ])
    await page.waitForTimeout(2000)
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 })
    if (!(await seen(page))) ok('이용권이 있는 사람에게는 안 뜬다', '돈 낸 사람에게 무료 권유 금지')
    else bad('과잉 노출', '이용권이 있는데도 뜬다')
    await ctx.close()
  }
} catch (e) {
  bad('실행', e.message)
} finally {
  await browser.close()
  await api(`/rest/v1/subscriptions?order_id=eq.popup-check-${stamp}`, { method: 'DELETE' })
  if (uid) await api(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' })
}

console.log(`\n${fail ? '팝업에 구멍이 있다.' : '뜰 사람에게만 뜬다.'}`)
process.exit(fail ? 1 : 0)
