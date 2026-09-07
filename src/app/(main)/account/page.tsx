import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, UserRound, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirectToLogin } from '@/lib/loginRedirect'
import { getActiveSubscription } from '@/lib/subscription'
import DeleteAccountForm from '@/components/account/DeleteAccountForm'

export const metadata: Metadata = { title: '계정 관리', robots: { index: false } }
export const dynamic = 'force-dynamic'

// 계정 화면 — 지금은 '회원 탈퇴' 하나가 이유다.
//
// 왜 필요한가: 2026-09-07 고객센터에 "회원 탈퇴 하고 싶어요 어디서 신청하나요"가 들어왔다.
// 탈퇴할 길이 없으면 개인정보 수집 동의를 철회할 방법이 없는 것이고(개인정보처리방침 4조에
// "탈퇴를 통해 철회할 수 있다"고 적혀 있다), 사람은 문의 대신 그냥 떠난다.
export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirectToLogin('/account')

  const [sub, sessions] = await Promise.all([
    getActiveSubscription(user.id),
    createAdminClient().from('quiz_sessions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
  ])
  const sessionCount = sessions.count ?? 0
  const passUntil = sub ? new Date(sub.expires_at).toLocaleDateString('ko-KR') : null

  return (
    <div className="max-w-xl mx-auto">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-[#64748b] hover:text-[#0f172a] mb-6">
        <ArrowLeft className="h-4 w-4" /> 대시보드
      </Link>

      <h1 className="text-2xl font-black text-[#0f172a] mb-1">계정 관리</h1>
      <p className="text-sm text-[#64748b] mb-8">로그인 정보와 이용권 상태, 그리고 탈퇴.</p>

      <section className="bg-white rounded-2xl border border-[#e2e8f0] p-6 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <UserRound className="h-5 w-5 text-[#1e3a5f]" />
          <h2 className="font-bold text-[#0f172a]">내 정보</h2>
        </div>
        <dl className="text-sm space-y-2">
          <div className="flex gap-3"><dt className="w-20 text-[#64748b]">이메일</dt><dd className="text-[#0f172a] break-all">{user.email}</dd></div>
          <div className="flex gap-3"><dt className="w-20 text-[#64748b]">이용권</dt><dd className="text-[#0f172a]">{passUntil ? `이용 중 · ${passUntil}까지` : '없음'}</dd></div>
          <div className="flex gap-3"><dt className="w-20 text-[#64748b]">학습 기록</dt><dd className="text-[#0f172a]">시험 세션 {sessionCount.toLocaleString('ko-KR')}개</dd></div>
        </dl>
      </section>

      <section className="bg-white rounded-2xl border border-red-200 p-6">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="h-5 w-5 text-red-700" />
          <h2 className="font-bold text-[#0f172a]">회원 탈퇴</h2>
        </div>
        <ul className="text-sm text-[#475569] leading-relaxed space-y-1.5 mb-4 list-disc pl-5">
          <li>탈퇴하면 <b className="text-[#0f172a]">로그인 정보와 학습 기록(시험 세션·답안·원고·북마크·후기)</b>이 지체 없이 지워지고 되돌릴 수 없어요.</li>
          <li><b className="text-[#0f172a]">결제 기록</b>은 전자상거래법에 따라 5년간 보관하되, 누구의 결제였는지는 끊어 둡니다(개인정보처리방침 3조).</li>
          {sub && (
            <li className="text-red-700">
              <b>이용권이 {passUntil}까지 남아 있어요.</b> 탈퇴하면 남은 기간은 사라지고 자동 환불되지 않습니다.
              환불 대상(결제 7일 이내·AI 채점 미사용)이면 <Link href="/refund" className="underline">환불 정책</Link>을 먼저 확인해 주세요.
            </li>
          )}
          <li>같은 이메일로 다시 가입할 수 있지만, 지운 기록과 이용권은 돌아오지 않아요.</li>
        </ul>
        <DeleteAccountForm />
      </section>
    </div>
  )
}
