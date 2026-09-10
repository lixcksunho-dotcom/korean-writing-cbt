// 돈 낸 사람이 부당하게 막히는 자리가 있는지 본다.
//   npm run check:blocks
//
// 왜 필요한가: 2026-09-09 하루에 같은 성격의 문의가 둘 왔다.
//   ① "회사 가상 데스크톱이라 로그인할 때마다 다른 기기로 잡혀 계정 공유로 막혔다"
//   ② "모의고사 4회 서술형 9번 원고지가 200자로 제한돼 있다"(실제로는 네 문단 × 200자)
// 둘 다 화면에는 아무 이상이 없고, 막힌 사람만 안다. 그래서 여기서 데이터로 본다.
//
// 읽기만 한다.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseCharLimit, hardCharCap } from '../src/lib/charLimit.ts'
import { DEVICE_LIMIT } from '../src/lib/antiSharingLimits.ts'

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

// ── 1) 글자 수 규칙이 뜻대로 읽히는가 ────────────────────────────────────
{
  const cases = [
    ['네 문단으로 작성하시오. (각 문단 200자 안팎)', 800, '문단마다 200자 → 전체 800자'],
    ['원고지 형식에 맞추어 네 문단으로 작성하고, 각 문단은 200자 내외로 한다.', 800, '같은 뜻의 다른 문장'],
    ['빈칸 ㉠~㉢을 채워 작성하시오. (각 항목 30자 내외)', 90, '항목 수를 라벨 범위에서 센다'],
    ['각 문단 200자 안팎으로 쓰시오.', null, '몇 문단인지 모르면 제한을 걸지 않는다'],
    ['800자 내외로 쓰시오.', 800, '전체 분량'],
    ['150자 이상 200자 이하로 쓰시오.', 200, '범위는 최댓값'],
    ['㉠ 40자, ㉡ 60자, ㉢ 60자 이내로 쓸 것.', 160, '라벨별 분량은 합'],
    ['한 문장으로 쓰시오.', null, '분량 표시가 없으면 제한 없음'],
  ]
  let wrong = 0
  for (const [text, want, why] of cases) {
    const got = parseCharLimit(text)
    if (got === want) continue
    wrong++
    bad(`글자 수 규칙 — ${why}`, `${got} (기대 ${want})`)
  }
  if (!wrong) ok('글자 수 규칙이 뜻대로 읽힌다', `${cases.length}가지`)
}

// ── 2) 실제 문항 중 '한 단위 분량'으로 막히는 것이 있는가 ────────────────
{
  const qs = await all('/rest/v1/questions?type=eq.essay&select=program,year,round,number,points,question&order=program,year,round,number')
  const tooTight = []
  for (const q of qs) {
    const limit = parseCharLimit(q.question)
    if (limit == null) continue
    // 단위별 분량이 적힌 문항인데 그 분량 그대로 잡혔으면, 한 문단 쓰고 막힌다는 뜻이다.
    const per = q.question.match(/(?:각|매)\s*(?:문단|단락|항목)\s*(?:은|는|당|에)?\s*(?:각각\s*)?([0-9][0-9,]*)\s*자/)
    if (per && limit === parseInt(per[1].replace(/,/g, ''), 10)) {
      tooTight.push(`${q.program} ${q.year}-${q.round} ${q.number}번(${limit}자)`)
      continue
    }
    // 원고지(300점) 보고서가 한 문단 분량으로 잠긴 경우도 같은 사고다.
    if (q.points >= 300 && limit < 400) tooTight.push(`${q.program} ${q.year}-${q.round} ${q.number}번(${q.points}점인데 ${limit}자)`)
  }
  if (tooTight.length === 0) ok('한 문단 분량으로 잠긴 문항이 없다', `서술형 ${qs.length}개 확인`)
  else bad('너무 좁은 제한', tooTight.join(' · '))

  const manuscripts = qs.filter(q => q.points >= 300)
  const limits = manuscripts.map(q => `${q.year}-${q.round}:${parseCharLimit(q.question) ?? '제한없음'}`)
  ok('원고지 문항 제한', limits.join(' · '))
}

// ── 2-2) 모범답안이 제 문제의 분량 조건을 지키는가 ───────────────────────
// 모범답안이 제한을 넘으면 두 가지가 한꺼번에 무너진다: 학습자가 그대로 따라 쓰면 조건 위반이
// 되고, AI 채점은 그 답안을 기준 삼아 채점한다. "모범답안이 130자를 넘어가서 다 작성이 안
// 됩니다"라는 문의로 드러났다(2026-09-10).
{
  const qs = await all('/rest/v1/questions?type=eq.essay&year=lt.9000&select=program,year,round,number,points,question,correct_answer')
  const len = (s) => Array.from(String(s ?? '')).filter(c => c !== String.fromCharCode(10)).length
  const over = []
  let limited = 0
  for (const q of qs) {
    const limit = parseCharLimit(q.question)
    if (limit == null) continue
    limited++
    const l = len(q.correct_answer)
    // 딱 맞출 필요는 없다 — '내외'라 조금 넘는 것은 둔다. 1.1배를 넘으면 조건 위반이다.
    if (l > limit * 1.1) over.push(`${q.year}-${q.round} ${q.number}번(제한 ${limit} · 모범답안 ${l})`)
  }
  if (!over.length) ok('모범답안이 제 분량 조건을 지킨다', `제한 있는 ${limited}문항`)
  else bad(`분량을 넘는 모범답안 ${over.length}개`, over.slice(0, 6).join(' · '))
}

// ── 3) 기기 한도에 지금 막히는 사람이 있는가 ─────────────────────────────
{
  const rows = await all('/rest/v1/device_usage?select=user_id,device_id,last_seen')
  const since = Date.now() - 24 * 3600_000
  const byUser = {}
  for (const r of rows) {
    if (new Date(r.last_seen).getTime() < since) continue
    ;(byUser[r.user_id] = byUser[r.user_id] ?? new Set()).add(r.device_id)
  }
  const blocked = Object.entries(byUser).filter(([, s]) => s.size >= DEVICE_LIMIT)
  if (blocked.length === 0) ok(`하루 안에 기기 ${DEVICE_LIMIT}대를 채운 사람이 없다`, '지금 막히는 사람 없음')
  else bad(`기기 한도에 닿은 사람 ${blocked.length}명`, blocked.map(([u, s]) => `${u.slice(0, 8)}(${s.size}대)`).join(' · '))

  // 옛 규칙(90일)이면 몇 명이 막혔을지 — 창을 좁힌 효과를 눈으로 본다.
  const since90 = Date.now() - 90 * 86400_000
  const by90 = {}
  for (const r of rows) {
    if (new Date(r.last_seen).getTime() < since90) continue
    ;(by90[r.user_id] = by90[r.user_id] ?? new Set()).add(r.device_id)
  }
  const would = Object.values(by90).filter(s => s.size >= DEVICE_LIMIT).length
  ok('참고: 옛 90일 규칙이었다면', `${would}명이 한도에 닿아 있었다`)
}

// ── 4) 제한에 걸려 잘린 답안이 실제로 있었는가 ───────────────────────────
// 제한과 '정확히 같은' 길이로 끝난 답안은 하드 캡에 잘렸다는 뜻이다. 서로 다른 사람이
// 같은 숫자에서 멈추는 것은 우연이 아니다 — 2025-1회 37번에서 12건이 모두 160자였고,
// 그중에는 '설치 비'처럼 낱말 중간에서 끊긴 답안도 있었다(2026-09-09).
{
  const qs = await all('/rest/v1/questions?type=eq.essay&select=id,year,round,number,points,question')
  const qById = Object.fromEntries(qs.map(q => [q.id, q]))
  const ans = await all('/rest/v1/quiz_answers?select=question_id,user_answer')
  const len = (s) => Array.from(s ?? '').filter(c => c !== String.fromCharCode(10)).length
  const stuck = {}
  for (const a of ans) {
    const q = qById[a.question_id]
    if (!q || !(a.user_answer ?? '').trim()) continue
    const cap = hardCharCap(parseCharLimit(q.question))
    if (cap == null) continue
    if (len(a.user_answer) === cap) {
      const k = `${q.year}-${q.round} ${q.number}번`
      stuck[k] = (stuck[k] ?? 0) + 1
    }
  }
  const many = Object.entries(stuck).filter(([, n]) => n >= 2)
  if (many.length === 0) ok('입력 한계에서 멈춘 답안이 쌓이지 않는다', '여유 캡이 제 몫을 한다')
  else bad('한계에서 멈춘 답안', many.map(([k, n]) => `${k} ${n}건`).join(' · '))
}

console.log('\n돈 낸 사람이 막히는 자리\n')
for (const r of results) console.log(`${r.ok ? '  o' : '  x'} ${r.n}${r.d ? ` — ${r.d}` : ''}`)
const failed = results.filter(r => !r.ok).length
console.log(failed ? `\n${failed}건 고칠 것이 있습니다.` : '\n부당하게 막히는 자리가 없습니다.')
process.exit(failed ? 1 : 0)
