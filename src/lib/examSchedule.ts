// 한국실용글쓰기 정기시험 일정·응시 정보 (출처: https://www.klata.or.kr/test/schedule)
// ⚠️ 일정은 주관처 사정으로 변경될 수 있습니다. 새 회차 공지 시 이 배열을 갱신하세요.
// ScheduleModal(로그인 후 안내 모달)과 /exam-info(공개 SEO 페이지)가 공유하는 단일 소스.

export const APPLY_URL = 'https://www.klata.or.kr/testing_accept/'
export const SCHEDULE_URL = 'https://www.klata.or.kr/test/schedule'

export type Round = {
  round: string
  applyStart: string
  /** 정기접수 마감 */
  applyEnd: string
  /**
   * 추가접수 마감(있는 시험만). KBS는 정기접수가 끝난 다음 날부터 9일간 더 받는데,
   * 이 값이 없으면 화면이 그 기간에도 '접수 마감'이라고 말한다 — 아직 낼 수 있는
   * 사람을 돌려보내는 셈이다.
   */
  addonEnd?: string
  examDate: string
  resultDate: string
}

export const SCHEDULE: Round[] = [
  { round: '제117회', applyStart: '2025-12-15', applyEnd: '2026-01-05', examDate: '2026-01-17', resultDate: '2026-02-17' },
  { round: '제118회', applyStart: '2026-02-16', applyEnd: '2026-03-09', examDate: '2026-03-21', resultDate: '2026-04-21' },
  { round: '제119회', applyStart: '2026-04-13', applyEnd: '2026-05-04', examDate: '2026-05-16', resultDate: '2026-06-16' },
  { round: '제120회', applyStart: '2026-06-08', applyEnd: '2026-06-29', examDate: '2026-07-11', resultDate: '2026-08-11' },
  { round: '제121회', applyStart: '2026-08-17', applyEnd: '2026-09-07', examDate: '2026-09-19', resultDate: '2026-10-20' },
  { round: '제122회', applyStart: '2026-10-19', applyEnd: '2026-11-09', examDate: '2026-11-21', resultDate: '2026-12-22' },
  { round: '제123회', applyStart: '2026-12-14', applyEnd: '2027-01-04', examDate: '2027-01-16', resultDate: '2027-02-16' },
]

// ── KBS한국어능력시험 일정 (출처: KBS한국어진흥원 공식 접수 목록, 2026-08-10 대조 확인) ──
// applyEnd는 '정기접수' 마감이다. 공식 목록은 추가접수 마감(정기 +9일)도 함께 보여 주는데,
// 92·93회가 정기 기준으로 들어가 있어 94회도 같은 기준으로 맞췄다 — 섞으면 회차마다
// 안내가 달라진다.
// https://www.kbskorean.org/klt/exam-apply/list · 변경 시 이 배열 갱신.
export const KBS_APPLY_URL = 'https://www.kbskorean.org/klt/exam-apply/list'
export const KBS_SCHEDULE_URL = 'https://www.kbskorean.org/klt/exam-apply/list'
export const KBS_SCHEDULE: Round[] = [
  { round: '제92회', applyStart: '2026-07-06', applyEnd: '2026-08-07', addonEnd: '2026-08-16', examDate: '2026-08-23', resultDate: '2026-09-03' },
  { round: '제93회', applyStart: '2026-09-07', applyEnd: '2026-10-02', addonEnd: '2026-10-11', examDate: '2026-10-18', resultDate: '2026-10-29' },
  { round: '제94회', applyStart: '2026-11-02', applyEnd: '2026-12-04', addonEnd: '2026-12-13', examDate: '2026-12-20', resultDate: '2026-12-31' },
]

export type ProgramSchedule = { title: string; rounds: Round[]; applyUrl: string; scheduleUrl: string }

/** 활성 시험(program)에 맞는 일정·링크·제목을 반환 */
export function getSchedule(program: string): ProgramSchedule {
  if (program === 'kbs') {
    return { title: 'KBS한국어능력시험 시험 일정', rounds: KBS_SCHEDULE, applyUrl: KBS_APPLY_URL, scheduleUrl: KBS_SCHEDULE_URL }
  }
  return { title: '한국실용글쓰기 시험 일정', rounds: SCHEDULE, applyUrl: APPLY_URL, scheduleUrl: SCHEDULE_URL }
}
