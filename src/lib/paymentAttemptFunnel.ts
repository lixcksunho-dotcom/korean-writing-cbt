// 결제 시도가 어디서 끝났는지 사람 단위로 묶는다(순수 판정 — 네트워크 없음).
//
// 왜 필요한가: 포트원 결제건만 세면 완결률이 24%(6/25)로 보인다. 그런데 실제 기록을 보면
// 한 사람이 몇 초 간격으로 2~3번 창을 열고 마지막에 결제하는 패턴이 대부분이다
// (결제수단을 바꿔 보는 것으로 보인다 — 카드창을 닫고 간편결제로, 같은 식).
// 건 단위로 세면 그 사람은 '3번 실패하고 1번 성공'이 되어, 있지도 않은 장애를 만들어 낸다.
// 사람 단위로 세야 '결제창까지 온 사람 중 몇 명이 실제로 냈는가'라는 진짜 질문에 답한다.
//
// 두 숫자를 다 낸다 — 건 단위(결제창이 얼마나 자주 버려지는가)와 사람 단위(돈이 얼마나 들어오는가).

export type AttemptInput = {
  id: string
  status: string
  /** 결제자 식별값(우리는 customerId에 userId를 싣는다). 없으면 건 하나를 한 사람으로 본다. */
  customerId?: string | null
  requestedAt?: string | null
  paidAt?: string | null
  /** 포트원이 주는 실패 사유(FAILED 건의 failure.reason). */
  failureReason?: string | null
}

export type PersonOutcome = {
  customerId: string
  attempts: number
  paid: boolean
  /** 첫 시도부터 결제까지 걸린 시간(초). 결제 안 했으면 null. */
  secondsToPay: number | null
  statuses: string[]
}

export type AttemptFunnel = {
  attempts: { total: number; paid: number; ratio: number }
  people: { total: number; paid: number; ratio: number }
  /** 결제창까지 왔지만 아무 건도 결제로 안 끝난 사람 */
  droppedPeople: PersonOutcome[]
  /** 여러 번 시도한 끝에 결제한 사람 — 여기 몰려 있으면 결제창에 뭔가 걸리는 것이다 */
  retriedThenPaid: PersonOutcome[]
  failureReasons: { reason: string; count: number }[]
}

const PAID = 'PAID'
// 환불된 건도 '결제까지는 갔다' — 완결률은 결제창을 통과했는지를 재는 숫자다.
const COMPLETED = new Set([PAID, 'CANCELLED', 'PARTIAL_CANCELLED'])

export function summarizeAttempts(rows: AttemptInput[]): AttemptFunnel {
  const byPerson = new Map<string, AttemptInput[]>()
  for (const r of rows) {
    // 결제자를 못 읽는 건은 다른 건과 합치면 안 된다(남의 시도와 섞여 완결률이 거짓이 된다).
    const key = r.customerId || `payment:${r.id}`
    const list = byPerson.get(key)
    if (list) list.push(r)
    else byPerson.set(key, [r])
  }

  const people: PersonOutcome[] = []
  for (const [customerId, unsorted] of byPerson) {
    // 시간순으로 세운다. 포트원 목록은 최신이 먼저라 그대로 두면 '결제 → 창 열림'처럼
    // 거꾸로 읽혀서, 결제한 뒤에 또 시도한 것처럼 보인다.
    const list = [...unsorted].sort((a, b) => (Date.parse(a.requestedAt ?? '') || 0) - (Date.parse(b.requestedAt ?? '') || 0))
    const completed = list.filter((r) => COMPLETED.has(r.status))
    const firstTry = list
      .map((r) => Date.parse(r.requestedAt ?? ''))
      .filter((t) => Number.isFinite(t))
      .sort((a, b) => a - b)[0]
    const paidAt = completed
      .map((r) => Date.parse(r.paidAt ?? r.requestedAt ?? ''))
      .filter((t) => Number.isFinite(t))
      .sort((a, b) => a - b)[0]
    people.push({
      customerId,
      attempts: list.length,
      paid: completed.length > 0,
      secondsToPay:
        completed.length && Number.isFinite(firstTry) && Number.isFinite(paidAt)
          ? Math.round((paidAt - firstTry) / 1000)
          : null,
      statuses: list.map((r) => r.status),
    })
  }

  const reasons = new Map<string, number>()
  for (const r of rows) {
    if (!r.failureReason) continue
    reasons.set(r.failureReason, (reasons.get(r.failureReason) ?? 0) + 1)
  }

  const attemptsPaid = rows.filter((r) => COMPLETED.has(r.status)).length
  const peoplePaid = people.filter((p) => p.paid).length

  return {
    attempts: { total: rows.length, paid: attemptsPaid, ratio: ratio(attemptsPaid, rows.length) },
    people: { total: people.length, paid: peoplePaid, ratio: ratio(peoplePaid, people.length) },
    droppedPeople: people.filter((p) => !p.paid),
    retriedThenPaid: people.filter((p) => p.paid && p.attempts > 1),
    failureReasons: [...reasons].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count),
  }
}

/** 0으로 나누면 NaN이 화면까지 나간다 — 시도가 없으면 비율도 없다(0). */
function ratio(part: number, whole: number): number {
  return whole > 0 ? part / whole : 0
}
