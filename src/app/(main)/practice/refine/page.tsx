import { createClient } from '@/lib/supabase/server'
import { redirectToLogin } from '@/lib/loginRedirect'
import refineWords from '@/data/refine-words.json'
import RefineQuiz, { type RefineItem } from './RefineQuiz'

export default async function RefinePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirectToLogin('/practice/refine')

  return <RefineQuiz items={refineWords as RefineItem[]} />
}
