// 시험 일정이 아직 쓸 만한지 본다.
//   npm run check:schedule
//
// 일정은 손으로 채워 넣는 표다(src/lib/examSchedule.ts). 회차가 다 지나가면
// 화면은 안 깨지고 **지난 회차를 계속 보여 준다** — 방문자에게는 그게 그냥
// '틀린 정보'다. 조용히 썩는 종류라 날짜로 감시한다.
//
// 접수 마감이 임박했는데 다음 회차가 없으면 그때가 갱신할 때다.
import fs from 'node:fs'
import path from 'node:path'

const SRC = path.join('src', 'lib', 'examSchedule.ts')
const text = fs.readFileSync(SRC, 'utf-8')

// { round: '제117회', applyStart: '2025-12-15', ... } 꼴을 그대로 읽는다.
function parseArray(name) {
  // 이름만으로 찾으면 SCHEDULE_URL 같은 게 먼저 걸린다 — 배열 선언 형태까지 맞춘다.
  const needle = `export const ${name}: Round[] = [`
  const at = text.indexOf(needle)
  if (at < 0) return null
  const open = at + needle.length - 1
  const close = text.indexOf(']', open)
  const body = text.slice(open, close)
  const rows = []
  for (const m of body.matchAll(/\{([^}]*)\}/g)) {
    const row = {}
    for (const f of m[1].matchAll(/(\w+)\s*:\s*'([^']*)'/g)) row[f[1]] = f[2]
    if (row.round) rows.push(row)
  }
  return rows
}

const KST = 9 * 3600 * 1000
const today = new Date(Date.now() + KST).toISOString().slice(0, 10)

const problems = []
const notes = []

for (const [label, name] of [['한국실용글쓰기', 'SCHEDULE'], ['KBS한국어', 'KBS_SCHEDULE']]) {
  const rows = parseArray(name)
  if (!rows || !rows.length) { problems.push(`${label} — 일정 표를 읽지 못했다(${name})`); continue }

  // 1) 날짜가 앞뒤로 맞는가. 오타 한 글자면 '접수 마감이 시작보다 빠른' 안내가 나간다.
  for (const r of rows) {
    const seq = ['applyStart', 'applyEnd', 'examDate', 'resultDate']
    for (let i = 1; i < seq.length; i++) {
      if (!(r[seq[i - 1]] <= r[seq[i]])) {
        problems.push(`${label} ${r.round} — ${seq[i - 1]}(${r[seq[i - 1]]})가 ${seq[i]}(${r[seq[i]]})보다 늦다`)
      }
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.examDate)) problems.push(`${label} ${r.round} — 날짜 모양이 이상하다(${r.examDate})`)
  }

  // 2) 아직 남은 회차가 있는가. 접수가 끝나지 않은 것만 센다(화면도 그렇게 고른다).
  const alive = rows.filter((r) => r.applyEnd >= today)
  const lastExam = rows.map((r) => r.examDate).sort().at(-1)
  if (!alive.length) {
    problems.push(`${label} — 접수가 남은 회차가 없다. 화면이 지난 회차를 계속 보여 준다 (마지막 시험일 ${lastExam})`)
  } else if (alive.length === 1) {
    problems.push(`${label} — 남은 회차가 ${alive[0].round} 하나뿐이다(접수 마감 ${alive[0].applyEnd}). 다음 회차를 채워 둘 때다`)
  } else {
    notes.push(`${label} — 남은 회차 ${alive.length}개 · 다음 접수 마감 ${alive[0].applyEnd} · 마지막 시험일 ${lastExam}`)
  }
}

console.log(`\n시험 일정 점검 (오늘 ${today} KST)\n`)
for (const n of notes) console.log('  ○ ' + n)
for (const p of problems) console.log('  × ' + p)
if (!problems.length) console.log('\n문제 없음 ✓')
else {
  console.log(`\n문제 ${problems.length}건 — ${SRC} 를 갱신하세요.`)
  console.log('  실용글쓰기: https://www.klata.or.kr/test/schedule')
  console.log('  KBS한국어:  https://www.kbskorean.org/klt/exam-apply/list')
  process.exitCode = 1
}
