// 시험 일정의 '오늘'·남은 날·접수 상태 — 서버와 브라우저가 같은 답을 내야 한다.
//
// 왜 따로 두나: 예전엔 ScheduleModal 안에서 `new Date()` 의 로컬 날짜로 '오늘'을 잡았다.
// Vercel 서버는 UTC 라 한국의 새벽 0~9시에는 서버의 '오늘'이 하루 전이다. 자매 서비스(KBS패스)에서
// 2026-09-07(접수 시작일) 새벽에 서버는 "접수 예정", 브라우저는 "접수 중 D-25"를 그려 hydration 이
// 어긋났고(React #418, 7화면), 접수 기간 중에는 매일 새벽 D-숫자가 하루씩 달랐다. 이 저장소는 같은
// 코드였고 제121회 접수 마감이 2026-09-07 이라 다음 날 새벽에 같은 사고가 예정돼 있었다.
// 시험은 한국에서 치르므로 '오늘'은 어디서 계산하든 **한국 날짜**다.
import type { Round } from './examSchedule'

/** 지금 이 순간의 한국 날짜 'YYYY-MM-DD' — 프로세스·브라우저 시간대와 무관하다. */
export function kstYmd(now: Date = new Date()): string {
  // en-CA 는 ISO 순서(YYYY-MM-DD)로 찍는 유일한 흔한 로케일이다.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

/** 'YYYY-MM-DD' → 날짜 번호(그 날 UTC 자정 ms). 로컬 자정을 쓰지 않아 시간대에 안 흔들린다. */
export function dayNumber(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

/** 오늘(KST)부터 그 날짜까지 남은 날. 같은 날이면 0. */
export function daysUntil(ymd: string, now: Date = new Date()): number {
  return Math.round((dayNumber(ymd) - dayNumber(kstYmd(now))) / 86400000)
}

// 접수 마감(closed)과 시험 종료(done)는 다르다. 접수가 끝나도 시험까지 2~3주가 남고,
// 이미 접수한 사람에게는 그 시험일이 지금 가장 중요한 날짜다.
export type RoundStatus = 'open' | 'addon' | 'upcoming' | 'closed' | 'done'

export function roundStatus(r: Round, now: Date = new Date()): RoundStatus {
  const today = dayNumber(kstYmd(now))
  if (today < dayNumber(r.applyStart)) return 'upcoming'
  if (today <= dayNumber(r.applyEnd)) return 'open'
  if (r.addonEnd && today <= dayNumber(r.addonEnd)) return 'addon'
  if (today <= dayNumber(r.examDate)) return 'closed'
  return 'done'
}

/** 아직 낼 수 있는가(정기 또는 추가접수 중) */
export const canApply = (st: RoundStatus) => st === 'open' || st === 'addon'

/** 대표 회차와 그 D-day — 접수중이면 그 회차, 아니면 가장 가까운 회차(배열은 날짜순). */
export function primaryRound(rounds: Round[], now: Date = new Date()): { primary: Round; status: RoundStatus; dday: number; upcoming: Round[] } {
  const upcoming = rounds.filter((r) => roundStatus(r, now) !== 'done')
  const primary = upcoming.find((r) => canApply(roundStatus(r, now))) ?? upcoming[0] ?? rounds[rounds.length - 1]
  const status = roundStatus(primary, now)
  const dday =
    status === 'open' ? daysUntil(primary.applyEnd, now)
      : status === 'addon' ? daysUntil(primary.addonEnd!, now)
        : status === 'upcoming' ? daysUntil(primary.applyStart, now)
          : status === 'closed' ? daysUntil(primary.examDate, now)
            : 0
  return { primary, status, dday, upcoming }
}
