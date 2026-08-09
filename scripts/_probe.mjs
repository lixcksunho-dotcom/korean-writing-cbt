import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
const rule = () => {
  const out = { noName: [], imgNoAlt: [], headings: [], h1: 0, lang: document.documentElement.lang, landmarks: {} }
  const name = (el) => (el.getAttribute('aria-label') || el.getAttribute('title') ||
    (el.labels && el.labels.length ? [...el.labels].map(l => l.textContent).join(' ') : '') ||
    (el.getAttribute('aria-labelledby') ? 'labelledby' : '') ||
    el.textContent || '').trim()
  for (const el of document.querySelectorAll('a[href], button, [role="button"], input, select, textarea')) {
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden') continue
    const r = el.getBoundingClientRect()
    if (r.width < 4 || r.height < 4) continue
    if (el.type === 'hidden') continue
    if (!name(el)) out.noName.push(`${el.tagName.toLowerCase()}${el.type ? '[' + el.type + ']' : ''} ${(el.className || '').toString().slice(0, 40)}`)
  }
  for (const img of document.querySelectorAll('img')) {
    if (!img.hasAttribute('alt')) out.imgNoAlt.push((img.getAttribute('src') || '').slice(0, 60))
  }
  const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
  out.h1 = hs.filter(h => h.tagName === 'H1').length
  let prev = 0
  for (const h of hs) {
    const lv = Number(h.tagName[1])
    if (prev && lv > prev + 1) out.headings.push(`h${prev} → h${lv} "${(h.textContent || '').trim().slice(0, 24)}"`)
    prev = lv
  }
  out.landmarks = { main: document.querySelectorAll('main').length, nav: document.querySelectorAll('nav').length }
  return out
}
for (const path of ['/', '/spelling', '/blog', '/login', '/signup', '/subscribe', '/word-counter', '/exam-info']) {
  await p.goto('https://kptest.cloud' + path, { waitUntil: 'load' })
  await p.waitForTimeout(600)
  const r = await p.evaluate(rule)
  const probs = []
  if (r.noName.length) probs.push(`이름없는 조작요소 ${r.noName.length}: ${r.noName.slice(0, 3).join(' | ')}`)
  if (r.imgNoAlt.length) probs.push(`alt없는 이미지 ${r.imgNoAlt.length}`)
  if (r.h1 !== 1) probs.push(`h1 ${r.h1}개`)
  if (r.headings.length) probs.push(`제목 건너뜀 ${r.headings.length}: ${r.headings.slice(0, 2).join(' | ')}`)
  if (!r.landmarks.main) probs.push('main 없음')
  if (r.lang !== 'ko') probs.push(`lang=${r.lang}`)
  console.log(`${path.padEnd(14)} ${probs.length ? probs.join(' · ') : '이상 없음'}`)
}
await b.close()
