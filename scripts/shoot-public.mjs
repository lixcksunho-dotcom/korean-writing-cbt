// 로그인 불필요한 공개 페이지 스크린샷. `node scripts/shoot-public.mjs <outDir> [--mobile]`
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'fs'
import path from 'path'

const outDir = process.argv[2] || 'screenshots'
const mobile = process.argv.includes('--mobile')
mkdirSync(outDir, { recursive: true })
const BASE = 'http://localhost:3000'
const sfx = mobile ? '-m' : ''
const PAGES = [
  ['kbs-seo', '/kbs-korean'],
  ['exam-info', '/exam-info'],
  ['spelling', '/spelling'],
  ['essay-guide', '/essay-guide'],
  ['business-writing', '/business-writing'],
  ['word-counter', '/word-counter'],
]

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 } })
const page = await ctx.newPage()
const results = []
for (const [label, url] of PAGES) {
  const r = await page.goto(BASE + url, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(400)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  await page.screenshot({ path: path.join(outDir, `${label}${sfx}.png`), fullPage: true })
  results.push([label, r?.status(), overflow])
}
writeFileSync(path.join(outDir, `public-report${sfx}.json`), JSON.stringify(results))
console.log(JSON.stringify(results))
await browser.close()
