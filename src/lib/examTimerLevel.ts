// 남은 시간을 어떻게 알릴지 정한다.
//
// 원래는 10분 미만이면 빨갛게 **10분 내내 깜빡였다**. 시험 중에 시야 한쪽이 10분 동안
// 깜빡이면 문제를 못 읽는다. 실제 시험은 "10분 남았습니다"를 한 번 말하고 만다.
// 그리고 깜빡임은 멀미·편두통을 부르는 사람이 있어서, 그런 설정을 켠 사람에게는
// 움직임 대신 색으로만 말해야 한다(prefers-reduced-motion).
//
// 그래서 두 단계로 나눈다 — 알아차리게 하는 단계와, 지금 서둘러야 하는 단계.

export type TimerLevel = 'normal' | 'soon' | 'urgent'

/** 10분 이하면 눈에 띄게, 3분 이하면 서둘러야 한다고 말한다. */
export function examTimerLevel(secondsLeft: number): TimerLevel {
  if (secondsLeft <= 180) return 'urgent'
  if (secondsLeft <= 600) return 'soon'
  return 'normal'
}

/** 남은 시간을 사람 말로. 시험 중에 계산을 시키지 않는다. */
export function timerNotice(secondsLeft: number): string | null {
  const level = examTimerLevel(secondsLeft)
  if (level === 'normal') return null
  const min = Math.ceil(secondsLeft / 60)
  return level === 'urgent'
    ? `${min}분 남았어요 — 안 푼 문항부터 채우세요`
    : `${min}분 남았어요`
}
