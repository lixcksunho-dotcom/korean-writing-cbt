import type { Metadata } from 'next'
import Link from 'next/link'
import LogoGlyph from '@/components/layout/LogoGlyph'
import SiteFooter from '@/components/layout/SiteFooter'
import BreadcrumbLd from '@/components/seo/BreadcrumbLd'
import StickyMobileCTA from '@/components/landing/StickyMobileCTA'
import RelatedBlogPosts from '@/components/blog/RelatedBlogPosts'
import InlineQuiz from '@/components/try/InlineQuiz'
import EssayPointMap from '@/components/study/EssayPointMap'

// 이 페이지를 만드는 근거는 유입 자료다.
//
// 90일 실측: 들어온 사람 중 '시험 쪽 화면도 본' 비율이 페이지마다 크게 갈렸다.
//   /essay-guide 71% · /guides 88% · /standard-words 89%   → 결제로 이어진다
//   /manuscript-guide 32% · /idioms 31% · /exam-compare 29% → 조회는 1·2위인데 결제 0건
// 원고지 작성법·사자성어를 찾는 사람의 3분의 2는 시험 준비생이 아니다(학교 과제·공모전).
//
// 그래서 조회수 큰 주제를 더 키우는 대신, **시험 의도가 분명한 주제**를 넓힌다.
// 서술형은 그중에서도 유료 기능(AI 첨삭)과 바로 이어지는 자리다.
//
// 아래 사실은 전부 우리 문제은행의 실제 발문에서 가져왔다.

export const revalidate = 21600

export const metadata: Metadata = {
  title: '한국실용글쓰기 서술형 배점 — 39번 300점, 시간은 어디에 쓸까 | 실글패스',
  description:
    '서술형 700점은 고르게 퍼져 있지 않습니다. 39번 한 문항이 300점이에요. 31~39번 배점과 문항마다 요구하는 조건을 실제 출제 형식 그대로 정리했습니다.',
  keywords: ['한국실용글쓰기 서술형', '실용글쓰기 배점', '실용글쓰기 39번', '서술형 700점', '실용글쓰기 시간 배분'],
  alternates: { canonical: 'https://kptest.cloud/essay-scoring' },
}

type Block = { head: string; body: string; keep: string[] }

const BLOCKS: { title: string; note: string; items: Block[] }[] = [
  {
    title: '39번 — 300점짜리 보고서',
    note: '한 문항에 300점입니다. 여기를 비우면 다른 데를 다 맞아도 등급이 내려갑니다.',
    items: [
      {
        head: '자료를 주고 네 문단 800자를 쓰게 한다',
        body: '<자료>를 여러 개 주고 그것을 바탕으로 보고서를 쓰라고 합니다. 분량은 800자 내외, 문단은 네 개로 정해져 있어요. 주제는 회차마다 다르지만(재택근무의 확산과 과제, 청년 1인 가구의 증가와 과제, 원격 교육의 확산과 과제) 요구 형식은 거의 같습니다.',
        keep: ['네 문단', '800자 내외', '<자료> 활용 필수'],
      },
      {
        head: '<글쓰기 계획>이 곧 채점표다',
        body: '문단마다 무엇을 쓸지 문제에서 지정해 줍니다 — 1문단은 개념과 배경(자료 1 활용), 2문단부터는 현황·문제·과제로 이어집니다. 계획에 적힌 자료를 안 쓰면 내용이 좋아도 감점입니다. 계획을 그대로 소제목처럼 놓고 채우는 것이 가장 안전해요.',
        keep: ['문단별 지시 = 채점 기준', '지정된 자료를 반드시 인용', '순서를 바꾸지 않기'],
      },
    ],
  },
  {
    title: '37·38번 — 각 100점',
    note: '둘이 합쳐 200점입니다. 형식이 고정돼 있어 연습한 만큼 그대로 점수가 됩니다.',
    items: [
      {
        head: '37번은 요약 — 문장 형식까지 정해 준다',
        body: '글을 읽고 요약문을 쓰는데, "㉠ 원리, ㉡ 장점, ㉢ 단점" 순서로 각각 한 문장씩 쓰라고 합니다. 게다가 "○○은 ~ 원리를 이용한다."처럼 문장 틀까지 지정해요. 내용을 잘 요약해도 형식을 어기면 깎입니다.',
        keep: ['순서 지정(원리→장점→단점)', '각 한 문장', '지정된 문장 틀 그대로'],
      },
      {
        head: '38번은 제안서·공문 빈칸',
        body: '자료를 주고 제안서의 ㉠~㉢을 채우게 합니다. ㉠은 문서의 성격이 드러나는 제목(5어절 이내), ㉡은 제안 이유처럼 칸마다 조건이 붙어요. 어절 수 제한이 자주 나오니 세어 보고 씁니다.',
        keep: ['제목은 5어절 이내', '칸마다 조건이 다름', '어절 수를 세어 확인'],
      },
    ],
  },
  {
    title: '31~36번 — 합쳐 200점',
    note: '한 문항 30~50점입니다. 짧게 끝내고 뒤로 넘어가는 것이 이깁니다.',
    items: [
      {
        head: '고쳐 쓰기와 조건 문장',
        body: '맞춤법이 틀린 곳을 찾아 고치거나, 군더더기를 덜어 한 문장으로 다시 쓰는 유형입니다. 【조건】에 "틀린 부분과 고친 부분만 기호와 함께 쓸 것"처럼 답안 모양이 지정돼 있어요 — 다 옮겨 적으면 오히려 감점입니다.',
        keep: ['【조건】이 답안 모양을 정한다', '시키지 않은 것은 쓰지 않기', '한 문항 3~4분'],
      },
    ],
  },
]

export default function EssayScoringPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <BreadcrumbLd name="서술형 배점" path="/essay-scoring" />

      <header className="sticky top-0 z-40 border-b border-[#e2e8f0] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <LogoGlyph className="h-7 w-7" />
            <span className="font-black text-[#0f172a]">실글패스</span>
          </Link>
          <Link href="/try" className="text-sm font-bold text-[#1e3a5f] underline underline-offset-4">
            문제 풀어보기
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="mb-2 text-3xl font-black tracking-tight text-[#0f172a] sm:text-4xl">
          서술형 700점, 시간은 어디에 쓸까
        </h1>
        <p className="mb-8 text-base leading-relaxed text-[#475569]">
          선택형 300점은 알거나 모르거나로 끝나지만, 서술형 700점은 <b>어디에 시간을 쓰느냐</b>로
          갈립니다. 그런데 700점이 고르게 퍼져 있지 않아요 — 마지막 한 문항이 300점입니다.
          아래는 실제 출제 형식 그대로 정리한 배점과 조건입니다.
        </p>

        {/* 읽고 끝나지 않게 — 첫 화면 근처에서 한 번 풀린다 */}
        <InlineQuiz topic={{ keyword: '고쳐', label: '고쳐쓰기' }} />

        <EssayPointMap />

        {BLOCKS.map(group => (
          <section key={group.title} className="mb-10">
            <h2 className="mb-1 text-2xl font-black text-[#0f172a]">{group.title}</h2>
            <p className="mb-3 text-sm text-[#64748b]">{group.note}</p>
            <div className="space-y-3">
              {group.items.map(b => (
                <div key={b.head} className="rounded-xl border border-[#e2e8f0] bg-white p-4">
                  <p className="font-black text-[#1e3a5f]">{b.head}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#475569]">{b.body}</p>
                  <ul className="mt-2.5 flex flex-wrap gap-1.5">
                    {b.keep.map(k => (
                      <li key={k} className="rounded border border-[#e2e8f0] bg-[#f8fafc] px-2 py-1 text-xs font-semibold text-[#1e3a5f]">
                        {k}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ))}

        <section className="mb-10 rounded-2xl border border-[#e2e8f0] bg-gradient-to-br from-[#0f1f3d] to-[#1e3a5f] p-6 text-center text-white">
          <p className="mb-1 text-lg font-black">서술형은 채점해 줄 사람이 있어야 늡니다</p>
          <p className="mb-5 text-sm leading-relaxed text-white/70">
            선택형은 답을 맞춰 보면 되지만, 300점짜리 보고서는 혼자 채점할 수 없어요.
            실글패스는 조건을 지켰는지·구성이 맞는지를 항목별로 짚어 줍니다.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/try" className="btn-gold inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-bold">
              가입 없이 문제 풀어보기
            </Link>
            <Link
              href="/essay-guide"
              className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/15"
            >
              서술형 유형별 공략 보기
            </Link>
          </div>
        </section>

        <RelatedBlogPosts category="writing" seed="essay-scoring" />
      </main>

      <StickyMobileCTA />
      <SiteFooter />
    </div>
  )
}
