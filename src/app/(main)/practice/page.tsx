import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ListChecks, PenLine, FileText, ChevronRight, CircleDot, Target, RotateCcw, Bookmark, Layers } from 'lucide-react'
import { getActiveProgram } from '@/lib/programContext'
import { getProgram } from '@/lib/programs'
import { questionBank } from '@/lib/questionBank'

export default async function PracticePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const program = await getActiveProgram()
  const cfg = getProgram(program)

  // 유형별 보유 문항 수 (안내용) — 현재 모드의 실제 시험 문항(year<9000)만
  const { data: rows } = await questionBank().from('questions').select('type').eq('program', program).lt('year', 9000)
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
      // KBS 전용 — 어휘·어법을 기출유형별로 세분해 정밀 연습(발문 기반 분류)
      href: '/practice/kbs-types',
      icon: Target,
      title: '유형별 집중 연습',
      desc: '고유어·한자성어·속담·표준발음·맞춤법 등 어휘·어법을 유형별로 골라 풀어요.',
      meta: '어휘 · 어법 세부 유형',
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
      href: '/practice/areas',
      icon: Layers,
      title: '영역별 집중 연습',
      desc: '결과에서 점수가 낮았던 영역만 모아 다시 풀어요.',
      // 영역이 많으면(KBS 7개) 카드 메타가 길어져 줄바꿈이 깨지므로 개수로 요약
      meta: cfg.areas.length > 4 ? `${cfg.areas.length}개 영역` : cfg.areas.map(x => x.name.split('·')[0]).join(' · '),
      grad: 'from-sky-500 to-blue-700',
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
      href: '/practice/report',
      icon: PenLine,
      title: '원고지 보고서 실전',
      desc: '실제 서술형 9번 보고서 문항을 시간 안에 이어서 작성해요.',
      meta: '시간제한 · 실전',
      grad: 'from-emerald-500 to-emerald-700',
    },
    {
      href: '/practice/wrong',
      icon: RotateCcw,
      title: '오답 다시 풀기',
      desc: '내가 지금도 틀리는 객관식만 모아 다시 풀어요.',
      meta: '약점 복습',
      grad: 'from-red-500 to-rose-600',
    },
    {
      href: '/practice/bookmarks',
      icon: Bookmark,
      title: '즐겨찾기 문제',
      desc: '결과 화면에서 저장한 문제를 모아 다시 풀어요.',
      meta: '내가 저장한 문제',
      grad: 'from-amber-500 to-[#d97706]',
    },
  ]

  // 실용글쓰기 전용 연습(유형별 집중·서술형·원고지 보고서)은 그 모드에서만 노출.
  // 순화어 O/X(refine)는 순화어·외래어·한자어를 다뤄 KBS에도 유효하므로 두 모드 모두 노출.
  const silyongOnly = new Set(['/practice/types', '/practice/essay', '/practice/report'])
  // KBS 유형별은 KBS 모드에서만 노출.
  const kbsOnly = new Set(['/practice/kbs-types'])
  const visibleCards = cards.filter(c =>
    cfg.hasManuscript ? !kbsOnly.has(c.href) : !silyongOnly.has(c.href),
  )

  return (
    <div className="animate-fade-up">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-[#0f172a] tracking-tight mb-1">유형별 연습</h1>
        <p className="text-[#64748b] text-sm py-3">{cfg.hasManuscript ? '객관식·서술형·원고지를' : '객관식 문제를'} 골라 연습할 수 있어요. 전체 모의고사는 <Link href="/cbt" className="text-[#1e3a5f] font-semibold underline">CBT 문제풀기</Link>에서 풀 수 있습니다.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {visibleCards.map(({ href, icon: Icon, title, desc, meta, grad }) => (
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
              <span className="text-xs bg-[#f1f5f9] text-[#475569] px-2.5 py-1 rounded-full font-semibold">{meta}</span>
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
