'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, X, Sparkles } from 'lucide-react'
import { trackEvent } from '@/lib/analytics/trackEvent'
import type { QuizItem } from './topicQuizBank'

// 눌러 보는 부분만 클라이언트. 문항 데이터는 서버에서 골라 props로 온다.

// ctaHref 기본값이 /cbt였는데, 비로그인으로 열면 곧바로 /login으로 튕긴다.
// 맛보기 문제를 다 푼 사람은 아직 가입 전이므로 가입 화면으로 바로 보낸다 —
// 로그인 화면을 한 번 거치게 하면 '계정이 없으신가요?'를 찾아야 하는 단계가 하나 는다.
export default function TopicQuizBoard({
  topic,
  items,
  ctaHref = '/signup?from=quiz',
}: { topic: string; items: QuizItem[]; ctaHref?: string }) {
  const [picked, setPicked] = useState<Record<number, number>>({})

  // 가설로 만든 장치라 효과를 볼 수 있어야 한다 — 몇 명이 손대고 끝까지 푸는지 남긴다.
  // setState 업데이터 안에서 보내면 StrictMode에서 두 번 찍힐 수 있어 밖에서 처리한다.
  function pick(qIndex: number, optIndex: number) {
    if (picked[qIndex] !== undefined) return
    const next = { ...picked, [qIndex]: optIndex }
    setPicked(next)
    const count = Object.keys(next).length
    if (count === 1) trackEvent('quiz_try', topic)
    if (items && count === items.length) trackEvent('quiz_done', topic)
  }

  if (!items?.length) return null
  const solved = Object.keys(picked).length
  const correct = items.filter((it: QuizItem, i: number) => picked[i] === it.answer).length

  return (
    <section className="mb-10 rounded-2xl border border-[#e2e8f0] bg-white p-5">
      <h2 className="text-lg font-black text-[#0f172a]">읽었으면 풀어볼까요?</h2>
      <p className="mt-0.5 mb-4 text-xs text-[#64748b]">
        가입 없이 바로 풀 수 있어요. 고르면 정답과 이유가 바로 나옵니다.
      </p>

      <div className="space-y-5">
        {items.map((it, i) => {
          const chosen = picked[i]
          const done = chosen !== undefined
          return (
            <div key={it.q}>
              <p className="mb-2 text-sm font-bold text-[#0f172a]">
                {i + 1}. {it.q}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {it.options.map((opt, oi) => {
                  const isAnswer = oi === it.answer
                  const isChosen = chosen === oi
                  const tone = !done
                    ? 'border-[#e2e8f0] hover:border-[#cbd5e1]'
                    : isAnswer
                      ? 'border-emerald-300 bg-emerald-50'
                      : isChosen
                        ? 'border-red-200 bg-red-50'
                        : 'border-[#e2e8f0] opacity-60'
                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={done}
                      onClick={() => pick(i, oi)}
                      className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-3 text-left text-sm text-[#334155] transition-colors disabled:cursor-default ${tone}`}
                    >
                      <span>{opt}</span>
                      {done && isAnswer && <Check className="h-4 w-4 shrink-0 text-emerald-700" />}
                      {done && isChosen && !isAnswer && <X className="h-4 w-4 shrink-0 text-red-600" />}
                    </button>
                  )
                })}
              </div>
              {done && (
                <p className="mt-2 rounded-xl bg-[#f8fafc] px-3.5 py-2.5 text-xs leading-relaxed text-[#475569]">
                  {it.why}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {solved === items.length && (
        <div className="mt-5 rounded-xl bg-gradient-to-br from-[#0f1f3d] to-[#1e3a5f] px-5 py-5 text-center text-white">
          <p className="text-base font-black">
            {items.length}문제 중 {correct}문제 정답
          </p>
          {/* 점수를 그냥 되풀이하지 않고, 그 점수가 무슨 뜻인지 한 줄로 말해 준다.
              전에는 몇 개를 맞혔든 같은 문장이라 다음 행동으로 이어질 이유가 없었다. */}
          <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-white/75">
            {correct === items.length
              ? '이 유형은 잡혔어요. 실전 39문항에서도 그런지 확인해 보세요.'
              : correct >= items.length - 1
                ? '거의 다 맞혔어요. 실전은 39문항이라 이런 문제가 계속 나와요.'
                : '헷갈리는 유형이 보여요. 실전 39문항을 풀면 어느 영역이 약한지 나옵니다.'}
          </p>

          <Link
            href={ctaHref}
            onClick={() => trackEvent('quiz_cta', topic)}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-3.5 text-sm font-black text-[#1e3a5f]"
          >
            <Sparkles className="h-4 w-4" />
            30초 가입하고 39문항 풀어보기
          </Link>
          {/* 여기서 무슨 일이 생기는지 미리 말한다. 전에는 '무료 모의고사 풀어보기'를
              누르면 예고 없이 로그인 화면이 떴다 — 맨 위에서 '가입 없이 풀 수 있다'고
              해 놓고서. 34명이 문제를 다 풀고도 한 명도 누르지 않은 자리다. */}
          <p className="mt-2 text-xs text-white/60">
            이메일·비밀번호만 · 카드 등록 없음
          </p>
        </div>
      )}
    </section>
  )
}
