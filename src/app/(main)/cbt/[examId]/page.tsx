import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ExamPlayer, { type Question } from '@/components/cbt/ExamPlayer'

export default async function ExamPage({
  params,
}: {
  params: Promise<{ examId: string }>
}) {
  const { examId } = await params
  const [yearStr, roundStr] = examId.split('-')
  const year = parseInt(yearStr)
  const round = parseInt(roundStr)

  if (isNaN(year) || isNaN(round)) redirect('/cbt')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: questions } = await supabase
    .from('questions')
    .select('id, number, type, question, options, passage')
    .eq('year', year)
    .eq('round', round)
    .order('number')

  if (!questions?.length) redirect('/cbt')

  return (
    <ExamPlayer
      questions={questions as unknown as Question[]}
      examYear={year}
      examRound={round}
    />
  )
}
