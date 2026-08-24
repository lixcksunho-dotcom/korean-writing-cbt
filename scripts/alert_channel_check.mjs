// 알림이 닿는지 판정이 맞는지 본다.
//   npm run check:alerts
//
// 반만 설정된 상태(토큰만 있고 대화방 id가 없는 등)를 '정상'으로 읽으면, 사고가 나도
// 아무 데도 안 가는데 화면은 초록불이 된다. 그 상태가 실제로 있었다.
import { describeAlertChannel } from '../src/lib/alertChannel.ts'

const results = []
const eq = (name, got, want) => results.push({ ok: got === want, name, detail: `${got} (기대 ${want})` })

eq('둘 다 있으면 닿는다', describeAlertChannel({ hasToken: true, hasChatId: true }).state, 'ready')
eq('둘 다 없으면 꺼져 있다', describeAlertChannel({ hasToken: false, hasChatId: false }).state, 'not_configured')
eq('토큰만 있으면 반쪽', describeAlertChannel({ hasToken: true, hasChatId: false }).state, 'partial')
eq('대화방 id만 있어도 반쪽', describeAlertChannel({ hasToken: false, hasChatId: true }).state, 'partial')

// 반쪽 상태를 '정상'으로 읽으면 안 된다 — 이게 이 검사의 핵심이다.
const half = [
  describeAlertChannel({ hasToken: true, hasChatId: false }),
  describeAlertChannel({ hasToken: false, hasChatId: true }),
]
eq('반쪽 상태는 절대 ready가 아니다', half.filter((s) => s.state === 'ready').length, 0)
eq('반쪽에는 무엇을 넣어야 하는지 알려준다', half.every((s) => s.action && s.action.includes('TELEGRAM')), true)
eq('토큰만 있을 때 빠진 것을 정확히 짚는다', describeAlertChannel({ hasToken: true, hasChatId: false }).action.includes('CHAT_ID'), true)
eq('대화방만 있을 때 빠진 것을 정확히 짚는다', describeAlertChannel({ hasToken: false, hasChatId: true }).action.includes('BOT_TOKEN'), true)
eq('정상일 때는 할 일이 없다', describeAlertChannel({ hasToken: true, hasChatId: true }).action, null)

const failed = results.filter((r) => !r.ok)
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name} — ${r.detail}`)
console.log(`\n${results.length - failed.length}/${results.length} 통과`)
process.exit(failed.length ? 1 : 0)
