import { createAdminClient } from '@/lib/supabase/admin'
import { CreditCard } from 'lucide-react'
import PaymentsAdmin, { type PaymentRow } from './PaymentsAdmin'

export const dynamic = 'force-dynamic'

// 최근 포트원 결제를 조회해 우리 DB의 구독 발급 여부와 대조한다.
// 목록 조회가 실패해도(키/네트워크) 페이지는 떠야 하므로 에러는 잡아서 넘긴다.
async function loadRecentPayments(): Promise<{ rows: PaymentRow[]; listError: string | null }> {
  const secret = process.env.PORTONE_API_SECRET
  const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID
  if (!secret || !storeId) {
    return { rows: [], listError: '포트원 키(PORTONE_API_SECRET/STORE_ID) 미설정' }
  }

  try {
    const { PortOneClient } = await import('@portone/server-sdk')
    const client = PortOneClient({ secret })

    const until = new Date()
    const from = new Date()
    from.setDate(from.getDate() - 60)

    const res = await client.payment.getPayments({
      page: { number: 0, size: 20 },
      filter: { storeId, from: from.toISOString(), until: until.toISOString() },
    })

    // Payment는 상태별 유니온이라 느슨하게 접근(렌더 전용).
    const items = (res?.items ?? []) as Array<Record<string, unknown>>
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
    return { rows, listError: null }
  } catch (e) {
    return { rows: [], listError: (e as Error).message }
  }
}

export default async function AdminPaymentsPage() {
  const { rows, listError } = await loadRecentPayments()

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-amber-500" />
        <h1 className="text-xl font-black text-gray-900">결제 복구</h1>
      </div>
      <p className="mb-6 text-sm text-gray-600">
        결제는 됐는데 구독이 발급되지 않은 건을 재발급합니다. 평상시엔 포트원 웹훅이 자동 처리하며,
        여기는 누락·과거 사고를 수동 복구하는 안전망입니다.
      </p>
      <PaymentsAdmin rows={rows} listError={listError} />
    </div>
  )
}
