// 사고 알림을 그 알림이 가리키는 접수 행(feedback)과 잇는다.
//
// 알림에는 '처리했는지'가 없다. 접수 행에는 있다. 둘을 이어야 처리 끝난 문의가
// 사고 목록에서 내려간다 — 안 이어지면 다 한 일을 매일 다시 보게 된다.
//
// 이전에는 알림 문구 앞 40자가 접수 본문으로 시작하는지만 봤다. 짧은 문의는 그 40자 안에
// ' [/support]' 꼬리표까지 들어가 영영 안 맞았다(실제: '회원 탈퇴 하고 싶어요' 문의가 처리
// 뒤에도 나흘간 빨갛게 남았다). 블로그 신청은 문구 모양이 아예 달라 한 번도 안 이어졌다.

import { BLOG_REVIEW_PATH, normalizeBlogUrl } from './blogPromoRules.ts'

export type FeedbackRowLite = {
  path: string | null
  contact: string | null
  message: string
  resolved: boolean | null
  created_at: string
}

export type FeedbackLink =
  /** 접수가 아니다(사후 확인 보고, 탈퇴 실패 같은 시스템 알림) — 이을 것이 없다 */
  | { kind: 'not_customer' }
  /** 접수 행을 찾았다 */
  | { kind: 'found'; resolved: boolean }
  /** 블로그 신청인데 접수 행이 없다 — 지워진 신청이라 심사할 것도 없다 */
  | { kind: 'missing' }
  /** 문의인데 어느 행인지 못 찾았다 — 모르는 것은 모른다고 둔다 */
  | { kind: 'unknown' }

const BLOG_APPLICATION = /^블로그 홍보 신청 — [^\n]*\n(\S+)/

/** 알림 문구에서 접수 본문의 머리. 알림에만 붙는 꼬리표('[/support]', '…(잘림)')를 뗀다. */
export function feedbackMessageHead(summary: string): string {
  return summary.replace(/ …\(잘림\)/, '').replace(/ \[[^\]]*\]$/, '').slice(0, 40)
}

export function linkAlertToFeedback(
  alert: { summary: string; at: string },
  rows: FeedbackRowLite[],
): FeedbackLink {
  const { summary } = alert
  if (/^블로그 홍보 사후 확인/.test(summary) || /^회원 탈퇴 실패/.test(summary)) return { kind: 'not_customer' }

  const application = BLOG_APPLICATION.exec(summary)
  if (application) {
    // 신청은 주소로 잇는다 — 접수 행의 contact 가 그 주소다. 모양이 달라도 같은 글이면 같다.
    const key = normalizeBlogUrl(application[1])
    const hit = rows.find(r => r.path === BLOG_REVIEW_PATH && r.contact && normalizeBlogUrl(r.contact) === key)
    return hit ? { kind: 'found', resolved: Boolean(hit.resolved) } : { kind: 'missing' }
  }

  const head = feedbackMessageHead(summary)
  if (!head) return { kind: 'unknown' }
  // 같은 말을 두 번 보낸 사람도 있다 — 시각이 가장 가까운 행이 이 알림의 접수다.
  const at = Date.parse(alert.at)
  const hit = rows
    .filter(r => r.path !== BLOG_REVIEW_PATH && r.message.startsWith(head))
    .sort((a, b) => Math.abs(Date.parse(a.created_at) - at) - Math.abs(Date.parse(b.created_at) - at))[0]
  return hit ? { kind: 'found', resolved: Boolean(hit.resolved) } : { kind: 'unknown' }
}
