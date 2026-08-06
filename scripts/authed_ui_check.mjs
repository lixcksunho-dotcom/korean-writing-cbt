// 로그인해야 보이는 화면의 명암비·휴대폰 사용성을 잰다.
//   npm run check:ui-authed
//
// check:contrast / check:mobile은 공개 면만 본다. 정작 돈을 낸 사람이 오래 머무는 곳은
// 로그인 뒤 화면(대시보드·시험·연습·첨삭)인데 그쪽은 한 번도 재지 않고 있었다.
//
// 검증용 계정을 만들고 → 두 모드(실글·KBS)로 돌고 → 계정을 지운다.
// 판정 규칙은 scripts/ui_audit_rules.mjs — 공개 면 검사와 같은 기준.
import fs from 'node:fs'
import { chromium, devices } from 'playwright'
import {
  lum, ratio, contrastBar, browserCollectText, cheapContrast,
  browserAuditMobile, mobileProblemLines, dismissIntros,
  browserAuditGraphics, graphicsProblemLines,
} from './ui_audit_rules.mjs'

const ENV = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8').split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const SB = ENV.NEXT_PUBLIC_SUPABASE_URL
const SVC = ENV.SUPABASE_SERVICE_ROLE_KEY
const BASE = process.env.AUTHED_UI_BASE ?? 'https://kptest.cloud'

const ROUTES = [
  '/dashboard', '/insights', '/cbt', '/manuscript', '/manuscript/history',
  '/practice', '/practice/areas', '/practice/bookmarks', '/practice/essay',
  '/practice/multiple', '/practice/refine', '/practice/report', '/practice/types',
  '/practice/wrong', '/practice/kbs-types', '/subscribe', '/subscribe/history',
]

const admin = (p, init) => fetch(`${SB}${p}`, {
  ...init,
  headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
})

// 검사 구간마다 계정을 따로 쓴다. 한 계정으로 두 브라우저에서 잇달아 로그인하면
// 기기 등록 제한(계정 공유 방지)에 걸려 두 번째가 통과하지 못한다.
const accounts = []
async function makeAccount(tag) {
  const stamp = `${Date.now()}${tag}`
  const email = `uicheck+${stamp}@kptest.cloud`
  const password = `Chk-${stamp}-aA1!`
  const mk = await admin('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email, password, email_confirm: true }),
  })
  if (!mk.ok) { console.error('검증용 계정을 만들지 못했습니다:', await mk.text()); process.exit(1) }
  const acc = { email, password, uid: (await mk.json()).id }
  accounts.push(acc)
  return acc
}

const contrastFails = []
const graphicFails = []
let graphicsChecked = 0
const mobileProblems = []
let textChecked = 0

const browser = await chromium.launch()
try {
  // ── 1) 데스크톱 폭에서 명암비 ───────────────────────────────────────────
  const dctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  await dctx.addInitScript(dismissIntros)
  const page = await dctx.newPage()
  const decoder = await browser.newPage()

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

  // 페이월·권한 때문에 곧바로 다른 곳으로 넘기는 화면이 있다. 이동이 멎기 전에 재면
  // 실행 컨텍스트가 사라져 통째로 죽는다 — 주소가 안정될 때까지 기다린다.
  async function settle(p) {
    let last = p.url()
    for (let i = 0; i < 8; i++) {
      await p.waitForTimeout(350)
      const now = p.url()
      if (now === last) return now
      last = now
    }
    return last
  }

  // 배포 직후나 인증 레이트리밋에 걸리면 한 번에 안 들어간다 — 몇 번 다시 해 본다.
  async function login(p, acc) {
    for (let attempt = 0; attempt < 3; attempt++) {
      await p.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
      await p.fill('input[type="email"]', acc.email)
      await p.fill('input[type="password"]', acc.password)
      await p.click('button[type="submit"]')
      for (let i = 0; i < 30; i++) {
        if (!new URL(p.url()).pathname.includes('/login')) return true
        await p.waitForTimeout(1000)
      }
      const msg = await p.evaluate(() => document.body.innerText.slice(0, 120).replace(/\s+/g, ' ')).catch(() => '')
      console.log(`  로그인 재시도 ${attempt + 1}/3 — 화면: ${msg}`)
      await p.waitForTimeout(5000)
    }
    return false
  }

  if (!await login(page, await makeAccount('d'))) throw new Error('로그인이 되지 않음')

  for (const mode of ['silyong', 'kbs']) {
    await dctx.addCookies([{ name: 'kptest_mode', value: mode, domain: new URL(BASE).hostname, path: '/' }])
    for (const route of ROUTES) {
      const res = await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 40000 }).catch(() => null)
      if (!res || res.status() >= 400) continue
      await settle(page)
      await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' }).catch(() => {})
      const gitems = await page.evaluate(browserAuditGraphics).catch(() => [])
      graphicsChecked += gitems.length
      graphicFails.push(...graphicsProblemLines(`${mode} ${route}`, gitems))
      const items = await page.evaluate(browserCollectText).catch(() => null)
      if (!items) continue
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
          line: `${mode} ${route}  ${real.toFixed(2)} (필요 ${bar})  ${it.fs}px${it.bold ? ' bold' : ''} <${it.tag}> "${it.text}"  글자 ${it.color} / 배경 rgb(${bgPx.join(',')})`,
        })
      }
    }
  }
  await dctx.close()

  // ── 2) 휴대폰 폭에서 사용성 ─────────────────────────────────────────────
  const mctx = await browser.newContext({ ...devices['iPhone 13'] })
  await mctx.addInitScript(dismissIntros)
  const mpage = await mctx.newPage()
  if (!await login(mpage, await makeAccount('m'))) throw new Error('휴대폰 폭에서 로그인이 되지 않음')

  for (const mode of ['silyong', 'kbs']) {
    await mctx.addCookies([{ name: 'kptest_mode', value: mode, domain: new URL(BASE).hostname, path: '/' }])
    for (const route of ROUTES) {
      const res = await mpage.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 40000 }).catch(() => null)
      if (!res || res.status() >= 400) continue
      await settle(mpage)
      await mpage.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 800) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)) }
        window.scrollTo(0, 0)
      }).catch(() => {})
      await mpage.waitForTimeout(250)
      const r = await mpage.evaluate(browserAuditMobile).catch(() => null)
      if (!r) continue
      mobileProblems.push(...mobileProblemLines(`${mode} ${route}`, r))
    }
  }
  await mctx.close()
} finally {
  await browser.close()
  // 뒷정리 — 남기면 관리자 지표에 섞인다
  for (const acc of accounts) {
    for (const t of ['quiz_answers', 'quiz_sessions', 'device_usage', 'manuscript_submissions']) {
      await admin(`/rest/v1/${t}?user_id=eq.${acc.uid}`, { method: 'DELETE' }).catch(() => {})
    }
    await admin(`/auth/v1/admin/users/${acc.uid}`, { method: 'DELETE' }).catch(() => {})
  }
  console.log(`\n검증용 계정 ${accounts.length}개 삭제`)
}

const hardMobile = mobileProblems.filter((p) => p.hard)
const softMobile = mobileProblems.filter((p) => !p.hard)

console.log(`\n로그인 뒤 화면 점검 — ${ROUTES.length}면 × 2모드`)
console.log(`명암비: 텍스트 ${textChecked}개 중 기준 미달 ${contrastFails.length}건`)
console.log(`아이콘·안내글: ${graphicsChecked}개 중 기준 미달 ${graphicFails.length}건`)
console.log(`휴대폰: 기준 미달 ${hardMobile.length}건 · 권장 미달 ${softMobile.length}건`)

if (contrastFails.length) {
  console.log('\n[명암비 기준 미달]')
  contrastFails.sort((a, b) => a.real - b.real)
  for (const f of contrastFails) console.log('  ' + f.line)
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
  console.log(`\n[휴대폰 권장 미달 — 44px] ${softMobile.length}건 중 앞 20건`)
  for (const p of softMobile.slice(0, 20)) console.log('  ' + p.line)
}
if (contrastFails.length || graphicFails.length || hardMobile.length) process.exitCode = 1
