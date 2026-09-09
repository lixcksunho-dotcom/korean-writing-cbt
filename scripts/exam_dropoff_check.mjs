// 모의고사를 시작했다가 끝내지 못한 사람들이 어디서 멈추는가.
//   npm run check:dropoff
//
// 왜 필요한가: 회원 144명 중 한 회라도 끝낸 사람은 63명뿐이다(2026-09-08 실측). 나머지의
// 절반쯤은 아예 시작을 안 했고, 나머지는 시작했다가 멈췄다. 멈춘 자리가 어디인지 모르면
// 화면을 고칠지, 시험을 짧게 할지, 잠금을 풀지 아무것도 정할 수 없다.
//
// 읽기만 한다. 개인정보는 계정 id 앞 8자만 쓴다.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getProgram } from '../src/lib/programs.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ENV = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, '.env.local'), 'utf-8').split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] }),
)
const H = { apikey: ENV.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${ENV.SUPABASE_SERVICE_ROLE_KEY}` }
const all = async (p) => {
  const out = []
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${ENV.NEXT_PUBLIC_SUPABASE_URL}${p}`, { headers: { ...H, Range: `${from}-${from + 999}` } })
    const b = await r.json()
    if (!Array.isArray(b)) throw new Error(JSON.stringify(b).slice(0, 160))
    out.push(...b)
    if (b.length < 1000) break
  }
  return out
}
const short = id => String(id ?? '').slice(0, 8)
const mean = a => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0)

const cfg = getProgram('silyong')
const qs = await all('/rest/v1/questions?select=id,year,round,number,type,points&program=eq.silyong&year=lt.9000')
const qById = Object.fromEntries(qs.map(q => [q.id, q]))
const ses = await all('/rest/v1/quiz_sessions?select=id,user_id,year,round,score,total,started_at,completed_at,saved_answers,saved_at&program=eq.silyong&year=lt.9000')
const ans = await all('/rest/v1/quiz_answers?select=session_id,question_id,ai_score,is_correct')

const answered = {}
for (const a of ans) (answered[a.session_id] = answered[a.session_id] ?? []).push(a)

const done = ses.filter(s => s.completed_at)
const open = ses.filter(s => !s.completed_at)
const users = new Set(ses.map(s => s.user_id))
const finishers = new Set(done.map(s => s.user_id))
const onlyOpen = [...users].filter(u => !finishers.has(u))

console.log(`\n모의고사 이탈 지점\n`)
console.log(`시작한 회차 ${ses.length}건 (끝냄 ${done.length} · 중단 ${open.length})`)
console.log(`시작한 사람 ${users.size}명 · 한 번이라도 끝낸 사람 ${finishers.size}명 · 한 번도 못 끝낸 사람 ${onlyOpen.length}명`)

// 1) 중단한 회차는 몇 번 문항까지 갔나
const reached = []
for (const s of open) {
  // 푸는 중에는 quiz_answers 에 아무것도 안 쌓인다 — 제출할 때 한꺼번에 들어간다.
  // 진행 중 답안은 saved_answers(저장하고 나가기)에만 남으므로 그쪽을 함께 본다.
  const saved = s.saved_answers && typeof s.saved_answers === 'object' ? Object.keys(s.saved_answers) : []
  const rows = answered[s.id] ?? []
  const nums = [...saved.map(qid => qById[qid]?.number), ...rows.map(r => qById[r.question_id]?.number)].filter(n => n != null)
  reached.push({ session: s, count: Math.max(saved.length, rows.length), maxNumber: nums.length ? Math.max(...nums) : 0 })
}
console.log(`\n중간 저장이 남아 있는 회차 ${open.filter(s => s.saved_answers && Object.keys(s.saved_answers).length).length}건 · 열기만 하고 아무 흔적 없는 회차 ${reached.filter(r => r.count === 0).length}건`)
const bucket = { '0문항': 0, '1~5': 0, '6~15': 0, '16~29': 0, '30(객관식 끝)': 0, '31~38(서술형)': 0, '39(마지막)': 0 }
for (const r of reached) {
  const n = r.maxNumber
  if (n === 0) bucket['0문항']++
  else if (n <= 5) bucket['1~5']++
  else if (n <= 15) bucket['6~15']++
  else if (n <= 29) bucket['16~29']++
  else if (n === 30) bucket['30(객관식 끝)']++
  else if (n <= 38) bucket['31~38(서술형)']++
  else bucket['39(마지막)']++
}
console.log(`\n중단한 회차가 마지막으로 닿은 문항 (총 ${open.length}건)`)
for (const [k, v] of Object.entries(bucket)) if (v) console.log(`  ${k.padEnd(14)} ${v}건 ${'#'.repeat(v)}`)

// 2) 얼마나 붙잡고 있었나
const mins = open.filter(s => s.started_at).map(s => (Date.now() - new Date(s.started_at).getTime()) / 60000)
const olds = mins.filter(m => m > 60 * 24).length
console.log(`\n중단 회차 중 하루 넘게 열려 있는 것 ${olds}건 — 이어풀기가 살아 있는지, 아니면 잊힌 기록인지의 문제다`)

// 3) 끝낸 사람들은 얼마나 걸렸나(시험 시간 대비)
const spent = done.filter(s => s.started_at && s.completed_at)
  .map(s => (new Date(s.completed_at).getTime() - new Date(s.started_at).getTime()) / 60000)
  .filter(m => m > 0 && m < 60 * 12)
  .sort((a, b) => a - b)
if (spent.length) {
  const med = spent[Math.floor(spent.length / 2)]
  console.log(`\n끝낸 회차 소요 시간: 중앙값 ${med.toFixed(0)}분 · 가장 짧은 ${spent[0].toFixed(0)}분 · 가장 긴 ${spent[spent.length - 1].toFixed(0)}분 (시험 시간 ${cfg.examMinutes}분)`)
  console.log(`  ${cfg.examMinutes}분을 넘긴 회차 ${spent.filter(m => m > cfg.examMinutes).length}건 · 10분 안에 끝낸 회차 ${spent.filter(m => m < 10).length}건`)
}

// 4) 무료 회차 잠금이 이탈과 관계있나 — 무료 범위(1~N회차)와 그 밖을 나눠 본다
const freeRounds = cfg.freeRounds
const inFree = s => Number(s.round) <= freeRounds
console.log(`\n무료 회차(${freeRounds}회차까지) 기준`)
console.log(`  무료 범위: 시작 ${ses.filter(inFree).length}건 · 끝냄 ${done.filter(inFree).length}건`)
console.log(`  그 밖:     시작 ${ses.filter(s => !inFree(s)).length}건 · 끝냄 ${done.filter(s => !inFree(s)).length}건`)

// 5) 한 번도 못 끝낸 사람들의 마지막 흔적
console.log(`\n한 번도 못 끝낸 사람 ${onlyOpen.length}명 (계정 앞 8자)`)
for (const u of onlyOpen.slice(0, 15)) {
  const mine = open.filter(s => s.user_id === u)
  const best = Math.max(...mine.map(s => (answered[s.id] ?? []).length))
  const last = mine.map(s => s.started_at).sort().pop()
  console.log(`  ${short(u)} · 시작 ${mine.length}회 · 가장 많이 푼 것 ${best}문항 · 마지막 ${String(last).slice(0, 10)}`)
}
if (onlyOpen.length > 15) console.log(`  … 외 ${onlyOpen.length - 15}명`)

// 결론 — 한때 '시작'의 뜻이 두 가지였다.
// 2026-09-09 전에는 /cbt/[회차] 화면을 여는 순간 세션 행이 생겼다. 그래서 눌러 보고 바로
// 나간 것까지 '시작'에 섞였다(그때 118건 중 112건). 지금은 시작 안내를 거쳐 '시작하기'를
// 누른 사람에게만 행이 생긴다 — 아래 마지막 줄이 그 문이 계속 닫혀 있는지 지킨다.
// 시작 안내가 배포된 시각(UTC). 이 뒤로는 '시작하기'를 누른 사람에게만 세션이 생긴다.
const GATE_FROM = '2026-09-09T04:35:00'
const touched = reached.filter(r => r.count > 0).length
console.log(`\n─────────────`)
console.log(`화면만 열고 나간 회차 ${reached.filter(r => r.count === 0).length}건 (대부분 시작 안내가 생기기 전에 쌓인 것)`)
console.log(`실제로 풀다 만 회차 ${touched}건`)
console.log(done.length + touched === 0
  ? '완주율: 아직 푼 회차가 없다'
  : `완주율: 열어 본 것까지 세면 ${(done.length / ses.length * 100).toFixed(0)}% · 한 문제라도 푼 것만 세면 ${(done.length / (done.length + touched) * 100).toFixed(0)}%`)

// 시작 안내를 넣은 뒤의 빈 세션은 뜻이 다르다 — 이제는 '시작하기를 누르고도 한 문제도 안 푼
// 사람'이다(게이트가 살아 있는지는 check:entry 가 매번 눌러서 확인한다). 그러니 실패로 다루지
// 않고 비율만 지켜본다. 절반을 훌쩍 넘으면 시작 화면 다음에서 돌아선다는 뜻이라 알린다.
const after = reached.filter(r => String(r.session.started_at ?? '') >= GATE_FROM)
const doneAfter = done.filter(s => String(s.started_at ?? '') >= GATE_FROM).length
const emptyAfter = after.filter(r => r.count === 0).length
const startedAfter = doneAfter + after.length
console.log(`\n시작 안내 배포 뒤 시작한 회차 ${startedAfter}건 — 끝냄 ${doneAfter} · 시작만 하고 안 푼 것 ${emptyAfter}`)
if (startedAfter >= 10 && emptyAfter / startedAfter > 0.7) {
  console.log(`× 시작하고도 안 푸는 비율이 ${(emptyAfter / startedAfter * 100).toFixed(0)}% — 시험 첫 화면에서 돌아서고 있다`)
  process.exit(1)
}
if (startedAfter < 10) console.log('  (표본 10건 전에는 비율로 판단하지 않는다)')
