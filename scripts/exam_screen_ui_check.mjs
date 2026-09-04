// 시험을 푸는 화면 자체의 명암비·휴대폰 사용성을 잰다.
//   npm run check:exam-ui
//
// 왜 필요한가: 사람이 이 서비스에서 가장 오래 머무는 화면인데(실글 120분·KBS 90분)
// 어떤 UI 검사에도 들어 있지 않았다. check:ui-authed는 회차 목록(/cbt)까지만 보고,
// 정작 문제를 푸는 /cbt/2025-1은 아무도 재지 않았다. 시험을 시작한 32명 중 18명만
// 끝냈는데, 화면이 읽기 힘들거나 손가락으로 누르기 어려운지조차 모르고 있었다.
//
// 문항 종류마다 화면이 완전히 다르다 — 객관식(보기 5개), 서술형(입력칸), 원고지(20칸
// 격자). 한 종류만 보면 나머지는 안 본 것이다. 휴대폰 폭의 '문제 목록'으로 옮겨 다닌다.
//
// 답은 고르지 않고 제출도 하지 않는다. 읽고 재기만 한다.
import fs from 'node:fs'
import { chromium, devices } from 'playwright'
import {
  lum, ratio, contrastBar, browserCollectText, cheapContrast,
  browserAuditMobile, mobileProblemLines, dismissIntros,
  browserAuditGraphics, graphicsProblemLines,
} from './ui_audit_rules.mjs'
import { assertFreshLocalServer } from './stale_server_guard.mjs'

const BASE = process.env.EXAM_UI_BASE ?? 'https://kptest.cloud'
const ROUND = process.env.EXAM_UI_ROUND ?? '2025-1'
// 시험마다 문항 구성이 다르다 — 실글은 객관식+서술형+원고지, KBS는 전부 객관식(듣기 포함).
// 어느 쪽을 보는지는 쿠키가 정한다.
const MODE = process.env.EXAM_UI_MODE ?? 'silyong'
// 시험을 정하는 건 쿠키가 아니라 주소다 — parseExamId가 'kbs-2025-1'처럼 앞머리를 읽고,
// 앞머리가 없으면 실글로 본다. 쿠키만 바꿔 놓고 KBS를 봤다고 착각했다.
const EXAM_PATH = MODE === 'silyong' ? ROUND : `${MODE}-${ROUND}`

const ENV = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8').split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const admin = (p, init) => fetch(`${ENV.NEXT_PUBLIC_SUPABASE_URL}${p}`, {
  ...init,
  headers: {
    apikey: ENV.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${ENV.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    ...(init?.headers ?? {}),
  },
})

const contrastFails = []
const graphicFails = []
const mobileProblems = []
const unseen = []
let textChecked = 0
let graphicsChecked = 0

const stamp = String(Date.now())
const DAY = 86400_000

const fresh = await assertFreshLocalServer(BASE)
// 서버가 안 떠 있으면 건너뛴다 — 이건 지역 빌드를 보는 검사다. 실패로 세면
// 묶음 검사에서 늘 빨간불이 되고, 그러면 아무도 안 돌려서 아무것도 못 지킨다.
if (fresh.running === false) {
  console.log(`  · ${fresh.reason}`)
  console.log(`    이 검사는 지역 빌드를 봅니다: npm run build && npx next start -p ${new URL(BASE).port} 뒤에 다시 돌리세요.`)
  process.exitCode = 0
  process.exit(0)
}
console.log(fresh.checked ? `  서버 빌드 확인됨 (${fresh.buildId})` : `  서버 빌드 비교 안 함 — ${fresh.reason}`)

const browser = await chromium.launch()
let uid = null
try {
  const email = `uicheck+examui${stamp}@kptest.cloud`
  const password = `Chk-${stamp}-aA1!`
  const mk = await admin('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email, password, email_confirm: true }) })
  if (!mk.ok) throw new Error(`계정 생성 실패: ${await mk.text()}`)
  uid = (await mk.json()).id
  // 유료로 둔다 — '저장하고 나가기'처럼 유료에게만 보이는 조작이 화면에 같이 있다.
  await admin('/rest/v1/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      user_id: uid, payment_key: `examui-${stamp}`, order_id: `examui-${stamp}`,
      amount: 0, status: 'active',
      started_at: new Date(Date.now() - DAY).toISOString(),
      expires_at: new Date(Date.now() + 29 * DAY).toISOString(),
    }),
  })

  async function login(page) {
    for (let a = 0; a < 3; a++) {
      await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
      await page.fill('input[type="email"]', email)
      await page.fill('input[type="password"]', password)
      await page.click('button[type="submit"]')
      for (let i = 0; i < 30; i++) {
        if (!new URL(page.url()).pathname.includes('/login')) return true
        await page.waitForTimeout(1000)
      }
      await page.waitForTimeout(4000)
    }
    return false
  }

  /** 휴대폰 폭의 '문제 목록'을 펼쳐 라벨이 label인 문항으로 간다. */
  async function goToQuestion(page, label) {
    const toggle = page.locator('button', { hasText: /문제 목록/ }).first()
    if (await toggle.count() === 0) return false
    if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click()
    await page.waitForTimeout(300)
    // 문항 목록은 DOM에 두 벌 있다 — 넓은 화면의 옆 목록과 좁은 화면의 접힌 목록.
    // 폭에 따라 한쪽만 보이므로, 안 보이는 쪽을 집으면 클릭이 영원히 기다린다.
    const btn = page.locator('button:visible').filter({ hasText: new RegExp(`^${label}$`) }).first()
    if (await btn.count() === 0) return false
    await btn.click()
    await page.waitForTimeout(700)
    // 목록을 다시 접는다 — 펼친 상태로 재면 목록이 화면을 덮어 겹침으로 잡힌다
    if ((await toggle.getAttribute('aria-expanded')) === 'true') await toggle.click()
    await page.waitForTimeout(300)
    return true
  }

  // ── 휴대폰 폭: 사용성 ───────────────────────────────────────────────────
  const mctx = await browser.newContext({ ...devices['iPhone 13'] })
  await mctx.addCookies([{ name: 'kptest_mode', value: MODE, domain: new URL(BASE).hostname, path: '/' }])
  await mctx.addInitScript(dismissIntros)
  const mpage = await mctx.newPage()
  if (!await login(mpage)) throw new Error('로그인이 되지 않음')

  const res = await mpage.goto(`${BASE}/cbt/${EXAM_PATH}`, { waitUntil: 'load', timeout: 60000 }).catch(() => null)
  if (!res || res.status() >= 400) throw new Error(`시험 화면을 열지 못함 (${res?.status() ?? '이동 실패'})`)
  await mpage.locator('button').filter({ hasText: /^[①②③④⑤]/ }).first().waitFor({ timeout: 30000 })
  await mpage.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' }).catch(() => {})

  // 서술형이 몇 개인지 목록에서 읽는다 — 마지막 것이 배점이 큰 원고지 문항이다
  await mpage.locator('button', { hasText: /문제 목록/ }).first().click()
  await mpage.waitForTimeout(400)
  // 목록이 두 벌이라 라벨도 두 번 나온다 — 중복을 없앤 뒤 번호순으로 세운다.
  const essayLabels = await mpage.evaluate(() => {
    const seen = [...new Set(
      [...document.querySelectorAll('button')]
        .map((b) => (b.textContent ?? '').trim())
        .filter((t) => /^서\d+$/.test(t))
    )]
    return seen.sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))
  })
  await mpage.locator('button', { hasText: /문제 목록/ }).first().click()
  await mpage.waitForTimeout(300)

  const spots = [{ name: '객관식', label: null }]
  if (essayLabels.length > 0) {
    spots.push({ name: '서술형', label: essayLabels[0] })
    // 배점이 큰 마지막 서술형이 원고지 문항이다. 서술형이 하나뿐이면 같은 곳을 두 번
    // 재게 되므로 그때는 넣지 않는다.
    if (essayLabels.length > 1) spots.push({ name: '원고지', label: essayLabels[essayLabels.length - 1] })
  } else {
    console.log(`  이 회차(${MODE} ${ROUND})엔 서술형이 없다 — 객관식만 본다`)
  }

  for (const spot of spots) {
    if (spot.label && !(await goToQuestion(mpage, spot.label))) {
      unseen.push(`휴대폰 ${spot.name} — 문항으로 이동하지 못함(${spot.label})`)
      continue
    }
    await mpage.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)) }
      window.scrollTo(0, 0)
    }).catch(() => {})
    await mpage.waitForTimeout(250)
    const r = await mpage.evaluate(browserAuditMobile).catch(() => null)
    if (!r) { unseen.push(`휴대폰 ${spot.name} — 화면을 읽지 못함`); continue }
    mobileProblems.push(...mobileProblemLines(`휴대폰 ${spot.name}`, r))
    console.log(`  휴대폰 ${spot.name} 측정됨`)
  }
  await mctx.close()

  // ── 데스크톱 폭: 명암비·아이콘 ──────────────────────────────────────────
  const dctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  await dctx.addCookies([{ name: 'kptest_mode', value: MODE, domain: new URL(BASE).hostname, path: '/' }])
  await dctx.addInitScript(dismissIntros)
  const page = await dctx.newPage()
  const decoder = await browser.newPage()
  if (!await login(page)) throw new Error('데스크톱 폭에서 로그인이 되지 않음')

  async function bgMedian(el) {
    await el.evaluate((e) => { e.dataset.oc = e.style.color; e.style.color = 'transparent' })
    let px = null
    try {
      const buf = await el.screenshot({ timeout: 4000 })
      px = await decoder.evaluate(async (b64) => {
        const img = new Image()
        img.src = 'data:image/png;base64,' + b64
        await img.decode()
        const cv = document.createElement('canvas')
        cv.width = img.width; cv.height = img.height
        cv.getContext('2d').drawImage(img, 0, 0)
        const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data
        const out = []
        for (let i = 0; i < d.length; i += 4) out.push([d[i], d[i + 1], d[i + 2]])
        return out
      }, buf.toString('base64'))
    } catch { /* 화면 밖이거나 가려진 요소 */ }
    await el.evaluate((e) => { e.style.color = e.dataset.oc || '' }).catch(() => {})
    if (!px?.length) return null
    const mid = (k) => { const v = px.map((p) => p[k]).sort((a, b) => a - b); return v[Math.floor(v.length / 2)] }
    return [mid(0), mid(1), mid(2)]
  }

  const dres = await page.goto(`${BASE}/cbt/${EXAM_PATH}`, { waitUntil: 'load', timeout: 60000 }).catch(() => null)
  if (!dres || dres.status() >= 400) throw new Error(`데스크톱 폭에서 시험 화면을 열지 못함 (${dres?.status() ?? '이동 실패'})`)
  await page.locator('button').filter({ hasText: /^[①②③④⑤]/ }).first().waitFor({ timeout: 30000 })
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' }).catch(() => {})

  // 데스크톱은 옆에 문항 목록이 늘 보인다 — 번호 단추를 바로 누른다
  for (const spot of spots) {
    if (spot.label) {
      // 문항 목록이 두 벌 있다 — 넓은 화면의 옆 목록과, 좁은 화면용 접힌 목록(lg:hidden).
      // 그냥 고르면 숨어 있는 쪽을 집어 클릭이 영원히 기다린다.
      const btn = page.locator('button:visible').filter({ hasText: new RegExp(`^${spot.label}$`) }).first()
      if (await btn.count() === 0) { unseen.push(`${spot.name} — 문항 단추를 찾지 못함(${spot.label})`); continue }
      await btn.click()
      await page.waitForTimeout(700)
    }
    const gitems = await page.evaluate(browserAuditGraphics).catch(() => [])
    graphicsChecked += gitems.length
    graphicFails.push(...graphicsProblemLines(spot.name, gitems))

    const items = await page.evaluate(browserCollectText).catch(() => null)
    if (!items) { unseen.push(`${spot.name} — 글자를 읽지 못함`); continue }
    const seen = new Set()
    for (const it of items) {
      const key = it.text + it.color + it.bg.raw
      if (seen.has(key)) continue
      seen.add(key)
      textChecked++
      const cheap = cheapContrast(it)
      if (!cheap) continue
      const bar = contrastBar(it.fs, it.bold)
      if (cheap.worst >= bar) continue
      const el = page.locator(`[data-cc="${it.id}"]`)
      await el.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {})
      await page.waitForTimeout(120)
      const bgPx = await bgMedian(el)
      if (!bgPx) continue
      const real = ratio(cheap.fl, lum(bgPx))
      if (real >= bar) continue
      contrastFails.push({
        real,
        line: `${spot.name}  ${real.toFixed(2)} (필요 ${bar})  ${it.fs}px${it.bold ? ' bold' : ''} <${it.tag}> "${it.text}"  글자 ${it.color} / 배경 rgb(${bgPx.join(',')})`,
      })
    }
    console.log(`  ${spot.name} 글자 ${items.length}개 측정됨`)
  }
  await dctx.close()
} catch (e) {
  unseen.push(`실행 — ${e instanceof Error ? e.message : String(e)}`)
} finally {
  await browser.close()
  if (uid) {
    for (const t of ['quiz_answers', 'quiz_sessions', 'device_usage', 'subscriptions']) {
      await admin(`/rest/v1/${t}?user_id=eq.${uid}`, { method: 'DELETE' }).catch(() => {})
    }
    await admin(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' }).catch(() => {})
    console.log('\n검증용 계정 1개 삭제')
  }
}

const hardMobile = mobileProblems.filter((p) => p.hard)
const softMobile = mobileProblems.filter((p) => !p.hard)

console.log(`\n시험 화면 점검 — ${MODE} ${ROUND} (/cbt/${EXAM_PATH})`)
console.log(`명암비: 텍스트 ${textChecked}개 중 기준 미달 ${contrastFails.length}건`)
console.log(`아이콘·안내글: ${graphicsChecked}개 중 기준 미달 ${graphicFails.length}건`)
console.log(`휴대폰: 기준 미달 ${hardMobile.length}건 · 권장 미달 ${softMobile.length}건`)

if (contrastFails.length) {
  console.log('\n[명암비 기준 미달]')
  for (const f of contrastFails.sort((a, b) => a.real - b.real)) console.log('  ' + f.line)
}
if (graphicFails.length) {
  console.log('\n[아이콘·안내글 기준 미달]')
  for (const l of graphicFails) console.log('  ' + l)
}
if (hardMobile.length) {
  console.log('\n[휴대폰 기준 미달]')
  for (const p of hardMobile) console.log('  ' + p.line)
}
if (softMobile.length) {
  console.log(`\n[휴대폰 권장 미달 — 44px] ${softMobile.length}건`)
  for (const p of softMobile.slice(0, 20)) console.log('  ' + p.line)
}
if (unseen.length) {
  console.log('\n[보지 못한 것 — 통과가 아니다]')
  for (const l of unseen) console.log('  ' + l)
}

if (contrastFails.length || graphicFails.length || hardMobile.length || unseen.length) process.exitCode = 1
