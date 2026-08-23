import { createAdminClient } from '@/lib/supabase/admin'
import { CreditCard } from 'lucide-react'
import PaymentsAdmin, { type PaymentRow } from './PaymentsAdmin'
import { summarizeAttempts, type AttemptFunnel } from '@/lib/paymentAttemptFunnel'

export const dynamic = 'force-dynamic'

// 최근 포트원 결제를 조회해 우리 DB의 구독 발급 여부와 대조한다.
// 목록 조회가 실패해도(키/네트워크) 페이지는 떠야 하므로 에러는 잡아서 넘긴다.
const WINDOW_DAYS = 60
const TABLE_ROWS = 20

async function loadRecentPayments(): Promise<{ rows: PaymentRow[]; funnel: AttemptFunnel | null; listError: string | null }> {
  const secret = process.env.PORTONE_API_SECRET
  const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID
  if (!secret || !storeId) {
    return { rows: [], funnel: null, listError: '포트원 키(PORTONE_API_SECRET/STORE_ID) 미설정' }
  }

  try {
    const { PortOneClient } = await import('@portone/server-sdk')
    const client = PortOneClient({ secret })

    const until = new Date()
    const from = new Date()
    from.setDate(from.getDate() - WINDOW_DAYS)

    // 완결률은 시도를 다 세야 맞다 — 한 화면(100건)만 보면 옛 시도가 통째로 빠진다.
    // 표에는 최근 것만 쓰고, 요약에는 기간 전체를 쓴다.
    const all: Array<Record<string, unknown>> = []
    for (let page = 0; page < 10; page++) {
      const res = await client.payment.getPayments({
        page: { number: page, size: 100 },
        filter: { storeId, from: from.toISOString(), until: until.toISOString() },
      })
      const got = (res?.items ?? []) as Array<Record<string, unknown>>
      all.push(...got)
      if (got.length < 100) break
    }

    // Payment는 상태별 유니온이라 느슨하게 접근(렌더 전용).
    const items = all
      .slice()
      .sort((a, b) => String(b.requestedAt ?? '').localeCompare(String(a.requestedAt ?? '')))
      .slice(0, TABLE_ROWS)
    const ids = items.map(p => String(p.id ?? '')).filter(Boolean)

    // 발급된 order_id 집합
    const admin = createAdminClient()
    let grantedSet = new Set<string>()
    if (ids.length) {
      const { data } = await admin.from('subscriptions').select('order_id').in('order_id', ids)
      grantedSet = new Set((data ?? []).map(r => r.order_id as string))
    }

    const rows: PaymentRow[] = items.map(p => {
      const amount = p.amount as { total?: number } | undefined
      const customer = p.customer as { id?: string; customerId?: string } | undefined
      const id = String(p.id ?? '')
      return {
        id,
        status: String(p.status ?? '-'),
        amount: typeof amount?.total === 'number' ? amount.total : null,
        customerId: customer?.id ?? customer?.customerId ?? null,
        orderName: (p.orderName as string) ?? null,
        paidAt: (p.paidAt as string) ?? (p.requestedAt as string) ?? null,
        granted: grantedSet.has(id),
      }
    })
    // 지금 회원인 사람의 시도만 센다.
    // 탈퇴했거나 검증용으로 만들었다 지운 계정의 시도가 섞이면 '결제창까지 왔는데 안 낸 사람'이
    // 부풀고, 정작 연락할 수 있는 사람이 몇 명인지가 흐려진다(실제로 검증 계정 3건이 섞였다).
    const { data: userList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const memberIds = new Set((userList?.users ?? []).map(u => u.id))
    const fromMembers = all.filter(p => {
      const customer = p.customer as { id?: string; customerId?: string } | undefined
      const id = customer?.id ?? customer?.customerId
      return id ? memberIds.has(id) : false
    })

    const funnel = summarizeAttempts(fromMembers.map(p => {
      const customer = p.customer as { id?: string; customerId?: string } | undefined
      const failure = p.failure as { reason?: string } | undefined
      return {
        id: String(p.id ?? ''),
        status: String(p.status ?? ''),
        customerId: customer?.id ?? customer?.customerId ?? null,
        requestedAt: (p.requestedAt as string) ?? null,
        paidAt: (p.paidAt as string) ?? null,
        failureReason: failure?.reason ?? null,
      }
    }))

    return { rows, funnel, listError: null }
  } catch (e) {
    return { rows: [], funnel: null, listError: (e as Error).message }
  }
}

/**
 * 결제창까지 온 사람이 실제로 냈는지 보여 준다.
 *
 * 건 단위로 세면 완결률이 30%대로 나와 결제창이 고장 난 것처럼 읽힌다 — 한 사람이
 * 몇 초 간격으로 창을 두세 번 여는 게 정상이기 때문이다. 사람 단위가 진짜 숫자다.
 */
function AttemptSummary({ funnel }: { funnel: AttemptFunnel }) {
  const pct = (r: number) => `${Math.round(r * 1000) / 10}%`
  return (
    <section className="mb-8 rounded-xl border border-[#e2e8f0] bg-white p-5">
      <h2 className="mb-1 text-sm font-black text-gray-900">결제 시도 요약</h2>
      <p className="mb-4 text-xs text-gray-600">결제대행사 기록 기준 · 최근 {WINDOW_DAYS}일 · 탈퇴·검증 계정 제외</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-[#f8fafc] p-3">
          <div className="text-lg font-black text-gray-900">{funnel.people.paid}/{funnel.people.total}명</div>
          <div className="text-xs text-gray-600">사람 단위 완결 ({pct(funnel.people.ratio)})</div>
        </div>
        <div className="rounded-lg bg-[#f8fafc] p-3">
          <div className="text-lg font-black text-gray-900">{funnel.attempts.paid}/{funnel.attempts.total}건</div>
          <div className="text-xs text-gray-600">건 단위 완결 ({pct(funnel.attempts.ratio)})</div>
        </div>
        <div className="rounded-lg bg-amber-50 p-3">
          <div className="text-lg font-black text-amber-900">{funnel.droppedPeople.length}명</div>
          <div className="text-xs text-amber-800">결제창까지 왔는데 안 냄</div>
        </div>
      </div>

      {funnel.retriedThenPaid.length > 0 && (
        <p className="mt-3 text-xs text-gray-600">
          여러 번 시도한 끝에 결제한 사람 {funnel.retriedThenPaid.length}명 — 몇 분 넘게 걸렸다면 결제창에서 막힌 것이다.
        </p>
      )}

      {funnel.failureReasons.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-1.5 text-xs font-bold text-gray-700">실패 사유(결제대행사 기록)</h3>
          <ul className="space-y-1">
            {funnel.failureReasons.slice(0, 5).map(r => (
              <li key={r.reason} className="text-xs text-gray-700">
                <span className="font-semibold">{r.count}건</span> · {r.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

export default async function AdminPaymentsPage() {
  const { rows, funnel, listError } = await loadRecentPayments()

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-amber-500" />
        <h1 className="text-xl font-black text-gray-900">결제 복구</h1>
      </div>
      {funnel && <AttemptSummary funnel={funnel} />}

      <p className="mb-6 text-sm text-gray-600">
        결제는 됐는데 구독이 발급되지 않은 건을 재발급합니다. 평상시엔 포트원 웹훅이 자동 처리하며,
        여기는 누락·과거 사고를 수동 복구하는 안전망입니다.
      </p>
      <PaymentsAdmin rows={rows} listError={listError} />
    </div>
  )
}
