// 처음 들어온 사람이 첫 버튼을 바로 누를 수 있는지 본다.
//   npm run check:first-click
//   FIRST_CLICK_BASE=http://127.0.0.1:4792 npm run check:first-click
//
// 왜 필요한가: 시험일정 안내가 세션당 1회 저절로 전면을 덮고 있었다. 홈에 들어오면
// 아무것도 읽기 전에 화면 전체가 가려지고 '가입 없이 문제 풀어보기'가 눌리지 않았다.
// 이동 속도를 재다가 클릭이 막혀서 알았다 — 화면은 멀쩡해 보여서 아무도 신고하지 않는다.
//
// 알리려던 마감일보다 먼저 만나는 것이 벽이면 안 된다. 그래서 '떴는가'가 아니라
// '눌리는가'를 본다.

import { chromium } from 'playwright'

const BASE = process.env.FIRST_CLICK_BASE ?? 'https://kptest.cloud'

let pass = 0, fail = 0
const ok = (n, d = '') => { pass++; console.log(`  ○ ${n}${d ? ` — ${d}` : ''}`) }
const bad = (n, d = '') => { fail++; console.log(`  × ${n}${d ? ` — ${d}` : ''}`) }

console.log(`\n첫 화면에서 첫 클릭 — ${BASE}\n`)

const browser = await chromium.launch()
try {
  for (const [w, h, label] of [[390, 844, '모바일'], [1280, 900, '데스크톱']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: w < 500 })
    const page = await ctx.newPage()
    try {
      // 처음 온 사람이다 — 저장된 것이 아무것도 없는 상태로 들어온다.
      await page.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 })
      await page.waitForTimeout(2500) // 저절로 뜨는 것이 있으면 이 사이에 뜬다

      const covers = page.locator('div.fixed.inset-0')
      let blocking = 0
      for (let i = 0; i < await covers.count(); i++) {
        if (await covers.nth(i).isVisible().catch(() => false)) blocking += 1
      }
      if (blocking === 0) ok(`${label}: 저절로 화면을 덮는 것이 없다`)
      else bad(`${label}: 전면을 덮는 것이 ${blocking}개 떠 있다`, '첫 클릭이 막힌다')

      // 실제로 눌러 본다. 덮개가 없어도 다른 것이 가로채면 여기서 걸린다.
      const cta = page.locator('a[href="/try"]').first()
      if (!(await cta.count())) { bad(`${label}: 홈에 체험 CTA가 없다`); continue }
      await cta.click({ timeout: 8000 })
      await page.waitForURL(u => u.pathname === '/try', { timeout: 15000 })
      ok(`${label}: 첫 CTA가 바로 눌린다`)
    } catch (e) {
      bad(`${label}: 첫 CTA를 못 눌렀다`, String(e.message).split('\n')[0].slice(0, 70))
    } finally {
      await ctx.close()
    }
  }
} finally {
  await browser.close()  // 닫지 않으면 프로세스가 안 끝난다
}

console.log(`\n${fail ? '들어오자마자 막히는 자리가 있다.' : '들어오자마자 바로 누를 수 있다.'}`)
process.exitCode = fail ? 1 : 0
