// 결제가 접수됐는데 이용권 발급이 실패하면 운영자에게 즉시 알린다.
//
// 왜 필요한가: 2026-07-25에 한 사람이 save→amount→confirm 순으로 연달아 막히고
// 결국 결제를 취소했다. 그 사람은 이용권을 못 받았고, **16일이 지나도록 아무도
// 몰랐다**. 화면에는 "고객센터로 문의해 주세요"만 떠 있었는데, 문의하지 않으면
// 그걸로 끝이다. AI 채점 실패보다 이쪽이 더 급하다 — 돈이 오간 뒤이기 때문이다.
//
// 관리자 화면에는 이미 결제 복구 기능이 있다. 알림에 주문번호를 실어 보내면
// 사장님이 그걸 그대로 넣어 손으로 발급해 줄 수 있다.
//
// 전송 실패는 무시한다(알림 때문에 결제 화면이 더 망가지면 안 된다).

const REASON_LABEL: Record<string, string> = {
  not_found: '포트원에서 결제건을 찾지 못함',
  status: '결제 상태가 PAID가 아님(승인 전이거나 실패)',
  amount: '결제 금액이 정가와 다름 — 확인 필요',
  no_user: '결제에 사용자 정보가 없음',
  user_mismatch: '결제자와 로그인 사용자가 다름',
  save: '검증은 통과했으나 이용권 저장이 실패 — 사용자는 돈만 낸 상태일 수 있다',
}

export async function alertPaymentFailure(a: {
  paymentId: string
  reason: string
  userId?: string
  amount?: number
  status?: string
}): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return

  const detail = [
    a.status ? `상태: ${a.status}` : null,
    a.amount != null ? `금액: ${a.amount.toLocaleString()}원` : null,
    a.userId ? `사용자: ${a.userId}` : null,
  ].filter(Boolean).join(' · ')

  const text =
    `💳 결제는 됐는데 이용권 발급 실패\n\n` +
    `• 사유: ${REASON_LABEL[a.reason] ?? a.reason}\n` +
    `• 주문번호: ${a.paymentId}\n` +
    (detail ? `• ${detail}\n` : '') +
    `\n관리자 → 결제 관리에서 이 주문번호로 복구할 수 있습니다.`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 4000)
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      signal: controller.signal,
    })
  } catch {
    // 무시
  } finally {
    clearTimeout(timer)
  }
}
