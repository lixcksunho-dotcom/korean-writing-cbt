import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ManuscriptEditor from '@/components/manuscript/ManuscriptEditor'
import GradingSample from '@/components/manuscript/GradingSample'
import Link from 'next/link'
import { PenLine, History, Lock, Sparkles, CheckCircle2 } from 'lucide-react'
import { getActiveSubscription, daysUntilExpiry } from '@/lib/subscription'
import { getAiTrialStatus } from '@/lib/aiTrial'

export default async function ManuscriptPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [sub, { count }, trial] = await Promise.all([
    getActiveSubscription(user.id),
    supabase
      .from('manuscript_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
    getAiTrialStatus(),
  ])

  // 랜딩·대시보드가 약속한 '가입하면 AI 첨삭 무료 체험'을 여기서도 지킨다.
  // 체험이 남아 있으면 결제 없이 바로 채점해 보게 하고, 소진 후에만 페이월을 띄운다.
  const canWrite = !!sub || trial.remaining > 0

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <PenLine className="h-6 w-6 text-[#f59e0b]" />
            <h1 className="text-2xl font-black text-[#0f172a] tracking-tight">원고지 AI 채점</h1>
          </div>
          <p className="text-[#64748b] text-sm">
            AI가 원고지 규정·실용글쓰기 답안 기준·맞춤법을 채점하고, 틀린 부분을 짚어드립니다.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {sub && (
            <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
              {daysUntilExpiry(sub.expires_at)}일 남음
            </span>
          )}
          {(count ?? 0) > 0 && (
            <Link href="/manuscript/history" className="flex items-center gap-1.5 text-sm text-[#1e3a5f] hover:underline">
              <History className="h-4 w-4" />
              기록 {count}건
            </Link>
          )}
        </div>
      </div>

      {canWrite ? (
        <>
          {!sub && (
            <div className="mb-5 flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-amber-200 bg-gradient-to-br from-[#fffbeb] to-[#fff7ed] px-5 py-4">
              <div className="flex-1">
                <p className="text-sm font-bold text-[#0f172a]">
                  무료 체험 <span className="text-amber-600">{trial.remaining}회</span> 남았어요
                </p>
                <p className="text-xs text-[#64748b] mt-0.5">
                  결제 없이 지금 바로 채점받아 보세요. 마음에 들면 5,500원으로 30일 무제한.
                </p>
              </div>
              <Link
                href="/subscribe"
                className="shrink-0 text-xs font-bold text-[#1e3a5f] border border-[#1e3a5f]/20 bg-white px-4 py-2 rounded-xl hover:bg-[#1e3a5f]/5 transition-colors"
              >
                이용권 보기
              </Link>
            </div>
          )}
          {/* 쓰기 전에 결과물을 먼저 보여준다 — 무엇을 받는지 모르면 400칸을 채울 이유가 없다 */}
          <GradingSample />
          <ManuscriptEditor hasSubscription={!!sub} trialRemaining={trial.remaining} />
        </>
      ) : (
        /* 페이월 */
        <div className="max-w-md mx-auto py-4">
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_4px_20px_rgba(15,31,61,0.08)] overflow-hidden">
            <div className="bg-gradient-to-br from-[#0f1f3d] to-[#1e3a5f] p-8 text-center text-white">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
                <Lock className="h-7 w-7 text-white" />
              </div>
              <h2 className="text-xl font-black mb-2">무료 체험 {trial.used}회를 모두 썼어요</h2>
              <p className="text-white/60 text-sm">5,500원 1회 결제로 30일 무제한 (자동결제 없음)</p>
            </div>
            <div className="p-6">
              <div className="space-y-2.5 mb-6">
                {[
                  'AI 원고지 채점 무제한',
                  '원고지 규정·실용글쓰기 답안 기준 부합 채점',
                  '틀린 부분(맞춤법·어법) 교정 목록 제공',
                  '채점 기록 무제한 저장',
                ].map(f => (
                  <div key={f} className="flex items-center gap-2.5 text-sm text-[#334155]">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
              <Link
                href="/subscribe"
                className="btn-gold w-full flex items-center justify-center gap-2 font-bold py-3.5 rounded-xl text-sm"
              >
                <Sparkles className="h-4 w-4" />
                5,500원으로 시작하기
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
