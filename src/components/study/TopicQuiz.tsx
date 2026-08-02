'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, X, Sparkles } from 'lucide-react'
import { trackEvent } from '@/lib/analytics/trackEvent'

// 학습자료로 들어온 사람의 88%가 한 페이지만 보고 떠난다(로그인까지 간 사람은 139명 중 1명).
// 규칙을 읽는 건 수동적이라, 읽고 나면 볼일이 끝난다. 그래서 읽은 자리에서 바로 풀어보게 하고
// 맞히든 틀리든 "실전은 39문항" 쪽으로 이어 준다.
//
// 문항은 정적 데이터다. 문제은행(questions)은 서버 전용이라 공개 페이지로 내보내지 않는다
// — 여기 있는 건 맛보기용으로 따로 쓴 것이고, 어문 규범으로 검증 가능한 것만 담았다.
type Item = { q: string; options: string[]; answer: number; why: string }

const BANK: Record<string, Item[]> = {
  spelling: [
    {
      q: '맞춤법이 바른 것은?',
      options: ['안 되', '안 돼', '안되여', '안 되여'],
      answer: 1,
      why: "'돼'는 '되어'의 준말이라 '되어'로 바꿔 말이 되면 '돼'입니다. '안 되어' → '안 돼'.",
    },
    {
      q: '빈칸에 알맞은 것은? — 밥을 먹지 (   ) 았다',
      options: ['안', '않', '안 하', '아니'],
      answer: 1,
      why: "'않'은 '아니하'의 준말로 용언 뒤에 붙습니다. 부사 '안'은 '안 먹어'처럼 앞에 옵니다.",
    },
    {
      q: '바르게 쓴 것은?',
      options: ['오랫만에 설레였다', '오랜만에 설레였다', '오랜만에 설레었다', '오랫만에 설레었다'],
      answer: 2,
      why: "'오랜만'은 '오래간만'의 준말이고, 기본형이 '설레다'라 '설레었다(설렜다)'가 맞습니다.",
    },
  ],
  honorifics: [
    {
      q: '높임 표현이 바른 것은?',
      options: [
        '주문하신 음료 나오셨습니다.',
        '이 상품은 품절이십니다.',
        '할아버지께서는 귀가 밝으십니다.',
        '사장님 말씀이 계시겠습니다.',
      ],
      answer: 2,
      why: '음료·상품은 사물이라 높임 대상이 아닙니다(사물 존대). ④는 «말씀이 있으시겠습니다»가 맞습니다.',
    },
    {
      q: '웃어른께 묻는 상황에서 바른 것은?',
      options: ['할머니께 물어봤다', '할머니한테 물어보셨다', '할머니께 여쭤봤다', '할머니가 물으셨다'],
      answer: 2,
      why: "'여쭈다'는 웃어른께 묻는 것을 낮춰 이르는 객체 높임 어휘이고, 조사도 '께'를 씁니다.",
    },
  ],
  'standard-words': [
    {
      q: '표준어로만 묶인 것은?',
      options: ['강남콩·웃어른', '강낭콩·윗어른', '강낭콩·웃어른', '강남콩·윗어른'],
      answer: 2,
      why: "'강낭콩'은 어원에서 멀어진 형태가 굳어져 표준어이고, 위아래 대립이 없으면 '웃-'을 씁니다.",
    },
    {
      q: '표준어가 아닌 것은?',
      options: ['미장이', '사글세', '아지랭이', '깍쟁이'],
      answer: 2,
      why: "'ㅣ' 역행 동화를 인정하지 않아 '아지랑이'가 표준어입니다.",
    },
  ],
  idioms: [
    {
      q: '‘괄목상대(刮目相對)’의 뜻은?',
      options: [
        '눈을 비비고 다시 볼 만큼 실력이 크게 늚',
        '서로 눈을 마주 보며 대립함',
        '눈앞의 이익만 좇음',
        '지위가 높은 사람을 우러러봄',
      ],
      answer: 0,
      why: '«눈을 비비고 상대를 대한다»는 뜻으로, 남의 학식이나 재주가 몰라볼 만큼 늘었을 때 씁니다.',
    },
    {
      q: '‘전화위복(轉禍爲福)’의 뜻은?',
      options: ['화를 참아 복을 부름', '재앙이 바뀌어 도리어 복이 됨', '복이 지나쳐 화가 됨', '화와 복은 정해져 있음'],
      answer: 1,
      why: '«화(禍)가 굴러 복(福)이 된다»는 뜻으로, 나쁜 일이 계기가 되어 좋은 결과로 이어질 때 씁니다.',
    },
    {
      q: '‘조삼모사(朝三暮四)’가 가리키는 것은?',
      options: [
        '아침저녁으로 부지런히 힘씀',
        '실제는 같은데 눈앞의 차이에 속음',
        '아침에 한 말을 저녁에 바꿈',
        '하루 네 끼를 나누어 먹음',
      ],
      answer: 1,
      why: '도토리를 «아침 셋 저녁 넷»으로 바꿔 원숭이를 달랜 고사에서 나왔습니다. 총량은 같은데 눈앞의 차이에 속는 것입니다.',
    },
  ],
  proverbs: [
    {
      q: '‘소 잃고 외양간 고친다’의 뜻은?',
      options: ['미리 대비해 큰 화를 막음', '일이 잘못된 뒤에야 손을 씀', '작은 손해로 큰 이익을 얻음', '남의 일에 참견함'],
      answer: 1,
      why: '이미 일을 그르친 뒤에 뒤늦게 대비한다는 뜻으로, 사후 약방문과 통합니다.',
    },
    {
      q: '‘등잔 밑이 어둡다’의 뜻은?',
      options: ['가까이 있는 것을 도리어 잘 모른다', '어두운 곳에서는 일하기 어렵다', '작은 빛도 소중하다', '멀리 볼수록 잘 보인다'],
      answer: 0,
      why: '가까이에 있는 사정을 오히려 잘 모른다는 뜻입니다.',
    },
    {
      q: '‘가는 말이 고와야 오는 말이 곱다’가 강조하는 것은?',
      options: ['말은 적을수록 좋다', '내가 잘해야 남도 잘한다', '말보다 행동이 중요하다', '약속은 반드시 지켜야 한다'],
      answer: 1,
      why: '내가 남에게 하는 말이 고와야 상대도 곱게 답한다는 뜻입니다.',
    },
  ],
  expressions: [
    {
      q: '‘발이 넓다’의 뜻은?',
      options: ['걸음이 빠르다', '아는 사람이 많다', '고집이 세다', '욕심이 많다'],
      answer: 1,
      why: '사귀어 아는 사람이 많아 활동 범위가 넓다는 뜻입니다.',
    },
    {
      q: '‘귀가 얇다’의 뜻은?',
      options: ['소리를 잘 못 듣는다', '남의 말을 쉽게 받아들인다', '비밀을 잘 지킨다', '눈치가 빠르다'],
      answer: 1,
      why: '남이 하는 말에 쉽게 솔깃해 잘 넘어간다는 뜻입니다.',
    },
    {
      q: '‘손이 크다’의 뜻은?',
      options: ['씀씀이가 후하다', '일을 크게 벌인다', '힘이 세다', '욕심이 많다'],
      answer: 0,
      why: '음식이나 물건을 넉넉하게 마련하는, 씀씀이가 후한 것을 이릅니다.',
    },
  ],
  'loanword-spelling': [
    {
      q: '외래어 표기가 모두 바른 것은?',
      options: ['초콜렛·소세지', '초콜릿·소시지', '초콜릿·소세지', '초콜렛·소시지'],
      answer: 1,
      why: '외래어 표기법상 chocolate는 «초콜릿», sausage는 «소시지»입니다.',
    },
    {
      q: '바른 표기는?',
      options: ['악세사리', '액세사리', '액세서리', '악세서리'],
      answer: 2,
      why: 'accessory의 바른 표기는 «액세서리»입니다.',
    },
  ],
}

export default function TopicQuiz({ topic, ctaHref = '/cbt' }: { topic: string; ctaHref?: string }) {
  const items = BANK[topic]
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
  const correct = items.filter((it, i) => picked[i] === it.answer).length

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
                      className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-left text-sm text-[#334155] transition-colors disabled:cursor-default ${tone}`}
                    >
                      <span>{opt}</span>
                      {done && isAnswer && <Check className="h-4 w-4 shrink-0 text-emerald-600" />}
                      {done && isChosen && !isAnswer && <X className="h-4 w-4 shrink-0 text-red-400" />}
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
        <div className="mt-5 rounded-xl bg-gradient-to-br from-[#0f1f3d] to-[#1e3a5f] px-5 py-4 text-center text-white">
          <p className="text-sm font-bold">
            {items.length}문제 중 {correct}문제 정답
          </p>
          <p className="mt-0.5 text-xs text-white/70">
            실전은 39문항이에요. 무료 모의고사로 지금 점수를 재 보세요.
          </p>
          <Link
            href={ctaHref}
            onClick={() => trackEvent('quiz_cta', topic)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-black text-[#1e3a5f]"
          >
            <Sparkles className="h-3.5 w-3.5" />
            무료 모의고사 풀어보기
          </Link>
        </div>
      )}
    </section>
  )
}
