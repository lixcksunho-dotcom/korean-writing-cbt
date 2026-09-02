import Link from 'next/link'
import { PenLine, ArrowRight } from 'lucide-react'
import TrialQuiz, { type TrialQuestion } from '@/components/try/TrialQuiz'
import { questionBank } from '@/lib/questionBank'

// 읽고 나가는 글에 '지금 풀어 보기'를 붙인다.
//
// 왜: 검색으로 들어오는 사람의 대부분이 설명 페이지에 닿는다(30일 실측 — /manuscript-guide
// 225건, /idioms 95건, /spelling 45건). 그런데 그 페이지들은 읽고 끝이라, 읽은 사람이
// 우리 문제를 한 번도 못 보고 나간다. 읽은 자리에서 바로 풀게 하면 두 가지가 생긴다 —
// 머무는 시간이 늘고(검색에 유리), 문제 품질을 직접 확인한 사람만 가입 화면으로 간다.
//
// 로그인은 걸지 않는다. 여기서 막으면 붙이는 의미가 없다.

/** 문항 본문에 이 낱말이 들어간 것만 고른다. 유형표가 따로 없어 본문으로 가른다. */
export type QuizTopic = { keyword: string; label: string }

export default async function InlineQuiz({
  topic,
  count = 3,
  heading,
}: {
  topic: QuizTopic
  count?: number
  heading?: string
}) {
  const { data } = await questionBank()
    .from('questions')
    .select('id, number, question, passage, options, correct_answer, explanation')
    // KBS 문항이 같은 표에 남아 있다 — 안 거르면 [듣기] 문항이 섞여 나온다.
    .eq('program', 'silyong')
    .eq('type', 'multiple')
    .ilike('question', `%${topic.keyword}%`)
    .order('id')
    .limit(count)

  const questions: TrialQuestion[] = (data ?? []).map(q => ({
    id: String(q.id),
    number: Number(q.number),
    question: String(q.question),
    passage: (q.passage as string | null) ?? null,
    options: (q.options as string[]) ?? [],
    correct: String(q.correct_answer),
    explanation: (q.explanation as string | null) ?? null,
  }))

  // 문항이 없으면 빈 상자를 남기지 않는다 — 없는 것을 있는 척하면 그게 더 나쁘다.
  if (questions.length === 0) return null

  return (
    <section className="mt-12 rounded-2xl border border-[#e2e8f0] bg-white p-5 sm:p-6">
      <div className="mb-1.5 flex items-center gap-2">
        <PenLine className="h-5 w-5 text-[#d97706]" aria-hidden="true" />
        <h2 className="text-lg font-black text-[#0f1f3d]">
          {heading ?? `${topic.label}, 지금 풀어 보세요`}
        </h2>
      </div>
      <p className="mb-5 text-sm text-[#64748b]">
        실제 출제 유형 그대로입니다. 회원가입 없이 채점과 해설까지 볼 수 있어요.
      </p>

      <TrialQuiz questions={questions} />

      <p className="mt-5 text-center text-sm text-[#64748b]">
        <Link href="/try" className="inline-flex items-center gap-1 font-bold text-[#1e3a5f] underline underline-offset-2">
          다른 유형도 풀어보기 <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </p>
    </section>
  )
}
