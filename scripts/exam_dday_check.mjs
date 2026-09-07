// 시험 일정의 '오늘'·D-day 가 서버 시간대에 흔들리지 않는지 본다.
//   npm run check:dday
//
// 왜 필요한가: 자매 서비스(KBS패스)에서 2026-09-07 새벽, Vercel(UTC)은 9/6 이고 브라우저(KST)는 9/7 이라
// 접수를 서버는 "예정", 브라우저는 "진행 중"으로 그려 7화면에서 hydration 이 어긋났다(React #418).
// 이 저장소는 같은 코드였고 제121회 접수 마감이 2026-09-07 — 다음 날 새벽 같은 사고가 예정돼 있었다.
// 로컬은 서버·브라우저 둘 다 KST 라 재현이 안 되므로, 같은 순간을 두 시간대(UTC·KST) 자식 프로세스에서
// 계산해 답이 같은지, 그리고 한국 날짜 기준으로 맞는지를 본다.
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

// 저장소 경로에 한글이 있어 URL pathname 을 그대로 쓰면 %EC… 로 깨진다 — fileURLToPath 로 푼다.
const SCRIPTS_DIR = fileURLToPath(new URL('.', import.meta.url))

// [순간(UTC ISO), 기대 상태, 기대 D-day] — 제121회(접수 8/17~9/7, 시험 9/19) · 제122회(접수 10/19~11/9, 시험 11/21) 기준.
const CASES = [
  ['2026-09-06T23:30:00Z', 'open', 0],       // 9/7 08:30 KST — UTC 로는 아직 9/6 이지만 한국은 마감 당일(D-DAY)
  ['2026-09-07T14:59:00Z', 'open', 0],       // 9/7 23:59 KST — 마감일(D-DAY)
  ['2026-09-07T15:00:00Z', 'closed', 11],    // 9/8 00:00 KST — 접수 마감·시험(9/19)까지 11일. UTC 로는 아직 9/7 → 예전 코드가 어긋나던 순간
  ['2026-09-07T23:30:00Z', 'closed', 11],    // 9/8 08:30 KST — 같은 상태여야 한다
  ['2026-09-19T14:59:00Z', 'closed', 0],     // 9/19 23:59 KST — 시험 당일
  ['2026-09-19T15:00:00Z', 'upcoming', 29],  // 9/20 00:00 KST — 121회 끝, 대표는 122회(접수 10/19 까지 29일)
  ['2026-10-18T15:00:00Z', 'open', 21],      // 10/19 00:00 KST — 122회 접수 시작, 마감 11/9 까지 21일
]

// 자식 프로세스에서 lib 를 불러 계산한다 — 시간대는 프로세스 시작 때 정해지므로 같은 프로세스에서 못 바꾼다.
const PROBE = `
  import { getSchedule } from '../src/lib/examSchedule.ts'
  import { primaryRound } from '../src/lib/examDday.ts'
  const out = []
  for (const iso of ${JSON.stringify(CASES.map((c) => c[0]))}) {
    const { primary, status, dday } = primaryRound(getSchedule('silyong').rounds, new Date(iso))
    out.push({ iso, round: primary.round, status, dday, offset: new Date(iso).getTimezoneOffset() })
  }
  console.log(JSON.stringify(out))
`
const runIn = (tz) => {
  const r = spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '--input-type=module', '-e', PROBE], {
    env: { ...process.env, TZ: tz }, encoding: 'utf8', cwd: SCRIPTS_DIR,
  })
  if (r.status !== 0) { console.error(`TZ=${tz} 실행 실패:\n${r.stderr}`); process.exit(1) }
  return JSON.parse(r.stdout.trim().split('\n').at(-1))
}

const utc = runIn('UTC')
const kst = runIn('Asia/Seoul')
// Windows Node 가 TZ 를 무시하면 두 결과가 '당연히' 같아져 검사가 헛돈다 — offset 으로 실제로 달랐는지 확인한다.
if (utc[0].offset === kst[0].offset) { console.error(`시간대가 적용되지 않았다(offset ${utc[0].offset} 동일) — 이 환경에선 검사가 무의미하다`); process.exit(1) }

let fail = 0
const w = 22
console.log(`${'순간(UTC)'.padEnd(w)}| 기대            | UTC 프로세스     | KST 프로세스     | 판정`)
CASES.forEach(([iso, expStatus, expDday], i) => {
  const a = utc[i], b = kst[i]
  const same = a.status === b.status && a.dday === b.dday && a.round === b.round
  const right = a.status === expStatus && (expDday == null || a.dday === expDday)
  const ok = same && right
  if (!ok) fail++
  const fmt = (x) => `${x.status}${expDday == null ? '' : ` D-${x.dday}`}`.padEnd(16)
  console.log(`${iso.padEnd(w)}| ${`${expStatus}${expDday == null ? '' : ` D-${expDday}`}`.padEnd(15)} | ${fmt(a)} | ${fmt(b)} | ${ok ? 'PASS' : same ? 'FAIL(기대와 다름)' : 'FAIL(시간대마다 다름)'}`)
})
console.log(`\n${CASES.length - fail}/${CASES.length} 통과 — 서버가 어느 시간대여도 브라우저(한국)와 같은 답`)
process.exit(fail ? 1 : 0)
