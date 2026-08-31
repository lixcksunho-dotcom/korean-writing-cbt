// 해결 처리한 불편사항이 그 사람 화면에 실제로 뜨는지 본다.
//   npm run check:resolved-notice
//
// 왜 필요한가: 문의를 고쳐 놓아도 알릴 길이 없었다. 남긴 사람은 읽혔는지조차 모른 채
// 떠난다. feedback 표의 resolved 칸을 켜면 대시보드에 띠가 뜨게 해 두었는데, 이런
// 알림은 조용히 안 뜨는 쪽으로 고장 나기 쉽다 — 관리자는 처리했다고 믿고, 사용자는
// 아무것도 못 본다. 그래서 눈으로 확인한다.
//
// 검사용 계정에 해결된 문의를 하나 심고 로그인해서 띠가 뜨는지 본다. 만든 것만 지운다.

import fs from 'node:fs'
import { chromium } from 'playwright'

const ENV = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8').split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] }),
)
const BASE = process.env.RESOLVED_NOTICE_BASE ?? 'https://kptest.cloud'
const api = (p, init) => fetch(`${ENV.NEXT_PUBLIC_SUPABASE_URL}${p}`, {
  ...init,
  headers: {
    apikey: ENV.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${ENV.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json', Prefer: 'return=representation', ...(init?.headers ?? {}),
  },
})

const stamp = String(Date.now())
const email = `notice+${stamp}@kptest.cloud`
const password = `Chk-${stamp}-aA1!`
const MESSAGE = '검사용 문의입니다. 해결 알림이 뜨는지 확인합니다.'
let uid = null
let failed = false

try {
  uid = (await (await api('/auth/v1/admin/users', {
    method: 'POST', body: JSON.stringify({ email, password, email_confirm: true }),
  })).json()).id
  if (!uid) throw new Error('검사용 계정을 만들지 못했다')

  const fb = await api('/rest/v1/feedback', {
    method: 'POST',
    body: JSON.stringify({ user_id: uid, message: MESSAGE, path: '/support', resolved: true }),
  })
  if (!fb.ok) throw new Error(`문의를 넣지 못했다: ${await fb.text()}`)

  const browser = await chromium.launch()
  const ctx = await browser.newContext()
  await ctx.addInitScript(() => { try { localStorage.setItem('silyong_mode_intro_v1', '1') } catch { /* 막혀 있어도 진행 */ } })
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

  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)

  const seen = await page.evaluate(() => {
    const el = [...document.querySelectorAll('[role="status"]')]
      .find(e => /불편사항이 해결/.test(e.textContent ?? ''))
    return { has: !!el, text: (el?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 110) }
  })

  console.log(`\n해결 알림 — ${BASE}\n`)
  if (!seen.has) {
    console.error('  × 해결된 문의가 있는데 대시보드에 알림이 없다')
    failed = true
  } else {
    console.log(`  ○ 알림이 뜬다 — "${seen.text}"`)
    // 닫으면 다시 안 떠야 한다. 매번 뜨면 그것대로 성가시다.
    await page.click('button[aria-label="알림 닫기"]').catch(() => {})
    await page.waitForTimeout(600)
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    const again = await page.evaluate(() =>
      [...document.querySelectorAll('[role="status"]')].some(e => /불편사항이 해결/.test(e.textContent ?? '')))
    if (again) { console.error('  × 닫았는데 새로고침하니 또 뜬다'); failed = true }
    else console.log('  ○ 닫으면 다시 뜨지 않는다')
  }
  await browser.close()
} catch (e) {
  failed = true
  console.error(String(e?.message ?? e).slice(0, 200))
} finally {
  if (uid) {
    await api(`/rest/v1/feedback?user_id=eq.${uid}`, { method: 'DELETE' }).catch(() => {})
    await api(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' }).catch(() => {})
  }
}
process.exit(failed ? 1 : 0)
