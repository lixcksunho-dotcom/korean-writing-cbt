// examId(URL 세그먼트) ↔ (program, year, round) 변환.
//
// 하위호환: 기존 실용글쓰기 URL 은 "year-round"(2조각) 그대로 유지한다.
// KBS 등 신규 시험만 "program-year-round"(3조각)로 표기해 기존 링크/북마크를 깨지 않는다.
import { DEFAULT_PROGRAM, isProgramId, type ProgramId } from './programs'

export type ParsedExamId = { program: ProgramId; year: number; round: number }

/** examId 파싱. 3조각(program-year-round)=신규, 2조각(year-round)=레거시(실용글쓰기). */
export function parseExamId(examId: string): ParsedExamId | null {
  const parts = examId.split('-')
  if (parts.length === 3 && isProgramId(parts[0])) {
    const year = parseInt(parts[1], 10)
    const round = parseInt(parts[2], 10)
    if (Number.isNaN(year) || Number.isNaN(round)) return null
    return { program: parts[0], year, round }
  }
  if (parts.length === 2) {
    const year = parseInt(parts[0], 10)
    const round = parseInt(parts[1], 10)
    if (Number.isNaN(year) || Number.isNaN(round)) return null
    return { program: DEFAULT_PROGRAM, year, round }
  }
  return null
}

/** examId 생성. 실용글쓰기는 기존 URL(year-round) 유지, 그 외는 program-year-round. */
export function formatExamId(program: ProgramId, year: number, round: number): string {
  return program === DEFAULT_PROGRAM ? `${year}-${round}` : `${program}-${year}-${round}`
}
