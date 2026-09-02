// 로그인 없이 문제를 풀 수 있는지 본다.
//   npm run check:trial
//
// 왜 필요한가: /cbt도 /practice도 로그인 필수라 검색으로 들어온 사람이 문제를 한 번도
// 못 보고 돌아갔다. 이 화면은 그 구멍을 메우려고 만든 것이므로 **로그아웃 상태에서**
// 끝까지 도는지가 전부다. 로그인이 끼어들면 만든 이유가 사라진다.

import { chromium } from 'playwright'

const BASE = process.env.TRIAL_BASE ?? 'http://localhost:3399'
let pass = 0, fail = 0
const ok = (n, d = '') => { pass++; console.log(`  ○ ${n}${d ? ` — ${d}` : ''}`) }
const bad = (n, d = '') => { fail++; console.log(`  × ${n}${d ? ` — ${d}` : ''}`) }

console.log(`\n가입 없이 풀어보기 — ${BASE}\n`)

const browser = await chromium.launch()
try {
  const ctx = await browser.newContext()   // 쿠키 없음 = 완전한 비회원
  const page = await ctx.newPage()

  const res = await page.goto(`${BASE}/try`, { waitUntil: 'networkidle', timeout: 60000 })
  if (res?.status() === 200 && new URL(page.url()).pathname === '/try') ok('비회원이 열 수 있다', '로그인으로 안 튕긴다')
  else bad('접근', `${res?.status()} → ${new URL(page.url()).pathname}`)

  const cards = page.locator('ol > li')
  const count = await cards.count()
  if (count === 5) ok('문항 5개가 나온다')
  else bad('문항 수', `${count}개`)

  const body = await page.evaluate(() => document.body.innerText)
  if (!/\[듣기\]/.test(body)) ok('KBS 듣기 문항이 섞이지 않는다', 'program 필터가 걸려 있다')
  else bad('문항 섞임', '[듣기] 문항이 보인다 — program 필터가 빠졌다')

  // 다 고르기 전에는 채점이 막혀야 한다 — 안 풀고 답만 보는 걸 막는다
  const gradeBtn = page.getByRole('button', { name: /채점|더 고르면/ })
  if (await gradeBtn.isDisabled()) ok('다 고르기 전에는 채점이 막힌다')
  else bad('채점 잠금', '아무것도 안 골랐는데 채점된다')

  for (let i = 0; i < count; i++) {
    await cards.nth(i).locator('button[aria-pressed]').first().click()
  }
  if (await gradeBtn.isEnabled()) ok('다 고르면 채점할 수 있다')
  else bad('채점 열림', '다 골랐는데 막혀 있다')

  await gradeBtn.click()
  await page.waitForTimeout(800)

  const after = await page.evaluate(() => document.body.innerText)
  if (/채점 결과/.test(after)) ok('로그인 없이 채점된다')
  else bad('채점', '결과가 안 나온다')
  if (/해설/.test(after)) ok('해설까지 보여 준다', '문제만 보여 주면 판단을 못 한다')
  else bad('해설', '해설이 없다')

  // 채점 뒤에 가입으로 이어져야 한다 — 여기서 안 이으면 그냥 무료 문제집이다
  const signup = page.locator('a[href="/signup"]')
  if (await signup.count()) ok('채점 뒤 가입으로 잇는다', `${await signup.count()}곳`)
  else bad('가입 유도', '이어지는 곳이 없다')

  // 홈에서 이 화면으로 들어올 길이 있는가
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 })
  if (await page.locator('a[href="/try"]').count()) ok('첫 화면에서 들어갈 수 있다')
  else bad('진입로', '첫 화면에 연결이 없다')

  // 검색으로 들어오는 게 이 화면의 존재 이유다
  const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text()
  if (sitemap.includes('/try')) ok('사이트맵에 들어 있다')
  else bad('사이트맵', '검색엔진이 못 찾는다')

  await ctx.close()
} catch (e) {
  bad('실행', e.message.split('\n')[0])
} finally {
  await browser.close()
}

console.log(`\n${fail ? '맛보기에 구멍이 있다.' : '가입 없이 끝까지 돈다.'}`)
process.exit(fail ? 1 : 0)
