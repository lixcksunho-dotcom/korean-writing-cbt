// 사고 알림이 '봐야 할 것'과 '안 봐도 되는 것'으로 제대로 갈리는지 본다.
//   npm run check:alert-triage
//
// 왜 필요한가: 최근 2주 사고 12건 중 9건이 자동 검사가 남긴 자국이었다
// (example.com/promo-check-…, blog.naver.com/audit<숫자>/…). 그게 어드민 목록을 채우고
// 텔레그램까지 울렸다. 아홉 개가 가짜면 사람은 목록을 안 읽게 되고, 그때 진짜 하나가
// 묻힌다 — 결제 실패 1건을 16일간 몰랐던 적이 있다.
//
// 반대로 넓게 잡으면 진짜 사고를 '검사 자국'으로 치워 버린다. 그게 더 나쁘다.
// 그래서 실제로 찍힌 문구를 그대로 넣고 양쪽을 다 확인한다.

import { triageAlert, isCheckArtifact, isSettled } from '../src/lib/operatorAlertTriage.ts'

let pass = 0, fail = 0
const ok = (n, d = '') => { pass++; console.log(`  ○ ${n}${d ? ` — ${d}` : ''}`) }
const bad = (n, d = '') => { fail++; console.log(`  × ${n}${d ? ` — ${d}` : ''}`) }
const is = (name, got, want) => (got === want ? ok(name, got) : bad(name, `${got} (기대 ${want})`))

console.log('\n사고 알림 분류\n')

// ── 실제로 어드민에 찍혔던 12건 ────────────────────────────────────────────
is('검사가 만든 신청(example.com)',
  triageAlert('블로그 홍보 신청 — 사람 확인 필요', 'https://example.com/promo-check-1788356571619a8c8b907'), 'test')
is('검사가 만든 사후 확인(audit 계정)',
  triageAlert('블로그 홍보 사후 확인 — 회수 0건 · 되살림 0건 · 못 읽음 1건 · 조건 어긋남 0건 · https://blog.naver.com/audit1788356597444/224398488516 본문이 비어 있어요'), 'test')
is('로컬에서 돌린 검사',
  triageAlert('블로그 홍보 신청 — 사람 확인 필요', 'http://127.0.0.1:4712/blog/silgeulpass-review-1788'), 'test')
is('배포 직후 조각(스스로 복구)',
  triageAlert('[배포 직후 조각 · 새로고침으로 복구] /cbt/2025-1 — Failed to load chunk'), 'settled')

// ── 사람이 반드시 봐야 하는 것 ─────────────────────────────────────────────
is('실제 사람의 글이 회수됨',
  triageAlert('블로그 홍보 사후 확인 — 회수 1건 · 되살림 0건 · 못 읽음 0건 · 조건 어긋남 0건 · https://blog.naver.com/zkvpdla1/224398488516'), 'actionable')
is('사파리 화면 오류(복구 안내 없음)',
  triageAlert('/cbt/2025-1/result — Load failed'), 'actionable')
is('결제는 됐는데 발급 안 됨',
  triageAlert('결제 완료 후 구독 발급 실패 — order_id sub-1234'), 'actionable')
is('실제 사용자의 문항 오류 신고',
  triageAlert('유형별 연습 맞춤법 14번에 오류가 있습니다'), 'actionable')
is('AI 채점 실패',
  triageAlert('AI 채점 실패 — 키 없음'), 'actionable')

// ── 경계 ───────────────────────────────────────────────────────────────────
if (!isCheckArtifact('https://blog.naver.com/zkvpdla1/224398488516')) ok('사람의 네이버 주소는 검사 자국이 아니다')
else bad('오탐', '진짜 신청을 검사 자국으로 치운다')
if (!isCheckArtifact('')) ok('빈 값은 검사 자국이 아니다')
else bad('빈 값', '아무것도 없는데 자국이라 한다')
if (!isSettled('블로그 홍보 사후 확인 — 회수 2건 · 되살림 0건 · 못 읽음 0건 · 조건 어긋남 1건'))
  ok('회수가 있으면 스스로 끝난 일이 아니다')
else bad('과잉 정리', '사람이 봐야 할 회수를 치운다')

// ── 알림을 만들 때부터 막는가 ──────────────────────────────────────────────
{
  const fsx = await import('node:fs')
  const src = fsx.readFileSync('src/lib/operatorAlerts.ts', 'utf8')
  if (src.includes('isCheckArtifact')) ok('검사 자국은 텔레그램을 울리지 않는다')
  else bad('알림 발송', '검사가 돌 때마다 폰이 울린다')
  if (src.includes('triageAlert')) ok('어드민 목록에 분류가 붙는다')
  else bad('목록 분류', '가짜와 진짜가 섞여 나온다')
}

console.log(`\n${fail ? '알림 분류에 구멍이 있다.' : '볼 것만 위로 온다.'}`)
process.exit(fail ? 1 : 0)
