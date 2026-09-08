// 예상 점수가 실제로 더 잘 맞는지, 그리고 기준값이 아직 유효한지 본다.
//   npm run check:score
//
// 왜 필요한가: 예상 점수는 틀려도 아무 표가 안 난다 — 화면에는 늘 숫자가 하나 떠 있다.
// 서술형을 안 받은 사람의 서술형 득점률을 객관식 정답률로 대신하던 때에도 화면은 멀쩡했고,
// 700점 구간이 통째로 100점 넘게 부풀어 있었다(2026-09-08 실측 발견).
//
// 그래서 채점이 끝난 회차를 답안지로 삼는다. 서술형 점수를 알고 있는 회차에서 '서술형을
// 모른다고 치고' 예측한 뒤, 진짜 값과 얼마나 벌어지는지를 옛 방식과 견준다.
// 기준값(ESSAY_BASELINE_RATE 등)이 지금 데이터와 멀어지면 여기서 잡힌다.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  predictScore, essayOwnRate,
  ESSAY_BASELINE_RATE, ESSAY_TOTAL_SD,
} from '../src/lib/predictedScore.ts'
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

const results = []
const ok = (n, d = '') => results.push({ ok: true, n, d })
const bad = (n, d = '') => results.push({ ok: false, n, d })
const mean = a => a.reduce((s, x) => s + x, 0) / (a.length || 1)

const weight = getProgram('silyong').weight

// ── 1) 규칙이 뜻대로 움직이는가 ───────────────────────────────────────────
{
  const noEssay = predictScore({ objectiveCorrect: 30, objectiveAnswered: 30, essays: [], weight })
  if (noEssay.basis === 'baseline') ok('서술형을 안 받았으면 평균으로 잡는다', `${noEssay.score}점`)
  else bad('미채점 처리', noEssay.basis)
  // 만점자라도 서술형을 모르면 만점이 될 수 없다 — 옛 방식은 1000점을 찍었다.
  if (noEssay.score < weight.objective + weight.essay * 0.8) ok('객관식 만점이 서술형 만점으로 번지지 않는다', `${noEssay.score}점`)
  else bad('과대 추정', `${noEssay.score}점`)

  const full = predictScore({
    objectiveCorrect: 30, objectiveAnswered: 30,
    essays: Array.from({ length: 9 }, () => ({ aiScore: 70, points: 100 })), weight,
  })
  if (full.basis === 'own') ok('한 회차를 다 채점받으면 그 사람 값을 쓴다', `비중 ${(full.essayOwnWeight * 100).toFixed(0)}%`)
  else bad('축소', `비중 ${full.essayOwnWeight}`)
  if (full.high - full.low < noEssay.high - noEssay.low) ok('채점을 받으면 범위가 좁아진다', `${full.high - full.low}점 < ${noEssay.high - noEssay.low}점`)
  else bad('범위', `${full.high - full.low} vs ${noEssay.high - noEssay.low}`)

  const few = predictScore({ objectiveCorrect: 4, objectiveAnswered: 5, essays: [], weight })
  const many = predictScore({ objectiveCorrect: 24, objectiveAnswered: 30, essays: [], weight })
  if (few.high - few.low > many.high - many.low) ok('푼 문제가 적으면 범위가 넓다', `${few.high - few.low}점 > ${many.high - many.low}점`)
  else bad('표본 반영', `${few.high - few.low} vs ${many.high - many.low}`)

  if (predictScore({ objectiveCorrect: 0, objectiveAnswered: 0, essays: [], weight }) === null) ok('푼 것이 없으면 점수를 만들지 않는다')
  else bad('빈 기록', '없는 점수를 만든다')
}

// ── 2) 실제 데이터로 옛 방식과 견준다 ────────────────────────────────────
const qs = await all('/rest/v1/questions?select=id,points,type&program=eq.silyong&year=lt.9000')
const qById = Object.fromEntries(qs.map(q => [q.id, q]))
const ses = await all('/rest/v1/quiz_sessions?select=id,user_id,score,total,completed_at&program=eq.silyong&year=lt.9000&completed_at=not.is.null')
const sesById = Object.fromEntries(ses.map(s => [s.id, s]))
const ans = await all('/rest/v1/quiz_answers?select=session_id,question_id,ai_score&ai_score=not.is.null')

const bySession = {}
for (const a of ans) {
  const q = qById[a.question_id]
  const s = sesById[a.session_id]
  if (!q || !s?.total) continue
  const e = (bySession[a.session_id] = bySession[a.session_id] ?? { grades: [], obj: (s.score ?? 0) / s.total, answered: s.total })
  e.grades.push({ aiScore: Number(a.ai_score) || 0, points: Number(q.points) || 0 })
}
// 채점이 충분히 된 회차만 답안지로 쓴다(한두 문항으로는 그 회차 서술형 실력을 못 본다).
const graded = Object.values(bySession).filter(e => essayOwnRate(e.grades).points >= 100)
if (graded.length < 20) {
  bad('답안지', `채점된 회차가 ${graded.length}건뿐 — 견줄 표본이 모자란다`)
} else {
  ok('답안지로 쓸 회차', `${graded.length}건`)
  const errNew = []
  const errOld = []
  const trueRates = []
  let covered = 0
  for (const e of graded) {
    const truth = essayOwnRate(e.grades)
    trueRates.push(truth.rate)
    const trueScore = Math.round(e.obj * weight.objective + truth.rate * weight.essay)
    // 서술형을 모른다고 치고 예측 — 지금 방식
    const now = predictScore({ objectiveCorrect: e.obj * e.answered, objectiveAnswered: e.answered, essays: [], weight })
    errNew.push(Math.abs(now.score - trueScore))
    if (trueScore >= now.low && trueScore <= now.high) covered += 1
    // 옛 방식: 서술형 득점률 = 객관식 정답률
    const old = Math.round(e.obj * weight.objective + e.obj * weight.essay)
    errOld.push(Math.abs(old - trueScore))
  }
  const mNew = mean(errNew)
  const mOld = mean(errOld)
  if (mNew < mOld) ok('서술형을 모를 때 예측이 더 가까워졌다', `평균오차 ${mOld.toFixed(0)}점 → ${mNew.toFixed(0)}점`)
  else bad('정밀도', `옛 방식 ${mOld.toFixed(0)}점 · 지금 ${mNew.toFixed(0)}점 — 나아지지 않았다`)

  const coverage = covered / graded.length
  if (coverage >= 0.85) ok('말한 범위 안에 실제가 들어온다', `${(coverage * 100).toFixed(0)}%`)
  else bad('범위가 좁다', `${(coverage * 100).toFixed(0)}%만 들어온다 — 폭을 넓혀야 한다`)

  // 기준값이 데이터와 멀어졌는지 — 멀어지면 상수를 새로 재야 한다
  const m = mean(trueRates)
  const sd = Math.sqrt(mean(trueRates.map(r => (r - m) ** 2)))
  if (Math.abs(m - ESSAY_BASELINE_RATE) <= 0.03) ok('서술형 평균 기준값이 아직 맞다', `실측 ${(m * 100).toFixed(1)}% vs 기준 ${(ESSAY_BASELINE_RATE * 100).toFixed(1)}%`)
  else bad('기준값 갱신 필요', `실측 ${(m * 100).toFixed(1)}% — ESSAY_BASELINE_RATE 를 ${m.toFixed(3)} 로`)
  if (Math.abs(sd - ESSAY_TOTAL_SD) <= 0.03) ok('서술형 편차 기준값이 아직 맞다', `실측 ${(sd * 100).toFixed(1)}%p`)
  else bad('편차 갱신 필요', `실측 ${(sd * 100).toFixed(1)}%p — ESSAY_TOTAL_SD 를 ${sd.toFixed(3)} 로`)
}

console.log('\n예상 점수 정밀도\n')
for (const r of results) console.log(`${r.ok ? '  o' : '  x'} ${r.n}${r.d ? ` — ${r.d}` : ''}`)
const failed = results.filter(r => !r.ok).length
console.log(failed ? `\n${failed}건 고칠 것이 있습니다.` : '\n예상 점수가 데이터와 맞다.')
process.exit(failed ? 1 : 0)
