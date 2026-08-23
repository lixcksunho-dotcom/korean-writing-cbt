'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// 권한 확인은 신고 화면과 같은 방식(레이아웃 가드만 믿지 않는다 — 서버 액션은 직접 불릴 수 있다).
async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
  if (!user || !adminEmails.includes(user.email ?? '')) throw new Error('Forbidden')
}

export async function setFeedbackResolved(id: string, resolved: boolean) {
  await assertAdmin()
  const { error } = await createAdminClient().from('feedback').update({ resolved }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/feedback')
}
