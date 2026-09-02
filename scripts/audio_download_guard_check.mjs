// 듣기 음성이 재생기에서 그대로 새어 나가지 않는지 본다.
//   npm run check:audio-guard
//
// 왜 필요한가: 브라우저 기본 재생기의 ⋮ 메뉴에는 '다운로드'가 있다. 유료로 만든 TTS
// 음성 16회차분이 한 번 눌러서 통째로 나간다. 실제 시험 화면에도 어울리지 않는다
// (수험생이 시험 중에 음성 파일을 내려받는 시험은 없다).
//
// 주소를 직접 열면 어차피 받을 수 있으니 완전히 막지는 못한다. 그래도 화면에서
// 권하는 길은 닫아 둔다 — '막을 수 없으니 열어 둔다'는 다른 이야기다.

import fs from 'node:fs'

let pass = 0, fail = 0
const ok = (n, d = '') => { pass++; console.log(`  ○ ${n}${d ? ` — ${d}` : ''}`) }
const bad = (n, d = '') => { fail++; console.log(`  × ${n}${d ? ` — ${d}` : ''}`) }

console.log('\n듣기 음성 보호\n')

// 음성을 트는 곳을 소스에서 직접 찾는다 — 목록을 손으로 적으면 새로 생긴 자리를 놓친다.
const files = []
const walk = dir => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = `${dir}/${e.name}`
    if (e.isDirectory()) walk(p)
    else if (e.name.endsWith('.tsx')) files.push(p)
  }
}
walk('src')

const players = files.filter(p => fs.readFileSync(p, 'utf8').includes('<audio'))

if (players.length > 0) ok('음성을 트는 자리를 찾았다', `${players.length}곳`)
else bad('재생기', '<audio 를 쓰는 곳이 하나도 없다 — 듣기가 사라졌는지 확인 필요')

for (const p of players) {
  const src = fs.readFileSync(p, 'utf8')
  const name = p.split('/').pop()
  if (src.includes('controlsList="nodownload')) ok(`${name} — 다운로드 메뉴를 막았다`)
  else bad(`${name} 음성 보호`, '재생기에서 바로 내려받을 수 있다')
  if (src.includes('onContextMenu')) ok(`${name} — 오른쪽 클릭 저장도 막았다`)
  else bad(`${name} 오른쪽 클릭`, '눌러서 저장할 수 있다')
}

console.log(`\n${fail ? '음성이 새어 나갈 수 있다.' : '재생기에서 권하는 길은 닫혀 있다.'}`)
process.exit(fail ? 1 : 0)
