// 배포 직후 '사라진 조각' 오류를 알아보는지 본다.
//   npm run check:chunk
//
// 넓게 잡으면 멀쩡한 오류까지 새로고침으로 덮어 원인을 못 찾고,
// 좁게 잡으면 결제 화면이 깨진 채로 남는다(2026-08-20에 실제로 났다).
import { isStaleChunkError } from '../src/lib/staleChunkRecovery.ts'

const results = []
const eq = (name, got, want) => results.push({ ok: got === want, name, detail: `${got} (기대 ${want})` })

// 실제로 우리 서비스에서 찍힌 문구
eq('실제로 난 오류를 잡는다', isStaleChunkError('Failed to load chunk /_next/static/chunks/0~pofmi~f4.zk.js from module 98763'), true)
eq('webpack 기본 문구', isStaleChunkError('ChunkLoadError: Loading chunk 42 failed.'), true)
eq('CSS 조각도 마찬가지', isStaleChunkError('Loading CSS chunk 5 failed'), true)
eq('사파리 문구', isStaleChunkError('Importing a module script failed.'), true)
eq('vite/esm 문구', isStaleChunkError('Failed to fetch dynamically imported module: /assets/x.js'), true)
// 2026-09-02 16:14 실제 신고: /cbt/2025-1/result — Load failed
// 사파리는 'chunk'라는 말을 아예 안 써서 위 조건에 하나도 안 걸렸다.
eq('사파리는 Load failed 라고만 한다', isStaleChunkError('Load failed'), true)
eq('파이어폭스 문구', isStaleChunkError('error loading dynamically imported module'), true)

// 이런 것까지 새로고침으로 덮으면 진짜 버그를 영영 못 본다
eq('일반 자바스크립트 오류는 아니다', isStaleChunkError("Cannot read properties of undefined (reading 'map')"), false)
eq('네트워크 오류는 아니다', isStaleChunkError('Failed to fetch'), false)
eq('비슷하지만 다른 문구', isStaleChunkError('Image failed to load'), false)
eq('서버 액션 오류는 아니다', isStaleChunkError('An error occurred in the Server Components render'), false)
eq('빈 값', isStaleChunkError(''), false)
eq('없음', isStaleChunkError(undefined), false)
eq('null', isStaleChunkError(null), false)

const failed = results.filter((r) => !r.ok)
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name} — ${r.detail}`)
console.log(`\n${results.length - failed.length}/${results.length} 통과`)
process.exit(failed.length ? 1 : 0)
