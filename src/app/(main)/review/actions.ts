'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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
  // 막으면 안 되기 때문이다. UPDATE 정책이 없어서(003) 지우고 다시 넣는다.
  //
  // 삭제만 service_role로 한다. reviews에는 삭제 '정책'은 있어도(003) authenticated에
  // DELETE '권한'이 없어서 사용자 클라이언트로는 "permission denied for table reviews"가
  // 난다 — 정책과 권한은 다른 층이다. 범위는 본인 행으로 못박는다(위에서 세션 확인).
  const { error: delErr } = await createAdminClient().from('reviews').delete().eq('user_id', user.id)
  if (delErr) throw new Error(delErr.message)

  const { error } = await supabase.from('reviews').insert({
    user_id: user.id,
    display_name: data.displayName.trim().slice(0, 20) || '회원',
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
