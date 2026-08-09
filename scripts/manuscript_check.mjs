// 원고지 화면이 실제로 쓸 수 있는 상태인지 본다.
//   npm run check:manuscript
//
// 이 서비스가 파는 것의 핵심인데 지금까지 어떤 검사도 손대지 않았다. AI 채점은
// 유료 API라 **절대 누르지 않는다** — 누르기 직전까지가 이 검사의 범위다.
// 그 앞이 깨지면 채점까지 갈 사람이 아예 없으므로, 앞을 지키는 게 먼저다.
import fs from 'node:fs'
import { chromium, devices } from 'playwright'
import { dismissIntros } from './ui_audit_rules.mjs'

const ENV = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8').split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const SB = ENV.NEXT_PUBLIC_SUPABASE_URL
const SVC = ENV.SUPABASE_SERVICE_ROLE_KEY
const BASE = process.env.MANUSCRIPT_CHECK_BASE ?? 'https://kptest.cloud'
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

const browser = await chromium.launch()
try {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] })
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

  await page.goto(`${BASE}/manuscript`, { waitUntil: 'load' })
  await page.waitForTimeout(2000)

  // 1) 원고지가 20칸인가. 칸 수가 틀리면 원고지 사용법 자체가 틀린 것이 된다.
  const cols = await page.evaluate(() => {
    // 격자선은 backgroundSize로 그린다 — 칸 너비와 전체 너비로 칸 수를 되짚는다.
    const grid = [...document.querySelectorAll('div')].find((d) => /linear-gradient/.test(d.style.backgroundImage || ''))
    if (!grid) return null
    const cell = parseFloat((grid.style.backgroundSize || '').split(' ')[0])
    const w = grid.getBoundingClientRect().width
    return cell > 0 ? Math.round(w / cell) : null
  })
  if (cols === 20) ok('원고지 칸', '한 줄 20칸')
  else bad('원고지 칸', `20칸이어야 하는데 ${cols ?? '격자를 찾지 못함'}`)

  // 2) 글자를 넣으면 글자 수가 따라오는가
  const SAMPLE = '재택근무는 사무실이 아닌 집에서 정보 통신 기술을 이용해 일하는 근무 방식이다. 출퇴근 시간을 아낄 수 있다는 점이 가장 큰 장점으로 꼽힌다.'
  const box = page.locator('[contenteditable="true"], textarea').first()
  if (!await box.count()) {
    bad('입력', '입력할 곳을 찾지 못함')
  } else {
    await box.click()
    await page.keyboard.insertText(SAMPLE)
    await page.waitForTimeout(800)
    const shown = await page.evaluate(() => /(\d+)\s*\/\s*400자/.exec(document.body.innerText)?.[1] ?? null)
    const n = Number(shown)
    // 세는 방식(공백 포함 여부)까지 단정하지는 않는다 — '따라 움직이는가'가 요점이다.
    if (!shown) bad('글자 수', '글자 수 표시를 찾지 못함')
    else if (n === 0) bad('글자 수', `${SAMPLE.length}자를 넣었는데 0으로 남아 있다`)
    else if (Math.abs(n - SAMPLE.length) > SAMPLE.length * 0.2) {
      bad('글자 수', `${SAMPLE.length}자를 넣었는데 ${n}으로 센다`)
    } else ok('글자 수', `${SAMPLE.length}자 → ${n} 표시`)

    // 3) 넣은 글자가 칸에 실제로 박히는가. 숫자만 맞고 화면이 비면 아무 소용이 없다.
    // 원고지는 글자를 칸마다 따로 그린다 — innerText로 읽으면 사이에 공백·줄바꿈이
    // 끼어서 '재택근무는'이 통으로는 안 잡힌다. 공백을 걷어 내고 본다.
    const firstChars = await page.evaluate(() => {
      const t = (document.body.innerText || '').replace(/\s+/g, '')
      return t.includes('재택근무는') ? '보임' : '안 보임'
    })
    if (firstChars === '보임') ok('칸 표시', '입력한 글이 원고지에 나타난다')
    else bad('칸 표시', '글자 수는 올라갔는데 원고지에 글이 안 보인다')
  }

  // 4) AI 채점 버튼이 있는가 — **누르지 않는다**(유료 API). 있는지만 본다.
  const aiBtn = await page.evaluate(() => {
    const el = [...document.querySelectorAll('button')].find((b) => /AI (채점|분석)/.test(b.textContent ?? ''))
    return el ? (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40) : null
  })
  if (aiBtn) ok('채점 버튼', `"${aiBtn}" (누르지 않음)`)
  else bad('채점 버튼', 'AI 채점 버튼을 찾지 못함')

  // 5) 새로고침하면 쓰던 글을 되살릴 길이 있는가. 원고지는 한 번에 가장 오래 쓰는
  //    화면이라 여기서 날리면 치명적이다. 자동으로 덮어쓰지는 않으므로(시험 화면과
  //    같은 방식) '이어서 쓰기'가 떠 있는지, 눌렀을 때 글이 돌아오는지를 본다.
  await page.reload({ waitUntil: 'load' })
  await page.waitForTimeout(2500)
  const resume = page.locator('button', { hasText: '이어서 쓰기' }).first()
  if (!await resume.count()) {
    bad('새로고침 복구', '새로고침하니 쓰던 글도, 되살릴 길도 없다')
  } else {
    await resume.click().catch(() => {})
    await page.waitForTimeout(1000)
    const back = await page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, '').includes('재택근무는'))
    if (back) ok('새로고침 복구', "'이어서 쓰기'로 글이 돌아온다")
    else bad('새로고침 복구', "'이어서 쓰기'를 눌렀는데 글이 안 돌아온다")
  }
} catch (e) {
  bad('검사 진행', String(e).slice(0, 160))
} finally {
  await browser.close()
  for (const t of ['manuscript_submissions', 'quiz_answers', 'quiz_sessions', 'device_usage']) {
    await admin(`/rest/v1/${t}?user_id=eq.${uid}`, { method: 'DELETE' }).catch(() => {})
  }
  await admin(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' }).catch(() => {})
}

console.log('\n원고지 화면 점검 (AI 채점은 누르지 않음)\n')
for (const r of results) console.log(`  ${r.ok ? '○' : '×'} ${r.n} — ${r.d}`)
const fails = results.filter((r) => !r.ok)
console.log(`\n통과 ${results.length - fails.length} / ${results.length}`)
if (fails.length) process.exitCode = 1
