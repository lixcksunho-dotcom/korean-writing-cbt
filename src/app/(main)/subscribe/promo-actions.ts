'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveSubscription } from '@/lib/subscription'
import { recordOperatorAlert } from '@/lib/operatorAlerts'
import {
  findPromoCampaign,
  normalizePromoCode,
  promoOrderId,
  promoOrderPrefix,
} from '@/lib/promoCampaign'
import { revalidatePath } from 'next/cache'

export type RedeemResult =
  | { ok: true; days: number; expiresAt: string; extended: boolean }
  | { ok: false; message: string }

/**
 * 행사 코드를 이용권으로 바꾼다.
 *
 * 실패는 던지지 않고 값으로 돌려준다 — 운영 빌드가 throw 메시지를 지워서
 * 화면에 '알 수 없는 오류'만 남는 일을 이 저장소에서 이미 겪었다.
 */
export async function redeemPromoCode(input: string): Promise<RedeemResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: '로그인한 뒤에 코드를 넣어 주세요.' }

  const code = normalizePromoCode(input ?? '')
  if (!code) return { ok: false, message: '코드를 입력해 주세요.' }

  const found = findPromoCampaign(code)
  if (!found.ok) {
    const message =
      found.reason === 'not_started' ? '아직 시작되지 않은 행사예요.'
      : found.reason === 'ended' ? '기간이 끝난 코드예요.'
      : '없는 코드예요. 대소문자·숫자를 다시 확인해 주세요.'
    return { ok: false, message }
  }
  const { campaign } = found

  const admin = createAdminClient()

  // 인원 제한. 세는 것과 넣는 것 사이에 남이 끼어들 수 있어 정확한 상한은 아니지만,
  // 진짜 방어선은 order_id의 unique 제약이다(같은 사람 재사용을 확실히 막는다).
  // 인원은 몇 명 넘쳐도 손해가 아니라서 여기서는 세는 정도로 둔다.
  const { count } = await admin
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .like('order_id', `${promoOrderPrefix(campaign.code)}%`)
  if ((count ?? 0) >= campaign.maxUses) {
    return { ok: false, message: '아쉽게도 이 행사는 마감됐어요.' }
  }

  // 이미 이용권이 있으면 남은 기간 뒤에 이어 붙인다 — 겹쳐 주면 산 사람이 손해를 본다.
  const current = await getActiveSubscription(user.id)
  const base = current ? new Date(current.expires_at) : new Date()
  const expiresAt = new Date(base.getTime() + campaign.days * 24 * 60 * 60 * 1000).toISOString()

  const { error } = await admin.from('subscriptions').insert({
    user_id: user.id,
    // 결제가 아님을 기록에 남긴다. amount=0이라 매출 대조에서 '무료 발급'으로 갈린다.
    payment_key: `promo:${campaign.code}`,
    order_id: promoOrderId(campaign.code, user.id),
    amount: 0,
    status: 'active',
    expires_at: expiresAt,
  })

  if (error) {
    // 23505 = unique_violation: 이 사람이 이 코드를 이미 썼다.
    if (error.code === '23505') return { ok: false, message: '이미 사용한 코드예요.' }
    return { ok: false, message: '발급 중 문제가 생겼어요. 잠시 뒤 다시 시도해 주세요.' }
  }

  // 행사 발급은 운영자가 알아야 하는 사건이다(마감 임박·이상 사용 감지).
  await recordOperatorAlert(
    'payment',
    `행사 코드 사용: ${campaign.label} (${campaign.code}) · ${(count ?? 0) + 1}/${campaign.maxUses}`,
    user.id,
  ).catch(() => {})

  revalidatePath('/', 'layout')
  return { ok: true, days: campaign.days, expiresAt, extended: !!current }
}
