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

  // 한 사람당 후기는 하나. 예전에는 점수 인증 사진이 필수라 사실상 한 번뿐이었는데,
  // 인증 없이도 쓸 수 있게 되면서 같은 사람이 여러 개를 올릴 수 있게 됐다.
  // 막지는 않고 갈아 끼운다 — 나중에 시험을 보고 점수 인증 후기로 바꿔 쓰는 길을
  // 막으면 안 되기 때문이다. UPDATE 정책이 없어서(마이그레이션 003) 지우고 다시 넣는다.
  const { error: delErr } = await supabase.from('reviews').delete().eq('user_id', user.id)
  if (delErr) throw new Error(delErr.message)

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
