// 블로그 글 본문이 실제로 읽히는 상태인지 본다.
//   npm run check:blog-render
//
// 글 본문은 발행 파이프라인이 만든 HTML을 그대로 넣는다(dangerouslySetInnerHTML).
// 인라인 style이 붙은 강조박스·표가 섞여 들어오므로, 사이트 토큰만 지켜서는 알 수 없다.
// 공개 면 검사(check:contrast/check:mobile)는 글 목록만 보고 개별 글은 안 본다.
//
// 표본을 고정 순서로 뽑는다 — 매번 다른 글을 보면 통과·실패가 흔들려 못 믿는다.
import fs from 'node:fs'
import path from 'node:path'
import { chromium, devices } from 'playwright'
import {
  lum, ratio, contrastBar, browserCollectText, cheapContrast,
  browserAuditMobile, mobileProblemLines, dismissIntros,
} from './ui_audit_rules.mjs'

const BASE = process.env.BLOG_RENDER_BASE ?? 'https://kptest.cloud'
const SAMPLE = Number(process.env.BLOG_RENDER_SAMPLE ?? 10)

const dir = path.join(process.cwd(), 'src', 'content', 'blog')
const slugs = fs.readdirSync(dir).filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')).slug)
  .sort()
// 앞뒤로 치우치지 않게 고르게 훑는다
const step = Math.max(1, Math.floor(slugs.length / SAMPLE))
const picked = slugs.filter((_, i) => i % step === 0).slice(0, SAMPLE)

const browser = await chromium.launch()
const contrastFails = []
const mobileProblems = []
let checked = 0

// ── 1) 데스크톱 폭에서 명암비 ─────────────────────────────────────────────
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

for (const slug of picked) {
  const url = `${BASE}/blog/${encodeURIComponent(slug)}`
  const res = await page.goto(url, { waitUntil: 'load' }).catch(() => null)
  if (!res || res.status() >= 400) { contrastFails.push({ real: 0, line: `${slug} — 열지 못함(${res?.status() ?? '응답 없음'})` }); continue }
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' }).catch(() => {})
  await page.waitForTimeout(500)
  const items = await page.evaluate(browserCollectText).catch(() => [])
  const seen = new Set()
  for (const it of items) {
    const key = it.text + it.color + it.bg.raw
    if (seen.has(key)) continue
    seen.add(key)
    checked++
    const cheap = cheapContrast(it)
    if (!cheap) continue
    const bar = contrastBar(it.fs, it.bold)
    if (cheap.worst >= bar) continue
    const el = page.locator(`[data-cc="${it.id}"]`)
    await el.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(100)
    const bgPx = await bgMedian(el)
    if (!bgPx) continue
    const real = ratio(cheap.fl, lum(bgPx))
    if (real >= bar) continue
    contrastFails.push({
      real,
      line: `${slug}  ${real.toFixed(2)} (필요 ${bar})  ${it.fs}px${it.bold ? ' bold' : ''} <${it.tag}> "${it.text}"  글자 ${it.color} / 배경 rgb(${bgPx.join(',')})`,
    })
  }
}
await dctx.close()

// ── 2) 휴대폰 폭에서 사용성(표가 화면 밖으로 밀리는지 등) ──────────────────
const mctx = await browser.newContext({ ...devices['iPhone 13'] })
await mctx.addInitScript(dismissIntros)
const mpage = await mctx.newPage()
for (const slug of picked) {
  const res = await mpage.goto(`${BASE}/blog/${encodeURIComponent(slug)}`, { waitUntil: 'load' }).catch(() => null)
  if (!res || res.status() >= 400) continue
  await mpage.waitForTimeout(400)
  await mpage.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 800) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 50)) }
    window.scrollTo(0, 0)
  }).catch(() => {})
  await mpage.waitForTimeout(200)
  const r = await mpage.evaluate(browserAuditMobile).catch(() => null)
  if (r) mobileProblems.push(...mobileProblemLines(slug, r))
}
await mctx.close()
await browser.close()

const hardMobile = mobileProblems.filter((p) => p.hard)
const softMobile = mobileProblems.filter((p) => !p.hard)

console.log(`\n블로그 글 본문 점검 — ${picked.length}편(전체 ${slugs.length}편에서 고르게)`)
console.log(`명암비: 텍스트 ${checked}개 중 기준 미달 ${contrastFails.length}건`)
console.log(`휴대폰: 기준 미달 ${hardMobile.length}건 · 권장 미달 ${softMobile.length}건`)

if (contrastFails.length) {
  console.log('\n[명암비 기준 미달]')
  contrastFails.sort((a, b) => a.real - b.real)
  for (const f of contrastFails) console.log('  ' + f.line)
}
if (hardMobile.length) {
  console.log('\n[휴대폰 기준 미달]')
  for (const p of hardMobile) console.log('  ' + p.line)
}
if (contrastFails.length || hardMobile.length) process.exitCode = 1
