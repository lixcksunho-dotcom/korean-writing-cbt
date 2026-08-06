// 검증용으로 만든 테스트 계정과 그 부산물을 지운다.
//
// check:pages 같은 스크립트는 끝에 스스로 지우지만, 실행이 중간에 끊기면(타임아웃·Ctrl+C)
// 뒷정리를 못 한 채 남는다. 남은 계정은 /admin 대시보드의 회원 수·완료 시험 수에 그대로
// 섞여서 실제 지표를 부풀린다(npm run funnel은 이 패턴을 걸러내지만 관리자 화면은 아니다).
//
// 사용: npm run cleanup:test          (지울 목록만 보여 준다)
//       npm run cleanup:test -- --yes (실제로 지운다)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ENV = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, '.env.local'), 'utf-8')
    .split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }),
)
const SB = ENV.NEXT_PUBLIC_SUPABASE_URL
const SVC = ENV.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json' }

// 검증 스크립트들이 쓰는 주소 패턴. 실제 사용자 주소와 겹칠 수 없는 형태여야 한다.
// 숫자 뒤 알파벳 한 글자까지 받는다 — check:ui-authed는 구간마다 계정을 나누려고
// uicheck+<시각>d / +<시각>m 처럼 꼬리를 붙이는데, 그게 안 잡혀서 회원 목록에 쌓여 있었다.
const TEST_PATTERN = /^(uicheck|kbscheck|admincheck)\+\d+[a-z]?@kptest\.cloud$/
const apply = process.argv.includes('--yes')

const users = (await (await fetch(`${SB}/auth/v1/admin/users?per_page=500`, { headers: H })).json()).users ?? []
const targets = users.filter((u) => TEST_PATTERN.test(u.email ?? ''))

if (!targets.length) {
  console.log('남은 테스트 계정 없음 ✓')
} else {
  console.log(`테스트 계정 ${targets.length}개${apply ? '' : ' (미리보기 — 실제로 지우려면 -- --yes)'}`)
  for (const u of targets) {
    const sessions = await (await fetch(`${SB}/rest/v1/quiz_sessions?user_id=eq.${u.id}&select=id`, { headers: H })).json()
    const n = Array.isArray(sessions) ? sessions.length : 0
    console.log(`  ${u.email}  가입 ${String(u.created_at).slice(0, 10)} · 세션 ${n}개`)
    if (!apply) continue

    for (const s of Array.isArray(sessions) ? sessions : []) {
      await fetch(`${SB}/rest/v1/quiz_answers?session_id=eq.${s.id}`, { method: 'DELETE', headers: H })
      await fetch(`${SB}/rest/v1/quiz_sessions?id=eq.${s.id}`, { method: 'DELETE', headers: H })
    }
    for (const table of ['bookmarks', 'question_reports', 'manuscript_submissions', 'reviews', 'device_usage', 'usage_daily']) {
      await fetch(`${SB}/rest/v1/${table}?user_id=eq.${u.id}`, { method: 'DELETE', headers: H })
    }
    await fetch(`${SB}/auth/v1/admin/users/${u.id}`, { method: 'DELETE', headers: H })
  }
  if (apply) console.log(`\n${targets.length}개 삭제 완료`)
}

const real = users.filter((u) => !TEST_PATTERN.test(u.email ?? '')).length
console.log(`실제 계정 ${real}개는 건드리지 않음`)
