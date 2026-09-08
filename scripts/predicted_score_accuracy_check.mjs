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
const ses = await all('/rest/v1/quiz_sessions?select=id,user_id,year,round,score,total,completed_at&program=eq.silyong&year=lt.9000&completed_at=not.is.null')
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

// ── 3) 실제 시험 점수와 대조 ─────────────────────────────────────────────
// 지금까지는 전부 'AI 채점 기준'으로만 맞다. 진짜 답안지는 사람들이 시험을 보고 올려 주는
// 성적(reviews.exam_score, 인증본 확인분)이다. 표본이 쌓이면 여기서 치우침이 드러난다.
{
  const revs = await all('/rest/v1/reviews?select=user_id,exam_score,verified&exam_score=not.is.null')
  const verified = revs.filter(r => r.verified)
  if (verified.length === 0) {
    ok('실제 시험 점수 표본', '아직 0건 — 시험 뒤 인증 후기가 들어오면 여기서 대조한다')
  } else {
    const diffs = []
    for (const r of verified) {
      const mine = ses.filter(s => s.user_id === r.user_id && s.total)
      if (!mine.length) continue
      const ids = new Set(mine.map(s => s.id))
      const essays = ans.filter(a => ids.has(a.session_id))
        .map(a => ({ aiScore: Number(a.ai_score) || 0, points: qById[a.question_id]?.points ?? null }))
      const p = predictScore({
        objectiveCorrect: mine.reduce((s, x) => s + (x.score ?? 0), 0),
        objectiveAnswered: mine.reduce((s, x) => s + (x.total ?? 0), 0),
        essays, weight,
      })
      if (p) diffs.push(p.score - r.exam_score)
    }
    if (diffs.length < 5) {
      ok('실제 시험 점수 표본', `${diffs.length}건 — 5건부터 치우침을 판단한다`)
    } else {
      const bias = mean(diffs)
      const mae = mean(diffs.map(Math.abs))
      if (Math.abs(bias) <= 60) ok('실제 점수와 견줘 치우침이 크지 않다', `평균 ${bias > 0 ? '+' : ''}${bias.toFixed(0)}점 · 평균오차 ${mae.toFixed(0)}점 (${diffs.length}건)`)
      else bad('실제 점수 대비 치우침', `평균 ${bias > 0 ? '+' : ''}${bias.toFixed(0)}점 — 기준값을 다시 재야 한다 (${diffs.length}건)`)
    }
  }
}

// ── 4) 더 손대면 나아지나 ────────────────────────────────────────────────
// 두 가지를 재 보고 안 넣었다(2026-09-08). 데이터가 쌓이면 답이 바뀔 수 있으므로 매번 다시 잰다.
//   · 회차 난이도 보정 — 회차 평균이 흔들려(응시 4명짜리 회차도 있다) 되레 나빠졌다
//   · 서술형 문항 난이도 보정 — 배점 구간별 득점률이 15%p 벌어지는데도 나아지지 않았다
// 어느 쪽이든 '지금 방식보다 뚜렷하게 낫다'가 되면 그때 넣는다.
{
  // 회차 보정: 서로 다른 회차를 이어 푼 짝에서, 앞 회차로 뒤 회차를 맞혀 본다
  const byRound = {}
  for (const s of ses) {
    if (!s.total) continue
    const k = `${s.year}-${s.round}`
    ;(byRound[k] = byRound[k] ?? []).push((s.score ?? 0) / s.total)
  }
  const roundMean = Object.fromEntries(Object.entries(byRound).map(([k, v]) => [k, mean(v)]))
  const byUser = {}
  for (const s of [...ses].sort((a, b) => String(a.completed_at).localeCompare(String(b.completed_at)))) {
    if (s.total) (byUser[s.user_id] = byUser[s.user_id] ?? []).push(s)
  }
  const raw = []
  const adj = []
  for (const v of Object.values(byUser)) {
    for (let i = 0; i < v.length - 1; i++) {
      const a = v[i]
      const b = v[i + 1]
      const ka = `${a.year}-${a.round}`
      const kb = `${b.year}-${b.round}`
      if (ka === kb) continue
      const ra = (a.score ?? 0) / a.total
      const rb = (b.score ?? 0) / b.total
      raw.push(Math.abs(ra - rb))
      adj.push(Math.abs(Math.min(1, Math.max(0, ra - (roundMean[ka] - roundMean[kb]))) - rb))
    }
  }
  if (raw.length < 10) ok('회차 보정 실험', `짝이 ${raw.length}건뿐 — 판단 보류`)
  else if (mean(adj) >= mean(raw) - 0.02) {
    ok('회차 난이도 보정은 아직 넣을 이유가 없다', `보정 없이 ${(mean(raw) * 300).toFixed(0)}점 · 보정 ${(mean(adj) * 300).toFixed(0)}점`)
  } else {
    bad('회차 보정이 이제 더 낫다', `보정 없이 ${(mean(raw) * 300).toFixed(0)}점 → 보정 ${(mean(adj) * 300).toFixed(0)}점 — 넣을 때가 됐다`)
  }

  // 서술형 문항 난이도 보정: 작은 문항만 채점됐다고 치고 그 회차 전체 득점률을 맞혀 본다
  const classSum = {}
  for (const a of ans) {
    const q = qById[a.question_id]
    if (!q?.points || q.type !== 'essay') continue
    const c = (classSum[q.points] = classSum[q.points] ?? { got: 0, max: 0 })
    c.got += Number(a.ai_score) || 0
    c.max += q.points
  }
  const classRate = Object.fromEntries(Object.entries(classSum).map(([p, c]) => [p, c.got / c.max]))
  const overall = Object.values(classSum).reduce((s, c) => s + c.got, 0) / (Object.values(classSum).reduce((s, c) => s + c.max, 0) || 1)
  const rawE = []
  const normE = []
  for (const e of graded) {
    const items = e.grades
    const totalPts = items.reduce((s, x) => s + x.points, 0)
    if (totalPts < 600) continue
    const truth = items.reduce((s, x) => s + x.aiScore, 0) / totalPts
    const small = items.filter(x => x.points <= 50)
    const max = small.reduce((s, x) => s + x.points, 0)
    if (max < 60) continue
    const got = small.reduce((s, x) => s + x.aiScore, 0)
    const expected = small.reduce((s, x) => s + x.points * (classRate[x.points] ?? overall), 0)
    rawE.push(Math.abs(got / max - truth))
    normE.push(Math.abs(Math.min(1, (got / (expected || 1)) * overall) - truth))
  }
  if (rawE.length < 10) ok('문항 난이도 보정 실험', `표본 ${rawE.length}건 — 판단 보류`)
  else if (mean(normE) >= mean(rawE) - 0.02) {
    ok('문항 난이도 보정도 아직 넣을 이유가 없다', `그냥 ${(mean(rawE) * 700).toFixed(0)}점 · 보정 ${(mean(normE) * 700).toFixed(0)}점`)
  } else {
    bad('문항 난이도 보정이 이제 더 낫다', `그냥 ${(mean(rawE) * 700).toFixed(0)}점 → 보정 ${(mean(normE) * 700).toFixed(0)}점 — 넣을 때가 됐다`)
  }
}

console.log('\n예상 점수 정밀도\n')
for (const r of results) console.log(`${r.ok ? '  o' : '  x'} ${r.n}${r.d ? ` — ${r.d}` : ''}`)
const failed = results.filter(r => !r.ok).length
console.log(failed ? `\n${failed}건 고칠 것이 있습니다.` : '\n예상 점수가 데이터와 맞다.')
process.exit(failed ? 1 : 0)
