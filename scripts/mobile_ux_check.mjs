// 휴대폰 화면에서 실제로 쓸 수 있는 상태인지 잰다(로그인 없이 보이는 면).
//   npm run check:mobile
//   MOBILE_BASE=http://localhost:3000 npm run check:mobile
//
// 데스크톱 브라우저로 보면 멀쩡한데 휴대폰에서만 깨지는 것들이 있다. 이 시험을 준비하는
// 사람 대부분이 휴대폰으로 들어오므로, 여기서 깨지면 데스크톱이 아무리 멀쩡해도 소용없다.
// 판정 규칙은 scripts/ui_audit_rules.mjs — 로그인 뒤 화면 검사와 같은 기준을 쓴다.
import { chromium, devices } from 'playwright'
import { browserAuditMobile, mobileProblemLines, dismissIntros } from './ui_audit_rules.mjs'

const BASE = process.env.MOBILE_BASE ?? 'https://kptest.cloud'
const PAGES = [
  '/', '/blog', '/subscribe', '/login', '/signup', '/spelling', '/idioms',
  '/manuscript-guide', '/essay-guide', '/word-counter', '/exam-info',
  '/kbs-korean', '/exam-compare', '/guides', '/proverbs', '/expressions',
  '/refined-words', '/honorifics', '/standard-words', '/loanword-spelling',
]

const browser = await chromium.launch()
const ctx = await browser.newContext({ ...devices['iPhone 13'] })
await ctx.addInitScript(dismissIntros)
const page = await ctx.newPage()

const problems = []
for (const path of PAGES) {
  const res = await page.goto(BASE + path, { waitUntil: 'load' }).catch(() => null)
  if (!res || res.status() >= 400) { problems.push({ hard: true, line: `${path} 열지 못함` }); continue }
  await page.waitForTimeout(500)
  // 화면 아래쪽까지 렌더시킨 뒤 재야 지연 로딩된 것도 포함된다
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 800) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)) }
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(300)
  const r = await page.evaluate(browserAuditMobile)

  // 하단 고정 CTA는 스크롤한 뒤에야 올라온다 — 겹침은 그 상태에서 다시 봐야 보인다.
  await page.evaluate(() => window.scrollTo(0, 1200))
  await page.waitForTimeout(700)
  const scrolled = await page.evaluate(browserAuditMobile)
  r.covered.push(...scrolled.covered)
  r.escaped.push(...scrolled.escaped)
  await page.evaluate(() => window.scrollTo(0, 0))

  problems.push(...mobileProblemLines(path, r))
}
await browser.close()

const hard = problems.filter((p) => p.hard)
const soft = problems.filter((p) => !p.hard)
console.log(`\n휴대폰 화면 점검 — ${PAGES.length}면 (iPhone 13)`)
console.log(`기준 미달 ${hard.length}건 · 권장 미달 ${soft.length}건\n`)
if (hard.length) {
  console.log('[기준 미달]')
  for (const p of hard) console.log('  ' + p.line)
}
if (soft.length) {
  console.log('\n[권장 미달 — 44px 손가락 크기]')
  for (const p of soft) console.log('  ' + p.line)
}
if (!problems.length) console.log('문제 0건')
if (hard.length) process.exitCode = 1
