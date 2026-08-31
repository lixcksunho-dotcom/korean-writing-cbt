// 로그인한 무료 사용자 기준으로 앱의 모든 화면을 전수로 훑는다.
//
// npm test(스모크)는 로그인 없이 볼 수 있는 공개 표면만 본다. 정작 돈이 오가는 화면은
// 전부 로그인 뒤에 있어서, 배포가 그쪽을 깨뜨려도 스모크는 초록으로 남는다.
// 여기서는 테스트 계정을 만들어 실글·KBS 두 모드로 모든 화면을 돌고 지운다.
//
// 결제와 AI 채점은 건드리지 않는다(유료 API·결제 행동).
//
// 사용: npm run check:pages          (기본 대상 https://kptest.cloud)
//       PAGE_SWEEP_BASE=http://localhost:3000 npm run check:pages
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { chromium } = await import(pathToFileURL(path.join(ROOT, 'node_modules', 'playwright', 'index.mjs')).href)

const ENV = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, '.env.local'), 'utf-8')
    .split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }),
)
const SB = ENV.NEXT_PUBLIC_SUPABASE_URL
const SVC = ENV.SUPABASE_SERVICE_ROLE_KEY
const BASE = process.env.PAGE_SWEEP_BASE ?? 'https://kptest.cloud'
const api = (p, init) => fetch(`${SB}${p}`, {
  ...init,
  headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(init?.headers || {}) },
})

// 결제 이후 경로(success/fail)는 결제 흐름이라 제외. /admin은 권한이 없어 리다이렉트가 정상.
const ROUTES = [
  '/dashboard', '/insights', '/cbt', '/manuscript', '/manuscript/history',
  '/practice', '/practice/areas', '/practice/bookmarks', '/practice/essay',
  '/practice/multiple', '/practice/refine', '/practice/report', '/practice/types',
  '/practice/wrong', '/subscribe', '/subscribe/history',
  '/guides', '/word-counter', '/refined-words',
]

const stamp = String(Date.now())
const email = `uicheck+${stamp}@kptest.cloud`
const password = `Chk-${stamp}-aA1!`
let userId = null
const problems = []
let visited = 0
// 가장 느린 하나만 찍으면 '이상치 하나'인지 '전반적으로 느린지'를 구분할 수 없다.
// 실제로 그 한 자리가 실행마다 바뀌어서, 고쳐도 나아졌는지 알기 어려웠다.
const timings = []

try {
  const created = await (await api('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email, password, email_confirm: true }),
  })).json()
  userId = created.id
  if (!userId) throw new Error('테스트 계정 생성 실패: ' + JSON.stringify(created).slice(0, 160))

  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
  // 첫 방문 안내 팝업은 화면을 가려 판정을 흐린다.
  // 이 플래그는 쿠키가 아니라 localStorage에 있다 — 쿠키로 심으면 아무 효과가 없다.
  await ctx.addInitScript(() => {
    try { localStorage.setItem('kptest_mode_intro_v1', '1') } catch { /* 접근 불가면 그냥 둔다 */ }
  })
  const page = await ctx.newPage()
  let pageErrs = []
  page.on('pageerror', (e) => pageErrs.push(String(e).slice(0, 110)))
  page.on('console', (m) => { if (m.type() === 'error') pageErrs.push('console: ' + m.text().slice(0, 100)) })

  // 배포 직후엔 첫 시도가 간헐적으로 안 넘어간다 — 한 번 더 시도한다.
  let loggedIn = false
  for (let attempt = 0; attempt < 2 && !loggedIn; attempt++) {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', password)
    await page.click('button[type="submit"]')
    for (let i = 0; i < 45; i++) {
      if (!new URL(page.url()).pathname.includes('/login')) { loggedIn = true; break }
      await page.waitForTimeout(1000)
    }
  }
  if (!loggedIn) throw new Error('로그인이 되지 않음')

  for (const mode of ['silyong']) {
    await ctx.addCookies([{ name: 'kptest_mode', value: mode, domain: new URL(BASE).hostname, path: '/' }])
    for (const route of ROUTES) {
      pageErrs = []
      const t0 = Date.now()
      let status
      try {
        status = (await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 40000 }))?.status()
      } catch (e) {
        problems.push(`${mode} ${route} — 이동 실패: ${String(e).slice(0, 70)}`)
        continue
      }
      await page.waitForTimeout(1200)
      // 페이월·모드 때문에 클라이언트에서 한 번 더 넘기는 화면이 있다. 이동 중에 재면
      // "Execution context was destroyed"로 검사가 통째로 죽는다 — 실제로 13번째
      // 화면에서 그렇게 끝났다. 주소가 멎을 때까지 기다리고, 그래도 죽으면 한 번 더 본다.
      let last = page.url()
      for (let i = 0; i < 8; i++) {
        await page.waitForTimeout(300)
        if (page.url() === last) break
        last = page.url()
      }
      const ms = Date.now() - t0
      timings.push({ route: `${mode} ${route}`, ms })
      let text = await page.evaluate(() => document.body.innerText).catch(() => null)
      if (text === null) {
        await page.waitForTimeout(1500)
        text = await page.evaluate(() => document.body.innerText).catch(() => null)
      }
      if (text === null) { problems.push(`${mode} ${route} — 화면을 읽지 못함(이동 중)`); continue }
      visited++
      if (status !== 200) problems.push(`${mode} ${route} → HTTP ${status}`)
      if (/Application error|Internal Server Error|문제가 발생/.test(text)) problems.push(`${mode} ${route} → 오류 화면`)
      // 리다이렉트 자체는 정상일 수 있으나(모드 전용 화면), 내용이 없는 건 문제다.
      if (text.length < 120) problems.push(`${mode} ${route} → 내용 없음(${text.length}자, 도착 ${new URL(page.url()).pathname})`)
      const uniq = [...new Set(pageErrs)]
      if (uniq.length) problems.push(`${mode} ${route} → 콘솔: ${uniq.slice(0, 2).join(' | ')}`)
    }
  }

  // ── 페이월: 무료 계정이 URL로 유료 콘텐츠에 닿으면 안 된다.
  // 뚫려도 화면은 멀쩡해 보이고, 그대로 매출이 샌다.
  //
  // 두 모드를 다 본다. 잠기는 회차가 서로 달라서(실글 무료 2회차, KBS 무료 1회차)
  // 한쪽만 보면 다른 쪽 구멍이 그대로 남는다.
  const PAID_BY_MODE = {
    silyong: ['/cbt/2025-5', '/cbt/2025-9', '/practice/multiple?set=2025-5', '/practice/essay?set=2025-5'],
  }
  for (const [mode, paidRoutes] of Object.entries(PAID_BY_MODE)) {
    await ctx.addCookies([{ name: 'kptest_mode', value: mode, domain: new URL(BASE).hostname, path: '/' }])
    for (const paid of paidRoutes) {
      await page.goto(`${BASE}${paid}`, { waitUntil: 'networkidle', timeout: 40000 }).catch(() => {})
      await page.waitForTimeout(800)
      const landed = new URL(page.url()).pathname
      const choices = await page.locator('label, button').filter({ hasText: /^\s*[①②③④⑤]/ }).count()
      visited++
      if (landed !== '/subscribe' || choices > 0) {
        problems.push(`페이월 뚫림: ${mode} ${paid} → ${landed} (선택지 ${choices}개)`)
      }
    }
  }
  // 반대쪽도 본다. 무료 회차까지 /subscribe로 가 버리면 위 검사는 전부 통과하는데
  // 정작 아무도 못 푸는 상태가 된다 — 통과가 통과인지 확인하는 대조군이다.
  // 시험 화면은 자동저장이 계속 돌아 networkidle이 안 온다 — 여기선 주소만 보면 된다.
  const FREE_BY_MODE = { silyong: '/cbt/2025-1' }
  for (const [mode, free] of Object.entries(FREE_BY_MODE)) {
    await ctx.addCookies([{ name: 'kptest_mode', value: mode, domain: new URL(BASE).hostname, path: '/' }])
    await page.goto(`${BASE}${free}`, { waitUntil: 'domcontentloaded', timeout: 40000 }).catch(() => {})
    await page.waitForTimeout(1500)
    const landed = new URL(page.url()).pathname
    visited++
    if (landed === '/subscribe') problems.push(`무료 회차가 막혔다: ${mode} ${free} → ${landed}`)
  }

  await ctx.addCookies([{ name: 'kptest_mode', value: 'silyong', domain: new URL(BASE).hostname, path: '/' }])
  // '전체 모아 풀기'는 접근은 되지만 무료 회차 분량만 실려야 한다(무료 2회차 = 60문항).
  await page.goto(`${BASE}/practice/multiple?set=all`, { waitUntil: 'networkidle', timeout: 40000 }).catch(() => {})
  await page.waitForTimeout(800)
  const loaded = (await page.content()).match(/correct_answer/g)?.length ?? 0
  visited++
  if (loaded > 100) problems.push(`set=all에 유료 회차 혼입 의심: 문항 ${loaded}개(무료면 60 안팎)`)

  await browser.close()
} catch (e) {
  problems.push('중단: ' + String(e).slice(0, 200))
} finally {
  // 테스트 계정이 남기는 것들을 전부 지운다.
  if (userId) {
    const sessions = await (await api(`/rest/v1/quiz_sessions?user_id=eq.${userId}&select=id`)).json()
    for (const s of Array.isArray(sessions) ? sessions : []) {
      await api(`/rest/v1/quiz_answers?session_id=eq.${s.id}`, { method: 'DELETE' })
      await api(`/rest/v1/quiz_sessions?id=eq.${s.id}`, { method: 'DELETE' })
    }
    await api(`/rest/v1/bookmarks?user_id=eq.${userId}`, { method: 'DELETE' })
    await api(`/rest/v1/manuscript_submissions?user_id=eq.${userId}`, { method: 'DELETE' })
    await api(`/auth/v1/admin/users/${userId}`, { method: 'DELETE' })
  }
}

console.log(`${BASE} · 훑은 화면 ${visited}개 (실글/KBS 두 모드)`)
{
  const sorted = [...timings].sort((a, b) => a.ms - b.ms)
  const at = (q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))]?.ms ?? 0
  // 주의: 이 값은 브라우저 조작·대기까지 포함한 '검사 기준' 시간이라 사용자 체감보다 크다.
  // 체감은 navigation timing으로 따로 재야 한다(실측: /dashboard 1260ms · /exam-info 145ms).
  // 여기서 볼 것은 절대값이 아니라 화면 사이의 차이와, 고친 뒤 분포가 내려가는지다.
  console.log(`응답 시간(검사 기준) — 중앙값 ${at(0.5)}ms · 상위10% ${at(0.9)}ms · 최대 ${sorted.at(-1)?.ms ?? 0}ms`)
  console.log('느린 화면 3개:')
  for (const t of sorted.slice(-3).reverse()) console.log(`  ${t.ms}ms  ${t.route}`)
}
if (problems.length) {
  console.log(`\n문제 ${problems.length}건`)
  problems.forEach((p) => console.log('  ' + p))
  // process.exit()는 아직 안 나간 stdout을 잘라 먹는다 — 종료 코드만 남기고 자연히 끝낸다.
  process.exitCode = 1
} else {
  console.log('문제 없음 ✓')
}
