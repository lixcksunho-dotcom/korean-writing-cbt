'use server'

import { createClient } from '@/lib/supabase/server'
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

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim())
  if (!adminEmails.includes(user.email ?? '')) redirect('/dashboard')
  return supabase
}

export async function createQuestion(data: QuestionInput) {
  const supabase = await requireAdmin()
  const { error } = await supabase.from('questions').insert({
    ...data,
    options: data.options ? JSON.stringify(data.options) : null,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/questions')
  revalidatePath('/cbt')
}

export async function updateQuestion(id: string, data: QuestionInput) {
  const supabase = await requireAdmin()
  const { error } = await supabase.from('questions').update({
    ...data,
    options: data.options ? JSON.stringify(data.options) : null,
  }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/questions')
  revalidatePath('/cbt')
}

export async function deleteQuestion(id: string) {
  const supabase = await requireAdmin()
  const { error } = await supabase.from('questions').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/questions')
  revalidatePath('/cbt')
}
