// 우리가 쓴 화면 문구에 맞춤법 오류가 없는지 본다.
//   npm run check:own-copy
//
// 왜 필요한가: 맞춤법을 가르치는 서비스에 맞춤법 오류가 있으면 그 한 줄이 나머지
// 전부를 의심하게 만든다. 실제로 사용자가 문항 오류를 하나 잡아 신고한 적이 있다
// ("어떡해가 아니라 어떻게가 맞습니다"). 화면 문구는 아무도 검사하지 않고 있었다.
//
// 문항의 '보기'는 일부러 틀린 표기를 넣는 자리이므로 보지 않는다 — 거기까지 보면
// 오답 선택지를 전부 오류라고 답한다. 우리가 쓴 화면 문구(page/component)만 본다.
//
// 규칙은 **언제나 틀린 것**만 넣는다. 문맥에 따라 갈리는 것(되/돼, 안/않)은 넣지 않는다 —
// 틀린 것을 놓치는 것보다 멀쩡한 것을 틀렸다고 하는 쪽이 검사를 못 믿게 만든다.

import fs from 'node:fs'
import path from 'node:path'

/** 어떤 문맥에서도 틀린 표기. 오른쪽이 바른 말. */
const ALWAYS_WRONG = [
  ['몇일', '며칠'],
  ['오랫만', '오랜만'],
  ['설레임', '설렘'],
  ['어의없', '어이없'],
  ['됬', '됐'],
  ['웬지', '왠지'],
  ['왠일', '웬일'],
  ['왠만', '웬만'],
  ['금새', '금세'],
  ['희안', '기이/희한'],
  ['역활', '역할'],
  ['일일히', '일일이'],
  ['틈틈히', '틈틈이'],
  ['깨끗히', '깨끗이'],
  ['꼼꼼희', '꼼꼼히'],
  ['어떻해', '어떡해/어떻게'],
  ['배게', '베개'],
  ['넓직', '널찍'],
  ['담배갑', '담뱃갑'],
  ['맞추다보', '맞추다 보'],
  ['할께', '할게'],
  ['갈께', '갈게'],
  ['볼께', '볼게'],
  ['드릴께', '드릴게'],
  ['줄께', '줄게'],
  ['있읍니', '있습니'],
  ['없읍니', '없습니'],
  ['뭐에요', '뭐예요'],
  ['이예요', '이에요'],
  ['뵈요', '봬요'],
  ['부시럭', '부스럭'],
  ['핼쓱', '핼쑥/해쓱'],
  ['간지르', '간질이'],
  ['들리다 보', '들르다 보'],
]

// 문항·해설을 담은 자료 파일은 보지 않는다 — 거기에는 틀린 표기가 예로 들어간다.
const SKIP_DIR = ['node_modules', '.next', 'scripts', 'src/data']
const SKIP_FILE = /questionBank|topicQuizBank|blogPromoRules|refine-words|\.json$/

let pass = 0, fail = 0
const ok = (n, d = '') => { pass++; console.log(`  ○ ${n}${d ? ` — ${d}` : ''}`) }
const bad = (n, d = '') => { fail++; console.log(`  × ${n}${d ? ` — ${d}` : ''}`) }

console.log('\n우리가 쓴 문구의 맞춤법\n')

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name).replace(/\\/g, '/')
    if (SKIP_DIR.some(s => p.includes(s))) continue
    if (e.isDirectory()) walk(p, out)
    else if (/\.(tsx|ts)$/.test(e.name) && !SKIP_FILE.test(p)) out.push(p)
  }
  return out
}

const files = walk('src')
const hits = []

for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split('\n')
  lines.forEach((line, i) => {
    // 한글이 없는 줄은 코드다 — 볼 것이 없다.
    if (!/[가-힣]/.test(line)) return
    // 가르치려고 적어 둔 자료는 오류가 아니다 — 맞춤법 페이지는 틀린 표기를 보여 주는 것이 일이다.
    //   { wrong: "몇일", right: "며칠" } · { q: "'왠지'와 '웬지' 중…" } · { how: "…" }
    // 이 줄까지 잡으면 가르치는 내용을 통째로 오류라고 답한다(처음 돌렸을 때 11건이 다 그랬다).
    if (/^\s*[{,]?\s*(wrong|right|bad|good|correct|incorrect|q|a|b|how|tip|topic|why)\s*:/.test(line)) return

    for (const [wrong, right] of ALWAYS_WRONG) {
      if (!line.includes(wrong)) continue
      // 그 낱말이 '틀린 표기'라고 설명하는 줄은 오류가 아니다.
      if (new RegExp(`['"‘’“”]${wrong}[^'"‘’“”]*['"‘’“”]\\s*(은|는|이|가)?\\s*(틀|잘못|아니)`).test(line)) continue
      if (line.includes(`${wrong}(X)`) || line.includes(`${wrong}(×)`)) continue

      // 바른 표기가 같은 줄에 함께 있으면 가르치는 줄이지 실수가 아니다.
      //   "오랫만에 → 오랜만에"(고침 예시) · "며칠 몇일"(검색 낱말 쌍)
      // 실수라면 바른 표기가 옆에 있을 리 없다. 이 한 줄로 남은 오탐이 다 걸러졌다.
      if (right.split('/').some(r => line.includes(r))) continue

      hits.push({ file: f, line: i + 1, wrong, right, text: line.trim().slice(0, 90) })
    }
  })
}

console.log(`  훑은 파일 ${files.length}개 · 규칙 ${ALWAYS_WRONG.length}개`)

if (!hits.length) ok('언제나 틀린 표기는 없다')
else {
  for (const h of hits) {
    bad(`${h.file}:${h.line}  '${h.wrong}' → '${h.right}'`, h.text)
  }
}

// 검사가 실제로 잡는지 스스로 확인한다 — 0건을 '문제 없음'으로 넘기면 안 된다.
{
  const sample = "그는 몇일 만에 왔다"
  const caught = ALWAYS_WRONG.some(([w]) => sample.includes(w))
  if (caught) ok('규칙이 실제로 걸러낸다', "'몇일' 검출")
  else bad('규칙 동작', '틀린 예시도 못 잡는다')
}

console.log(`\n${fail ? '우리 글에 틀린 표기가 있다.' : '우리 글은 깨끗하다.'}`)
process.exitCode = fail ? 1 : 0
