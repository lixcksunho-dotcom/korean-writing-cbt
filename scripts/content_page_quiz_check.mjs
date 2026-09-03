// 읽으러 온 사람에게 풀어볼 문제를 실제로 내주는지 본다.
//   npm run check:page-quiz
//   PAGE_QUIZ_BASE=http://127.0.0.1:4797 npm run check:page-quiz
//
// 왜 필요한가: 문제를 푼 151명은 거의 다 설명 페이지에 박힌 퀴즈에서 나온다(/try 자체는
// 90일간 조회 0건이다). 그런데 퀴즈가 빠진 페이지가 있었다 — /word-counter 138회,
// /guides 134회, /refined-words 98회가 90일 동안 아무 문제도 못 보고 지나갔다.
//
// 더 나쁜 쪽은 조용히 사라지는 경우다. InlineQuiz는 낱말에 맞는 문항이 없으면,
// TopicQuiz는 그 주제 문항이 없으면 **아무것도 안 그리고 null을 돌려준다**. 화면은
// 멀쩡해 보이고 빌드도 통과한다 — 붙였다고 생각한 자리가 비어 있어도 알 길이 없다.
//
// 그래서 소스에 적혀 있는지가 아니라 **그려진 화면에 실제로 있는지**를 본다.
//
// 목록은 손으로 적지 않는다. src/app 아래 공개 설명 페이지를 그때그때 훑어서,
// 새로 만든 페이지도 자동으로 걸리게 한다.

import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.PAGE_QUIZ_BASE ?? 'https://kptest.cloud'

// 설명 페이지가 아닌 곳. 로그인 뒤 화면·법적 고지·목록 페이지는 문제를 낼 자리가 아니다.
const NOT_CONTENT = new Set([
  '(main)', '(auth)', '(legal)', 'admin', 'api', 'auth',
  'blog',        // 글 목록 — 각 글에는 BlogCTA가 따로 붙는다
  'try',         // 여기가 문제 그 자체다
  'login', 'signup', 'forgot-password', 'reset-password',
  'terms', 'privacy', 'refund', 'support', 'sitemap',
])

let pass = 0, fail = 0
const ok = (n, d = '') => { pass++; console.log(`  ○ ${n}${d ? ` — ${d}` : ''}`) }
const bad = (n, d = '') => { fail++; console.log(`  × ${n}${d ? ` — ${d}` : ''}`) }

console.log(`\n설명 페이지가 문제를 내주는가 — ${BASE}\n`)

const pages = fs.readdirSync('src/app', { withFileTypes: true })
  .filter(d => d.isDirectory() && !NOT_CONTENT.has(d.name) && !d.name.startsWith('[') && !d.name.startsWith('_'))
  .filter(d => fs.existsSync(path.join('src/app', d.name, 'page.tsx')))
  .map(d => d.name)
  .sort()

if (!pages.length) { bad('설명 페이지를 하나도 못 찾았다'); process.exitCode = 1 }

// 두 부품이 각각 이 제목을 단다. 둘 중 하나만 있으면 된다.
const QUIZ_HEADINGS = ['지금 풀어 보세요', '읽었으면 풀어볼까요?']

for (const name of pages) {
  const url = `${BASE}/${name}`
  let html
  try {
    const res = await fetch(url)
    if (res.status === 404) continue          // 라우트가 아닌 폴더는 넘긴다
    if (!res.ok) { bad(`/${name} 를 못 읽었다`, `HTTP ${res.status}`); continue }
    html = await res.text()
  } catch (e) {
    bad(`/${name} 를 못 읽었다`, String(e.message).slice(0, 50)); continue
  }

  const hasQuiz = QUIZ_HEADINGS.some(h => html.includes(h))
  if (!hasQuiz) { bad(`/${name} 에 풀어볼 문제가 없다`, '읽고 그냥 나간다'); continue }

  // 제목만 있고 문항이 비어 있을 수도 있다 — 보기(선택지)가 실제로 실렸는지 본다.
  // 두 부품 다 보기를 props로 넘기므로 스트림 안에 options 키가 문항 수만큼 나온다.
  // 그 키는 따옴표가 이스케이프된 채로 실린다 — 역슬래시를 걷어내고 세면 두 경우가 같아진다.
  const count = (html.replace(/\\/g, '').match(/"options":/g) ?? []).length
  if (count > 0) ok(`/${name}`, `문항 ${count}개`)
  else bad(`/${name} 에 제목만 있고 문항이 비었다`, '문항을 못 찾아 빈 채로 그렸다')
}

console.log(`\n${fail ? '읽고 그냥 나가는 자리가 있다.' : '읽은 자리에서 바로 풀어볼 수 있다.'}`)
process.exitCode = fail ? 1 : 0
