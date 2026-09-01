// 블로그 홍보 답례로 주는 무료 이용권 — 행사(캠페인) 정의.
//
// 왜 이 방식인가: 새 표를 만들지 않는다. 발급 기록은 subscriptions에 amount=0으로
// 남기고, order_id에 `promo-<코드>-<사용자>` 를 넣는다. order_id에 unique 제약이 있어
// **같은 사람이 같은 코드를 두 번 쓰는 것을 DB가 막는다**(경쟁 요청이 겹쳐도).
// 매출 대조(check:revenue)는 amount=0을 '무료 발급'으로 이미 구분하고 있어 오염되지 않는다.
//
// 코드를 저장소에 두는 이유: 행사는 주기적이고 개수가 적다. 표·관리화면을 새로 만드는
// 비용보다, 한 줄 추가하고 배포하는 편이 빠르고 실수도 적다. 이 파일은 서버에서만
// 읽으므로 브라우저 번들에 코드가 실리지 않는다.

export type PromoCampaign = {
  /** 사용자가 입력하는 코드. 대문자·숫자만 — 헷갈리는 글자(O,0,I,1)는 피해서 만든다. */
  code: string
  /** 관리 화면·기록에 남는 이름 */
  label: string
  /** 지급 일수 */
  days: number
  /** 이 코드로 받을 수 있는 총 인원. 넘으면 마감된다. */
  maxUses: number
  /** 사용 가능 기간(ISO). 지나면 만료로 안내한다. */
  startsAt: string
  endsAt: string
}

// 행사 목록. 끝난 행사도 지우지 말 것 — 지우면 '이 코드가 뭐였는지'를 못 찾는다.
export const PROMO_CAMPAIGNS: PromoCampaign[] = [
  {
    code: 'BLOG30',
    label: '블로그 후기 이벤트 · 1개월',
    days: 30,
    maxUses: 100,
    startsAt: '2026-09-01T00:00:00+09:00',
    endsAt: '2026-12-31T23:59:59+09:00',
  },
]

/** 입력값을 코드 표기로 맞춘다 — 사람은 소문자·공백·하이픈을 섞어 적는다. */
export function normalizePromoCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export type PromoLookup =
  | { ok: true; campaign: PromoCampaign }
  | { ok: false; reason: 'unknown' | 'not_started' | 'ended' }

/** 코드를 찾아 지금 쓸 수 있는지까지 판정한다(인원 제한은 DB를 봐야 하므로 여기서 안 본다). */
export function findPromoCampaign(input: string, now: Date = new Date()): PromoLookup {
  const code = normalizePromoCode(input)
  const campaign = PROMO_CAMPAIGNS.find(c => c.code === code)
  if (!campaign) return { ok: false, reason: 'unknown' }
  if (now < new Date(campaign.startsAt)) return { ok: false, reason: 'not_started' }
  if (now > new Date(campaign.endsAt)) return { ok: false, reason: 'ended' }
  return { ok: true, campaign }
}

/** 발급 기록의 order_id. 코드+사용자로 유일해 재사용을 DB가 막는다. */
export function promoOrderId(code: string, userId: string): string {
  return `promo-${code}-${userId}`
}

/** 이 코드로 나간 발급을 찾을 때 쓰는 접두사 */
export function promoOrderPrefix(code: string): string {
  return `promo-${code}-`
}

/** 행사가 지금 어느 단계인지. 시각을 인자로 받아 순수하게 판정한다. */
export function promoState(c: PromoCampaign, now: number): '시작 전' | '진행 중' | '종료' {
  if (now < new Date(c.startsAt).getTime()) return '시작 전'
  if (now > new Date(c.endsAt).getTime()) return '종료'
  return '진행 중'
}
