'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitReview(data: {
  displayName: string
  content: string
  rating: number
  examDate?: string | null
  examScore?: number | null
  proofPath?: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase.from('reviews').insert({
    user_id: user.id,
    display_name: data.displayName.trim(),
    content: data.content.trim(),
    rating: data.rating,
    exam_date: data.examDate || null,
    exam_score: data.examScore ?? null,
    proof_path: data.proofPath || null,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/')
  revalidatePath('/dashboard')
}
