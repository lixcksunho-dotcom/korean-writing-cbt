import { Webhook } from '@portone/server-sdk'
import { grantSubscriptionForPayment } from '@/lib/payment'

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
      } else {
        console.error(`[portone-webhook] 발급 실패 payment=${paymentId} reason=${result.reason}`)
      }
    } catch (e) {
      console.error(`[portone-webhook] 처리 예외 payment=${paymentId}:`, (e as Error).message)
    }
  }

  // 검증을 통과한 이벤트는 처리 결과(중복·무관 이벤트 포함)와 무관하게 200으로 응답해
  // 포트원의 불필요한 재시도를 막는다. (서명 실패만 4xx)
  return new Response('ok', { status: 200 })
}
