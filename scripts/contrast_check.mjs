// 글자와 배경의 명암비(WCAG AA)를 실제 렌더된 페이지에서 잰다(로그인 없이 보이는 면).
//   npm run check:contrast
//   CONTRAST_BASE=http://localhost:3000 npm run check:contrast
//
// 눈으로는 "좀 흐린가" 정도로 넘어가는 것들이라 자동으로 재지 않으면 그대로 남는다.
// 이걸로 주 CTA(.btn-gold)가 흰 글자 2.15:1이던 것을 찾았다.
//
// 2단으로 재는 이유 — 배경색은 CSS만 봐서는 알 수 없다:
//  1단(싸다): 조상으로 거슬러 올라가 처음 만나는 칠해진 배경으로 후보를 거른다.
//  2단(느리다): 걸린 것만 글자를 잠깐 투명하게 만들고 그 자리를 찍어 배경 픽셀의
//            중앙값으로 확증한다. 반투명 레이어·고정 헤더·그라디언트처럼 조상 추적으로는
//            알 수 없는 배경이 여기서 드러난다.
//            (가장자리에 섞여 든 색에 흔들리지 않도록 최솟값이 아니라 중앙값을 쓴다)
import { chromium } from 'playwright'
import { lum, ratio, contrastBar, browserCollectText, cheapContrast, dismissIntros } from './ui_audit_rules.mjs'

const BASE = process.env.CONTRAST_BASE ?? 'https://kptest.cloud'
const PAGES = [
  '/', '/blog', '/subscribe', '/login', '/signup',
  '/spelling', '/idioms', '/proverbs', '/expressions', '/refined-words',
  '/honorifics', '/standard-words', '/loanword-spelling',
  '/manuscript-guide', '/essay-guide', '/business-writing', '/word-counter',
  '/exam-info', '/kbs-korean', '/exam-compare', '/guides',
]

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
// 자동으로 뜨는 모달의 어두운 스크림이 요소를 덮은 채로 찍히면 배경이 전부 회색으로 나온다.
await page.addInitScript(dismissIntros)
const decoder = await browser.newPage()
const fails = []
let checked = 0, verified = 0, cleared = 0

// 요소 자리의 배경 픽셀 중앙값 — 글자를 지우고 찍는다.
async function bgMedian(el) {
  await el.evaluate((e) => { e.dataset.oc = e.style.color; e.style.color = 'transparent' })
  let px = null
  try {
    const buf = await el.screenshot({ timeout: 4000 })
    px = await decoder.evaluate(async (b64) => {
      const img = new Image()
      img.src = 'data:image/png;base64,' + b64
      await img.decode()
      const cv = document.createElement('canvas')
      cv.width = img.width; cv.height = img.height
      const ctx = cv.getContext('2d')
      ctx.drawImage(img, 0, 0)
      const d = ctx.getImageData(0, 0, cv.width, cv.height).data
      const out = []
      for (let i = 0; i < d.length; i += 4) out.push([d[i], d[i + 1], d[i + 2]])
      return out
    }, buf.toString('base64'))
  } catch { /* 화면 밖이거나 가려진 요소 */ }
  await el.evaluate((e) => { e.style.color = e.dataset.oc || '' }).catch(() => {})
  if (!px?.length) return null
  const mid = (k) => { const v = px.map((p) => p[k]).sort((a, b) => a - b); return v[Math.floor(v.length / 2)] }
  return [mid(0), mid(1), mid(2)]
}

for (const path of PAGES) {
  const res = await page.goto(BASE + path, { waitUntil: 'load' }).catch(() => null)
  if (!res || res.status() >= 400) {
    console.log(`  ${path} 열지 못함 (${res?.status() ?? '응답 없음'})`)
    continue
  }
  // 페이드인이 진행 중인 프레임을 찍으면 배경이 중간색(회색)으로 섞여 엉뚱한 값이 나온다
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' })
  await page.waitForTimeout(600)
  const items = await page.evaluate(browserCollectText)
  const seen = new Set()

  for (const it of items) {
    const key = it.text + it.color + it.bg.raw
    if (seen.has(key)) continue
    seen.add(key)
    checked++

    const cheap = cheapContrast(it)
    if (!cheap) continue
    const bar = contrastBar(it.fs, it.bold)
    if (cheap.worst >= bar) continue

    // 2단: 픽셀로 확증
    verified++
    const el = page.locator(`[data-cc="${it.id}"]`)
    await el.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(120) // 스크롤로 붙는 효과가 자리 잡을 때까지
    const bgPx = await bgMedian(el)
    if (!bgPx) continue // 잴 수 없으면 보고하지 않는다(추측하느니 빼는 게 낫다)
    const real = ratio(cheap.fl, lum(bgPx))
    if (real >= bar) { cleared++; continue }

    fails.push({
      line: `${path}  ${real.toFixed(2)} (필요 ${bar})  ${it.fs}px${it.bold ? ' bold' : ''} <${it.tag}> "${it.text}"  글자 ${it.color} / 배경 rgb(${bgPx.join(',')})`,
      real,
    })
  }
}
await browser.close()

fails.sort((a, b) => a.real - b.real)
console.log(`\n명암비 검사 — ${PAGES.length}면 · 텍스트 ${checked}개 · 픽셀 확증 ${verified}건(그중 ${cleared}건은 실제로 문제 없음)`)
if (fails.length === 0) {
  console.log('기준 미달 0건')
} else {
  console.log(`기준 미달 ${fails.length}건 (낮은 순)\n`)
  for (const f of fails) console.log('  ' + f.line)
  process.exitCode = 1
}
