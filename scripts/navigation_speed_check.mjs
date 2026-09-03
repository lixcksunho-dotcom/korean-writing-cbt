// 페이지를 옮겨갈 때 얼마나 기다리는지 잰다.
//   npm run check:nav
//   NAV_CHECK_BASE=http://127.0.0.1:4791 npm run check:nav
//
// 왜 필요한가: 첫 화면이 뜨는 속도만 재면 다 통과하는데, 정작 답답한 건 그다음이었다.
// Next는 링크가 화면에 들어와야 미리 받는다. 머리말 링크는 늘 보이니 115~167ms인데,
// 아래로 내려야 보이는 링크는 0.8~2.0초가 걸렸다 — 같은 사이트인데 여섯 배 차이다.
//
// 재는 조건은 좋은 폰이 아니라 흔한 폰이다: 4배 느린 CPU, 1.6Mbps, 지연 150ms.
// 링크가 보이자마자 바로 누르는 최악의 경우로 잰다. 읽는 동안 미리 받히면 더 빠르다.

import { chromium } from 'playwright'

const BASE = process.env.NAV_CHECK_BASE ?? 'https://kptest.cloud'

// 최근 30일 조회수 상위에서 고른, 로그인 없이 갈 수 있는 자리들.
const HOPS = [
  { to: '/manuscript-guide', limit: 700 },
  { to: '/exam-compare', limit: 700 },
  { to: '/exam-info', limit: 700 },
  { to: '/try', limit: 500 },
]

let pass = 0, fail = 0
const ok = (n, d = '') => { pass++; console.log(`  ○ ${n}${d ? ` — ${d}` : ''}`) }
const bad = (n, d = '') => { fail++; console.log(`  × ${n}${d ? ` — ${d}` : ''}`) }

console.log(`\n페이지 이동 속도 — ${BASE}`)
console.log('  (모바일·CPU 4배 느림·1.6Mbps, 링크 보이자마자 바로 누름)\n')

const browser = await chromium.launch()
try {
  for (const { to, limit } of HOPS) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const page = await ctx.newPage()
    const cdp = await ctx.newCDPSession(page)
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false, latency: 150,
      downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8,
    })
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    // 일정 안내를 이미 본 것으로 두고 시작한다 — 여기서 재려는 것은 이동 시간이다.
    await page.addInitScript(() => {
      try { sessionStorage.setItem('kpt_schedule_seen_silyong', '1') } catch { /* 저장이 막힌 브라우저 */ }
    })

    try {
      await page.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 })
      await page.waitForTimeout(4000) // 미리 받을 틈
      const link = page.locator(`a[href="${to}"]`).first()
      if (!(await link.count())) { bad(`${to} 로 가는 링크가 홈에 없다`); continue }

      await link.scrollIntoViewIfNeeded()
      const t0 = Date.now()
      await link.click()
      await page.waitForURL(u => u.pathname === to, { timeout: 25000 })
      await page.locator('h1, h2').first().waitFor({ state: 'visible', timeout: 25000 })
      const ms = Date.now() - t0

      const feel = ms < 300 ? '즉시' : ms < 700 ? '괜찮음' : '답답함'
      if (ms <= limit) ok(`/ → ${to}`, `${ms}ms ${feel}`)
      else bad(`/ → ${to}`, `${ms}ms — 한도 ${limit}ms를 넘었다`)
    } catch (e) {
      bad(`/ → ${to}`, String(e.message).split('\n')[0].slice(0, 70))
    } finally {
      await ctx.close()
    }
  }
} finally {
  await browser.close()  // 닫지 않으면 프로세스가 안 끝나고 검사가 시간 초과로 죽는다
}

console.log(`\n${fail ? '옮겨갈 때 기다리는 자리가 있다.' : '옮겨가도 기다리지 않는다.'}`)
process.exitCode = fail ? 1 : 0
