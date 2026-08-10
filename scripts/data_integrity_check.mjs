// 운영 데이터가 앞뒤로 맞는지 본다.
//   npm run check:data
//
// 왜 필요한가: 이 코드베이스에서 가장 자주 난 사고가 '쓰기가 조용히 실패한 것'이다.
// supabase-js는 throw 대신 {error}를 돌려주는데 그걸 안 받으면 실패가 그대로 지나가고,
// 읽는 쪽은 대개 `?? []`라 화면이 "0건"으로 멀쩡해 보인다. 브라우저 E2E로는 절대 안 잡힌다.
// 실제로 시험 제출에서 답안 insert가 실패해 **답안 없이 세션만 '완료'로 남은 적**이 있다
// (2026-06-01·06-06 두 건이 아직 남아 있다 — 고친 뒤로는 늘지 않았다).
//
// 화면이 아니라 데이터끼리 대조하면 그런 어긋남이 드러난다.
//
// PostgREST는 한 번에 1000행만 준다(limit을 크게 줘도 조용히 잘린다). Range로 넘긴다.
import fs from 'node:fs'

const ENV = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8').split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const SB = ENV.NEXT_PUBLIC_SUPABASE_URL
const KEY = ENV.SUPABASE_SERVICE_ROLE_KEY

async function all(path, order) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${SB}/rest/v1/${path}&order=${order}`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Range: `${from}-${from + 999}` },
    })
    const rows = await res.json()
    if (!Array.isArray(rows)) throw new Error(`${path.split('?')[0]} 조회 실패: ${JSON.stringify(rows).slice(0, 140)}`)
    out.push(...rows)
    if (rows.length < 1000) return out
  }
}

// 2026-06-01·06-06 두 건은 답안 insert 실패를 고치기 전의 기록이다. 지우면 그 사람의
// 시험 기록이 사라지므로 남겨 두고, '이보다 늘면 실패'로 감시한다.
const KNOWN_EMPTY_DONE = 2

const problems = []
const notes = []

try {
  const [sessions, answers, questions, bookmarks, reports, users] = await Promise.all([
    all('quiz_sessions?select=id,user_id,completed_at,score,total,year,round', 'started_at'),
    all('quiz_answers?select=session_id,question_id,ai_score', 'session_id'),
    all('questions?select=id', 'id'),
    all('bookmarks?select=user_id,question_id', 'created_at'),
    all('question_reports?select=id,question_id,resolved', 'created_at'),
    fetch(`${SB}/auth/v1/admin/users?per_page=200`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })
      .then((r) => r.json()).then((j) => j.users ?? []),
  ])

  const qid = new Set(questions.map((q) => q.id))
  const sid = new Set(sessions.map((s) => s.id))
  const uid = new Set(users.map((u) => u.id))
  const answerCount = {}
  for (const a of answers) answerCount[a.session_id] = (answerCount[a.session_id] ?? 0) + 1

  notes.push(`세션 ${sessions.length} · 답안 ${answers.length} · 문항 ${questions.length} · 북마크 ${bookmarks.length} · 신고 ${reports.length} · 계정 ${users.length}`)

  // 1) 완료로 표시됐는데 답안이 하나도 없다 = 제출이 반만 성공한 것이다.
  //    사용자는 결과 화면에서 0점을 보고, 다시 풀 수도 없다(completed_at이 이미 찍혔다).
  const emptyDone = sessions.filter((s) => s.completed_at && !answerCount[s.id])
  if (emptyDone.length > KNOWN_EMPTY_DONE) {
    problems.push(`완료 표시인데 답안 0건인 세션 ${emptyDone.length}건 (알려진 과거분 ${KNOWN_EMPTY_DONE}건 초과) — 답안 저장이 조용히 실패하고 있다`)
  } else if (emptyDone.length) {
    notes.push(`완료 표시인데 답안 0건 ${emptyDone.length}건 — 모두 2026-06 고치기 전 기록(늘지 않았다)`)
  }

  // 2) 참조가 끊긴 행. 화면에서는 빈 칸·사라진 문항으로 나타난다.
  const orphan = [
    ['없는 세션을 가리키는 답안', answers.filter((a) => !sid.has(a.session_id)).length],
    ['없는 문항을 가리키는 답안', answers.filter((a) => !qid.has(a.question_id)).length],
    ['없는 문항을 가리키는 북마크', bookmarks.filter((b) => !qid.has(b.question_id)).length],
    ['없는 문항을 가리키는 신고', reports.filter((r) => !qid.has(r.question_id)).length],
    ['없는 계정의 세션', sessions.filter((s) => !uid.has(s.user_id)).length],
    ['없는 계정의 북마크', bookmarks.filter((b) => !uid.has(b.user_id)).length],
  ]
  for (const [label, n] of orphan) if (n > 0) problems.push(`${label} ${n}건`)

  // 3) 점수가 총점을 넘을 수는 없다. 넘으면 채점 계산이 틀린 것이다.
  const overScore = sessions.filter((s) => s.completed_at && (s.score ?? 0) > (s.total ?? 0))
  if (overScore.length) problems.push(`점수가 총점보다 큰 세션 ${overScore.length}건 — 채점 계산 오류`)

  // 4) 미처리 신고는 사고가 아니라 할 일이다. 쌓이면 알려 준다.
  const pending = reports.filter((r) => !r.resolved).length
  if (pending) notes.push(`미처리 문제 신고 ${pending}건 — /admin/reports`)
} catch (e) {
  problems.push('중단: ' + String(e).slice(0, 200))
}

console.log('\n운영 데이터 정합성 점검\n')
for (const n of notes) console.log('  ○ ' + n)
for (const p of problems) console.log('  × ' + p)
console.log(problems.length ? `\n문제 ${problems.length}건` : '\n문제 없음 ✓')
if (problems.length) process.exitCode = 1
