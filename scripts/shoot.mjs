// UI 점검용 스크린샷 러너. `node scripts/shoot.mjs <outDir> [--mobile]`
// 로그인 필요한 페이지는 SHOOT_EMAIL/SHOOT_PASSWORD 계정으로 먼저 로그인한다.
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'fs'
import path from 'path'

const outDir = process.argv[2] || 'screenshots'
const mobile = process.argv.includes('--mobile')
mkdirSync(outDir, { recursive: true })

const BASE = 'http://localhost:3000'
const PUBLIC_PAGES = [
  ['home', '/'],
  ['login', '/login'],
  ['signup', '/signup'],
  ['subscribe', '/subscribe'],
  ['exam-info', '/exam-info'],
  ['essay-guide', '/essay-guide'],
  ['spelling', '/spelling'],
  ['word-counter', '/word-counter'],
  ['business-writing', '/business-writing'],
  ['terms', '/terms'],
  ['refund', '/refund'],
]
const AUTH_PAGES = [
  ['dashboard', '/dashboard'],
  ['cbt', '/cbt'],
  ['practice', '/practice'],
  ['practice-types', '/practice/types'],
  ['practice-areas', '/practice/areas'],
  ['practice-area-0', '/practice/areas?a=0'],
  ['practice-multiple', '/practice/multiple'],
  ['practice-essay', '/practice/essay'],
  ['manuscript', '/manuscript'],
  ['review', '/review'],
  ['insights', '/insights'],
]

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({
  viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
  deviceScaleFactor: 1,
})
const page = await ctx.newPage()
const results = []
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })

async function shoot(label, url) {
  const suffix = mobile ? '-m' : ''
  try {
    const resp = await page.goto(BASE + url, { waitUntil: 'networkidle', timeout: 45000 })
    await page.waitForTimeout(600)
    const file = path.join(outDir, `${label}${suffix}.png`)
    await page.screenshot({ path: file, fullPage: true })
    // 가로 스크롤(모바일 레이아웃 깨짐) 검출
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    results.push({ label, url, status: resp?.status(), title: await page.title(), overflow, file })
  } catch (e) {
    results.push({ label, url, error: String(e).slice(0, 200) })
  }
}

const email = process.env.SHOOT_EMAIL
if (email) {
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
  await page.fill('input[type=email]', email)
  await page.fill('input[type=password]', process.env.SHOOT_PASSWORD)
  await page.click('button[type=submit]')
  await page.waitForURL(/dashboard|\/$/, { timeout: 30000 }).catch(() => {})
  // 첫 방문 모드 안내 팝업이 스크린샷을 가리므로 미리 본 것으로 처리
  await page.evaluate(() => localStorage.setItem('kptest_mode_intro_v1', '1'))
}

for (const [l, u] of email ? [...PUBLIC_PAGES, ...AUTH_PAGES] : PUBLIC_PAGES) await shoot(l, u)

writeFileSync(path.join(outDir, `report${mobile ? '-m' : ''}.json`), JSON.stringify({ results, errors }, null, 1))
console.log(JSON.stringify(results.map(r => [r.label, r.status ?? r.error, r.overflow]), null, 0))
console.log('console errors:', errors.length)
await browser.close()
