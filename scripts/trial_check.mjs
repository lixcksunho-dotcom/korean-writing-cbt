// 로그인 없이 문제를 풀 수 있는지 본다.
//   npm run check:trial
//
// 왜 필요한가: /cbt도 /practice도 로그인 필수라 검색으로 들어온 사람이 문제를 한 번도
// 못 보고 돌아갔다. 이 화면은 그 구멍을 메우려고 만든 것이므로 **로그아웃 상태에서**
// 끝까지 도는지가 전부다. 로그인이 끼어들면 만든 이유가 사라진다.

import { chromium } from 'playwright'
import { TRIAL_TOPICS } from '../src/lib/trialTopics.ts'

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

  // ── 설명 페이지에 붙인 문제 ─────────────────────────────────────────────
  // 검색으로 들어오는 사람의 대부분이 설명 페이지에 닿는다. 읽고 그냥 나가면
  // 우리 문제를 한 번도 못 본 것이다. 거기서 바로 풀 수 있어야 한다.
  for (const path of ['/spelling', '/manuscript-guide', '/loanword-spelling']) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 60000 })
    const quiz = page.locator('section:has(ol > li button[aria-pressed])')
    if (await quiz.count()) ok(`${path} 에서 바로 풀 수 있다`)
    else { bad(`${path} 문제 블록`, '설명만 있고 풀 곳이 없다'); continue }

    const items = quiz.locator('ol > li')
    const n = await items.count()
    for (let i = 0; i < n; i++) await items.nth(i).locator('button[aria-pressed]').first().click()
    await quiz.getByRole('button', { name: /채점/ }).click()
    await page.waitForTimeout(600)
    const t = await quiz.innerText()
    if (/채점 결과/.test(t) && /해설/.test(t)) ok(`${path} 채점·해설까지 로그인 없이`, `${n}문항`)
    else bad(`${path} 채점`, t.slice(0, 60))
  }

  // ── 로그인 벽 ──────────────────────────────────────────────────────────
  // '무료 CBT 모의고사'라고 해놓고 로그인을 요구하면 검색으로 온 사람은 거기서 끝난다.
  // 30일 실측: 콘텐츠에 4,604명이 닿고 목록까지 온 사람은 382명뿐이었다.
  // 설명 페이지의 CTA는 로그인 없이 되는 자리를 가리켜야 한다.
  {
    const fs2 = await import('node:fs')
    const pages = fs2.readdirSync('src/app', { withFileTypes: true })
      .filter(e => e.isDirectory() && !e.name.startsWith('(') && !e.name.startsWith('_'))
      .map(e => `src/app/${e.name}/page.tsx`)
      .filter(p => fs2.existsSync(p))
    const walled = pages.filter(p => {
      const src = fs2.readFileSync(p, 'utf8')
      return /href="\/cbt"[\s\S]{0,240}무료/.test(src)
    })
    // 푸터·블로그 CTA 같은 공용 부품도 모든 설명 페이지에 함께 뜬다 — 거기 남은
    // 로그인 벽 하나가 페이지 스무 곳을 한꺼번에 막는다. 실제 화면에서도 확인한다.
    await page.goto(`${BASE}/spelling`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    const liveWalled = await page.$$eval('a[href="/cbt"]', as => as.map(a => a.textContent?.trim() ?? ''))
    if (liveWalled.length === 0) ok('설명 페이지 화면에 로그인 벽 링크가 없다')
    else bad('로그인 벽(화면)', `${liveWalled.length}개 남음: ${liveWalled.slice(0, 3).join(', ')}`)

    if (walled.length === 0) ok('설명 페이지가 로그인 벽으로 안 보낸다')
    else bad('로그인 벽', `'무료'라 해놓고 로그인이 필요한 곳으로 보내는 페이지: ${walled.map(p => p.split('/')[2]).join(', ')}`)
  }

  // ── 유형별 맛보기 ───────────────────────────────────────────────────────
  // 설명 페이지에서 '다른 유형도 풀어보기'를 눌렀는데 같은 문항이 또 나오면
  // 다른 것을 준다고 해놓고 같은 것을 준 셈이다. 유형마다 실제로 달라야 한다.
  {
    const seen = new Map()
    for (const t of TRIAL_TOPICS) {
      await page.goto(`${BASE}/try/${t.slug}`, { waitUntil: 'networkidle', timeout: 60000 })
      const items = page.locator('ol > li')
      const n = await items.count()
      if (n === 0) { bad(`${t.label} 맛보기`, '문항이 없다'); continue }
      // 문항 본문만 뽑는다 — 줄 번호로 자르면 번호 배지나 빈 줄을 비교하게 된다.
      const first = await items.first().locator('p').first().innerText().catch(() => '')
      if (new RegExp(t.keyword).test(await page.locator('ol').innerText())) ok(`${t.label} — 그 유형 문항이 나온다`, `${n}문항`)
      else bad(`${t.label} 유형`, '다른 유형 문항이 나온다')
      const prev = seen.get(first)
      if (prev) bad('유형별 차이', `${t.label}과 ${prev}가 같은 문항으로 시작한다`)
      seen.set(first, t.label)
    }
    if (seen.size === TRIAL_TOPICS.length) ok('유형마다 첫 문항이 다르다', `${seen.size}가지`)
  }


  // 사이트맵에 유형별 주소를 넣었으니 제목·설명도 유형마다 달라야 한다.
  // 여섯 주소가 같은 제목이면 검색엔진에는 같은 문서 여섯 개다.
  {
    const titles = new Map()
    for (const t of TRIAL_TOPICS) {
      await page.goto(`${BASE}/try/${t.slug}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
      const title = await page.title()
      if (titles.has(title)) bad('제목 중복', `${t.label}과 ${titles.get(title)}의 제목이 같다`)
      titles.set(title, t.label)
      if (title.includes(t.label)) ok(`${t.label} — 제목에 유형이 들어간다`)
      else bad(`${t.label} 제목`, title.slice(0, 40))
    }
    if (titles.size === TRIAL_TOPICS.length) ok('제목이 유형마다 다르다', `${titles.size}가지`)
  }
  // 검색 유입의 관문이라 캐시가 살아 있어야 한다. searchParams 를 받으면 이 화면이
  // 통째로 '매 요청 새로 그리기'가 된다(실측: no-store, 첫 응답 635ms).
  {
    for (const path of ['/try', `/try/${TRIAL_TOPICS[0].slug}`]) {
      const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(30000) })
      const cc = res.headers.get('cache-control') ?? ''
      if (!/no-store/.test(cc)) ok(`${path} 는 캐시된다`, cc.slice(0, 46))
      else bad(`${path} 캐시`, '매 요청 새로 그린다 — searchParams 가 들어갔는지 보라')
    }
  }

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
