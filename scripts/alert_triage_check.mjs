// 사고 알림이 '봐야 할 것'과 '안 봐도 되는 것'으로 제대로 갈리는지 본다.
//   npm run check:alert-triage
//
// 왜 필요한가: 최근 2주 사고 12건 중 9건이 자동 검사가 남긴 자국이었다
// (example.com/promo-check-…, blog.naver.com/audit<숫자>/…). 그게 어드민 목록을 채우고
// 텔레그램까지 울렸다. 아홉 개가 가짜면 사람은 목록을 안 읽게 되고, 그때 진짜 하나가
// 묻힌다 — 결제 실패 1건을 16일간 몰랐던 적이 있다.
//
// 두 번째(2026-09-11): 자국을 걷어낸 뒤에도 11건이 남았는데 전부 기계가 끝낸 일이었다.
// 운영자가 "해당 사고 이제 없애"라고 했다. 그 11건을 그대로 넣고 전부 내려가는지 본다.
//
// 반대로 넓게 잡으면 진짜 사고를 치워 버린다. 그게 더 나쁘다.
// 그래서 실제로 찍힌 문구를 그대로 넣고 양쪽을 다 확인한다.

import { triageAlert, isCheckArtifact, isSettled } from '../src/lib/operatorAlertTriage.ts'
import { linkAlertToFeedback, feedbackMessageHead } from '../src/lib/operatorAlertFeedbackLink.ts'

let pass = 0, fail = 0
const ok = (n, d = '') => { pass++; console.log(`  ○ ${n}${d ? ` — ${d}` : ''}`) }
const bad = (n, d = '') => { fail++; console.log(`  × ${n}${d ? ` — ${d}` : ''}`) }
const is = (name, got, want) => (got === want ? ok(name, got) : bad(name, `${got} (기대 ${want})`))

console.log('\n사고 알림 분류\n')

// ── 검사 자국 ─────────────────────────────────────────────────────────────
is('검사가 만든 신청(example.com)',
  triageAlert('블로그 홍보 신청 — 사람 확인 필요', 'https://example.com/promo-check-1788356571619a8c8b907'), 'test')
is('검사가 만든 사후 확인(audit 계정)',
  triageAlert('블로그 홍보 사후 확인 — 회수 0건 · 되살림 0건 · 못 읽음 1건 · 조건 어긋남 0건 · https://blog.naver.com/audit1788356597444/224398488516 본문이 비어 있어요'), 'test')
is('로컬에서 돌린 검사',
  triageAlert('블로그 홍보 신청 — 사람 확인 필요', 'http://127.0.0.1:4712/blog/silgeulpass-review-1788'), 'test')

// ── 2026-09-11 에 '볼 것'으로 남아 있던 11건 — 전부 기계가 끝낸 일 ─────────
is('사후 확인: 다시 공개돼 되살림(옛 문구)',
  triageAlert('블로그 홍보 사후 확인 — 회수 0건 · 되살림 1건 · 못 읽음 0건 · 조건 어긋남 0건\n· https://blog.naver.com/lyw2216/224404736518\n  다시 공개돼 이용권을 되살렸습니다'), 'settled')
is('사후 확인: 비공개라 회수(기계가 끝냄, 회수는 영구)',
  triageAlert('블로그 홍보 사후 확인 — 회수 1건 · 되살림 0건 · 못 읽음 0건 · 조건 어긋남 0건\n· https://blog.naver.com/zkvpdla1/224398488516\n  네이버가 이렇게 답했어요: 비공개 글 입니다. — 이용권을 회수했습니다'), 'settled')
is('사후 확인: 새 문구(되살림 칸 없음)로 회수',
  triageAlert('블로그 홍보 사후 확인 — 회수 1건 · 못 읽음 0건 · 조건 어긋남 0건\n· https://blog.naver.com/someone/1'), 'settled')
is('자동 확인 통과한 신청(그 자리에서 지급됨)',
  triageAlert('블로그 홍보 신청 — 자동 확인 통과\nhttps://blog.naver.com/lyw2216/224404736518', '03dcc877-eee1-441f-8882-dbff43f02ce2'), 'settled')
is('행사 코드 발급(1주일)',
  triageAlert('행사 코드 사용: 블로그 후기 이벤트 · 1주일 (BLOG7) · 1/100', '789ae871-905c-4b15-b159-302ea99c5968'), 'settled')
is('행사 코드 발급(1개월)',
  triageAlert('행사 코드 사용: 블로그 후기 이벤트 · 1개월 (BLOG30) · 1/100', '04797cd9-bc00-4665-87ea-873f3f5b4007'), 'settled')
is('사파리 회선 끊김(Load failed)',
  triageAlert('/cbt/2025-1/result — Load failed', 'no-digest'), 'settled')
is('크롬 회선 끊김(Failed to fetch)',
  triageAlert('/practice/essay — Failed to fetch', 'no-digest'), 'settled')
is('배포 직후 조각(스스로 복구)',
  triageAlert('[배포 직후 조각 · 새로고침으로 복구] /cbt/2025-1 — Failed to load chunk'), 'settled')

// ── 사람이 반드시 봐야 하는 것 ─────────────────────────────────────────────
is('사후 확인: 조건 어긋남(기계는 회수 안 하고 알리기만 한다)',
  triageAlert('블로그 홍보 사후 확인 — 회수 0건 · 못 읽음 0건 · 조건 어긋남 1건\n· https://blog.naver.com/someone/1\n  사진(1장, 3장 이상)'), 'actionable')
is('사람 확인이 필요한 실제 신청(접수 상태는 따로 잇는다)',
  triageAlert('블로그 홍보 신청 — 사람 확인 필요\nhttps://blog.naver.com/zkvpdla1/224398488516', '3d69dbc8-8789-4f8c-90b3-e25c8d6142cf'), 'actionable')
is('진짜 화면 오류(회선 문제가 아님)',
  triageAlert('/cbt/2025-1/result — Cannot read properties of undefined (reading \'score\')', 'a1b2c3'), 'actionable')
is('Load failed 가 문장 가운데 있으면 회선 문제로 안 본다',
  triageAlert('/cbt — Load failed while parsing result JSON'), 'actionable')
is('결제는 됐는데 발급 안 됨',
  triageAlert('결제 완료 후 구독 발급 실패 — order_id sub-1234'), 'actionable')
is('환불 회수 확인 필요',
  triageAlert('환불 처리 확인 필요: 결제 상태 불명 (주문 sub-1)'), 'actionable')
is('실제 사용자의 문항 오류 신고',
  triageAlert('유형별 연습 맞춤법 14번에 오류가 있습니다'), 'actionable')
is('AI 채점 실패',
  triageAlert('AI 채점 실패 — 키 없음'), 'actionable')
is('회원 탈퇴 실패(사람이 처리해야 한다)',
  triageAlert('회원 탈퇴 실패(ledger): x — 사람이 처리 필요 (user 1234abcd)', 'da62fc30'), 'actionable')

// ── 경계 ───────────────────────────────────────────────────────────────────
if (!isCheckArtifact('https://blog.naver.com/zkvpdla1/224398488516')) ok('사람의 네이버 주소는 검사 자국이 아니다')
else bad('오탐', '진짜 신청을 검사 자국으로 치운다')
if (!isCheckArtifact('')) ok('빈 값은 검사 자국이 아니다')
else bad('빈 값', '아무것도 없는데 자국이라 한다')
if (!isSettled('블로그 홍보 사후 확인 — 회수 2건 · 되살림 0건 · 못 읽음 0건 · 조건 어긋남 1건'))
  ok('회수와 조건 어긋남이 같이 있으면 사람이 봐야 한다')
else bad('과잉 정리', '사람이 봐야 할 조건 어긋남을 치운다')

// ── 접수 행과 잇기: 처리 끝난 문의가 내려가는가 ────────────────────────────
console.log('\n접수 행과 잇기\n')
const rows = [
  // 실제 행: 짧은 문의라 알림 40자 안에 ' [/support]' 가 들어가 이전 규칙으로는 영영 안 맞았다
  { path: '/support', contact: 'jungs6769424@naver.com', message: '회원 탈퇴 하고 싶어요\n어디서 신청하나요', resolved: true, created_at: '2026-09-07T12:14:18.086Z' },
  { path: '/support', contact: null, message: '모의고사 4회 서술형 9번 문제 원고지가 200자 작성으로 제한 걸려 있습니다.', resolved: false, created_at: '2026-09-09T00:45:13.985Z' },
  { path: '#promo/blog-review', contact: 'https://m.blog.naver.com/someone/777', message: '[블로그 홍보 신청]\nhttps://m.blog.naver.com/someone/777\n\nOK 제목', resolved: false, created_at: '2026-09-10T00:00:00Z' },
]
is('꼬리표를 떼고 머리를 잡는다', feedbackMessageHead('회원 탈퇴 하고 싶어요\n어디서 신청하나요 [/support]'), '회원 탈퇴 하고 싶어요\n어디서 신청하나요')
is('잘림 표시도 뗀다', feedbackMessageHead('가나다 …(잘림) [/cbt]'), '가나다')
{
  const l = linkAlertToFeedback({ summary: '회원 탈퇴 하고 싶어요\n어디서 신청하나요 [/support]', at: '2026-09-07T12:14:18.198Z' }, rows)
  is('짧은 문의가 처리됨으로 이어진다', `${l.kind}:${l.resolved}`, 'found:true')
}
{
  const l = linkAlertToFeedback({ summary: '모의고사 4회 서술형 9번 문제 원고지가 200자 작성으로 제한 걸려 있습니다. [/support]', at: '2026-09-09T00:45:14.194Z' }, rows)
  is('미처리 문의는 미처리로 이어진다', `${l.kind}:${l.resolved}`, 'found:false')
}
{
  const l = linkAlertToFeedback({ summary: '블로그 홍보 신청 — 사람 확인 필요\nhttps://blog.naver.com/someone/777', at: '2026-09-10T00:00:01Z' }, rows)
  is('신청은 주소 모양이 달라도(m.blog) 같은 접수로 잇는다', `${l.kind}:${l.resolved}`, 'found:false')
}
{
  const l = linkAlertToFeedback({ summary: '블로그 홍보 신청 — 사람 확인 필요\nhttps://blog.naver.com/zkvpdla1/224398488516', at: '2026-09-02T06:54:36Z' }, rows)
  is('접수 행이 지워진 신청은 missing(심사할 것이 없다)', l.kind, 'missing')
}
{
  const l = linkAlertToFeedback({ summary: '블로그 홍보 사후 확인 — 회수 1건 · 못 읽음 0건 · 조건 어긋남 0건', at: '2026-09-02T06:54:50Z' }, rows)
  is('사후 확인 보고는 접수가 아니다', l.kind, 'not_customer')
}
{
  const l = linkAlertToFeedback({ summary: '회원 탈퇴 실패(ledger): x — 사람이 처리 필요 (user 1234abcd)', at: '2026-09-02T06:54:50Z' }, rows)
  is('탈퇴 실패는 접수 행이 없어도 missing 이 아니다', l.kind, 'not_customer')
}
{
  const l = linkAlertToFeedback({ summary: '처음 보는 문의입니다 [/support]', at: '2026-09-02T06:54:50Z' }, rows)
  is('못 찾은 문의는 unknown(모르는 것은 모른다고 둔다)', l.kind, 'unknown')
}

// ── 알림을 만들 때부터 막는가 ──────────────────────────────────────────────
{
  const fsx = await import('node:fs')
  const src = fsx.readFileSync('src/lib/operatorAlerts.ts', 'utf8')
  if (src.includes('isCheckArtifact')) ok('검사 자국은 텔레그램을 울리지 않는다')
  else bad('알림 발송', '검사가 돌 때마다 폰이 울린다')
  if (src.includes('triageAlert')) ok('어드민 목록에 분류가 붙는다')
  else bad('목록 분류', '가짜와 진짜가 섞여 나온다')
  if (src.includes('linkAlertToFeedback')) ok('어드민 목록이 접수 행의 처리 여부를 읽는다')
  else bad('접수 잇기', '처리 끝난 문의가 계속 빨갛게 남는다')
}

console.log(`\n${fail ? '알림 분류에 구멍이 있다.' : '볼 것만 위로 온다.'} (통과 ${pass} · 실패 ${fail})`)
process.exit(fail ? 1 : 0)
