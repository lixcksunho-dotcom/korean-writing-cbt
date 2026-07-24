'use server'

// 시험 모드(실글/KBS) 전환 — 쿠키에 저장하고 화면을 갱신한다.
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { PROGRAM_COOKIE } from '@/lib/programContext'
import { isProgramId } from '@/lib/programs'

export async function setActiveProgram(program: string): Promise<void> {
  if (!isProgramId(program)) return
  const store = await cookies()
  store.set(PROGRAM_COOKIE, program, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1년
    sameSite: 'lax',
  })
  // 레이아웃 이하 모든 서버 컴포넌트를 새 모드로 다시 렌더
  revalidatePath('/', 'layout')
}
