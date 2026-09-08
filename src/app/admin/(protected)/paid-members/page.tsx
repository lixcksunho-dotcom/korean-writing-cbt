import { createAdminClient } from '@/lib/supabase/admin'
import { fetchAllRows, listAllUsers } from '@/lib/adminPaging'
import { passLabel } from '@/lib/subscription'
import { DAILY_GRADE_LIMIT } from '@/lib/antiSharingLimits'
import { getProgram } from '@/lib/programs'
import { tierFor } from '@/lib/grade'
import { buildPaidMembers, summarizePaidMembers } from '@/lib/paidMemberStats'
import { Sparkles, Users, Trophy, AlertTriangle } from 'lucide-react'

export const dynamic = 'force-dynamic'

// quiz_answers 에는 회원 칼럼이 없다 — 세션(session_id)으로 사람에 붙인다.
type EssayJoin = {
  session_id: string
  ai_score: number | null
  questions: { points: number | null } | { points: number | null }[] | null
}

// 유료회원(이용권을 가진 사람)이 실제로 얼마나 쓰고 몇 점을 받는지.
//
// 왜 필요한가: 회원 목록·결제 원장은 '누가 냈는가'만 말한다. 이용권을 늘릴지, AI 한도를 올릴지,
// 문제를 쉽게 할지는 "쓰고 있는가·점수가 오르는가"를 봐야 정할 수 있다(운영자 지시 2026-09-08).
// 계산은 paidMemberStats(순수 함수)에 있고 여기서는 읽어서 넘기기만 한다.
export default async function PaidMembersPage() {
  const admin = createAdminClient()
  const nowIso = new Date().toISOString()

  // 1) 살아 있는 이용권 — 전량(1000행 상한을 넘어도 잘리지 않게 페이지로 읽는다)
  type SubRow = { user_id: string | null; payment_key: string | null; amount: number | null; started_at: string; expires_at: string }
  const subs = await fetchAllRows<SubRow>((from, to) =>
    admin.from('subscriptions')
      .select('user_id, payment_key, amount, started_at, expires_at')
      .eq('status', 'active').gt('expires_at', nowIso)
      .order('expires_at', { ascending: false })
      .range(from, to))

  // 한 사람이 여러 이용권을 가질 수 있다 — 가장 늦게 끝나는 것 하나만 본다.
  const byUser = new Map<string, SubRow>()
  for (const s of subs) if (s.user_id && !byUser.has(s.user_id)) byUser.set(s.user_id, s)
  const userIds = [...byUser.keys()]

  if (userIds.length === 0) {
    return (
      <div>
        <h1 className="text-xl font-black text-gray-900 mb-6">유료회원</h1>
        <p className="rounded-xl border border-[#e2e8f0] bg-white p-6 text-sm text-gray-600">지금 이용권을 가진 회원이 없습니다.</p>
      </div>
    )
  }

  // 2) 이메일 · 3) AI 사용량 · 4) 모의고사
  const [users, usage, exams] = await Promise.all([
    listAllUsers(admin),
    fetchAllRows<{ user_id: string; day: string; grade_count: number | null }>((from, to) =>
      admin.from('usage_daily').select('user_id, day, grade_count').in('user_id', userIds).range(from, to)),
    fetchAllRows<{ id: string; user_id: string; score: number | null; total: number | null; completed_at: string | null }>((from, to) =>
      admin.from('quiz_sessions').select('id, user_id, score, total, completed_at')
        .in('user_id', userIds).not('completed_at', 'is', null).lt('year', 9000).range(from, to)),
  ])

  // 5) 서술형 AI 점수 — 세션으로 사람에 붙인다(quiz_answers 에는 회원 칼럼이 없다).
  const sessionOwner = new Map(exams.map(e => [e.id, e.user_id]))
  const sessionIds = [...sessionOwner.keys()]
  // 조인 결과의 questions 는 supabase-js 가 배열로 추론한다(실제로는 한 행) — 아래에서 둘 다 받는다.
  const essays = sessionIds.length
    ? await fetchAllRows<EssayJoin>((from, to) =>
        admin.from('quiz_answers').select('session_id, ai_score, questions(points)')
          .in('session_id', sessionIds).not('ai_score', 'is', null).range(from, to) as unknown as
          PromiseLike<{ data: EssayJoin[] | null; error: { message: string } | null }>)
    : []
  const emailById = new Map(users.map(u => [u.id, u.email ?? '(이메일 없음)']))
  const weight = getProgram().weight

  const rows = buildPaidMembers({
    passes: userIds.map(id => {
      const s = byUser.get(id) as SubRow
      return {
        userId: id,
        email: emailById.get(id) ?? '(탈퇴/보관)',
        passLabel: passLabel({ payment_key: s.payment_key, amount: s.amount, started_at: s.started_at, expires_at: s.expires_at }),
        amount: Number(s.amount) || 0,
        startedAt: s.started_at,
        expiresAt: s.expires_at,
      }
    }),
    exams: exams.map(e => ({ userId: e.user_id, score: e.score, total: e.total, completedAt: e.completed_at })),
    essays: essays.map(e => {
      const q = Array.isArray(e.questions) ? e.questions[0] : e.questions
      return { userId: sessionOwner.get(e.session_id) ?? '', aiScore: e.ai_score, points: q?.points ?? null }
    }),
    usage: usage.map(u => ({ userId: u.user_id, day: u.day, count: Number(u.grade_count) || 0 })),
    weight,
  }).sort((a, b) => b.aiTotal - a.aiTotal || (b.avgScore ?? -1) - (a.avgScore ?? -1))

  const sum = summarizePaidMembers(rows, DAILY_GRADE_LIMIT)
  const full = weight.objective + weight.essay

  const cards = [
    { label: '이용권 보유', value: `${sum.members}명`, sub: `결제 ${sum.paidMembers} · 무료 ${sum.freeMembers}`, icon: Users },
    { label: 'AI 첨삭 누적', value: `${sum.aiTotal}회`, sub: `1인 평균 ${sum.aiPerMember}회 · 최근 7일 ${sum.ai7d}회`, icon: Sparkles },
    { label: '평균 예상 점수', value: sum.avgScore == null ? '—' : `${sum.avgScore}점`, sub: sum.avgScore == null ? '응시 기록 없음' : `${full}점 만점 · 응시자 ${sum.examTakers}명`, icon: Trophy },
    { label: '하루 한도 도달', value: `${sum.hitCapEver}명`, sub: `하루 ${DAILY_GRADE_LIMIT}회를 다 쓴 적 있음`, icon: AlertTriangle },
  ]

  return (
    <div>
      <h1 className="text-xl font-black text-gray-900 mb-1">유료회원</h1>
      <p className="text-sm text-gray-500 mb-6">지금 이용권이 살아 있는 회원만. AI 첨삭 사용량과 모의고사 점수를 함께 봅니다.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {cards.map(({ label, value, sub, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-[#e2e8f0] bg-white p-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1">
              <Icon className="h-3.5 w-3.5" /> {label}
            </div>
            <p className="text-xl font-black text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* 표는 넓어서 좁은 화면에서는 가로로 민다 */}
      <div className="overflow-x-auto rounded-xl border border-[#e2e8f0] bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="text-left font-semibold px-3 py-2">회원</th>
              <th className="text-left font-semibold px-3 py-2">이용권</th>
              <th className="text-right font-semibold px-3 py-2">AI 누적</th>
              <th className="text-right font-semibold px-3 py-2">최근 7일</th>
              <th className="text-right font-semibold px-3 py-2">하루 최대</th>
              <th className="text-right font-semibold px-3 py-2">응시</th>
              <th className="text-right font-semibold px-3 py-2">평균 점수</th>
              <th className="text-right font-semibold px-3 py-2">최고</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const tier = r.avgScore == null ? null : tierFor(r.avgScore)
              return (
                <tr key={r.userId} className="border-t border-[#f1f5f9]">
                  <td className="px-3 py-2">
                    <span className="font-semibold text-gray-900 break-all">{r.email}</span>
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {r.passLabel}
                    <span className="block text-xs text-gray-400">{r.daysLeft}일 남음</span>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-900">{r.aiTotal}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{r.ai7d}</td>
                  <td className={`px-3 py-2 text-right ${r.aiMaxDay >= DAILY_GRADE_LIMIT ? 'font-bold text-amber-700' : 'text-gray-600'}`}>{r.aiMaxDay}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{r.exams}</td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-900">
                    {r.avgScore == null ? '—' : r.avgScore}
                    {tier && <span className="block text-xs text-gray-400">{tier.name}</span>}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-600">{r.bestScore ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-gray-500 leading-relaxed">
        · 점수는 회차별 예상 점수({full}점 만점)의 평균이에요. 객관식 정답률에 서술형 AI 득점률을 배점대로 환산한 값이라 실제 시험 점수와는 다를 수 있어요.<br />
        · 서술형을 아직 안 받은 회차는 객관식 정답률로 잠정 계산해요(대시보드와 같은 방식).<br />
        · &lsquo;하루 최대&rsquo;가 {DAILY_GRADE_LIMIT}이면 그 날 한도를 다 쓴 거예요 — 한도를 올릴지 판단하는 자리입니다.
      </p>
    </div>
  )
}
