'use server'

import { createClient } from '@/lib/supabase/server'
import { questionBank } from '@/lib/questionBank'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

type QuestionInput = {
  year: number
  round: number
  number: number
  type: 'multiple' | 'short' | 'essay'
  passage?: string | null
  question: string
  options: string[] | null
  correct_answer: string
  explanation: string
}

// 권한 확인은 사용자 세션으로, 실제 읽기·쓰기는 questionBank(service_role)로 한다.
// 마이그레이션 033이 questions의 공개 정책을 없앤 뒤로 사용자 클라이언트는 이 표를
// 한 줄도 못 읽고 못 쓴다 — 관리자 화면이 조용히 '총 0문항'으로 굳어 있었다.
async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  // filter(Boolean) 필수 — ADMIN_EMAILS가 비었거나 끝에 쉼표가 있으면 목록에 ''가 남고,
  // 이메일 없는 계정(user.email undefined → '')이 관리자로 통과해 버린다.
  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
  if (!user.email || !adminEmails.includes(user.email)) redirect('/dashboard')
  return supabase
}

export async function createQuestion(data: QuestionInput) {
  await requireAdmin()
  const { error } = await questionBank().from('questions').insert({
    ...data,
    options: data.options ? JSON.stringify(data.options) : null,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/questions')
  revalidatePath('/cbt')
  // 홈의 '9회분·351문항'과 맛보기 문제도 여기서 나온다. 안 걸어 두면 문항을 고쳐도
  // 만료될 때까지 옛 숫자·옛 문제가 걸려 있다.
  revalidatePath('/')
  revalidatePath('/try', 'layout')
}

export async function updateQuestion(id: string, data: QuestionInput) {
  await requireAdmin()
  const { error } = await questionBank().from('questions').update({
    ...data,
    options: data.options ? JSON.stringify(data.options) : null,
  }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/questions')
  revalidatePath('/cbt')
  // 홈의 '9회분·351문항'과 맛보기 문제도 여기서 나온다. 안 걸어 두면 문항을 고쳐도
  // 만료될 때까지 옛 숫자·옛 문제가 걸려 있다.
  revalidatePath('/')
  revalidatePath('/try', 'layout')
}

export async function deleteQuestion(id: string) {
  await requireAdmin()
  const { error } = await questionBank().from('questions').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/questions')
  revalidatePath('/cbt')
  // 홈의 '9회분·351문항'과 맛보기 문제도 여기서 나온다. 안 걸어 두면 문항을 고쳐도
  // 만료될 때까지 옛 숫자·옛 문제가 걸려 있다.
  revalidatePath('/')
  revalidatePath('/try', 'layout')
}
