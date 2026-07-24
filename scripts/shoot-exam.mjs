// 실제 시험 화면(CBT 플레이어)·결과 화면 스크린샷. `node scripts/shoot-exam.mjs <outDir> [--mobile]`
import { chromium } from '@playwright/test'
import { mkdirSync } from 'fs'
import path from 'path'

const outDir = process.argv[2] || 'screenshots'
const mobile = process.argv.includes('--mobile')
mkdirSync(outDir, { recursive: true })
const BASE = 'http://localhost:3000'
const sfx = mobile ? '-m' : ''

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 } })
const page = await ctx.newPage()

await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
await page.fill('input[type=email]', process.env.SHOOT_EMAIL)
await page.fill('input[type=password]', process.env.SHOOT_PASSWORD)
await page.click('button[type=submit]')
await page.waitForURL(/dashboard|\/$/, { timeout: 30000 }).catch(() => {})
await page.evaluate(() => localStorage.setItem('kptest_mode_intro_v1', '1'))

async function shoot(name) {
  await page.waitForTimeout(800)
  await page.screenshot({ path: path.join(outDir, `${name}${sfx}.png`), fullPage: true })
}

// 실용글쓰기 1회 (무료)
await page.goto(BASE + '/cbt/2025-1', { waitUntil: 'networkidle' })
await shoot('exam-silyong')

// KBS 1회 — 듣기 문항 포함. 모드 전환 후 진입
await page.goto(BASE + '/cbt/kbs-2025-1', { waitUntil: 'networkidle' })
await shoot('exam-kbs')

console.log('done', await page.title())
await browser.close()
