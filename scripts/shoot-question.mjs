// 특정 문항 카드만 잘라 찍는다. `node scripts/shoot-question.mjs <examId> <문항번호> <out.png>`
import { chromium } from '@playwright/test'

const [examId, num, out] = process.argv.slice(2)
const browser = await chromium.launch({ headless: true })
// lg 이상이어야 좌측 문제 목록이 펼쳐진 상태로 보인다(모바일 그리드는 기본 접힘).
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()

await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' })
await page.fill('input[type=email]', process.env.SHOOT_EMAIL)
await page.fill('input[type=password]', process.env.SHOOT_PASSWORD)
await page.click('button[type=submit]')
await page.waitForURL(/dashboard|\/$/, { timeout: 30000 }).catch(() => {})
await page.evaluate(() => localStorage.setItem('kptest_mode_intro_v1', '1'))

await page.goto(`http://localhost:3000/cbt/${examId}`, { waitUntil: 'networkidle' })
await page.locator('button').filter({ hasText: new RegExp(`^${num}$`) }).first().click()
await page.waitForTimeout(600)
await page.locator('div').filter({ hasText: new RegExp(`^${num}번$`) }).last()
  .locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]')
  .screenshot({ path: out })
console.log('ok', out)
await browser.close()
