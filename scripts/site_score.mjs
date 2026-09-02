// 사이트 점수를 매긴다 — 개발 루프에서 '나아졌는지'를 숫자로 본다.
//   npm run score
//
// 왜 필요한가: 고칠 때마다 "좋아진 것 같다"로 말하면 다음 날 무엇이 나아졌는지 아무도
// 모른다. 항목마다 근거가 있는 숫자를 만들고, 루프를 돌 때마다 같은 잣대로 다시 잰다.
//
// 배점은 이 서비스가 파는 것의 비중을 따른다. KBS패스와 다르다 — 저기는 듣기가 크지만
// 여기는 **서술형**이 전부다(선택형 300점 / 서술형 700점).
//   문제 품질 20 · 서술형 채점 25 · 점수 상승 도움 15 · 유입·전환 15 · UI 15 · 속도 10
//
// '유입·전환'을 따로 둔 이유: 아무리 좋아도 사람이 안 들어오면 값을 못 한다.
// 기능이 있는지(도움)와 사람이 닿는지(유입)는 다른 질문이다.
//
// 점수를 후하게 주지 않는다. 근거를 못 대는 항목은 0점으로 두고 무엇이 없는지 적는다.
// AI 채점은 유료 API라 여기서 실제로 부르지 않는다 — 부를 수 있는 상태인지까지만 본다.

import fs from 'node:fs'
import { execSync } from 'node:child_process'

const ENV = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8').split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] }),
)
const SB = ENV.NEXT_PUBLIC_SUPABASE_URL
const SVC = ENV.SUPABASE_SERVICE_ROLE_KEY

// PostgREST는 한 번에 1,000행까지만 준다. 그걸 모르면 5,000건이 1,000건으로 보인다.
async function apiAll(path) {
  const out = []
  for (let from = 0; ; from += 1000) {
    let res
    for (let tryN = 0; tryN < 3; tryN++) {
      try {
        res = await fetch(`${SB}${path}`, {
          headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, Range: `${from}-${from + 999}` },
          signal: AbortSignal.timeout(20000),
        })
        break
      } catch { /* 잠깐 끊기는 일이 있다 — 여기서 죽으면 점수가 통째로 없어진다 */ }
    }
    if (!res) break
    const rows = await res.json()
    if (!Array.isArray(rows) || rows.length === 0) break
    out.push(...rows)
    if (rows.length < 1000) break
  }
  return out
}

const lines = []
const say = t => { console.log(t); lines.push(t) }
let total = 0
function cat(name, got, max, notes) {
  total += got
  say(`\n■ ${name} ${got}/${max}`)
  for (const n of notes) say(`   · ${n}`)
}

// 점수는 **로컬 프로덕션 빌드**를 재서 매긴다.
//
// 처음엔 검사들이 기본값대로 프로덕션(kptest.cloud)을 봤는데, 시험 한 회차를 끝까지
// 푸는 검사가 네트워크 왕복 때문에 15분을 넘겨 시간 초과로 죽었다. 그래서 멀쩡한
// 기능이 0점으로 찍혔다(실측 — 같은 검사가 로컬에서는 13/13 통과).
// 재는 자리가 흔들리면 점수는 아무 말도 못 한다. 배포된 것이 맞는지는 배포 뒤에 따로 본다.
const LOCAL = process.env.SCORE_BASE ?? 'http://localhost:3399'
const BASE_ENV = {
  MANUSCRIPT_CHECK_BASE: LOCAL, PAID_ESSAY_BASE: LOCAL, EXAM_FLOW_BASE: LOCAL,
  RESUME_BASE: LOCAL, PAST_RESULT_BASE: LOCAL, TRIAL_BASE: LOCAL,
  CONTRAST_BASE: LOCAL, MOBILE_BASE: LOCAL, A11Y_CHECK_BASE: LOCAL,
  SUB_GATE_BASE: LOCAL, VITALS_BASE: LOCAL,
}

const failLog = []

const timings = []

// 한 검사에 15분을 줬더니 시험 한 회차를 끝까지 푸는 검사가 잘렸다. 단독으로 돌리면
// 7분에 13/13 통과하는 검사가 채점기 안에서만 0점으로 찍혔다 — 앱이 아니라 잣대가
// 틀린 것이다. 30분으로 늘리고, 어느 검사가 오래 걸리는지 함께 적는다.
const run = (cmd) => {
  const started = Date.now()
  try {
    const out = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe', timeout: 1_800_000, env: { ...process.env, ...BASE_ENV } })
    timings.push({ cmd, sec: Math.round((Date.now() - started) / 1000), ok: true })
    return { ok: true, out }
  } catch (e) {
    const out = String(e.stdout ?? '') + String(e.stderr ?? '')
    timings.push({ cmd, sec: Math.round((Date.now() - started) / 1000), ok: false })
    // 왜 실패했는지 안 남기면 다음 사람은 '0점'만 보고 무엇을 고쳐야 할지 모른다.
    // 점수판이 스스로 저지르면 안 되는 잘못이 바로 그것이다.
    failLog.push({ cmd, tail: out.split(String.fromCharCode(10)).filter(Boolean).slice(-12).join(String.fromCharCode(10)) })
    return { ok: false, out }
  }
}


// 재는 대상이 멀쩡한지 먼저 본다.
//
// 실측: 빌드가 깨져 CSS가 통째로 안 실린 서버를 그대로 채점했다. 링크가 브라우저 기본
// 파란색으로 나와 명암비가 떨어지고, 버튼이 24px로 줄어 휴대폰 검사가 깨지고, 시험
// 화면에서 보기를 못 눌러 0/39가 됐다 — 앱은 멀쩡한데 점수만 94에서 80으로 떨어졌다.
// 잘못된 바탕 위에서 잰 숫자는 아무 말도 못 한다. 그때는 채점을 아예 하지 않는다.
{
  let html = ''
  try {
    html = await (await fetch(LOCAL, { signal: AbortSignal.timeout(20000) })).text()
  } catch (e) {
    console.error(`채점 대상(${LOCAL})에 닿지 못했습니다 — 서버부터 띄우세요.`)
    process.exit(1)
  }
  const cssHref = html.match(/href="(\/_next\/static\/[^"]+\.css)"/)?.[1]
  if (!cssHref) {
    console.error(`채점 대상에 CSS가 없습니다(${LOCAL}) — 빌드가 깨졌습니다.`)
    console.error('rm -rf .next && npm run build 로 다시 만든 뒤 채점하세요.')
    process.exit(1)
  }
  const css = await fetch(`${LOCAL}${cssHref}`, { signal: AbortSignal.timeout(20000) }).catch(() => null)
  const size = css?.ok ? (await css.text()).length : 0
  if (size < 10000) {
    console.error(`채점 대상의 CSS가 비어 있습니다(${size}바이트) — 빌드가 깨졌습니다.`)
    process.exit(1)
  }
}


// 채점기 자신이 멀쩡한지 먼저 본다.
//
// 실측: 이 파일을 고치다 정의하지 않은 변수를 참조하게 만들었더니, 모든 검사가 조용히
// 실패하고 총점이 12점으로 찍혔다. 앱은 아무 문제가 없었다. 채점기가 고장 났을 때
// '앱이 나쁘다'고 말하는 것이 가장 나쁜 실패다 — 아무 것도 안 하는 편이 낫다.
{
  const probe = run('npm run --silent check:duplicates')
  if (!probe.ok && probe.out.trim() === '') {
    console.error('검사를 하나도 실행하지 못했습니다 — 채점기나 실행 환경이 고장 났습니다.')
    console.error('앱 점수가 아니라 잣대의 문제이므로 채점을 멈춥니다.')
    process.exit(1)
  }
}

say(`실글패스 사이트 점수 — ${new Date().toISOString().slice(0, 16).replace('T', ' ')} (${LOCAL})`)

// ── 1. 문제 품질 (20) ───────────────────────────────────────────────────────
{
  const notes = []
  let got = 0
  for (const [name, cmd, pt] of [
    ['문항 내용 검사', 'npm run --silent check:questions', 8],
    ['회차 안 중복 없음', 'npm run --silent check:duplicates', 4],
    ['맞춤법 문항의 답이 서로 안 어긋남', 'npm run --silent check:spelling-consistency', 4],
    ['자료 정합성', 'npm run --silent check:data', 4],
  ]) {
    const r = run(cmd)
    if (r.ok) { got += pt; notes.push(`${name} → ${pt}/${pt}`) }
    else notes.push(`${name} 실패 → 0/${pt}`)
  }
  cat('문제 품질', got, 20, notes)
}

// ── 2. 서술형 채점 (25) ─────────────────────────────────────────────────────
// 이 서비스가 파는 것. 선택형은 문제집으로도 되지만 서술형은 여기서만 된다.
{
  const notes = []
  let got = 0

  const keyed = !!(ENV.GEMINI_API_KEY || ENV.OPENAI_API_KEY || ENV.ANTHROPIC_API_KEY)
  if (keyed) { got += 4; notes.push('채점 API 키가 설정돼 있다 → 4/4') }
  else notes.push('채점 API 키가 없다 — 채점이 아예 안 된다 → 0/4')

  for (const [name, cmd, pt] of [
    ['원고지 채점 화면이 끝까지 돈다', 'npm run --silent check:manuscript', 7],
    ['유료 전환 뒤에도 이어서 채점된다', 'npm run --silent check:paid-essay-resume', 6],
    ['채점 결과가 결과 화면에 닿는다', 'npm run --silent check:report', 4],
    ['구독 잠금이 정확히 걸린다', 'npm run --silent check:sub-gate', 4],
  ]) {
    const r = run(cmd)
    if (r.ok) { got += pt; notes.push(`${name} → ${pt}/${pt}`) }
    else notes.push(`${name} 실패 → 0/${pt}`)
  }
  cat('서술형 채점', got, 25, notes)
}

// ── 3. 점수를 올려 주는가 (15) ──────────────────────────────────────────────
{
  const notes = []
  let got = 0
  for (const [name, cmd, pt] of [
    ['시험을 끝까지 풀고 채점까지', 'npm run --silent check:exam-flow', 5],
    ['중간에 나가도 이어서 풀 수 있다', 'npm run --silent check:resume', 4],
    ['시험 중 속도 안내가 맞는 말을 한다', 'npm run --silent check:pace', 3],
    ['지난 결과를 다시 볼 수 있다', 'npm run --silent check:past-result', 3],
  ]) {
    const r = run(cmd)
    if (r.ok) { got += pt; notes.push(`${name} → ${pt}/${pt}`) }
    else notes.push(`${name} 실패 → 0/${pt}`)
  }
  cat('점수 상승 도움', got, 15, notes)
}

// ── 4. 유입·전환 (15) ───────────────────────────────────────────────────────
// 아무리 좋아도 사람이 안 들어오면 값을 못 한다. 실제 기록으로 잰다.
{
  const notes = []
  let got = 0

  const trial = run('npm run --silent check:trial')
  if (trial.ok) { got += 4; notes.push('가입 없이 문제를 풀어볼 수 있다 → 4/4') }
  else notes.push('가입 전에 문제를 못 본다 — 유입의 맨 앞이 막혀 있다 → 0/4')

  const since = new Date(Date.now() - 30 * 864e5).toISOString()
  const views = await apiAll(`/rest/v1/page_views?select=referrer,created_at&created_at=gte.${since}&order=created_at`)
  const ext = views.filter(v => {
    try { return v.referrer && !new URL(v.referrer).hostname.includes('kptest') } catch { return false }
  })
  // 검색에서 오는 사람이 있어야 유입이 스스로 돈다. 없으면 매번 사람이 홍보해야 한다.
  const search = ext.filter(v => /naver|google|daum|bing/.test(v.referrer)).length
  const searchPt = search >= 1500 ? 5 : search >= 800 ? 4 : search >= 300 ? 3 : search >= 100 ? 2 : search > 0 ? 1 : 0
  got += searchPt
  notes.push(`30일 검색 유입 ${search}건(외부 전체 ${ext.length}건) → ${searchPt}/5`)

  const subs = await apiAll('/rest/v1/subscriptions?select=created_at,amount,status&order=created_at')
  const paid = subs.filter(s => Number(s.amount) > 0 && s.status !== 'cancelled')
  const paid30 = paid.filter(s => s.created_at >= since)
  const payPt = paid30.length >= 20 ? 6 : paid30.length >= 10 ? 5 : paid30.length >= 5 ? 4 : paid30.length >= 2 ? 3 : paid30.length >= 1 ? 2 : 0
  got += payPt
  notes.push(`30일 결제 ${paid30.length}건 · 누적 ${paid.length}건 ${paid.reduce((s, x) => s + Number(x.amount), 0).toLocaleString('ko-KR')}원 → ${payPt}/6`)

  cat('유입·전환', got, 15, notes)
}

// ── 5. UI·접근성 (15) ───────────────────────────────────────────────────────
{
  const notes = []
  let got = 0
  for (const [name, cmd, pt] of [
    ['명암비', 'npm run --silent check:contrast', 5],
    ['휴대폰 사용성', 'npm run --silent check:mobile', 5],
    ['키보드·스크린리더', 'npm run --silent check:a11y', 5],
  ]) {
    const r = run(cmd)
    if (r.ok) { got += pt; notes.push(`${name} 기준 미달 0건 → ${pt}/${pt}`) }
    else notes.push(`${name} 미달 있음 → 0/${pt}`)
  }
  cat('UI·접근성', got, 15, notes)
}

// ── 6. 속도 (10) ────────────────────────────────────────────────────────────
{
  const notes = []
  let got = 0
  const r = run('npm run --silent check:vitals')
  const rows = [...r.out.matchAll(/^(\/\S*)\s+\S+\s+\S+\s+\S+\s+([\d.]+)\s+(\d+)ms/gm)]
  if (rows.length) {
    const overTbt = rows.filter(m => +m[3] > 600)
    const overCls = rows.filter(m => +m[2] > 0.1)
    const tbtPt = Math.round(((rows.length - overTbt.length) / rows.length) * 7)
    const clsPt = Math.round(((rows.length - overCls.length) / rows.length) * 3)
    got += tbtPt + clsPt
    notes.push(`측정 ${rows.length}면 · TBT 초과 ${overTbt.length}면 → ${tbtPt}/7`)
    notes.push(`CLS 초과 ${overCls.length}면 → ${clsPt}/3`)
    if (overTbt.length) notes.push(`느린 면: ${overTbt.slice(0, 5).map(m => `${m[1]}(${m[3]}ms)`).join(', ')}`)
    if (overCls.length) notes.push(`흔들리는 면: ${overCls.slice(0, 5).map(m => `${m[1]}(${m[2]})`).join(', ')}`)
  } else notes.push('속도를 재지 못했다 → 0/10')
  cat('속도', got, 10, notes)
}

const slow = timings.filter(t => t.sec >= 120).sort((a, b) => b.sec - a.sec)
if (slow.length) {
  say(`
[오래 걸린 검사]`)
  for (const t of slow) say(`  ${String(t.sec).padStart(4)}초  ${t.ok ? "통과" : "실패"}  ${t.cmd.replace("npm run --silent ", "")}`)
}

if (failLog.length) {
  say(`
[실패한 검사 ${failLog.length}건 — 마지막 줄들]`)
  for (const f of failLog) {
    say(`
  $ ${f.cmd}`)
    for (const line of f.tail.split(String.fromCharCode(10))) say(`    ${line}`)
  }
}

say(`\n총점 ${total}/100`)

fs.mkdirSync('logs/score', { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
fs.writeFileSync(`logs/score/${stamp}.txt`, lines.join('\n') + '\n')
console.log(`\n기록: logs/score/${stamp}.txt`)
