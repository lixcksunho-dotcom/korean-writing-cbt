// 로그인이 필요 없는 페이지가 인증 SDK를 함께 내려보내는지 본다.
//   npm run check:bundle
//   BUNDLE_CHECK_BASE=http://127.0.0.1:4711 npm run check:bundle
//
// 왜 필요한가: 홈이 Supabase 클라이언트 SDK를 싣고 있었다. 압축 63KB, 풀면 242KB다.
// 홈은 로그인을 안 쓴다 — 꺼져 있는 이벤트 팝업 하나가 그걸 정적으로 물고 있었다.
// 아무도 못 보는 팝업 때문에 첫 방문자 전원이 242KB를 받아 해석한 셈이다.
//
// 이런 건 조용히 되돌아온다. 클라이언트 부품 하나에 import 한 줄만 늘면 그만이라,
// 화면은 멀쩡하고 아무 경고도 안 뜬다.
//
// .next 폴더를 읽지 않는다: 개발 서버를 띄우는 다른 검사가 그 자리를 덮어쓰고,
// 개발 빌드는 코드 분할이 달라서 멀쩡한 코드를 실패라고 말한다. 실제 응답만 본다.

import zlib from 'node:zlib'

const BASE = process.env.BUNDLE_CHECK_BASE ?? 'https://kptest.cloud'

let pass = 0, fail = 0
const ok = (n, d = '') => { pass++; console.log(`  ○ ${n}${d ? ` — ${d}` : ''}`) }
const bad = (n, d = '') => { fail++; console.log(`  × ${n}${d ? ` — ${d}` : ''}`) }

console.log(`\n공개 페이지 무게 — ${BASE}\n`)

// base64 디코더는 supabase-js만 끌고 온다 — 인증 SDK가 실렸다는 표식이다.
const isAuthSdk = (src) => src.includes('toByteArray') && src.includes('byteLength')

// 바닥(React + Next 런타임)이 200KB 근처다. 그 위로 크게 벌어지면 뭔가 새로 붙은 것이다.
const LIMIT_KB = 230

/** 로그인 없이 보는 자리들. /cbt·/login은 인증이 실제로 필요하니 여기 없다. */
const PUBLIC = ['/', '/try', '/spelling', '/manuscript-guide']

for (const route of PUBLIC) {
  let html
  try {
    const res = await fetch(BASE + route)
    if (!res.ok) { bad(`${route} 를 못 읽었다`, `HTTP ${res.status}`); continue }
    html = await res.text()
  } catch (e) {
    bad(`${route} 를 못 읽었다`, String(e.message).slice(0, 60)); continue
  }

  const chunks = [...new Set(html.match(/\/_next\/static\/chunks\/[^"]+\.js/g) ?? [])]
  if (!chunks.length) { bad(`${route} 에서 스크립트를 못 찾았다`); continue }

  let bytes = 0
  const sdkHits = []
  for (const u of chunks) {
    const src = await (await fetch(BASE + u)).text()
    // 서버마다 압축 방식이 달라 응답 헤더는 못 믿는다. 같은 잣대로 직접 압축해 잰다.
    bytes += zlib.gzipSync(src).length
    if (isAuthSdk(src)) sdkHits.push(u.split('/').pop())
  }

  if (sdkHits.length) bad(`${route} 이 인증 SDK를 싣는다`, sdkHits.join(', '))
  else ok(`${route} 은 인증 SDK를 안 싣는다`)

  const kb = bytes / 1024
  if (kb <= LIMIT_KB) ok(`${route} JS ${kb.toFixed(1)}KB`, `한도 ${LIMIT_KB}KB`)
  else bad(`${route} JS ${kb.toFixed(1)}KB`, `한도 ${LIMIT_KB}KB를 넘었다`)
}

console.log(`\n${fail ? '공개 페이지가 필요 없는 것을 싣는다.' : '공개 페이지가 받을 것만 받는다.'}`)
// process.exit()를 쓰면 fetch 핸들이 남아 윈도우에서 libuv가 죽는다 — 자연히 끝나게 둔다.
process.exitCode = fail ? 1 : 0
