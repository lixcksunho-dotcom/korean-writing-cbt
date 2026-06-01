'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitReview(data: {
  displayName: string
  content: string
  rating: number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase.from('reviews').insert({
    user_id: user.id,
    display_name: data.displayName.trim(),
    content: data.content.trim(),
    rating: data.rating,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/')
  revalidatePath('/dashboard')
}
