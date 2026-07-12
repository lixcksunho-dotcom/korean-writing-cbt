// 한국실용글쓰기 정기시험 일정·응시 정보 (출처: https://www.klata.or.kr/test/schedule)
// ⚠️ 일정은 주관처 사정으로 변경될 수 있습니다. 새 회차 공지 시 이 배열을 갱신하세요.
// ScheduleModal(로그인 후 안내 모달)과 /exam-info(공개 SEO 페이지)가 공유하는 단일 소스.

export const APPLY_URL = 'https://www.klata.or.kr/testing_accept/'
export const SCHEDULE_URL = 'https://www.klata.or.kr/test/schedule'

export type Round = {
  round: string
  applyStart: string
  applyEnd: string
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
