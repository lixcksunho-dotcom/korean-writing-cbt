import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ListChecks, PenLine, FileText, ChevronRight, CircleDot, Target } from 'lucide-react'

export default async function PracticePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 유형별 보유 문항 수 (안내용) — 유형별 연습 전용(year>=9000)은 제외
  const { data: rows } = await supabase.from('questions').select('type').lt('year', 9000)
  const multipleCount = (rows ?? []).filter(r => r.type === 'multiple').length
  const essayCount = (rows ?? []).filter(r => r.type === 'essay').length

  const cards = [
    {
      href: '/practice/types',
      icon: Target,
      title: '유형별 집중 연습',
      desc: '맞춤법·외래어·문장 호응·공문서를 유형별로 골라 고쳐 써요.',
      meta: '맞춤법·외래어·호응·공문서',
      grad: 'from-rose-500 to-pink-600',
    },
    {
      href: '/practice/refine',
      icon: CircleDot,
      title: '순화어 O/X 퀴즈',
      desc: '바른 표현인지 O·X로 빠르게 판단하며 순화어를 익혀요.',
      meta: '맞춤법·외래어·한자어 등',
      grad: 'from-violet-500 to-purple-700',
    },
    {
      href: '/practice/multiple',
      icon: ListChecks,
      title: '객관식 연습',
      desc: '한 문제씩 풀고 바로 정답·해설을 확인해요.',
      meta: `${multipleCount}문항`,
      grad: 'from-blue-500 to-[#1e3a5f]',
    },
    {
      href: '/practice/essay',
      icon: FileText,
      title: '서술형 연습',
      desc: '원고지에 답을 쓰고 문항별로 AI 채점을 받아요.',
      meta: `${essayCount}문항`,
      grad: 'from-amber-500 to-[#d97706]',
    },
    {
      href: '/manuscript',
      icon: PenLine,
      title: '원고지 연습',
      desc: '자유 주제로 원고지 글쓰기를 연습하고 AI 첨삭을 받아요.',
      meta: '자유 작성',
      grad: 'from-emerald-500 to-emerald-700',
    },
  ]

  return (
    <div className="animate-fade-up">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-[#0f172a] tracking-tight mb-1">유형별 연습</h1>
        <p className="text-[#64748b] text-sm">객관식·서술형·원고지를 따로 골라 연습할 수 있어요. 전체 모의고사는 <Link href="/cbt" className="text-[#1e3a5f] font-semibold underline">CBT 문제풀기</Link>에서 풀 수 있습니다.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {cards.map(({ href, icon: Icon, title, desc, meta, grad }) => (
          <Link
            key={href}
            href={href}
            className="card-hover group bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_4px_16px_rgba(15,31,61,0.06)] p-6 flex flex-col"
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center shadow-md mb-4`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
            <h2 className="font-bold text-[#0f172a] text-lg mb-1">{title}</h2>
            <p className="text-[#64748b] text-sm leading-relaxed flex-1">{desc}</p>
            <div className="flex items-center justify-between mt-5">
              <span className="text-xs bg-[#f1f5f9] text-[#64748b] px-2.5 py-1 rounded-full font-semibold">{meta}</span>
              <span className="flex items-center gap-1 text-sm font-semibold text-[#1e3a5f] group-hover:gap-2 transition-all">
                시작 <ChevronRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
