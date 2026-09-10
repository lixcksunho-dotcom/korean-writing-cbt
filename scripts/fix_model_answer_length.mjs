// 제 분량 조건을 넘는 모범답안을 조건 안으로 줄여 넣는다.
//   node --experimental-strip-types --no-warnings scripts/fix_model_answer_length.mjs        (미리보기)
//   node --experimental-strip-types --no-warnings scripts/fix_model_answer_length.mjs --apply
//
// 왜 필요한가: "AI가 작성한 모범 답안이 문제에서 130자 이상 넘어가서 다 작성이 안 됩니다"
// (2026-09-10 문의). 실제로 제한이 있는 24문항 중 8개의 모범답안이 제 조건을 넘었다 —
// 90자 제한에 151자짜리도 있었다. 모범답안이 조건을 어기면 두 가지가 함께 무너진다:
// 보고 배우는 사람이 그대로 쓰면 감점이 되고, AI 채점이 그 답안을 기준으로 삼는다.
//
// 줄여 쓴 원칙: 문제의 조건(시작 어구·필수 낱말·문장 수·형식)은 그대로 지키고, 같은 뜻을
// 더 적은 말로 적었다. 내용을 빼지 않았다.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseCharLimit } from '../src/lib/charLimit.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ENV = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, '.env.local'), 'utf-8').split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] }),
)
const H = {
  apikey: ENV.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${ENV.SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
}
const APPLY = process.argv.includes('--apply')
const len = s => Array.from(String(s ?? '')).filter(c => c !== '\n').length

// 회차-문항번호 → 새 모범답안
const REWRITES = {
  '5-35': '일회용품을 줄이려면 누구나 쉽게 동참할 수 있는 사회적 기반을 마련해야 한다.',
  '5-37': '탄소 발자국은 활동 과정에서 배출하는 온실가스를 이산화탄소량으로 환산한 지표이다. 보이지 않던 배출을 수치로 보여 주어 생활이 기후에 미치는 영향을 가늠하게 하기에 주목받는다. 이를 줄이는 작은 선택이 모이면 큰 변화가 된다.',
  '6-37': '도시 열섬 현상은 도심 기온이 주변보다 비정상적으로 높아지는 현상이다. 아스팔트의 열 축적과 인공 열기, 녹지 감소가 원인이다. 옥상 녹화와 바람길 설계, 친환경 포장재가 해결 방안이다.',
  '7-33': '전통시장이 활기를 되찾으려면 편의 시설과 함께 시장만의 특색 있는 먹거리를 살려야 한다.',
  '7-37': '스마트팜은 감지기로 온도·습도·수분을 재고 그 자료를 분석해 온실 환경과 물·양분 공급을 자동으로 조절하는 농장이다. 환경을 정밀하게 관리해 수확량을 늘리고 자원 낭비와 노동 부담을 줄이며, 날씨와 무관하게 안정적으로 생산할 수 있다. 다만 초기 비용이 크고 다룰 기술이 필요하며, 정전이나 고장이 나면 피해가 크다는 한계가 있다.',
  '8-35': '부담 없이 함께해 주실 여러분의 참여를 기다립니다',
  '8-38': '㉠ 혼자서는 꾸준히 읽기 어렵다는 직원이 많다. ㉡ 매주 한 번 점심에 30분씩 모여 함께 읽고 의견을 나눈다. ㉢ 독서 습관을 길러 부서 간 소통을 키운다.',
  '9-37': '전기차 폐배터리 재활용은 성능이 남은 것을 에너지 저장 장치로 다시 쓰는 재사용과, 분해해 리튬·니켈·코발트를 뽑아 새 원료로 되돌리는 재활용으로 이루어진다. 이를 통해 광물 자원을 아끼고 환경 오염을 줄이며 새 산업과 일자리를 만든다. 다만 구성이 제각각이라 분해 비용이 크고, 회수 금속의 순도를 높이는 기술이 모자라며, 운반·보관 중 화재 위험이 있다.',
}

const rows = await (await fetch(
  `${ENV.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/questions?program=eq.silyong&type=eq.essay&year=lt.9000&select=id,round,number,question,correct_answer`,
  { headers: H },
)).json()

let bad = 0
const plans = []
for (const [key, next] of Object.entries(REWRITES)) {
  const [round, number] = key.split('-').map(Number)
  const q = rows.find(r => r.round === round && r.number === number)
  if (!q) { console.log(`${key}: 문항을 못 찾았다`); bad++; continue }
  const limit = parseCharLimit(q.question)
  const before = len(q.correct_answer)
  const after = len(next)
  const okNow = limit != null && after <= limit * 1.1
  if (!okNow) bad++
  console.log(`${okNow ? 'o' : 'x'} ${round}회 ${number}번 · 제한 ${limit}자 · ${before}자 → ${after}자`)
  plans.push({ id: q.id, key, next })
}
if (bad) { console.log(`\n${bad}건이 아직 조건을 넘는다 — 적용하지 않는다.`); process.exit(1) }

if (!APPLY) { console.log('\n미리보기만 했다. 넣으려면 --apply.'); process.exit(0) }

let done = 0
for (const p of plans) {
  const res = await fetch(`${ENV.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/questions?id=eq.${p.id}`, {
    method: 'PATCH', headers: H, body: JSON.stringify({ correct_answer: p.next }),
  })
  if (res.ok) done++
  else console.log(`  ! ${p.key} ${res.status} ${(await res.text()).slice(0, 120)}`)
}
console.log(`\n적용 ${done}/${plans.length}문항`)
