'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// 서버 액션은 레이아웃 가드와 별개이므로 호출 시마다 관리자 권한을 재확인한다.
async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
  if (!user || !adminEmails.includes(user.email ?? '')) throw new Error('Forbidden')
}

function revalidate() {
  revalidatePath('/admin/reviews')
  revalidatePath('/')
  revalidatePath('/dashboard')
}

/** 점수 인증 확정/해제 */
export async function setReviewVerified(id: string, verified: boolean) {
  await assertAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from('reviews').update({ verified }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidate()
}

/** 후기 노출/숨김 */
export async function setReviewVisible(id: string, isVisible: boolean) {
  await assertAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from('reviews').update({ is_visible: isVisible }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidate()
}

/** 후기 삭제(인증 사진까지 함께 제거) */
export async function deleteReview(id: string) {
  await assertAdmin()
  const admin = createAdminClient()
  const { data } = await admin.from('reviews').select('proof_path').eq('id', id).single()
  if (data?.proof_path) {
    await admin.storage.from('review-proofs').remove([data.proof_path as string])
  }
  const { error } = await admin.from('reviews').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidate()
}
