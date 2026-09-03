// 처음 오는 사람이 페이지를 '다시 만드는' 비용을 물지 않는지 본다.
//   npm run check:landing-cache
//
// 왜 필요한가: 홈은 만료되면 그다음 오는 첫 사람이 재생성을 기다린다. 실측 2,835ms였고,
// 캐시가 살아 있을 때는 91ms였다. 홈 방문이 하루 13회인데 만료가 10분이었으니
// (하루 144번 만료) 거의 모든 방문자가 그 첫 사람이었다.
//
// 만료를 6시간으로 늘리고, 1시간마다 도는 예약 작업(ops\warm_pages.bat)이 대신
// 재생성을 맞도록 했다. 예열 뒤 홈 첫바이트는 2,861ms에서 91ms가 됐다. 그래서 두 가지를 함께 지켜야 한다.
//   · 들어오는 문(홈·맛보기)의 만료가 예열 주기보다 넉넉히 길 것
//   · 만료가 길어진 만큼, 내용이 바뀌는 자리에서 즉시 갱신을 걸어 둘 것
//     (안 그러면 빨라진 대신 낡은 것을 보여 준다 — 더 나쁘다)
//
// 소스를 읽어서 본다. 실제 응답의 캐시 적중은 시점에 따라 갈려서 검사로 쓰면 들쭉날쭉하다.

import fs from 'node:fs'

let pass = 0, fail = 0
const ok = (n, d = '') => { pass++; console.log(`  ○ ${n}${d ? ` — ${d}` : ''}`) }
const bad = (n, d = '') => { fail++; console.log(`  × ${n}${d ? ` — ${d}` : ''}`) }

console.log('\n첫 방문자가 재생성을 기다리지 않는가\n')

// 예열은 1시간마다 돈다. 만료가 그보다 짧으면 사람이 먼저 만나는 창이 생긴다.
// 여유를 두고 3시간을 바닥으로 잡는다 — 예열이 한두 번 밀려도 사람이 안 맞도록.
const WARM_INTERVAL_SEC = 3 * 60 * 60
const MIN_REVALIDATE = WARM_INTERVAL_SEC + 1

// 검색·광고·링크로 처음 들어오는 자리들.
const DOORS = ['src/app/page.tsx', 'src/app/try/page.tsx', 'src/app/try/[topic]/page.tsx']

for (const file of DOORS) {
  if (!fs.existsSync(file)) { bad(`${file} 이 없다`); continue }
  const src = fs.readFileSync(file, 'utf8')
  const m = src.match(/export const revalidate = (\d+)/)
  if (!m) {
    // revalidate가 아예 없으면 완전 정적이다 — 다시 만들 일이 없으니 제일 빠르다.
    if (/export const dynamic\s*=\s*['"]force-dynamic['"]/.test(src)) bad(`${file} 이 매 요청 새로 그린다`)
    else ok(`${file} 은 완전 정적이다`, '다시 만들 일이 없다')
    continue
  }
  const sec = Number(m[1])
  const h = (sec / 3600).toFixed(1).replace(/\.0$/, '')
  if (sec >= MIN_REVALIDATE) ok(`${file} 만료 ${h}시간`, '예열 주기(1시간)보다 넉넉하다')
  else bad(`${file} 만료 ${h}시간`, '3시간보다 짧다 — 예열 사이에 사람이 재생성을 맞는다')
}

// 만료가 길어진 값을 낡게 두지 않으려면, 바꾸는 쪽에서 즉시 갱신을 걸어야 한다.
const MUTATIONS = [
  { file: 'src/app/(main)/review/actions.ts', needs: ["revalidatePath('/')"], what: '후기를 쓰면 홈이 바로 바뀐다' },
  { file: 'src/app/admin/(protected)/questions/actions.ts', needs: ["revalidatePath('/')", "revalidatePath('/try'"], what: '문항을 고치면 홈·맛보기가 바로 바뀐다' },
]

for (const { file, needs, what } of MUTATIONS) {
  if (!fs.existsSync(file)) { bad(`${file} 이 없다`); continue }
  const src = fs.readFileSync(file, 'utf8')
  const missing = needs.filter(n => !src.includes(n))
  if (!missing.length) ok(what)
  else bad(`${what} — 안 걸려 있다`, missing.join(', '))
}

// 예열 스크립트가 실제로 있는지. 없으면 위 만료 시간은 근거를 잃는다.
{
  const warm = 'C:/Users/선호/ops/warm_pages.bat'
  if (fs.existsSync(warm)) ok('예열 스크립트가 있다', 'ops\\warm_pages.bat (1시간마다)')
  else console.log('  · 예열 스크립트를 못 찾았다 — 이 컴퓨터가 아닐 수 있어 실패로 세지 않는다')
}

console.log(`\n${fail ? '첫 방문자가 재생성을 기다린다.' : '첫 방문자는 만들어 둔 것을 받는다.'}`)
process.exitCode = fail ? 1 : 0
