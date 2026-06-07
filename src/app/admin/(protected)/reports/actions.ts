'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
  if (!user || !adminEmails.includes(user.email ?? '')) throw new Error('Forbidden')
}

export async function setReportResolved(id: string, resolved: boolean) {
  await assertAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from('question_reports').update({ resolved }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/reports')
}

export async function deleteReport(id: string) {
  await assertAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from('question_reports').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/reports')
}
