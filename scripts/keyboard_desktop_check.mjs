// 키보드만으로 쓸 수 있는지 + 넓은 화면에서 레이아웃이 무너지지 않는지 잰다.
//   npm run check:keyboard
//
// 마우스로만 눌러 보면 절대 안 걸리는 것들이다.
//  - 초점 표시: Tab으로 옮겨 갔는데 어디 있는지 안 보이면 키보드로는 못 쓴다
//  - 초점 함정: 다음으로 못 넘어가면 그 자리에 갇힌다
//  - 건너뛰기 링크: 매 페이지 메뉴를 다 지나야 본문에 닿으면 화면 낭독기 사용자가 지친다
//  - 넓은 화면: 본문이 끝까지 늘어나면 한 줄이 너무 길어 읽기 어렵다(최대 폭 제한 확인)
import { chromium } from 'playwright'
import { dismissIntros } from './ui_audit_rules.mjs'

const BASE = process.env.KEYBOARD_BASE ?? 'https://kptest.cloud'
const PAGES = ['/', '/subscribe', '/login', '/spelling', '/word-counter', '/blog', '/exam-info']

const browser = await chromium.launch()
const problems = []

// ── 1) 키보드 ────────────────────────────────────────────────────────────
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
await ctx.addInitScript(dismissIntros)
const page = await ctx.newPage()

for (const path of PAGES) {
  const res = await page.goto(BASE + path, { waitUntil: 'load' }).catch(() => null)
  if (!res || res.status() >= 400) { problems.push(`${path} 열지 못함`); continue }
  // 전환(transition)이 켜져 있으면 초점을 뗀 직후에도 이전 색이 읽혀 비교가 어긋난다
  await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' })
  await page.waitForTimeout(400)

  const seen = []
  let stuck = null
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab')
    const info = await page.evaluate(() => {
      const el = document.activeElement
      if (!el || el === document.body) return null
      const cs = getComputedStyle(el)
      const r = el.getBoundingClientRect()
      // 초점 표시는 outline·그림자만이 아니다. 테두리 색을 바꾸는 방식도 흔하므로,
      // 초점을 뗐을 때와 비교해서 눈에 보이는 차이가 있는지로 판단한다.
      const snap = (s) => [s.outlineStyle, s.outlineWidth, s.outlineColor, s.boxShadow, s.borderColor, s.borderWidth, s.backgroundColor].join('|')
      const focused = snap(cs)
      el.blur()
      const blurred = snap(getComputedStyle(el))
      el.focus()
      return {
        tag: el.tagName.toLowerCase(),
        // 같은 요소인지 가릴 때 쓴다. 글자만 잘라 비교하면 카드 제목이 같은 말머리로
        // 시작할 때 서로 다른 링크를 한 곳으로 착각한다(블로그 목록에서 실제로 그랬다).
        id: `${el.tagName}|${el.getAttribute?.('href') ?? ''}|${Math.round(r.top + scrollY)}`,
        text: (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || '').trim().slice(0, 20),
        visible: r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight * 3,
        focusRing: focused !== blurred,
      }
    })
    if (!info) break
    seen.push(info)
    if (seen.length >= 3) {
      const [a, b, c] = seen.slice(-3)
      if (a.id === b.id && b.id === c.id) { stuck = a; break }
    }
  }

  if (!seen.length) { problems.push(`${path}  Tab으로 아무 데도 못 감`); continue }
  if (stuck) problems.push(`${path}  초점이 "${stuck.text || stuck.tag}"에 갇힘(3번 연속 같은 곳)`)
  const noRing = seen.filter((s) => !s.focusRing)
  if (noRing.length) {
    const names = [...new Set(noRing.map((s) => s.text || s.tag))].slice(0, 3).join(' / ')
    problems.push(`${path}  초점 표시 없음 ${noRing.length}/${seen.length}곳 — ${names}`)
  }

  // 본문 앞에 반복되는 링크가 몇 개나 있는가.
  // 규격(WCAG 2.4.1)이 요구하는 건 '반복 블록 건너뛰기'다. 헤더에 링크가 두세 개뿐이면
  // 건너뛰기 링크가 없어도 문제되지 않는다 — 매 페이지 메뉴를 한참 지나야 할 때가 문제다.
  const before = await page.evaluate(() => {
    const h1 = document.querySelector('h1')
    if (!h1) return 0
    const top = h1.getBoundingClientRect().top + scrollY
    return [...document.querySelectorAll('a[href], button')].filter((el) => {
      const cs = getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden') return false
      const r = el.getBoundingClientRect()
      return r.height > 0 && r.top + scrollY < top
    }).length
  })
  const hasSkip = await page.evaluate(() =>
    [...document.querySelectorAll('a[href^="#"]')].some((a) => /본문|content|main|건너/i.test(a.textContent + (a.getAttribute('href') ?? '')))
  )
  if (before > 8 && !hasSkip) problems.push(`${path}  본문 앞 링크·버튼 ${before}개인데 바로가기 링크 없음`)
}
await ctx.close()

// ── 2) 넓은 화면 ─────────────────────────────────────────────────────────
const wctx = await browser.newContext({ viewport: { width: 2560, height: 1100 } })
await wctx.addInitScript(dismissIntros)
const wpage = await wctx.newPage()
for (const path of PAGES) {
  const res = await wpage.goto(BASE + path, { waitUntil: 'load' }).catch(() => null)
  if (!res || res.status() >= 400) continue
  await wpage.waitForTimeout(400)
  const wide = await wpage.evaluate(() => {
    const bad = []
    for (const el of document.querySelectorAll('p, li')) {
      const r = el.getBoundingClientRect()
      if (r.width < 200 || r.height < 8) continue
      const txt = (el.textContent ?? '').trim()
      if (txt.length < 60) continue
      // 한 줄이 너무 길면 눈이 다음 줄 첫 글자를 못 찾는다(권장 45~90자).
      // 한글은 글자폭이 거의 폰트 크기만 하고 라틴은 그 절반쯤이라 섞인 비율로 잡는다.
      // 라틴 기준(0.55em)만 쓰면 한글 문단의 줄당 글자수를 두 배로 세게 된다.
      const fs = parseFloat(getComputedStyle(el).fontSize)
      const hangul = (txt.match(/[가-힣]/g) ?? []).length / txt.length
      const perLine = Math.round(r.width / (fs * (0.55 + 0.45 * hangul)))
      if (perLine > 95) bad.push({ perLine, w: Math.round(r.width), text: txt.slice(0, 24) })
    }
    return bad.slice(0, 3)
  })
  for (const b of wide) problems.push(`${path}  2560px에서 한 줄 ${b.perLine}자(폭 ${b.w}px) — "${b.text}"`)
}
await wctx.close()
await browser.close()

console.log(`\n키보드·넓은 화면 점검 — ${PAGES.length}면`)
if (!problems.length) {
  console.log('문제 0건')
} else {
  console.log(`문제 ${problems.length}건\n`)
  for (const p of problems) console.log('  ' + p)
  process.exitCode = 1
}
