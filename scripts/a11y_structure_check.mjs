// 화면의 뼈대가 낭독기에 제대로 전달되는지 본다.
//   npm run check:a11y
//
// 명암비·누름 크기는 재고 있었지만 '이름'과 '구조'는 아무도 안 보고 있었다.
// 눈으로는 멀쩡하다 — 이름표가 옆에 보이니까. 문제는 그 이름표가 입력칸과
// 묶여 있느냐인데, 그건 화면을 봐서는 알 수 없다.
//
// 실제로 이걸로 찾았다: 가입·로그인 입력칸 5개가 낭독기에 '편집란'으로만 들렸고,
// 첫 화면·로그인·가입에 main이 없어 '본문 바로가기'가 갈 곳이 없었다.
import fs from 'node:fs'
import { chromium } from 'playwright'
import { dismissIntros } from './ui_audit_rules.mjs'

const ENV = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8').split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const SB = ENV.NEXT_PUBLIC_SUPABASE_URL
const SVC = ENV.SUPABASE_SERVICE_ROLE_KEY
const BASE = process.env.A11Y_CHECK_BASE ?? 'https://kptest.cloud'
const admin = (p, init) => fetch(`${SB}${p}`, {
  ...init,
  headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
})

const PUBLIC = [
  '/', '/blog', '/subscribe', '/login', '/signup', '/spelling', '/word-counter',
  '/exam-info', '/kbs-korean', '/guides', '/manuscript-guide', '/essay-guide',
  '/privacy', '/terms', '/refund', '/support', '/forgot-password', '/reset-password',
]
const AUTHED = ['/dashboard', '/insights', '/cbt', '/manuscript', '/practice', '/practice/report', '/subscribe/history']

// 브라우저 안에서 도는 규칙 — 바깥 스코프를 참조하면 안 된다.
function auditStructure() {
  const out = { noName: [], imgNoAlt: [], skipped: [], h1: 0, main: 0, lang: document.documentElement.lang }
  const accName = (el) => {
    const aria = el.getAttribute('aria-label')
    if (aria && aria.trim()) return aria.trim()
    if (el.getAttribute('aria-labelledby')) return 'labelledby'
    if (el.labels && el.labels.length) {
      const t = [...el.labels].map((l) => l.textContent ?? '').join(' ').trim()
      if (t) return t
    }
    const title = el.getAttribute('title')
    if (title && title.trim()) return title.trim()
    // input의 value는 이름이 될 수 있다(제출 버튼 등). placeholder는 아니다 — 글자를 넣으면 사라진다.
    if (el.tagName === 'INPUT' && ['submit', 'button', 'reset'].includes(el.type) && el.value) return el.value
    return (el.textContent ?? '').trim()
  }
  for (const el of document.querySelectorAll('a[href], button, [role="button"], input, select, textarea')) {
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden') continue
    if (el.type === 'hidden') continue
    const r = el.getBoundingClientRect()
    if (r.width < 4 || r.height < 4) continue
    if (!accName(el)) {
      out.noName.push(`<${el.tagName.toLowerCase()}${el.type ? ' type=' + el.type : ''}> ${(el.getAttribute('placeholder') || el.className || '').toString().slice(0, 30)}`)
    }
  }
  for (const img of document.querySelectorAll('img')) {
    if (!img.hasAttribute('alt')) out.imgNoAlt.push((img.getAttribute('src') ?? '').slice(0, 60))
  }
  const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
  out.h1 = hs.filter((h) => h.tagName === 'H1').length
  let prev = 0
  for (const h of hs) {
    const lv = Number(h.tagName[1])
    if (prev && lv > prev + 1) out.skipped.push(`h${prev}→h${lv} "${(h.textContent ?? '').trim().slice(0, 20)}"`)
    prev = lv
  }
  out.main = document.querySelectorAll('main').length
  return out
}

const problems = []
let looked = 0

const browser = await chromium.launch()
let uid = null
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.addInitScript(dismissIntros)
  const page = await ctx.newPage()

  // 모달 안은 그동안 아무도 안 봤다. 검사는 화면만 열고 지나갔는데, 조작 요소는
  // 오히려 모달에 몰려 있다 — 실제로 후기 모달의 별점 5개와 닫기 버튼이 낭독기에
  // 이름 없는 버튼으로만 들렸다(평점을 매길 방법이 없었다).
  async function lookInside(label, path, openText) {
    const res = await page.goto(`${BASE}${path}`, { waitUntil: 'load', timeout: 40000 }).catch(() => null)
    if (!res || res.status() >= 400) { problems.push(`${label} ${path}  열지 못함`); return }
    await page.waitForTimeout(1200)
    const opener = page.locator('button, a').filter({ hasText: openText }).first()
    if (!await opener.count()) { problems.push(`${label} ${path}  "${openText}"를 찾지 못함`); return }
    await opener.click().catch(() => {})
    await page.waitForTimeout(1200)
    const dialog = await page.evaluate(() => {
      const root = document.querySelector('[role="dialog"]') ?? document.querySelector('[aria-modal="true"]')
      if (!root) return null
      const accName = (el) => {
        const aria = el.getAttribute('aria-label')
        if (aria && aria.trim()) return aria.trim()
        if (el.getAttribute('aria-labelledby')) return 'labelledby'
        if (el.labels && el.labels.length) {
          const t = [...el.labels].map((l) => l.textContent ?? '').join(' ').trim()
          if (t) return t
        }
        const title = el.getAttribute('title')
        if (title && title.trim()) return title.trim()
        return (el.textContent ?? '').trim()
      }
      const noName = []
      for (const el of root.querySelectorAll('a[href], button, [role="button"], input, select, textarea')) {
        const cs = getComputedStyle(el)
        if (cs.display === 'none' || cs.visibility === 'hidden') continue
        if (el.type === 'hidden') continue
        const r = el.getBoundingClientRect()
        if (r.width < 4 || r.height < 4) continue
        if (!accName(el)) noName.push(`<${el.tagName.toLowerCase()}> ${(el.className || '').toString().slice(0, 24)}`)
      }
      return { noName }
    })
    if (!dialog) { problems.push(`${label} ${path}  "${openText}"를 눌렀는데 대화상자가 안 열렸다`); return }
    looked++
    if (dialog.noName.length) {
      problems.push(`${label} "${openText}" 모달  이름 없는 조작 요소 ${dialog.noName.length}개 — ${dialog.noName.slice(0, 3).join(' / ')}`)
    }
  }

  async function look(label, path) {
    const res = await page.goto(`${BASE}${path}`, { waitUntil: 'load', timeout: 40000 }).catch(() => null)
    if (!res || res.status() >= 400) { problems.push(`${label} ${path}  열지 못함 (${res?.status() ?? '이동 실패'})`); return }
    await page.waitForTimeout(700)
    const r = await page.evaluate(auditStructure).catch(() => null)
    if (!r) { problems.push(`${label} ${path}  구조를 읽지 못함`); return }
    looked++
    if (r.noName.length) problems.push(`${label} ${path}  이름 없는 조작 요소 ${r.noName.length}개 — ${r.noName.slice(0, 3).join(' / ')}`)
    if (r.imgNoAlt.length) problems.push(`${label} ${path}  alt 없는 이미지 ${r.imgNoAlt.length}개 — ${r.imgNoAlt[0]}`)
    // h1은 그 화면이 무엇인지 한 줄로 말하는 자리다. 없으면 낭독기가 제목을 못 읽고,
    // 여럿이면 어느 게 제목인지 알 수 없다.
    if (r.h1 !== 1) problems.push(`${label} ${path}  h1이 ${r.h1}개 (1개여야 한다)`)
    if (r.skipped.length) problems.push(`${label} ${path}  제목 단계 건너뜀 — ${r.skipped.slice(0, 2).join(' / ')}`)
    if (r.main !== 1) problems.push(`${label} ${path}  main이 ${r.main}개 (1개여야 한다)`)
    if (r.lang !== 'ko') problems.push(`${label} ${path}  lang="${r.lang}" (ko여야 한다)`)
  }

  for (const p of PUBLIC) await look('공개', p)

  // 로그인 뒤 화면. 갓 만든 계정이라 빈 화면인데, 구조는 내용과 무관하게 맞아야 한다.
  const stamp = String(Date.now())
  const email = `uicheck+${stamp}@kptest.cloud`
  const password = `Chk-${stamp}-aA1!`
  const mk = await admin('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email, password, email_confirm: true }) })
  if (mk.ok) {
    uid = (await mk.json()).id
    let logged = false
    for (let a = 0; a < 3 && !logged; a++) {
      await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
      await page.fill('input[type="email"]', email)
      await page.fill('input[type="password"]', password)
      await page.click('button[type="submit"]')
      for (let i = 0; i < 30; i++) {
        if (!new URL(page.url()).pathname.includes('/login')) { logged = true; break }
        await page.waitForTimeout(1000)
      }
      if (!logged) await page.waitForTimeout(4000)
    }
    if (!logged) problems.push('로그인 뒤 화면을 보지 못함 — 로그인 실패')
    else {
      for (const p of AUTHED) await look('로그인 뒤', p)
      // 모달 안쪽(조작 요소가 몰려 있는 자리)
      await lookInside('로그인 뒤', '/dashboard', '후기 남기기')
      await lookInside('로그인 뒤', '/dashboard', '시험일정')
    }
  } else {
    problems.push('검증용 계정을 만들지 못해 로그인 뒤 화면은 건너뜀')
  }
} catch (e) {
  problems.push('중단: ' + String(e).slice(0, 160))
} finally {
  await browser.close()
  if (uid) {
    for (const t of ['quiz_answers', 'quiz_sessions', 'device_usage', 'manuscript_submissions']) {
      await admin(`/rest/v1/${t}?user_id=eq.${uid}`, { method: 'DELETE' }).catch(() => {})
    }
    await admin(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' }).catch(() => {})
  }
}

console.log(`\n화면 뼈대 점검 — ${looked}면 (이름·대체글·제목 단계·랜드마크)`)
if (!problems.length) console.log('문제 없음 ✓')
else {
  console.log(`문제 ${problems.length}건\n`)
  for (const p of problems) console.log('  ' + p)
  process.exitCode = 1
}
