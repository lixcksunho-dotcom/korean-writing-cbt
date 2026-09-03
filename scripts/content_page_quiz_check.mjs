// 읽으러 온 사람에게 풀어볼 문제를 실제로 내주는지, 그리고 닿을 수 있는 자리에 두는지 본다.
//   npm run check:page-quiz
//   PAGE_QUIZ_BASE=http://127.0.0.1:4781 npm run check:page-quiz
//
// 왜 필요한가: 문제를 푼 151명은 거의 다 설명 페이지에 박힌 퀴즈에서 나온다(/try 자체는
// 90일간 조회 0건이다 — 사람은 검색으로 설명 페이지에 닿지, 맛보기 페이지로 안 들어온다).
// 그래서 이 퀴즈가 사실상 유일한 입구다. 두 가지가 다 맞아야 입구 노릇을 한다.
//
// 1) 있는가. InlineQuiz는 낱말에 맞는 문항이 없으면, TopicQuiz는 그 주제 문항이 없으면
//    **아무것도 안 그리고 null을 돌려준다**. 화면은 멀쩡하고 빌드도 통과한다 —
//    붙였다고 생각한 자리가 비어 있어도 알 길이 없다. 그래서 그려진 화면을 본다.
//
// 2) 닿는가. /spelling은 규칙 카드 29개를 다 지나야 문제가 나와서 4.3화면 아래였다.
//    다른 페이지는 1화면 안에서 풀린다. 있어도 못 보면 없는 것과 같다.

import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.PAGE_QUIZ_BASE ?? 'https://kptest.cloud'

// 설명 페이지가 아닌 곳. 로그인 뒤 화면·법적 고지·목록 페이지는 문제를 낼 자리가 아니다.
const NOT_CONTENT = new Set([
  '(main)', '(auth)', '(legal)', 'admin', 'api', 'auth',
  'blog',        // 글 목록 — 각 글에는 BlogCTA가 따로 붙는다
  'try',         // 여기가 문제 그 자체다
  'login', 'signup', 'forgot-password', 'reset-password',
  'terms', 'privacy', 'refund', 'support', 'sitemap',
])

/** 몇 화면까지 내려가도 되는가. 지금 가장 먼 곳이 1.6화면이다. */
const MAX_SCREENS = 2.0

let pass = 0, fail = 0
const ok = (n, d = '') => { pass++; console.log(`  ○ ${n}${d ? ` — ${d}` : ''}`) }
const bad = (n, d = '') => { fail++; console.log(`  × ${n}${d ? ` — ${d}` : ''}`) }

console.log(`\n설명 페이지가 문제를 내주는가 — ${BASE}`)
console.log(`  (모바일 화면 기준, 첫 문제까지 ${MAX_SCREENS}화면 이내)\n`)

const pages = fs.readdirSync('src/app', { withFileTypes: true })
  .filter(d => d.isDirectory() && !NOT_CONTENT.has(d.name) && !d.name.startsWith('[') && !d.name.startsWith('_'))
  .filter(d => fs.existsSync(path.join('src/app', d.name, 'page.tsx')))
  .map(d => d.name)
  .sort()

if (!pages.length) bad('설명 페이지를 하나도 못 찾았다')

const browser = await chromium.launch()
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const page = await ctx.newPage()

  for (const name of pages) {
    const url = `${BASE}/${name}`
    let res
    try {
      res = await page.goto(url, { waitUntil: 'load', timeout: 60000 })
    } catch (e) {
      bad(`/${name} 를 못 읽었다`, String(e.message).split('\n')[0].slice(0, 50)); continue
    }
    if (res && res.status() === 404) continue      // 라우트가 아닌 폴더는 넘긴다
    if (res && !res.ok()) { bad(`/${name} 를 못 읽었다`, `HTTP ${res.status()}`); continue }
    await page.waitForTimeout(600)

    const r = await page.evaluate(() => {
      const heads = [...document.querySelectorAll('h2')]
        .filter(el => /지금 풀어 보세요|읽었으면 풀어볼까요/.test(el.textContent ?? ''))
      const top = heads.length ? Math.round(heads[0].getBoundingClientRect().top + window.scrollY) : null
      return { found: heads.length, top, vh: window.innerHeight, html: document.documentElement.outerHTML.length }
    })

    if (!r.found) { bad(`/${name} 에 풀어볼 문제가 없다`, '읽고 그냥 나간다'); continue }

    // 제목만 있고 문항이 비어 있을 수도 있다 — 보기(선택지)가 실제로 실렸는지 본다.
    // 두 부품 다 보기를 props로 넘기므로 스트림 안에 options 키가 문항 수만큼 나온다.
    // 그 키는 따옴표가 이스케이프된 채로 실린다 — 역슬래시를 걷어내고 세면 두 경우가 같아진다.
    const body = await page.content()
    const count = (body.replace(/\\/g, '').match(/"options":/g) ?? []).length
    if (!count) { bad(`/${name} 에 제목만 있고 문항이 비었다`, '문항을 못 찾아 빈 채로 그렸다'); continue }

    const screens = r.top / r.vh
    if (screens <= MAX_SCREENS) ok(`/${name}`, `문항 ${count}개 · ${screens.toFixed(1)}화면`)
    else bad(`/${name} 의 문제가 너무 아래에 있다`, `${screens.toFixed(1)}화면 — ${MAX_SCREENS}화면 이내여야 한다`)
  }
} finally {
  await browser.close()   // 닫지 않으면 프로세스가 안 끝나고 검사가 시간 초과로 죽는다
}

console.log(`\n${fail ? '읽고 그냥 나가는 자리가 있다.' : '읽은 자리에서 바로 풀어볼 수 있다.'}`)
process.exitCode = fail ? 1 : 0
