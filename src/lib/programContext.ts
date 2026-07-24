// 현재 활성 시험 모드(실글/KBS)를 쿠키로 보관.
// 서버 컴포넌트에서 getActiveProgram()으로 읽어 모드별 화면을 렌더한다.
import { cookies } from 'next/headers'
import { DEFAULT_PROGRAM, isProgramId, type ProgramId } from './programs'

export const PROGRAM_COOKIE = 'kptest_mode'

/** 현재 선택된 시험 모드. 미설정/이상값이면 기본(실용글쓰기). */
export async function getActiveProgram(): Promise<ProgramId> {
  const store = await cookies()
  const v = store.get(PROGRAM_COOKIE)?.value
  return v && isProgramId(v) ? v : DEFAULT_PROGRAM
}
