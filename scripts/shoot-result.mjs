// 실전처럼 한 회차를 풀고 제출해 결과 화면까지 스크린샷.
// `node scripts/shoot-result.mjs <outDir> [examId] [--mobile]`
import { chromium } from '@playwright/test'
import { mkdirSync } from 'fs'
import path from 'path'

const outDir = process.argv[2] || 'screenshots'
const examId = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : '2025-1'
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

await page.goto(`${BASE}/cbt/${examId}`, { waitUntil: 'networkidle' })

// 모든 문항을 순회하며 객관식은 임의 선택, 서술형은 짧게 작성
const total = await page.locator('text=/^\\d+ \\/ \\d+$/').first().innerText().then(t => Number(t.split('/')[1]))
for (let i = 0; i < total; i++) {
  const choices = page.locator('button:has-text("①"), label:has-text("①")')
  const opts = page.locator('[data-choice], button').filter({ hasText: /^[①②③④⑤]/ })
  if (await opts.count()) {
    await opts.nth(i % Math.min(5, await opts.count())).click().catch(() => {})
  } else {
    const ta = page.locator('textarea').first()
    if (await ta.count()) await ta.fill('제시된 조건에 맞추어 간단히 작성한 답안입니다. 문어체로 서술하였습니다.').catch(() => {})
  }
  void choices
  const next = page.getByRole('button', { name: /다음/ }).or(page.locator('button:has-text("다음")'))
  if (i < total - 1 && await next.count()) await next.first().click().catch(() => {})
  await page.waitForTimeout(120)
}

await page.locator('button:has-text("제출하기")').first().click()
await page.waitForTimeout(400)
// 확인 모달의 제출 버튼
const confirm = page.locator('button:has-text("제출")').last()
await confirm.click().catch(() => {})
await page.waitForURL(/result/, { timeout: 60000 })
await page.waitForTimeout(1500)
await page.screenshot({ path: path.join(outDir, `result-${examId}${sfx}.png`), fullPage: true })
console.log('result url:', page.url())
await browser.close()
