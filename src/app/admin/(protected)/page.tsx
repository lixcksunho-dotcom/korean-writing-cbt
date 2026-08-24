import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { isActivePass } from '@/lib/subscription'
import { REVOKED } from '@/lib/subscriptionRevocationPolicy'
import { checkAiKey } from '@/lib/aiKeyStatus'
import { recentOperatorAlerts, alertChannelEnv } from '@/lib/operatorAlerts'
import { describeAlertChannel } from '@/lib/alertChannel'
import AlertChannelCard from './AlertChannelCard'
import SubscriberTrend from '@/components/admin/SubscriberTrend'
import { BookOpen, Star, CreditCard, Wallet, FileCheck2, PenLine, ChevronRight, BadgeCheck, Users, Flag, AlertTriangle, CheckCircle2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminHome() {
  // 관리자 권한은 admin/layout.tsx에서 이미 검증됨. 통계는 service_role로 집계.
  const admin = createAdminClient()

  const [alerts, aiKey, qCount, reviewRows, subRows, examDone, manuscriptCount, reportRows] = await Promise.all([
    recentOperatorAlerts(),
    checkAiKey(),
    admin.from('questions').select('*', { count: 'exact', head: true }),
    admin.from('reviews').select('proof_path, verified, is_visible'),
    admin.from('subscriptions').select('amount, status, expires_at'),
    admin.from('quiz_sessions').select('*', { count: 'exact', head: true }).not('completed_at', 'is', null),
    admin.from('manuscript_submissions').select('*', { count: 'exact', head: true }),
    admin.from('question_reports').select('resolved'),
  ])
  const reportPending = (reportRows.data ?? []).filter(r => !r.resolved).length

  const reviews = reviewRows.data ?? []
  const reviewTotal = reviews.length
  const reviewPending = reviews.filter(r => r.proof_path && !r.verified).length
  const reviewVisible = reviews.filter(r => r.is_visible !== false).length

  const subs = subRows.data ?? []
  const activePasses = subs.filter(s => isActivePass(s.status as string, s.expires_at as string)).length
  // 환불(회수)된 건은 매출이 아니다. 만료된 건은 매출이 맞으므로 만료가 아니라 status로 가른다.
  const paidSubs = subs.filter(s => s.status !== REVOKED)
  const totalOrders = paidSubs.length
  const revenue = paidSubs.reduce((sum, s) => sum + (Number(s.amount) || 0), 0)
  const refundedCount = subs.length - totalOrders

  const stats = [
    { label: '활성 이용권', value: `${activePasses}`, sub: `누적 결제 ${totalOrders}건`, icon: CreditCard, color: 'text-blue-600 bg-blue-50' },
    { label: '누적 매출', value: `${revenue.toLocaleString()}원`, sub: refundedCount ? `환불 ${refundedCount}건 제외` : '결제 합계', icon: Wallet, color: 'text-emerald-700 bg-emerald-50' },
    { label: '등록 문제', value: `${qCount.count ?? 0}`, sub: '객관식+서술형', icon: BookOpen, color: 'text-indigo-600 bg-indigo-50' },
    { label: '후기', value: `${reviewTotal}`, sub: `노출 ${reviewVisible} · 인증대기 ${reviewPending}`, icon: Star, color: 'text-amber-700 bg-amber-50' },
    { label: '완료한 시험', value: `${examDone.count ?? 0}`, sub: '제출 세션', icon: FileCheck2, color: 'text-violet-600 bg-violet-50' },
    { label: '원고지 제출', value: `${manuscriptCount.count ?? 0}`, sub: 'AI 채점 요청', icon: PenLine, color: 'text-rose-600 bg-rose-50' },
  ]

  const navCards = [
    { href: '/admin/members', title: '회원 관리', desc: '회원 검색·추가·삭제, 체크로 유료 전환', icon: Users, badge: undefined },
    { href: '/admin/questions', title: '문제 관리', desc: '모의고사·유형별 문제 추가/수정/삭제', icon: BookOpen, badge: undefined },
    { href: '/admin/reviews', title: '후기 관리', desc: '점수 인증 확정·노출/숨김·삭제', icon: BadgeCheck, badge: reviewPending > 0 ? `인증대기 ${reviewPending}` : undefined },
    { href: '/admin/reports', title: '문제 신고', desc: '오류 신고 확인·처리, 문제 바로 수정', icon: Flag, badge: reportPending > 0 ? `미처리 ${reportPending}` : undefined },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">관리자 대시보드</h1>
        <p className="text-sm text-gray-600 mt-1">서비스 핵심 지표를 한눈에 확인하세요.</p>
      </div>

      <AlertChannelCard status={describeAlertChannel(alertChannelEnv())} />

      {/* 최근 사고. 텔레그램 설정이 없어도 여기엔 남는다 — 알림이 설정에 의존하면
          설정이 빠진 동안은 없는 것과 같다(결제 실패 1건을 16일간 몰랐다). */}
      {alerts.length > 0 && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <h2 className="text-sm font-bold text-red-800 mb-2.5">최근 2주 사고 {alerts.length}건</h2>
          <ul className="space-y-1.5">
            {alerts.map((a, i) => (
              <li key={i} className="text-xs text-red-800 leading-relaxed">
                <span className="font-semibold">[{a.label}]</span>{' '}
                {new Date(a.at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}{' '}
                — {a.summary}
                {a.ref && <span className="block font-mono text-[11px] text-red-700 break-all">{a.ref}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* AI 채점 연결 상태 — 키가 빠지면 채점이 전부 실패하는데 사용자 화면에만 뜬다.
          요금이 붙지 않는 모델 조회로 확인한다(잔액은 이 방법으로 알 수 없다). */}
      <div
        className={`mb-6 flex items-start gap-2.5 rounded-xl border p-3.5 ${
          aiKey.ok ? 'border-gray-200 bg-white' : 'border-red-200 bg-red-50'
        }`}
      >
        {aiKey.ok
          ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-700" aria-hidden />
          : <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-700" aria-hidden />}
        <div className="min-w-0">
          <div className={`text-sm font-bold ${aiKey.ok ? 'text-gray-900' : 'text-red-800'}`}>{aiKey.title}</div>
          <p className={`text-xs mt-0.5 ${aiKey.ok ? 'text-gray-600' : 'text-red-800'}`}>{aiKey.detail}</p>
        </div>
      </div>

      {/* 지표 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {stats.map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="bg-white border rounded-xl p-4">
            <div className={`inline-flex p-2 rounded-lg mb-3 ${color}`}><Icon className="h-4 w-4" /></div>
            <div className="text-2xl font-black text-gray-900 tracking-tight">{value}</div>
            <div className="text-xs font-semibold text-gray-700 mt-0.5">{label}</div>
            <div className="text-xs text-gray-600 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* 유입 추이 — 텔레그램이 없어도 여기서 볼 수 있게 */}
      <div className="mb-8">
        <SubscriberTrend />
      </div>

      {/* 관리 메뉴 */}
      <div className="grid sm:grid-cols-2 gap-3">
        {navCards.map(({ href, title, desc, icon: Icon, badge }) => (
          <Link key={href} href={href} className="group bg-white border rounded-xl p-5 flex items-center gap-4 hover:border-gray-400 hover:shadow-sm transition-all">
            <div className="w-11 h-11 rounded-xl bg-gray-900 flex items-center justify-center shrink-0">
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-gray-900">{title}</h2>
                {badge && <span className="text-xs font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">{badge}</span>}
              </div>
              <p className="text-xs text-gray-600 mt-0.5">{desc}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-600 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all" />
          </Link>
        ))}
      </div>
    </div>
  )
}
