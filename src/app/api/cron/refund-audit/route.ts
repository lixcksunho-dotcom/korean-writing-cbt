import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revokeSubscriptionForPayment } from '@/lib/subscriptionRevocation'
import { fetchPortonePayment } from '@/lib/payment'
import { ACTIVE } from '@/lib/subscriptionRevocationPolicy'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// 환불된 결제인데 이용권이 살아 있는 건을 서버가 스스로 찾아 회수한다 — 취소 웹훅의 안전망.
//
// 왜 필요한가: 취소 웹훅은 재시도 5회(약 4.5시간) 뒤 영영 사라진다. 그때 놓친 건은 아무도 모르는
// 채로 남아 환불받은 사람이 30일을 계속 쓴다(2026-06-19 실제 사례). 원장(포트원)과 우리 DB를
// 직접 대조하는 이 경로는 웹훅이 있든 없든 같은 답을 낸다. 판정은 웹훅과 같은 함수를 쓴다.
// 손으로 돌리던 scripts/revoke_refunded_subscriptions.mjs 를 서버가 3시간마다 하는 것.
//
// 호출: ops의 3시간 배치(blog_audit.bat)가 GET 한다. ?dry=1 이면 찾기만 하고 바꾸지 않는다.
// Vercel Hobby는 크론이 2개까지라 vercel.json 에는 넣지 않는다.

function unauthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  // 비밀이 아직 없으면 막지 않는다 — ops/blog_audit.bat 이 헤더 없이 3시간마다 부른다(설정하려면 Vercel env + bat 헤더를 함께).
  if (!secret) return false
  const actual = Buffer.from(req.headers.get('authorization') ?? '')
  const expected = Buffer.from(`Bearer ${secret}`)
  return actual.length !== expected.length || !timingSafeEqual(actual, expected)
}

export async function GET(req: Request) {
  if (unauthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!process.env.PORTONE_API_SECRET) {
    return NextResponse.json({ skipped: 'portone-not-configured', checked: 0 })
  }
  const dry = new URL(req.url).searchParams.get('dry') === '1'

  // 살아 있는 이용권 중 결제로 나간 것만(주문번호 sub-…). 행사 코드·무료 발급은 원장에 없다.
  const admin = createAdminClient()
  const { data: subs, error } = await admin
    .from('subscriptions')
    .select('id, order_id, user_id, expires_at')
    .eq('status', ACTIVE)
    .like('order_id', 'sub-%')
    .gt('expires_at', new Date().toISOString())
    .order('started_at', { ascending: false })
    .limit(500)
  if (error) return NextResponse.json({ error: 'db', detail: error.message }, { status: 500 })

  const tally: Record<string, number> = {}
  const revoked: string[] = []
  const review: string[] = []
  const trouble: string[] = []
  for (const s of subs ?? []) {
    const orderId = s.order_id as string
    if (dry) {
      const { payment, httpStatus } = await fetchPortonePayment(orderId)
      const key = payment ? String(payment.status ?? 'unknown') : `lookup:${httpStatus ?? 'err'}`
      tally[key] = (tally[key] ?? 0) + 1
      if (payment && (payment.status === 'CANCELLED' || payment.status === 'PARTIAL_CANCELLED')) revoked.push(orderId)
      continue
    }
    const r = await revokeSubscriptionForPayment(orderId)
    const key = r.ok ? r.action : `fail:${r.reason}`
    tally[key] = (tally[key] ?? 0) + 1
    if (r.ok && r.action === 'revoke') revoked.push(orderId)
    else if (r.ok && r.action === 'review') review.push(orderId)
    else if (!r.ok && r.reason !== 'not_found') trouble.push(`${orderId}:${r.reason}`)
  }

  const summary = {
    at: new Date().toISOString(),
    dry,
    checked: subs?.length ?? 0,
    tally,
    revoked,      // 회수됨(dry 면 회수 대상)
    review,       // 부분 취소 등 사람이 정할 것 — operator alert 도 남는다
    trouble,      // 원장 조회 실패 등 다음 회차에 다시 볼 것
  }
  if (revoked.length || review.length || trouble.length) console.log('[refund-audit]', JSON.stringify(summary))
  return NextResponse.json(summary)
}
