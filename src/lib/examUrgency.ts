// 시험이 코앞일 때만 켜지는 긴급 안내 — "며칠 안 남았다"는 사실일 때만 말한다.
//
// 왜 임계를 두나: 접수가 끝나도 시험까지 ~12일이 남고, 그 다음 회차는 두 달쯤 뒤다.
// 항상 "시험 임박"이라고 하면 접수가 막 열린 날(시험 5주 뒤)에도 거짓말이 된다.
// 그래서 가장 가까운 '아직 안 지난' 시험의 한국 날짜 D-day 가 임계 안일 때만 켠다.
import { getSchedule, type Round } from './examSchedule'
import { daysUntil } from './examDday'

/** 이 날짜 안이면 "시험이 며칠 안 남았다"고 강조한다. */
export const URGENT_WITHIN_DAYS = 14

/** 가장 가까운 다가오는 시험과, 그게 임계 안이면 강조 여부. rounds 는 날짜순. */
export function examUrgency(rounds: Round[], now: Date = new Date()): { show: boolean; dday: number; round: Round | null } {
  const round = rounds.find((r) => daysUntil(r.examDate, now) >= 0) ?? null
  if (!round) return { show: false, dday: 0, round: null }
  const dday = daysUntil(round.examDate, now)
  return { show: dday <= URGENT_WITHIN_DAYS, dday, round }
}

/** 실용글쓰기 기준 긴급 안내 — 서버 컴포넌트 편의 래퍼. */
export function silyongExamUrgency(now: Date = new Date()) {
  return examUrgency(getSchedule('silyong').rounds, now)
}
