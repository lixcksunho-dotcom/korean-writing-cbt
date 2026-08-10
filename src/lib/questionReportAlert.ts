// 문제 오류 신고가 접수되면 운영자에게 알린다.
//
// 기록·전송은 operatorAlerts가 맡는다. 텔레그램(TELEGRAM_BOT_TOKEN·TELEGRAM_CHAT_ID)이
// 설정돼 있으면 폰으로도 오고, 설정이 없어도 관리자 첫 화면에는 남는다.
// 예전엔 텔레그램만 있어서, 값이 없는 동안 신고 알림이 통째로 사라졌다.
//
// 텔레그램 설정 방법(한 번만):
//   1) @BotFather 로 봇 생성 → 봇 토큰을 TELEGRAM_BOT_TOKEN 에 넣는다.
//   2) 그 봇과 대화 시작(아무 메시지) 후 https://api.telegram.org/bot<토큰>/getUpdates 에서
//      chat.id 를 확인해 TELEGRAM_CHAT_ID 에 넣는다.

import { recordOperatorAlert } from '@/lib/operatorAlerts'

export type QuestionReportAlert = {
  reason: string
  program: string
  year: number
  round: number
  number: number
  reporter: string
}

export async function sendQuestionReportAlert(a: QuestionReportAlert): Promise<void> {
  const examLabel = a.program === 'kbs' ? 'KBS한국어' : '실용글쓰기'
  const telegram = [
    '🚨 문제 오류 신고',
    '',
    `• 시험: ${examLabel} ${a.year}년 ${a.round}회`,
    `• 문항: ${a.number}번`,
    `• 사유: ${a.reason}`,
    `• 신고자: ${a.reporter}`,
  ].join('\n')

  await recordOperatorAlert(
    'question_report',
    `${examLabel} ${a.year}년 ${a.round}회 ${a.number}번 — ${a.reason} (신고자 ${a.reporter})`,
    `${a.program}-${a.year}-${a.round}-${a.number}`,
    telegram,
  )
}
