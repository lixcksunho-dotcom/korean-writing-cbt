import { Webhook } from '@portone/server-sdk'
import { grantSubscriptionForPayment } from '@/lib/payment'
import { alertPaymentFailure } from '@/lib/paymentFailureAlert'
import { revokeSubscriptionForPayment } from '@/lib/subscriptionRevocation'

// 포트원 V2 결제 웹훅. success 페이지(브라우저 의존)와 무관하게 서버 간 호출로
// 구독을 발급하고(결제완료), 환불되면 회수한다(취소).
// 콘솔에 웹훅 URL(https://kptest.cloud/api/portone/webhook) 등록 + PORTONE_WEBHOOK_SECRET 필요.
// 취소 이벤트를 받으려면 콘솔 웹훅 설정에서 'Transaction.Cancelled'도 켜져 있어야 한다.

export async function POST(req: Request) {
  const secret = process.env.PORTONE_WEBHOOK_SECRET
  if (!secret) {
    console.error('[portone-webhook] PORTONE_WEBHOOK_SECRET 미설정 — 웹훅 처리 불가')
    return new Response('webhook secret not configured', { status: 503 })
  }

  // 서명 검증은 raw body 기준이므로 text()로 그대로 읽는다.
  const body = await req.text()
  const headers = {
    'webhook-id': req.headers.get('webhook-id') ?? '',
    'webhook-timestamp': req.headers.get('webhook-timestamp') ?? '',
    'webhook-signature': req.headers.get('webhook-signature') ?? '',
  }

  let webhook
  try {
    webhook = await Webhook.verify(secret, body, headers)
  } catch (e) {
    // 위조/오설정/시간오차 — 절대 처리하지 않는다.
    console.warn('[portone-webhook] 서명 검증 실패:', (e as Error).message)
    return new Response('invalid signature', { status: 401 })
  }

  if ('type' in webhook && webhook.type === 'Transaction.Paid') {
    const paymentId = webhook.data.paymentId
    try {
      const result = await grantSubscriptionForPayment(paymentId)
      if (result.ok) {
        console.log(
          `[portone-webhook] 구독 발급 ${result.alreadyGranted ? '(이미존재)' : 'OK'} payment=${paymentId} user=${result.userId}`,
        )
        return new Response('ok', { status: 200 })
      }
      console.error(`[portone-webhook] 발급 실패 payment=${paymentId} reason=${result.reason}`)
      // 일시적 실패(API 지연으로 아직 조회 안 됨 / 아직 PAID 반영 전 / DB 일시오류)는
      // 500을 반환해 포트원 재시도(0→1→4→16→256분, 최대 5회)로 자동 복구되게 한다.
      // 영구 실패(금액 불일치·사용자 식별 불가)는 재시도해도 같으므로 200으로 종료.
      const transient = result.reason === 'not_found' || result.reason === 'lookup_failed' || result.reason === 'status' || result.reason === 'save'
      // 재시도로 낫는 것(transient)은 포트원이 다시 부른다. 그렇지 않은 것은 여기서
      // 영영 사라지므로 — 사용자는 돈을 냈는데 이용권이 없다 — 즉시 알린다.
      if (!transient) {
        await alertPaymentFailure({
          paymentId,
          reason: result.reason,
          amount: result.amount,
          status: result.status,
        })
      }
      return new Response(`unprocessed: ${result.reason}`, { status: transient ? 500 : 200 })
    } catch (e) {
      console.error(`[portone-webhook] 처리 예외 payment=${paymentId}:`, (e as Error).message)
      return new Response('error', { status: 500 }) // 예외도 일시적으로 보고 재시도 유도
    }
  }

  // 환불 → 이용권 회수. 전액 취소만 자동 회수하고, 부분 취소는 회수 여부를 사람이 정한다
  // (판정은 subscriptionRevocationPolicy, 여기서는 두 이벤트를 같은 경로로 넘긴다).
  if ('type' in webhook && (webhook.type === 'Transaction.Cancelled' || webhook.type === 'Transaction.PartialCancelled')) {
    const paymentId = webhook.data.paymentId
    try {
      const result = await revokeSubscriptionForPayment(paymentId)
      if (result.ok) {
        console.log(`[portone-webhook] 취소 처리 ${result.action} payment=${paymentId} (${result.reason})`)
        return new Response('ok', { status: 200 })
      }
      console.error(`[portone-webhook] 회수 실패 payment=${paymentId} reason=${result.reason}`)
      // 전부 재시도로 나을 수 있는 실패다(포트원 반영 지연·조회 장애·DB 일시오류).
      // 여기서 포기하면 환불받은 사람이 30일을 그대로 쓴다 → 500으로 재시도를 부른다.
      // 재시도 5회가 모두 실패해도 대사(npm run audit:refunds)가 나중에 잡으므로,
      // 매 재시도마다 알림을 쌓지는 않는다. 알림은 revokeSubscriptionForPayment가
      // 자기 판단으로 필요한 경우(부분취소·갱신 실패)에만 남긴다.
      return new Response(`revoke failed: ${result.reason}`, { status: 500 })
    } catch (e) {
      console.error(`[portone-webhook] 취소 처리 예외 payment=${paymentId}:`, (e as Error).message)
      return new Response('error', { status: 500 })
    }
  }

  // 그 밖의 이벤트(실패·가상계좌 발급·취소대기 등)는 처리 대상 아님 → 200으로 조용히 수신.
  return new Response('ok', { status: 200 })
}
