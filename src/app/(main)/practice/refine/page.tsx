import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import refineWords from '@/data/refine-words.json'
import RefineQuiz, { type RefineItem } from './RefineQuiz'

export default async function RefinePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <RefineQuiz items={refineWords as RefineItem[]} />
}
