// 관리자 화면의 명암비·휴대폰 사용성을 잰다.
//   npm run check:admin
//
// 여태 한 번도 재지 않은 마지막 구역이다. 공개 면·로그인 뒤 화면은 다 봤는데
// 정작 내가 매일 들어가는 곳은 빠져 있었다.
//
// 운영 서버에는 붙지 않는다. 관리자 권한은 ADMIN_EMAILS(서버 시작 시점 환경변수)로
// 정해지는데 그 값을 운영에서 바꿀 수도, 바꿔서도 안 된다. 그래서
//   임시 계정 생성 → 그 계정만 관리자로 지정한 로컬 운영빌드 기동 → 측정 → 정리
// 순서로 돈다.
//
// 화면 안의 단추는 어떤 것도 누르지 않는다. 회원 삭제·결제 복구처럼 되돌릴 수 없는
// 동작이 같은 화면에 있어서, 이 검사는 오직 읽고 재기만 한다.
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { chromium, devices } from 'playwright'
import {
  lum, ratio, contrastBar, browserCollectText, cheapContrast,
  browserAuditMobile, mobileProblemLines, dismissIntros,
} from './ui_audit_rules.mjs'

const ENV = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8').split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const SB = ENV.NEXT_PUBLIC_SUPABASE_URL
const SVC = ENV.SUPABASE_SERVICE_ROLE_KEY
const PORT = Number(process.env.ADMIN_UI_PORT ?? 3117)
const BASE = `http://127.0.0.1:${PORT}`

const admin = (p, init) => fetch(`${SB}${p}`, {
  ...init,
  headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
})

// ── 빌드가 소스보다 오래됐으면 다시 만든다 ───────────────────────────────
function newestMtime(dir) {
  let newest = 0
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    newest = Math.max(newest, e.isDirectory() ? newestMtime(p) : fs.statSync(p).mtimeMs)
  }
  return newest
}

const nextBin = path.join('node_modules', 'next', 'dist', 'bin', 'next')
function run(args, env) {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [nextBin, ...args], { stdio: 'inherit', env: { ...process.env, ...env } })
    p.on('exit', (c) => (c === 0 ? resolve() : reject(new Error(`next ${args[0]} 실패 (${c})`))))
  })
}

const buildId = '.next/BUILD_ID'
const stale = !fs.existsSync(buildId) || fs.statSync(buildId).mtimeMs < newestMtime('src')
if (stale) {
  console.log('빌드가 소스보다 오래됐습니다 — 다시 만듭니다.')
  await run(['build'])
}

// ── 임시 관리자 계정 ─────────────────────────────────────────────────────
const stamp = `${Date.now()}`
const acc = { email: `admincheck+${stamp}@kptest.cloud`, password: `Chk-${stamp}-aA1!` }
const mk = await admin('/auth/v1/admin/users', {
  method: 'POST',
  body: JSON.stringify({ email: acc.email, password: acc.password, email_confirm: true }),
})
if (!mk.ok) { console.error('검증용 계정을 만들지 못했습니다:', await mk.text()); process.exit(1) }
acc.uid = (await mk.json()).id

// 수정 화면은 실제 문제 하나가 있어야 열린다
const qres = await admin('/rest/v1/questions?select=id&limit=1')
const sampleQuestionId = (await qres.json().catch(() => []))?.[0]?.id ?? null

const ROUTES = [
  '/admin/login',
  '/admin',
  '/admin/members',
  '/admin/questions',
  '/admin/questions/new',
  ...(sampleQuestionId ? [`/admin/questions/${sampleQuestionId}/edit`] : []),
  '/admin/reports',
  '/admin/reviews',
  '/admin/payments',
  '/admin/traffic',
]

// ── 이 계정만 관리자인 로컬 서버 ─────────────────────────────────────────
// @next/env는 이미 process.env에 있는 키를 .env.local로 덮어쓰지 않는다 — 여기 값이 이긴다.
const server = spawn(process.execPath, [nextBin, 'start', '-p', String(PORT)], {
  stdio: 'ignore',
  env: { ...process.env, ADMIN_EMAILS: acc.email },
})

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`${BASE}/admin/login`)).ok) return true } catch { /* 아직 안 뜸 */ }
    await new Promise((r) => setTimeout(r, 1000))
  }
  return false
}

const contrastFails = []
const mobileProblems = []
let textChecked = 0

const browser = await chromium.launch()
try {
  if (!await waitForServer()) throw new Error(`로컬 서버가 ${PORT}포트에 뜨지 않았습니다`)

  // 실패하면 이유를 남긴다. 주소만 보고는 권한 문제인지 로그인 실패인지 구분이 안 돼서
  // 한참 헤맸다 — 마지막 주소와 화면에 뜬 글을 같이 던진다.
  async function login(page) {
    await page.goto(`${BASE}/admin/login`, { waitUntil: 'domcontentloaded' })
    await page.fill('input[type="email"]', acc.email)
    await page.fill('input[type="password"]', acc.password)
    await page.click('button[type="submit"]')
    for (let i = 0; i < 30; i++) {
      if (new URL(page.url()).pathname === '/admin') return null
      // 권한 없음으로 튕기면 ADMIN_EMAILS가 안 먹은 것 — 계속 기다려도 소용없다
      if (page.url().includes('error=forbidden')) break
      await page.waitForTimeout(1000)
    }
    const shown = await page.evaluate(() => document.body.innerText.slice(0, 200).replace(/\s+/g, ' ')).catch(() => '')
    return `${page.url()} — 화면: ${shown}`
  }

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

  const dfail = await login(page)
  if (dfail) throw new Error(`관리자로 들어가지 못했습니다 — ${dfail}`)

  // 화면마다 몇 개를 실제로 쟀는지 남긴다. 0이면 "통과"가 아니라 "안 봤다"인데
  // 합계만 찍으면 그 둘이 구분되지 않는다.
  for (const route of ROUTES) {
    const res = await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 40000 }).catch(() => null)
    if (!res || res.status() >= 400) { console.log(`  ${route}  열리지 않음 (${res?.status() ?? '이동 실패'})`); continue }
    await page.waitForTimeout(400)
    await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' }).catch(() => {})
    const items = await page.evaluate(browserCollectText).catch(() => null)
    if (!items) { console.log(`  ${route}  글자를 읽지 못함`); continue }
    console.log(`  ${route}  글자 ${items.length}개 (${new URL(page.url()).pathname})`)
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
        line: `${route}  ${real.toFixed(2)} (필요 ${bar})  ${it.fs}px${it.bold ? ' bold' : ''} <${it.tag}> "${it.text}"  글자 ${it.color} / 배경 rgb(${bgPx.join(',')})`,
      })
    }
  }
  await dctx.close()

  // ── 2) 휴대폰 폭에서 사용성 ─────────────────────────────────────────────
  const mctx = await browser.newContext({ ...devices['iPhone 13'] })
  await mctx.addInitScript(dismissIntros)
  const mpage = await mctx.newPage()
  const mfail = await login(mpage)
  if (mfail) throw new Error(`휴대폰 폭에서 관리자로 들어가지 못했습니다 — ${mfail}`)

  for (const route of ROUTES) {
    const res = await mpage.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 40000 }).catch(() => null)
    if (!res || res.status() >= 400) continue
    await mpage.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 800) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)) }
      window.scrollTo(0, 0)
    }).catch(() => {})
    await mpage.waitForTimeout(250)
    const r = await mpage.evaluate(browserAuditMobile).catch(() => null)
    if (!r) continue
    mobileProblems.push(...mobileProblemLines(route, r))
  }
  await mctx.close()
} finally {
  await browser.close()
  server.kill()
  for (const t of ['quiz_answers', 'quiz_sessions', 'device_usage', 'manuscript_submissions']) {
    await admin(`/rest/v1/${t}?user_id=eq.${acc.uid}`, { method: 'DELETE' }).catch(() => {})
  }
  await admin(`/auth/v1/admin/users/${acc.uid}`, { method: 'DELETE' }).catch(() => {})
  console.log('\n검증용 계정 1개 삭제 · 로컬 서버 종료')
}

const hardMobile = mobileProblems.filter((p) => p.hard)
const softMobile = mobileProblems.filter((p) => !p.hard)

console.log(`\n관리자 화면 점검 — ${ROUTES.length}면`)
console.log(`명암비: 텍스트 ${textChecked}개 중 기준 미달 ${contrastFails.length}건`)
console.log(`휴대폰: 기준 미달 ${hardMobile.length}건 · 권장 미달 ${softMobile.length}건`)

if (contrastFails.length) {
  console.log('\n[명암비]')
  for (const f of contrastFails.sort((a, b) => a.real - b.real)) console.log('  ' + f.line)
}
if (hardMobile.length) {
  console.log('\n[휴대폰 — 기준 미달]')
  for (const p of hardMobile) console.log('  ' + p.line)
}
if (softMobile.length) {
  console.log('\n[휴대폰 — 권장 미달]')
  for (const p of softMobile) console.log('  ' + p.line)
}

process.exit(contrastFails.length || hardMobile.length ? 1 : 0)
