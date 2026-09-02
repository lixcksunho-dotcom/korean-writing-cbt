// 검사들이 결과를 찍고 제대로 끝나는지 본다.
//   npm run check:exit-hygiene
//
// 왜 필요한가: exam_flow_check 가 '통과 13/13'을 찍고도 프로세스가 안 끝났다.
// 브라우저를 안 닫아서 이벤트 루프가 살아 있었던 것이다. 사람이 직접 돌리면 결과만
// 보고 넘어가니 아무도 몰랐는데, 점수판은 끝나기를 기다리다 30분 뒤 '실패'로 적었다.
// **13/13 통과한 기능이 0점으로 찍혔다.** 잣대가 앱을 잘못 말한 것이다.
//
// 브라우저를 여는 검사는 반드시 닫아야 하고, 닫는 자리는 finally 여야 한다 —
// 도중에 실패하면 close 줄을 지나치지 못한다.

import fs from 'node:fs'

let pass = 0, fail = 0
const ok = (n, d = '') => { pass++; console.log(`  ○ ${n}${d ? ` — ${d}` : ''}`) }
const bad = (n, d = '') => { fail++; console.log(`  × ${n}${d ? ` — ${d}` : ''}`) }

console.log('\n검사가 제대로 끝나는가\n')

const warn = []

const files = fs.readdirSync('scripts').filter(f => f.endsWith('.mjs'))
// 이 파일 자신은 브라우저를 안 연다 — 낱말이 들어 있을 뿐이라 스스로를 잡으면 안 된다.
const SELF = 'check_exit_hygiene_check.mjs'
const browserChecks = files
  .filter(f => f !== SELF)
  .filter(f => /await\s+chromium\.launch|=\s*await\s+chromium\.launch/.test(fs.readFileSync(`scripts/${f}`, 'utf8')))

if (browserChecks.length > 0) ok('브라우저를 여는 검사를 찾았다', `${browserChecks.length}개`)
else bad('대상', '브라우저를 여는 검사가 하나도 없다 — 찾는 방법이 틀렸을 수 있다')

for (const f of browserChecks) {
  const src = fs.readFileSync(`scripts/${f}`, 'utf8')
  // 변수 이름이 제각각이라(browser, b, ...) 이름이 아니라 '무엇을 닫는지'로 본다.
  const closes = /\.close\(\)/.test(src)
  if (closes) ok(`${f} — 닫는다`)
  else { bad(`${f} 종료`, '브라우저를 안 닫아 프로세스가 안 끝난다'); continue }

  // finally 밖에서만 닫으면 도중에 실패했을 때 그 줄을 못 지나친다.
  // 다만 이건 '오류가 났을 때만' 새는 것이라, 아예 안 닫는 것과 무게가 다르다.
  // 실패로 막으면 멀쩡한 검사 열몇 개를 한꺼번에 뜯어고쳐야 해서 오히려 위험하다.
  const inFinally = /finally\s*\{[\s\S]*?\.close\(\)/.test(src)
  if (!inFinally) warn.push(f)
}

if (warn.length) {
  console.log(`
[알아 둘 것 — 오류가 나면 브라우저가 남는 검사 ${warn.length}개]`)
  console.log(`  ${warn.join(", ")}`)
  console.log('  통과할 때는 닫으므로 점수를 막지는 않는다. 손볼 때 finally 로 옮길 것.')
}

console.log(`\n${fail ? '끝나지 않는 검사가 있다.' : '검사가 결과를 찍고 제때 끝난다.'}`)
process.exit(fail ? 1 : 0)
