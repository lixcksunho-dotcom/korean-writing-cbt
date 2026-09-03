// 서버 함수가 사용자·DB와 같은 편에서 도는지 본다.
//   npm run check:region
//
// 왜 필요한가: 로그인 뒤 화면이 1.2~1.4초 걸렸다. 문서는 13KB뿐이고 첫바이트는 22ms인데
// 응답이 끝나는 데 1.2초였다 — 전송이 아니라 서버가 그동안 조회를 기다린 것이다.
//
// 답은 응답 헤더에 있었다. X-Vercel-Id: icn1::iad1 — 요청은 서울로 들어오는데 함수는
// 미국 동부에서 돌고 있었다. Supabase는 아시아·태평양에 있다. 사용자도 DB도 아시아인데
// 그 사이 계산만 태평양을 두 번 건넜다. 서울로 옮기니 응답 완료가 1364ms에서 360ms가 됐다.
//
// 이건 코드를 안 건드려도 되돌아갈 수 있다(설정 한 줄, 플랫폼 기본값 변경). 그리고
// 되돌아가도 화면은 멀쩡하다 — 그냥 느려질 뿐이라 아무도 신고하지 않는다.

const BASE = process.env.REGION_CHECK_BASE ?? 'https://kptest.cloud'
const WANT = 'icn1'

let pass = 0, fail = 0
const ok = (n, d = '') => { pass++; console.log(`  ○ ${n}${d ? ` — ${d}` : ''}`) }
const bad = (n, d = '') => { fail++; console.log(`  × ${n}${d ? ` — ${d}` : ''}`) }

console.log(`\n서버가 어디서 도는가 — ${BASE}\n`)

// 동적 경로여야 의미가 있다. 정적 페이지는 엣지에서 나가므로 함수 지역이 안 드러난다.
const DYNAMIC = ['/api/promo/quota', '/dashboard']

for (const path of DYNAMIC) {
  let res
  try {
    res = await fetch(BASE + path, { redirect: 'manual' })
  } catch (e) {
    bad(`${path} 를 못 읽었다`, String(e.message).slice(0, 60)); continue
  }
  const id = res.headers.get('x-vercel-id') ?? ''
  if (!id) { bad(`${path} 에 실행 지역 표시가 없다`, 'Vercel 배포가 아닌가'); continue }

  // 'icn1::iad1' 은 서울로 들어와 미국에서 돈다는 뜻이다. 뒤쪽이 실제 실행 지역이다.
  const hops = id.split('::').filter(h => /^[a-z]{3}\d$/.test(h))
  const ran = hops[hops.length - 1] ?? '(모름)'
  if (ran === WANT) ok(`${path} 는 ${ran} 에서 돈다`, id.split('::').slice(0, 2).join('::'))
  else bad(`${path} 가 ${ran} 에서 돈다`, `${WANT} 이어야 한다 — 조회마다 태평양을 건넌다`)
}

// 지역이 맞아도 실제로 빠른지 본다. 지역은 원인일 뿐이고, 사람이 겪는 것은 시간이다.
// /dashboard 는 로그인이 없으면 리다이렉트만 하고 끝나 조회를 안 탄다. 그래서 로그인
// 없이도 DB를 한 번 읽는 경로로 잰다 — 여기가 느리면 로그인 뒤 화면은 더 느리다.
{
  const path = '/api/promo/quota'
  const times = []
  for (let i = 0; i < 3; i++) {
    const t0 = Date.now()
    await fetch(BASE + path, { redirect: 'manual' }).then(r => r.text()).catch(() => {})
    times.push(Date.now() - t0)
  }
  // 첫 번째는 함수가 잠들어 있었을 수 있다 — 가장 빠른 값으로 본다.
  const best = Math.min(...times)
  const LIMIT = 600
  if (best <= LIMIT) ok(`${path} 응답 ${best}ms`, `한도 ${LIMIT}ms`)
  else bad(`${path} 응답 ${best}ms`, `한도 ${LIMIT}ms를 넘었다`)
}

console.log(`\n${fail ? '서버가 멀리서 돈다.' : '서버가 가까이서 돈다.'}`)
process.exitCode = fail ? 1 : 0
