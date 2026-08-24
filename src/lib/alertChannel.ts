// 알림이 사장님에게 실제로 닿는지 판정한다(순수 — 네트워크 없음).
//
// 왜 필요한가: 알림을 텔레그램으로만 보내는데, 토큰이 설정돼 있지 않으면 **전부 조용히
// 버려진다**. 예전에 실제로 그랬다 — 결제 실패도 채점 실패도 아무 데도 안 갔다.
// 그래서 '보내는 코드가 있다'와 '실제로 닿는다'를 구분해서 화면에 드러낸다.
//   npm run check:alerts

export type ChannelState = 'ready' | 'not_configured' | 'partial'

export type ChannelStatus = {
  state: ChannelState
  /** 사람이 읽는 한 줄 */
  label: string
  /** 무엇을 해야 하는지. 문제가 없으면 null */
  action: string | null
}

/**
 * 토큰과 대화방 id는 **둘 다** 있어야 한다. 하나만 있으면 텔레그램 호출이 실패하는데,
 * 실패를 삼키고 있어서 화면상으로는 '보냄'과 구분되지 않는다.
 */
export function describeAlertChannel(input: { hasToken: boolean; hasChatId: boolean }): ChannelStatus {
  const { hasToken, hasChatId } = input
  if (hasToken && hasChatId) {
    return { state: 'ready', label: '텔레그램으로 알림이 갑니다', action: null }
  }
  if (!hasToken && !hasChatId) {
    return {
      state: 'not_configured',
      label: '텔레그램 알림이 꺼져 있습니다 — 사고가 나도 관리자 화면에만 남습니다',
      action: 'Vercel 환경변수에 TELEGRAM_BOT_TOKEN·TELEGRAM_CHAT_ID를 넣어 주세요',
    }
  }
  return {
    state: 'partial',
    label: `설정이 반만 돼 있습니다 (${hasToken ? '대화방 id 없음' : '봇 토큰 없음'}) — 알림이 나가지 않습니다`,
    action: `Vercel 환경변수에 ${hasToken ? 'TELEGRAM_CHAT_ID' : 'TELEGRAM_BOT_TOKEN'}를 넣어 주세요`,
  }
}
