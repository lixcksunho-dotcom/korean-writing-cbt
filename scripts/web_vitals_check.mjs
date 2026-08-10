// 휴대폰 + 느린 회선에서의 체감 성능(Core Web Vitals)을 잰다.
//   npm run check:vitals
//
// 빠른 회선에서 재면 전부 0으로 나와 아무것도 못 잡는다. 실제 사용자는 지하철에서
// 4G가 잘 안 잡히는 채로 들어온다. 그 조건으로 재야 의미가 있다.
//
// 한 번만 재면 안 된다. TBT는 실행마다 100ms 가까이 흔들려서, 같은 코드로 돌려도
// 매번 다른 페이지가 기준을 넘는다(실측: /spelling 529→624, /blog 627→580).
// 그러면 검사가 신호가 아니라 소음이 되고, 결국 아무도 안 본다.
// => 페이지마다 여러 번 재서 중앙값으로 판단한다.
//
// 재기 전에 빌드에 폰트가 들어 있는지 먼저 확인할 것(.next/static/media/*.woff2).
// 폰트가 빠진 빌드로 재면 글꼴 교체가 없어 CLS가 0으로 나오는데, 이걸 개선으로
// 착각해 잘못된 결론을 낸 적이 있다.
import { chromium, devices } from 'playwright'

const BASE = process.env.VITALS_BASE ?? 'https://kptest.cloud'
const PAGES = (process.env.VITALS_PAGES ?? '/,/spelling,/blog,/subscribe,/exam-info').split(',')

// 4G가 잘 안 잡히는 상황에 가까운 값
const NET = { offline: false, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8, latency: 150 }

const RUNS = Number(process.env.VITALS_RUNS ?? 3)
const median = (xs) => {
  const a = [...xs].sort((x, y) => x - y)
  return a.length % 2 ? a[(a.length - 1) / 2] : Math.round((a[a.length / 2 - 1] + a[a.length / 2]) / 2)
}

const browser = await chromium.launch()
const rows = []

for (const path of PAGES) {
 const samples = []
 for (let run = 0; run < RUNS; run++) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] })
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('kptest_mode_intro_v1', '1')
      sessionStorage.setItem('kpt_schedule_seen_silyong', '1')
      sessionStorage.setItem('kpt_schedule_seen_kbs', '1')
    } catch { /* 저장소가 막힌 환경 */ }
  })
  const page = await ctx.newPage()
  const cdp = await ctx.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', NET)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }) // 보급형 휴대폰 정도

  await page.addInitScript(() => {
    window.__v = { cls: 0, lcp: 0, shifts: [] }
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        if (e.hadRecentInput) continue
        window.__v.cls += e.value
        if (e.value > 0.01) {
          const src = e.sources?.[0]?.node
          window.__v.shifts.push({ v: +e.value.toFixed(4), el: src ? (src.tagName || '') + ' ' + (src.textContent || '').trim().slice(0, 24) : '?' })
        }
      }
    }).observe({ type: 'layout-shift', buffered: true })
    new PerformanceObserver((l) => {
      const e = l.getEntries().at(-1)
      if (e) window.__v.lcp = e.startTime
    }).observe({ type: 'largest-contentful-paint', buffered: true })
    // 화면이 뜬 뒤 손가락에 얼마나 늦게 반응하는지. 긴 작업(50ms 초과분)이 쌓일수록
    // 눌렀는데 아무 일도 안 일어나는 시간이 길어진다.
    window.__v.tbt = 0
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) window.__v.tbt += Math.max(0, e.duration - 50)
      }).observe({ type: 'longtask', buffered: true })
    } catch { /* 이 브라우저는 longtask를 안 준다 */ }
    window.__v.inp = 0
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) window.__v.inp = Math.max(window.__v.inp, e.duration)
      }).observe({ type: 'event', buffered: true, durationThreshold: 16 })
    } catch { /* 이 브라우저는 event timing을 안 준다 */ }
  })

  await page.goto(BASE + path, { waitUntil: 'load' })
  await page.waitForTimeout(9000) // 느린 회선에서 늦게 오는 것까지 본다
  // 실제로 눌러 봐야 반응 지연이 잡힌다. 페이지를 옮기지 않도록 링크가 아닌 곳을 누른다.
  for (let i = 0; i < 5; i++) {
    await page.mouse.click(20, 300 + i * 40).catch(() => {})
    await page.waitForTimeout(220)
  }
  await page.evaluate(() => window.scrollTo(0, 900)).catch(() => {})
  await page.waitForTimeout(600)
  const v = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0]
    return { ...window.__v, ttfb: Math.round(nav?.responseStart ?? 0), fcp: Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0) }
  })
  samples.push({ ...v, lcp: Math.round(v.lcp), tbt: Math.round(v.tbt ?? 0), inp: Math.round(v.inp ?? 0) })
  await ctx.close()
 }
 // 중앙값으로 합친다. shifts는 가장 흔들림이 컸던 회차 것을 남긴다(원인 추적용).
 const worst = samples.reduce((a, b) => (b.cls > a.cls ? b : a), samples[0])
 rows.push({
   path,
   ttfb: median(samples.map(s => s.ttfb)),
   fcp: median(samples.map(s => s.fcp)),
   lcp: median(samples.map(s => s.lcp)),
   cls: median(samples.map(s => s.cls)),
   tbt: median(samples.map(s => s.tbt)),
   inp: median(samples.map(s => s.inp)),
   shifts: worst.shifts ?? [],
 })
}
await browser.close()

// 기준: LCP 2.5s / CLS 0.1 이하가 'good'
const bad = []
console.log('\n체감 성능 — 휴대폰 · 느린 회선(1.6Mbps/150ms) · CPU 4배 느리게\n')
console.log('면'.padEnd(14), 'TTFB'.padStart(6), 'FCP'.padStart(7), 'LCP'.padStart(7), 'CLS'.padStart(8), 'TBT'.padStart(7), '반응'.padStart(7))
for (const r of rows) {
  const flag = (r.lcp > 2500 || r.cls > 0.1 || r.inp > 200 || r.tbt > 600) ? '  ←' : ''
  console.log(
    r.path.padEnd(14), String(r.ttfb).padStart(5) + 'ms', String(r.fcp).padStart(6) + 'ms',
    String(r.lcp).padStart(6) + 'ms', r.cls.toFixed(4).padStart(8),
    String(r.tbt).padStart(6) + 'ms', String(r.inp).padStart(6) + 'ms', flag,
  )
  if (r.lcp > 2500) bad.push(`${r.path} LCP ${r.lcp}ms (기준 2500)`)
  if (r.cls > 0.1) bad.push(`${r.path} CLS ${r.cls.toFixed(4)} (기준 0.1)`)
  if (r.inp > 200) bad.push(`${r.path} 반응 ${r.inp}ms (기준 200)`)
  if (r.tbt > 600) bad.push(`${r.path} TBT ${r.tbt}ms (기준 600)`)
}
const shifted = rows.filter((r) => r.shifts.length)
if (shifted.length) {
  console.log('\n[레이아웃이 밀린 지점]')
  for (const r of shifted) for (const s of r.shifts.slice(0, 3)) console.log(`  ${r.path}  ${s.v}  ${s.el}`)
}
if (bad.length) {
  console.log('\n기준 초과 ' + bad.length + '건')
  for (const b of bad) console.log('  ' + b)
  process.exitCode = 1
} else {
  console.log('\n기준 초과 0건')
}
