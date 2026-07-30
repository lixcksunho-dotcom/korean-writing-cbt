// 문제 오류 신고가 접수되면 관리자에게 텔레그램으로 알림을 보낸다(무료 Telegram Bot API).
// 환경변수 TELEGRAM_BOT_TOKEN·TELEGRAM_CHAT_ID 가 모두 설정된 경우에만 동작하며,
// 전송에 실패하더라도 신고 자체는 이미 저장되었으므로 예외를 밖으로 던지지 않는다.
//
// 설정 방법(한 번만):
//   1) 텔레그램 @BotFather 로 봇 생성 → 봇 토큰을 TELEGRAM_BOT_TOKEN 에 넣는다.
//   2) 그 봇과 대화 시작(아무 메시지) 후 https://api.telegram.org/bot<토큰>/getUpdates 에서
//      chat.id 를 확인해 TELEGRAM_CHAT_ID 에 넣는다.
//   → 이후 오류 신고가 들어올 때마다 폰으로 즉시 알림이 온다.

export type QuestionReportAlert = {
  reason: string
  program: string
  year: number
  round: number
  number: number
  reporter: string
}

export async function sendQuestionReportAlert(a: QuestionReportAlert): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return // 미설정이면 조용히 통과

  const examLabel = a.program === 'kbs' ? 'KBS한국어' : '실용글쓰기'
  const text =
    `🚨 문제 오류 신고\n\n` +
    `• 시험: ${examLabel} ${a.year}년 ${a.round}회\n` +
    `• 문항: ${a.number}번\n` +
    `• 사유: ${a.reason}\n` +
    `• 신고자: ${a.reporter}`

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
    // 네트워크 오류·타임아웃은 무시(신고는 이미 저장됨)
  } finally {
    clearTimeout(timer)
  }
}
