// 첫 화면 이벤트 팝업이 제대로 뜨고 제대로 안 뜨는지 본다.
//   npm run check:popup
//
// 팝업은 두 방향으로 망가진다. 안 떠서 아무도 이벤트를 모르거나, 너무 떠서 미움받거나.
// 특히 '이미 돈 낸 사람에게 무료로 받으라고 권하는 것'은 조용히 일어나는 사고다.
//
// 검사가 만든 계정·발급만 지운다.

import fs from 'node:fs'
import { requireSite } from './assertSite.mjs'
import { chromium } from 'playwright'

// 팝업은 플래그로 켜고 끈다. 꺼져 있을 때는 '안 뜨는 것'이 정답이다 —
// 껐다고 검사를 지우면, 다시 켰을 때 무엇이 보장되는지 아무도 모른다.
const ENABLED = /BLOG_EVENT_POPUP_ENABLED = true/.test(
  fs.readFileSync('src/lib/blogPromoRules.ts', 'utf8'),
)

const ENV = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8').split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] }),
)
const SB = ENV.NEXT_PUBLIC_SUPABASE_URL
const KEY = ENV.SUPABASE_SERVICE_ROLE_KEY
const BASE = process.env.POPUP_BASE ?? 'https://kptest.cloud'

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

// 다른 제품의 서버가 같은 포트에 떠 있으면 남의 결과로 내 사이트를 판단하게 된다.
if (!(await requireSite(BASE, '실글패스'))) process.exit(1)

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

// ── 꺼져 있어도 확인하는 것 ────────────────────────────────────────────────
// 팝업은 플래그가 꺼져 있으면 화면에 안 뜬다. 그래서 켜기 전까지는 아무도 안 본다 —
// 정작 켜는 날 처음 보게 되는데, 그때 고치면 이미 손님이 본 뒤다.
// 화면 없이도 볼 수 있는 것은 여기서 미리 본다.
{
  const src = fs.readFileSync('src/components/promo/EventPopup.tsx', 'utf8')

  // 고지는 한쪽만 말하면 안 된다. '내리면 멈춘다'만 쓰고 '다시 올리면 되살아난다'를
  // 빼면, 읽는 사람은 한 번 실수하면 끝이라고 이해한다.
  if (/멈춰|꺼집니다|멈춥니다/.test(src)) ok('내리면 멈춘다고 밝힌다')
  else bad('회수 고지', '없다')
  if (/되살아납니다|되살아나요/.test(src)) ok('다시 올리면 되살아난다고 함께 밝힌다')
  else bad('한쪽만 고지', '멈춘다는 말만 있고 되살아난다는 말이 없다')

  // 광고 표시 의무와 회수 조건은 이 창에서 읽고 결정하는 내용이다. 흐리게 쓰면 안 읽힌다.
  // 예전엔 #94a3b8 11px이었고, 흰 배경 대비가 2.6:1이었다(기준 4.5).
  const TOO_LIGHT = ['#94a3b8', '#cbd5e1', '#a8a29e', 'text-slate-400', 'text-gray-400']
  const notice = src.split('\n').filter(l => /선착순|공개돼 있어야/.test(l))
  const around = src.split('\n')
  const noticeBlock = around
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => /선착순 \{MAX_REWARDS\}/.test(l))
    .flatMap(({ i }) => around.slice(Math.max(0, i - 3), i + 1))
    .join('\n')
  const light = TOO_LIGHT.filter(c => noticeBlock.includes(c))
  if (!light.length) ok('고지 문구가 흐리지 않다')
  else bad('고지 대비', `${light.join(', ')} — 흰 배경에서 4.5:1을 못 넘긴다`)
  if (notice.length) ok('고지 문구가 팝업 안에 있다')
  else bad('고지 문구', '못 찾았다')
}

let heldBack = false
const browser = await chromium.launch()
try {
  if (!ENABLED) {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(5000)
    if (await page.locator(POPUP).count() === 0) ok('보류 중 — 팝업이 뜨지 않는다', '플래그 off')
    else bad('보류 실패', '꺼 뒀는데 뜬다')
    await ctx.close()
    // 여기서 process.exit를 부르면 플레이라이트 핸들이 닫히는 중이라 윈도우에서
    // libuv가 죽는다. 아래 finally가 브라우저를 닫도록 두고, 끝났다고만 표시한다.
    heldBack = true
  }

  // 1) 처음 온 사람에게는 뜬다
  if (!heldBack) {
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
    if (/접수|시험/.test(text)) ok('시험 일정을 같은 창에서 함께 보여 준다')
    else bad('일정 표시', '이벤트만 있고 일정이 없다')
    const others = await page.locator('[role="dialog"]:not([aria-labelledby="event-popup-title"])').count()
    if (others === 0) ok('자동으로 뜨는 창은 이것 하나뿐이다')
    else bad('창 겹침', `다른 창 ${others}개가 함께 떠 있다`)

    // 2) '오늘 하루 보지 않기'를 누르면 다시 안 뜬다
    await page.getByRole('button', { name: /일 동안 보지 않기/ }).click()
    await page.waitForTimeout(300)
    await page.reload({ waitUntil: 'domcontentloaded' })
    if (!(await seen(page))) ok('일주일 보지 않기를 누르면 다시 안 뜬다')
    else bad('일주일 숨기기', '또 뜬다')
    await ctx.close()
  }

  // 3) 그냥 닫으면 다음 방문에는 다시 뜬다(하루 숨기기와 구분돼야 한다)
  if (!heldBack) {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await seen(page)
    await page.locator(`${POPUP} button[aria-label="닫기"]`).click()
    await page.waitForTimeout(300)
    await page.reload({ waitUntil: 'domcontentloaded' })
    if (await seen(page)) ok('그냥 닫으면 다음 방문에 다시 뜬다')
    else bad('닫기 동작', '일주일 숨기기처럼 동작한다')
    await ctx.close()
  }

  // 4) 이미 이용권이 있는 사람에게는 안 뜬다
  if (!heldBack) {
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
process.exitCode = fail ? 1 : 0
