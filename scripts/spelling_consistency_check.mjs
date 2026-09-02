// 같은 틀린 말을 문항마다 다르게 고치고 있지 않은지 본다.
//   npm run check:spelling-consistency
//
// 왜 필요한가: 2026-09-01 고객 신고 — 유형별 연습 14번이 '어떻해 → 어떡해'로 고치고
// 있었다. 그 자리는 뒤의 동사를 꾸미는 부사 자리라 '어떻게'가 맞다. 그런데 같은
// 문제은행의 다른 문항(2025-4 9번, 2025-9 1번)은 이미 '어떻게'로 고치고 있었다.
// **우리끼리 답이 갈려 있었던 것**이고, 그걸 사람이 신고해서야 알았다.
//
// 맞춤법 교정 문항은 '틀린 말 → 바른 말' 쌍이 문제은행 전체에서 하나여야 한다.
// 두 갈래로 갈리면 둘 중 하나는 반드시 틀렸다. 그 자리를 자동으로 잡는다.
//
// 헷갈리는 짝(어떻게/어떡해처럼 둘 다 있는 말)은 문맥이 갈라주므로, 여기서는
// '같은 문제은행 안에서 서로 어긋나는가'만 본다 — 국어 규범을 판정하지 않는다.

import fs from 'node:fs'

const ENV = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8').split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] }),
)
const SB = ENV.NEXT_PUBLIC_SUPABASE_URL
const SVC = ENV.SUPABASE_SERVICE_ROLE_KEY

async function all() {
  const out = []
  for (let p = 0; ; p++) {
    const res = await fetch(
      `${SB}/rest/v1/questions?select=year,round,number,type,question,correct_answer,explanation&order=id&limit=1000&offset=${p * 1000}`,
      { headers: { apikey: SVC, Authorization: `Bearer ${SVC}` } })
    const b = await res.json()
    if (!Array.isArray(b)) break
    out.push(...b)
    if (b.length < 1000) break
  }
  return out
}

const rows = await all()
console.log(`\n맞춤법 교정 일관성 — 문항 ${rows.length}개\n`)

// '틀린말 → 바른말' 쌍을 뽑는다. 답과 해설 양쪽에서 같은 표기를 쓴다.
const ARROW = /([가-힣]{2,10})\s*(?:→|->|은|는)?\s*[「'‘"]?([가-힣]{2,10})[」'’"]?\s*(?:으?로)?\s*(?:고쳐|고칩니다|바른|맞습니다)?/
const pairs = new Map() // 틀린말 → Map(바른말 → [출처])

// 활용형이 달라도 같은 말이다 — '어떻해'와 '어떻해서든'을 따로 보면 어긋남을 못 잡는다.
//
// 다만 앞글자만 같다고 묶으면 안 된다. '왠지'와 '왠만하면'은 앞이 같아도 다른 말이라
// (→왜인지 / →웬만하면) 묶으면 멀쩡한 두 문항이 어긋남으로 잡힌다 — 실제로 그랬다.
// 그래서 '한 낱말의 활용형'인 것만, 어간을 정확히 적어 묶는다.
const STEM_GROUPS = [
  ['어떻해', '어떻해서', '어떻해야'],   // 없는 말. 문맥에 따라 어떻게/어떡해로 갈린다
]
const stemOf = (w) => {
  const g = STEM_GROUPS.find(list => list.some(st => w.startsWith(st)))
  return g ? g[0] : w
}

const addPair = (wrong, right, src) => {
  if (!wrong || !right || wrong === right) return
  // 틀린 말은 어간으로 묶고, 바른 말도 어간으로 견준다 —
  // '어떻해→어떡해'와 '어떻해서든→어떻게 해서든'이 같은 자리의 다른 답임을 드러낸다.
  const key = stemOf(wrong)
  // 바른 말은 첫 낱말로 본다 — '어떻게 해서든'과 '어떻게'는 같은 답이다.
  const val = right.trim().split(/\s+/)[0]
  if (key === val) return
  if (!pairs.has(key)) pairs.set(key, new Map())
  const m = pairs.get(key)
  if (!m.has(val)) m.set(val, [])
  m.get(val).push(`${src} (${wrong}→${right})`)
}

for (const q of rows) {
  const src = `${q.year}-${q.round} ${q.number}번`
  // ① 서술형 정답이 '틀린말 → 바른말' 꼴
  const a = String(q.correct_answer ?? '')
  const m1 = a.match(/^\s*([가-힣]{2,12})\s*(?:→|->)\s*([가-힣]{2,12})\s*$/)
  if (m1) addPair(m1[1], m1[2], src)

  // ② 해설의 「틀린말」은 「바른말」 꼴
  const e = String(q.explanation ?? '')
  for (const m of e.matchAll(/[「'‘]([가-힣]{2,12})[」'’]\s*(?:은|는)\s*[「'‘]([가-힣 ]{2,14})[」'’]/g)) {
    addPair(m[1], m[2].trim(), src)
  }
}

// 뜻이 갈리는 붙여쓰기 — 한 낱말로 쓰면 다른 뜻이 되는 말들.
// 2026-09-02 전수 점검에서 실제로 걸린 자리: 공문서의 '재개관은 다음날부터'를
// 붙여 쓰면 '훗날부터'가 된다(그 이튿날이 아니라). 문맥이 '이튿날'이면 띄어야 한다.
const MEANING_SPLIT = [
  { joined: '다음날', spaced: '다음 날', note: "'다음날'은 훗날(정해지지 않은 미래). 이튿날이면 '다음 날'" },
  { joined: '큰소리', spaced: '큰 소리', note: "'큰소리'는 장담·호통. 소리가 크면 '큰 소리'" },
  { joined: '한번', spaced: '한 번', note: "'한번'은 시도·기회. 횟수 1회면 '한 번'" },
]
for (const q of rows) {
  const a = String(q.correct_answer ?? '')
  for (const m of MEANING_SPLIT) {
    // 답의 '→' 오른쪽(고친 결과)만 본다. 공문서 문항은 띄어쓰기를 V로 적으므로
    // V를 공백으로 되돌린 뒤, '붙여 쓴 꼴'로 답했을 때만 알린다.
    const rights = a.split(/→|->/).slice(1).join(' ').replace(/V/g, ' ')
    const joinedUsed = new RegExp(`${m.joined}(?![가-힣])`).test(rights)
    if (joinedUsed) {
      console.log(`  · ${q.year}-${q.round} ${q.number}번 — '${m.joined}'으로 붙여 쓰라고 답한다. ${m.note}`)
    }
  }
}

let failed = false
let conflicts = 0
for (const [wrong, rights] of pairs) {
  if (rights.size > 1) {
    conflicts++
    failed = true
    console.error(`  × '${wrong}'을(를) 서로 다르게 고치고 있다`)
    for (const [right, srcs] of rights) console.error(`      → ${right} : ${srcs.join(', ')}`)
  }
}

console.log(`  교정 쌍 ${pairs.size}종 · 어긋남 ${conflicts}건`)
if (!failed) console.log('\n같은 말을 두 갈래로 고치는 곳은 없다.')
else console.log('\n둘 중 하나는 틀렸다 — 문맥을 보고 하나로 맞출 것.')
process.exit(failed ? 1 : 0)
