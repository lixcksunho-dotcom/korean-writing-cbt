import { Webhook } from '@portone/server-sdk'
import { grantSubscriptionForPayment } from '@/lib/payment'
import { alertPaymentFailure } from '@/lib/paymentFailureAlert'

// 포트원 V2 결제완료 웹훅. success 페이지(브라우저 의존)와 무관하게 서버 간 호출로
// 구독을 발급해, 결제는 됐는데 발급이 안 되는 사고를 자동 복구한다.
// 콘솔에 웹훅 URL(https://kptest.cloud/api/portone/webhook) 등록 + PORTONE_WEBHOOK_SECRET 필요.

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
      const transient = result.reason === 'not_found' || result.reason === 'status' || result.reason === 'save'
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

  // 결제완료 외 이벤트(취소·실패·가상계좌 등)는 처리 대상 아님 → 200으로 조용히 수신.
  return new Response('ok', { status: 200 })
}
