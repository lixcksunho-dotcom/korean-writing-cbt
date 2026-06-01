import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ManuscriptEditor from '@/components/manuscript/ManuscriptEditor'
import Link from 'next/link'
import { PenLine, History, Lock, Sparkles, CheckCircle2 } from 'lucide-react'
import { getActiveSubscription, daysUntilExpiry } from '@/lib/subscription'

export default async function ManuscriptPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [sub, { count }] = await Promise.all([
    getActiveSubscription(user.id),
    supabase
      .from('manuscript_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ])

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <PenLine className="h-6 w-6 text-[#f59e0b]" />
            <h1 className="text-2xl font-black text-[#0f172a] tracking-tight">원고지 AI 채점</h1>
          </div>
          <p className="text-[#64748b] text-sm">
            AI가 맞춤법·문법·내용 구성·표현력을 채점해드립니다.
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

      {sub ? (
        <ManuscriptEditor />
      ) : (
        /* 페이월 */
        <div className="max-w-md mx-auto py-4">
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_4px_20px_rgba(15,31,61,0.08)] overflow-hidden">
            <div className="bg-gradient-to-br from-[#0f1f3d] to-[#1e3a5f] p-8 text-center text-white">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
                <Lock className="h-7 w-7 text-white" />
              </div>
              <h2 className="text-xl font-black mb-2">구독 후 이용 가능해요</h2>
              <p className="text-white/60 text-sm">월 5,000원으로 AI 채점 무제한 이용</p>
            </div>
            <div className="p-6">
              <div className="space-y-2.5 mb-6">
                {[
                  'AI 원고지 채점·첨삭 무제한',
                  '4가지 항목 세부 점수 분석',
                  '맞춤법·문법 교정 목록 제공',
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
                className="btn-gold w-full flex items-center justify-center gap-2 text-white font-bold py-3.5 rounded-xl text-sm"
              >
                <Sparkles className="h-4 w-4" />
                5,000원으로 시작하기
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
