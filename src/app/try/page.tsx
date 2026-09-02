import type { Metadata } from 'next'
import Link from 'next/link'
import LogoGlyph from '@/components/layout/LogoGlyph'
import SiteFooter from '@/components/layout/SiteFooter'
import TrialQuiz, { type TrialQuestion } from '@/components/try/TrialQuiz'
import { questionBank } from '@/lib/questionBank'
import { TRIAL_TOPICS, findTrialTopic } from '@/lib/trialTopics'

export const revalidate = 3600

export const metadata: Metadata = {
  title: '한국실용글쓰기 문제 풀어보기 — 회원가입 없이 5문항',
  description:
    '한국실용글쓰기 시험 문제를 회원가입 없이 바로 풀어 보세요. 채점과 해설까지 무료입니다. 맞춤법·외래어 표기·띄어쓰기 등 실제 출제 유형 그대로.',
  keywords: [
    '한국실용글쓰기 문제', '한국실용글쓰기 기출문제', '한국실용글쓰기 모의고사',
    '실용글쓰기 문제풀이', '실용글쓰기 무료 문제', '실용글쓰기CBT',
  ],
  alternates: { canonical: '/try' },
}

// 로그인 없이 풀어 보는 맛보기 화면.
//
// 왜 만들었나: /cbt도 /practice도 로그인 필수라, 검색으로 들어온 사람이 문제를 한 번도
// 못 보고 돌아갔다. 경쟁 CBT는 전부 '회원가입 없이 바로 풀기'다(comcbt·cbtkorea 실측).
// 유입의 맨 앞이 막혀 있으면 뒤의 어떤 기능도 쓰이지 않는다.
//
// 다 열지는 않는다 — 5문항만. 우리가 파는 것(전 회차·서술형 AI 채점·약점 분석)은 그대로 두고,
// '이 사이트 문제가 쓸 만하다'는 것만 확인시킨다.
export default async function TryPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>
}) {
  // 검색은 '맞춤법 문제'·'띄어쓰기 문제'처럼 유형으로 들어온다. 주소에 유형이 있으면
  // 그 사람이 찾던 것을 첫 화면에 바로 보여 준다. 없으면 여러 유형을 섞어 준다.
  const topic = findTrialTopic((await searchParams).t)

  // program 필터가 반드시 있어야 한다 — 이 표에는 KBS 문항 300개가 아직 남아 있고,
  // 안 거르면 실글패스 화면에 [듣기] 문항이 섞여 나온다.
  let query = questionBank()
    .from('questions')
    .select('id, number, question, passage, options, correct_answer, explanation')
    .eq('program', 'silyong')
    .eq('type', 'multiple')

  if (topic) {
    query = query.ilike('question', `%${topic.keyword}%`).order('id').limit(5)
  } else {
    // 유형을 안 고른 사람에게는 1회차 앞부분을 준다 — 실제 시험이 시작되는 모습 그대로다.
    query = query.eq('round', 1).lte('number', 30).order('number').limit(5)
  }
  const { data } = await query

  const questions: TrialQuestion[] = (data ?? []).map(q => ({
    id: String(q.id),
    number: Number(q.number),
    question: String(q.question),
    passage: (q.passage as string | null) ?? null,
    options: (q.options as string[]) ?? [],
    correct: String(q.correct_answer),
    explanation: (q.explanation as string | null) ?? null,
  }))

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]">
      <header className="border-b border-[#e2e8f0] bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 py-2">
            <LogoGlyph className="h-6 w-6" />
            <span className="font-black text-[#0f1f3d]">실글패스</span>
          </Link>
          <Link href="/signup" className="py-3 text-sm font-semibold text-[#475569] transition-colors hover:text-[#0f1f3d]">
            무료 가입 →
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
          <div className="mb-8 border-t-4 border-[#0f1f3d] pt-6">
            <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-[#94a3b8]">회원가입 없이 · 무료</p>
            <h1 className="mb-4 text-3xl font-black leading-tight text-[#0f1f3d] sm:text-4xl">
              {topic ? `한국실용글쓰기 ${topic.label} 문제,` : '한국실용글쓰기 문제,'}
              <br />
              지금 바로 풀어 보세요
            </h1>
            <p className="leading-relaxed text-[#475569]">
              실제 출제 유형 그대로입니다. 채점과 해설까지 로그인 없이 볼 수 있어요.
            </p>
          </div>

          {/* 유형을 고르면 그 유형만 나온다. 설명 페이지에서 '다른 유형도'를 누른 사람에게
              같은 문항을 또 주지 않기 위해서이기도 하다. */}
          <div className="mb-6 flex flex-wrap gap-2">
            <Link
              href="/try"
              className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-bold transition-colors ${
                topic ? 'border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f1f5f9]' : 'border-[#0f1f3d] bg-[#0f1f3d] text-white'
              }`}
            >
              전체
            </Link>
            {TRIAL_TOPICS.map(t => (
              <Link
                key={t.slug}
                href={`/try?t=${t.slug}`}
                className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-bold transition-colors ${
                  topic?.slug === t.slug ? 'border-[#0f1f3d] bg-[#0f1f3d] text-white' : 'border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f1f5f9]'
                }`}
              >
                {t.label}
              </Link>
            ))}
          </div>

          <TrialQuiz questions={questions} />

          <p className="mt-10 text-center text-sm text-[#94a3b8]">
            전 회차 모의고사와 서술형 AI 채점·첨삭은{' '}
            <Link href="/signup" className="font-bold text-[#0f1f3d] underline underline-offset-2">
              무료 가입
            </Link>
            {' '}후에 쓸 수 있어요.
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
