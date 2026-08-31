// 시험 도중 나갈 때 물어보고, 서버에 남겨 다른 기기에서 이어지는지 본다.
//   npm run check:exit-save
//
// 왜 필요한가: 39문항짜리 시험을 한 자리에서 끝내는 사람은 드물다. 전화가 오고, 출근하고,
// 그냥 탭을 닫는다. 그때 답안이 이 브라우저에만 남으면 다른 기기에서는 처음부터다 —
// 사람은 다시 오지 않는다. 그래서 나가려는 순간 붙잡아 서버에 남길지 묻게 했다.
//
// 그 길을 그대로 따라간다. 무료 계정으로 한다 — 되돌아와야 할 사람이 무료 사용자다.
//   1) 시험을 열어 한 문항 고른다
//   2) 나가려 한다(앱 안의 링크를 누른다) → 물어보는가
//   3) '저장하고 나가기' → 서버(quiz_sessions.saved_answers)에 실제로 들어갔는가
//   4) 브라우저를 통째로 새로 띄워(= 다른 기기) 들어가면 그 답이 그대로 있는가
//
// 4번이 이 기능의 전부다. 3번까지만 되면 예전과 다를 게 없다.
// 검사가 만든 계정·세션만 지운다.

import fs from 'node:fs'
import { chromium } from 'playwright'

const ENV = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8').split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] }),
)
const BASE = process.env.EXIT_SAVE_BASE ?? 'https://kptest.cloud'
const api = (p, init) => fetch(`${ENV.NEXT_PUBLIC_SUPABASE_URL}${p}`, {
  ...init,
  headers: {
    apikey: ENV.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${ENV.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json', Prefer: 'return=representation', ...(init?.headers ?? {}),
  },
})

const stamp = String(Date.now())
const email = `exitsave+${stamp}@kptest.cloud`
const password = `Chk-${stamp}-aA1!`
let uid = null
let failed = false
const ok = (n, d = '') => console.log(`  ○ ${n}${d ? ` — ${d}` : ''}`)
const bad = (n, d = '') => { console.error(`  × ${n}${d ? ` — ${d}` : ''}`); failed = true }

async function dismissIntro(page) {
  for (let i = 0; i < 3; i++) {
    const dialog = page.locator('[role="dialog"]')
    if (await dialog.count() === 0) break
    const close = dialog.locator('button').filter({ hasText: /닫기|시작|확인|나중에/ }).first()
    if (await close.count()) await close.click().catch(() => {})
    else await page.keyboard.press('Escape')
    await page.waitForTimeout(600)
  }
}

// 새 브라우저 컨텍스트 = 다른 기기. localStorage도 쿠키도 넘어가지 않는다.
async function freshDevice(browser) {
  const ctx = await browser.newContext()
  await ctx.addInitScript(() => { try { localStorage.setItem('silyong_mode_intro_v1', '1') } catch { /* 막혀도 진행 */ } })
  const page = await ctx.newPage()
  for (let a = 0; a < 3; a++) {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', password)
    await page.click('button[type="submit"]')
    for (let i = 0; i < 30; i++) {
      if (!new URL(page.url()).pathname.includes('/login')) return { ctx, page }
      await page.waitForTimeout(1000)
    }
  }
  throw new Error('로그인이 되지 않음')
}

const pickedAt = 2 // 1번 문항의 3번 보기
const selectedIndex = page => page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')].filter(b => /^[①②③④⑤]/.test(b.textContent ?? ''))
  return { total: btns.length, at: btns.findIndex(b => b.getAttribute('aria-pressed') === 'true') }
})

const browser = await chromium.launch()
try {
  console.log(`\n나갈 때 물어보고 서버에 남기는가 — ${BASE}\n`)

  uid = (await (await api('/auth/v1/admin/users', {
    method: 'POST', body: JSON.stringify({ email, password, email_confirm: true }),
  })).json()).id
  if (!uid) throw new Error('검사용 계정을 만들지 못했다')

  // ── 기기 1: 풀다가 나간다 ────────────────────────────────────────────────
  const dev1 = await freshDevice(browser)
  await dev1.page.goto(`${BASE}/cbt/2025-1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await dismissIntro(dev1.page)
  const choice = dev1.page.locator('button').filter({ hasText: /^[①②③④⑤]/ })
  await choice.first().waitFor({ timeout: 30000 })
  await choice.nth(pickedAt).click()
  await dev1.page.waitForTimeout(1200)

  // 나가려 한다 — 앱 안의 링크를 누른다(상단 메뉴 등)
  const away = dev1.page.locator('a[href="/dashboard"], a[href="/cbt"]').first()
  if (await away.count() === 0) throw new Error('나갈 링크를 찾지 못했다')
  await away.click()
  await dev1.page.waitForTimeout(900)

  const asked = await dev1.page.evaluate(() => {
    const el = [...document.querySelectorAll('[role="dialog"]')]
      .find(e => /시험에서 나갈까요/.test(e.textContent ?? ''))
    return {
      has: !!el,
      buttons: el ? [...el.querySelectorAll('button')].map(b => (b.textContent ?? '').trim()) : [],
      onExamPage: location.pathname.includes('/cbt/2025-1'),
    }
  })
  if (!asked.has) bad('나가려 할 때 물어본다', '아무것도 묻지 않고 나가진다')
  else if (!asked.onExamPage) bad('물어보는 동안 시험 화면에 머문다', '이미 나가 버렸다')
  else if (!asked.buttons.some(b => /^저장하고 나가기/.test(b)) || !asked.buttons.some(b => /저장하지 않고 나가기/.test(b))) {
    bad('두 갈래를 준다', `버튼: ${asked.buttons.join(' / ')}`)
  } else ok('나가려 하면 물어본다', asked.buttons.filter(Boolean).join(' · '))

  // '저장하고 나가기'
  const saveBtn = dev1.page.locator('[role="dialog"] button').filter({ hasText: /^저장하고 나가기$/ }).first()
  if (await saveBtn.count() === 0) throw new Error('저장하고 나가기 버튼이 없다')
  await saveBtn.click()
  await dev1.page.waitForURL(u => !u.toString().includes('/cbt/2025-1'), { timeout: 30000 }).catch(() => {})
  const left = new URL(dev1.page.url()).pathname
  if (left.includes('/cbt/2025-1')) bad('저장 뒤 나가진다', `아직 ${left}에 있다`)
  else ok('저장 뒤 원래 가려던 곳으로 나간다', left)

  // 서버에 실제로 들어갔는지 — 화면 말고 표를 본다
  const sessions = await (await api(`/rest/v1/quiz_sessions?user_id=eq.${uid}&select=id,saved_answers,time_left,saved_at`)).json()
  const saved = sessions.find(s => s.saved_answers && Object.keys(s.saved_answers).length > 0)
  if (!saved) bad('서버에 남았다', `세션 ${sessions.length}건 중 저장된 것이 없다`)
  else ok('서버에 남았다', `${Object.keys(saved.saved_answers).length}문항 · 남은 시간 ${saved.time_left}초`)

  await dev1.ctx.close()

  // ── 기기 2: 다른 기기에서 들어간다 ───────────────────────────────────────
  const dev2 = await freshDevice(browser)
  const noLocal = await dev2.page.evaluate(() =>
    Object.keys(localStorage).filter(k => k.startsWith('kptest_exam_draft_')).length)
  if (noLocal !== 0) bad('새 기기라는 전제', `임시본이 ${noLocal}건 넘어왔다 — 검사가 성립하지 않는다`)

  await dev2.page.goto(`${BASE}/cbt/2025-1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await dismissIntro(dev2.page)
  await dev2.page.locator('button').filter({ hasText: /^[①②③④⑤]/ }).first().waitFor({ timeout: 30000 })
  await dev2.page.waitForTimeout(1500)

  const restored = await selectedIndex(dev2.page)
  if (restored.total === 0) bad('다른 기기 · 시험 화면', '보기 버튼을 못 찾았다')
  else if (restored.at === pickedAt) ok('다른 기기에서도 고른 답이 그대로 있다', `보기 ${restored.total}개 중 ${pickedAt + 1}번째`)
  else bad('다른 기기에서는 답이 없다', `선택된 자리 ${restored.at + 1} (기대 ${pickedAt + 1})`)

  await dev2.ctx.close()
} catch (e) {
  bad('실행', String(e?.message ?? e).slice(0, 300))
} finally {
  await browser.close()
  if (uid) {
    for (const t of ['quiz_answers', 'quiz_sessions']) {
      await api(`/rest/v1/${t}?user_id=eq.${uid}`, { method: 'DELETE' }).catch(() => {})
    }
    await api(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' }).catch(() => {})
  }
}
console.log(failed ? '\n나가는 길에 잃는 데가 있다.' : '\n나갈 때 물어보고, 다른 기기에서 이어진다.')
process.exit(failed ? 1 : 0)
