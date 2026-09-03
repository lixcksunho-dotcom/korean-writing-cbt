// 결제가 막혔을 때, 무엇이 빠졌는지 그 자리로 데려가는지 본다.
//   npm run check:pay-guide
//   PAY_GUIDE_BASE=http://127.0.0.1:4796 npm run check:pay-guide
//
// 왜 필요한가: 결제창까지 못 간 사람이 최근 60일 14명이었다 — 전화번호 미입력 7,
// 약관 미동의 7. 같은 기간 결제 성공이 20명이니 적은 수가 아니다.
//
// 두 칸 다 버튼 위에 있는데도 그냥 누른다. 그리고 안내는 버튼 아래에 떠서, 고쳐야 할
// 칸과 한 화면에 안 들어온다. 말은 했지만 어디를 고치라는지는 안 보였던 셈이다.
//
// 여기서 확인하는 것은 '막혔는가'가 아니라 '어디를 고치면 되는지 알려 주는가'다.
//
// 주의: 결제창은 절대 열지 않는다. 일부러 빈 채로 눌러 **거절되는 경로만** 본다.

import fs from 'node:fs'
import { chromium } from 'playwright'

const BASE = process.env.PAY_GUIDE_BASE ?? 'https://kptest.cloud'

const E = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8').split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] }),
)
const SB = E.NEXT_PUBLIC_SUPABASE_URL, SVC = E.SUPABASE_SERVICE_ROLE_KEY
const admin = (p, init) => fetch(`${SB}${p}`, {
  ...init,
  headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
})

let pass = 0, fail = 0
const ok = (n, d = '') => { pass++; console.log(`  ○ ${n}${d ? ` — ${d}` : ''}`) }
const bad = (n, d = '') => { fail++; console.log(`  × ${n}${d ? ` — ${d}` : ''}`) }

console.log(`\n결제가 막혔을 때 어디를 고치라고 하는가 — ${BASE}\n`)

const stamp = `${Date.now()}pay`
const email = `payguide+${stamp}@kptest.cloud`, password = `Chk-${stamp}-aA1!`
const mk = await admin('/auth/v1/admin/users', {
  method: 'POST',
  body: JSON.stringify({ email, password, email_confirm: true }),
})
if (!mk.ok) { console.error('검증용 계정을 만들지 못했습니다:', await mk.text()); process.exit(1) }
const uid = (await mk.json()).id

const browser = await chromium.launch()
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const page = await ctx.newPage()

  // 배포 직후나 인증 레이트리밋에 걸리면 한 번에 안 들어간다 — 몇 번 다시 해 본다.
  let signedIn = false
  for (let attempt = 0; attempt < 3 && !signedIn; attempt++) {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', password)
    await page.click('button[type="submit"]')
    for (let i = 0; i < 25; i++) {
      if (!new URL(page.url()).pathname.includes('/login')) { signedIn = true; break }
      await page.waitForTimeout(1000)
    }
    if (!signedIn) await page.waitForTimeout(5000)
  }
  if (!signedIn) throw new Error('로그인이 되지 않음(3회 시도)')

  await page.goto(`${BASE}/subscribe`, { waitUntil: 'load', timeout: 60000 })
  // 결제 부품은 나중에 따로 실린다(dynamic·ssr:false) — 나타날 때까지 기다린다.
  await page.locator('input[type="tel"]').first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => {})
  const phone = page.locator('input[type="tel"]').first()
  const agree = page.locator('input[type="checkbox"]').first()
  const payBtn = page.locator('button', { hasText: /카드|결제/ }).first()
  if (!(await phone.count()) || !(await agree.count()) || !(await payBtn.count())) {
    bad('결제 화면을 못 찾았다', '이용권 화면 구조가 바뀌었나')
  } else {
    // ── 아무것도 안 채우고 누른다 (동의가 먼저 걸린다) ─────────────────────
    await payBtn.click()
    await page.waitForTimeout(600)

    const agreeMarked = await agree.getAttribute('aria-invalid')
    if (agreeMarked === 'true') ok('동의를 안 하면 동의 칸을 짚어 준다')
    else bad('동의 칸이 표시되지 않는다', `aria-invalid=${agreeMarked}`)

    const focusedAgree = await page.evaluate(() => document.activeElement?.getAttribute('type'))
    if (focusedAgree === 'checkbox') ok('커서가 동의 칸으로 옮겨간다')
    else bad('커서가 안 옮겨간다', `지금 초점: ${focusedAgree ?? '(없음)'}`)

    // ── 동의만 하고 전화번호는 비운 채 누른다 ──────────────────────────────
    await agree.check()
    await page.waitForTimeout(200)
    if (await agree.getAttribute('aria-invalid') !== 'true') ok('체크하면 표시가 곧바로 사라진다')
    else bad('고쳤는데 표시가 남아 있다')

    await payBtn.click()
    await page.waitForTimeout(600)

    const phoneMarked = await phone.getAttribute('aria-invalid')
    if (phoneMarked === 'true') ok('번호가 없으면 번호 칸을 짚어 준다')
    else bad('번호 칸이 표시되지 않는다', `aria-invalid=${phoneMarked}`)

    const focusedPhone = await page.evaluate(() => document.activeElement?.getAttribute('type'))
    if (focusedPhone === 'tel') ok('커서가 번호 칸으로 옮겨간다', '모바일은 자판까지 열린다')
    else bad('커서가 안 옮겨간다', `지금 초점: ${focusedPhone ?? '(없음)'}`)

    // 빠진 칸이 화면 안에 들어와 있어야 한다 — 말만 하고 화면 밖이면 소용없다.
    const inView = await phone.evaluate(el => {
      const r = el.getBoundingClientRect()
      return r.top >= 0 && r.bottom <= window.innerHeight
    })
    if (inView) ok('고쳐야 할 칸이 화면 안에 있다')
    else bad('고쳐야 할 칸이 화면 밖이다', '안내를 봐도 어디를 고칠지 모른다')

    // 여기서 멈춘다. 번호를 채우고 누르면 진짜 결제창이 열린다 — 검사가 할 일이 아니다.
    ok('결제창은 열지 않고 끝낸다', '거절되는 경로만 확인한다')
  }
} catch (e) {
  bad('확인하지 못했다', String(e.message).split('\n')[0].slice(0, 80))
} finally {
  await browser.close()
  await admin(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' })  // 만든 것만 지운다
}

console.log(`\n${fail ? '막히기만 하고 어디를 고칠지는 안 알려 준다.' : '막히면 고칠 자리로 데려간다.'}`)
process.exitCode = fail ? 1 : 0
