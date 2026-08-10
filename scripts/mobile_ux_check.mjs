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
  '/privacy', '/terms', '/refund', '/support',
  // 비밀번호 재설정 — 계정을 잃은 사람이 마지막으로 닿는 화면이라 여기가 깨지면 되돌릴 길이 없다
  '/forgot-password', '/reset-password',
]

const browser = await chromium.launch()
const ctx = await browser.newContext({ ...devices['iPhone 13'] })
await ctx.addInitScript(dismissIntros)
const page = await ctx.newPage()

const problems = []
for (const path of PAGES) {
  const res = await page.goto(BASE + path, { waitUntil: 'load' }).catch(() => null)
  if (!res || res.status() >= 400) { problems.push({ hard: true, line: `${path} 열지 못함` }); continue }
  // 전환이 도는 중간 프레임을 재면 하단 고정 바가 '화면 밖으로 나갔다'고 잘못 잡힌다.
  // (실제로 91% 지점에서 찍혀 75px 넘침으로 보고된 적이 있다)
  await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' }).catch(() => {})
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
  await page.waitForTimeout(900)
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
  // 같은 요소(푸터 링크 등)가 여러 면에 반복돼서 건수만 보면 실제보다 심각해 보인다.
  // 종류로 묶어야 '무엇이 몇 종류 남았는지'가 보인다.
  const byLabel = new Map()
  for (const p of soft) {
    const m = /미만 (\d+)x(\d+) "(.+)"$/.exec(p.line) ?? /(\d+(?:\.\d+)?)px 글자 "(.+)"$/.exec(p.line)
    const key = m ? (m.length === 4 ? `${m[3]} (${m[2]}px)` : `${m[2]} (${m[1]}px 글자)`) : p.line
    byLabel.set(key, (byLabel.get(key) ?? 0) + 1)
  }
  console.log(`\n[권장 미달 — 44px 손가락 크기] ${byLabel.size}종류 / ${soft.length}건`)
  for (const [k, n] of [...byLabel.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(3)}면  ${k}`)
  }
}
if (!problems.length) console.log('문제 0건')
if (hard.length) process.exitCode = 1
