// 휴대폰 화면에서 실제로 쓸 수 있는 상태인지 잰다.
//   npm run check:mobile
//   MOBILE_BASE=http://localhost:3000 npm run check:mobile
//
// 데스크톱 브라우저로 보면 멀쩡한데 휴대폰에서만 깨지는 것들이 있다. 이 시험을 준비하는
// 사람 대부분이 휴대폰으로 들어오므로, 여기서 깨지면 데스크톱이 아무리 멀쩡해도 소용없다.
//
// 재는 것:
//  - 가로 스크롤: 본문이 화면보다 넓으면 좌우로 밀린다(가장 흔하고 가장 티 나는 깨짐)
//  - 손가락 크기: 누르는 것이 44x44 미만이면 오조작이 난다(iOS 휴먼 인터페이스 기준)
//  - 붙어 있는 누름 대상: 24px보다 작은 것이 24px 안에 붙어 있으면 옆의 것이 눌린다
//  - 너무 작은 글자: 12px 미만은 확대 없이는 못 읽는다
//  - 화면 밖으로 나간 요소: 오른쪽이 잘려 내용이 사라진다
import { chromium, devices } from 'playwright'

const BASE = process.env.MOBILE_BASE ?? 'https://kptest.cloud'
const PAGES = [
  '/', '/blog', '/subscribe', '/login', '/signup', '/spelling', '/idioms',
  '/manuscript-guide', '/essay-guide', '/word-counter', '/exam-info',
  '/kbs-korean', '/exam-compare', '/guides', '/proverbs', '/expressions',
  '/refined-words', '/honorifics', '/standard-words', '/loanword-spelling',
]

function audit() {
  const vw = document.documentElement.clientWidth
  const out = { overflow: null, tiny: [], small: [], crowded: [], offscreen: [] }

  // 가로 스크롤 — 무엇이 튀어나왔는지까지 짚어야 고칠 수 있다
  if (document.documentElement.scrollWidth > vw + 1) {
    const wide = []
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect()
      if (r.width < 1 || r.height < 1) continue
      if (r.right > vw + 1 && getComputedStyle(el).position !== 'fixed') {
        wide.push({ tag: el.tagName.toLowerCase(), cls: (el.className?.toString?.() ?? '').slice(0, 60), right: Math.round(r.right), text: (el.textContent ?? '').trim().slice(0, 20) })
      }
    }
    // 가장 바깥쪽(가장 많이 튀어나온) 것 몇 개만
    wide.sort((a, b) => b.right - a.right)
    out.overflow = { scrollWidth: document.documentElement.scrollWidth, vw, worst: wide.slice(0, 3) }
  }

  const tappables = [...document.querySelectorAll('a[href], button, input, select, textarea, [role="button"]')]
    .filter((el) => {
      const cs = getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false
      const r = el.getBoundingClientRect()
      return r.width > 0 && r.height > 0
    })

  // 문장 안에 흐르는 링크는 크기 기준에서 빠진다(WCAG 2.5.8의 inline 예외).
  // 이걸 안 빼면 본문 링크가 전부 걸려 진짜 문제가 묻힌다.
  const isInline = (el) => {
    if (el.tagName !== 'A') return false
    if (!getComputedStyle(el).display.startsWith('inline')) return false
    const p = el.parentElement
    if (!p) return false
    return [...p.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0)
  }

  for (const el of tappables) {
    const r = el.getBoundingClientRect()
    const label = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || el.tagName).trim().slice(0, 22)
    if (r.right > vw + 1 || r.left < -1) out.offscreen.push({ label, left: Math.round(r.left), right: Math.round(r.right) })
  }

  // 크기·간격 기준이 적용되는 대상(문장 속 링크 제외)
  const sized = tappables.filter((el) => !isInline(el))
  for (const el of sized) {
    const r = el.getBoundingClientRect()
    const label = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || el.tagName).trim().slice(0, 22)
    const w = Math.round(r.width), h = Math.round(r.height)
    if (w < 24 || h < 24) out.small.push({ label, w, h, hard: true })
    else if (w < 44 || h < 44) out.small.push({ label, w, h, hard: false })
  }

  // 인접한 누름 대상 사이 간격.
  // 규격(WCAG 2.5.8)은 24px보다 작은 대상에만 간격을 요구한다 — 충분히 큰 것끼리는
  // 붙어 있어도 위반이 아니다(분절 컨트롤·표 셀이 그렇다). 작은 것만 본다.
  const undersized = (r) => r.width < 24 || r.height < 24
  for (let i = 0; i < sized.length; i++) {
    const a = sized[i].getBoundingClientRect()
    for (let j = i + 1; j < sized.length; j++) {
      const b = sized[j].getBoundingClientRect()
      if (!undersized(a) && !undersized(b)) continue
      if (sized[i].contains(sized[j]) || sized[j].contains(sized[i])) continue
      const dx = Math.max(0, Math.max(a.left, b.left) - Math.min(a.right, b.right))
      const dy = Math.max(0, Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom))
      if (dx === 0 && dy === 0) continue // 겹침은 레이아웃상 정상인 경우가 많다(래퍼 등)
      const gap = Math.hypot(dx, dy)
      if (gap > 0 && gap < 24) {
        out.crowded.push({
          a: (sized[i].textContent || sized[i].tagName).trim().slice(0, 16),
          b: (sized[j].textContent || sized[j].tagName).trim().slice(0, 16),
          gap: Math.round(gap),
        })
      }
    }
  }

  for (const el of document.querySelectorAll('body *')) {
    if (el.children.length > 0) continue
    const txt = el.textContent?.trim()
    if (!txt || txt.length < 2) continue
    const fs = parseFloat(getComputedStyle(el).fontSize)
    if (fs && fs < 12) out.tiny.push({ text: txt.slice(0, 20), fs })
  }
  return out
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ ...devices['iPhone 13'] })
await ctx.addInitScript(() => {
  try {
    localStorage.setItem('kptest_mode_intro_v1', '1')
    sessionStorage.setItem('kpt_schedule_seen_silyong', '1')
    sessionStorage.setItem('kpt_schedule_seen_kbs', '1')
  } catch { /* 저장소가 막힌 환경 */ }
})
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
  const r = await page.evaluate(audit)

  const uniq = (arr, key) => [...new Map(arr.map((x) => [key(x), x])).values()]
  if (r.overflow) {
    const w = r.overflow.worst.map((x) => `<${x.tag}> ${x.right}px "${x.text}"`).join(' / ')
    problems.push({ hard: true, line: `${path}  가로 스크롤 ${r.overflow.scrollWidth}px > 화면 ${r.overflow.vw}px — ${w}` })
  }
  for (const x of uniq(r.offscreen, (v) => v.label)) problems.push({ hard: true, line: `${path}  화면 밖 누름대상 "${x.label}" (left ${x.left}, right ${x.right})` })
  for (const x of uniq(r.small, (v) => v.label + v.w + v.h).slice(0, 6)) {
    problems.push({ hard: x.hard, line: `${path}  ${x.hard ? '누름대상 24px 미만' : '누름대상 권장(44px) 미만'} ${x.w}x${x.h} "${x.label}"` })
  }
  for (const x of uniq(r.crowded, (v) => v.a + v.b).slice(0, 4)) problems.push({ hard: true, line: `${path}  누름대상 간격 ${x.gap}px "${x.a}" ↔ "${x.b}"` })
  for (const x of uniq(r.tiny, (v) => v.text).slice(0, 4)) problems.push({ hard: x.fs < 11, line: `${path}  ${x.fs}px 글자 "${x.text}"` })
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
