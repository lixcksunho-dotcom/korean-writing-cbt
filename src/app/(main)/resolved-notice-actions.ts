'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTelegram } from '@/lib/operatorAlerts'

// 해결 알림 띠가 그 사람 화면에 실제로 떴을 때 호출된다.
//
// 왜 필요한가: '처리함'을 눌러 놓고도 그 사람이 봤는지는 알 길이 없었다. 문의를 남긴
// 분께 답이 닿았는지가 운영자에게 보이지 않으면, 처리는 했는데 전달은 안 된 상태가
// 조용히 이어진다. 띠가 뜬 순간을 기록해 관리자 불편사항 목록에 '고객 확인함'으로 띄운다.
//
// 기록은 operatorAlerts와 같은 이유로 page_views를 재사용한다(#event/ 접두사는
// 방문 통계에서 걸러진다) — 마이그레이션이 필요 없다.
export async function acknowledgeResolvedNotices(ids: string[]): Promise<void> {
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 10) return

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const admin = createAdminClient()
  // 본인 것·해결된 것만 인정한다 — id를 마음대로 보내 남의 문의를 '확인함'으로 만들 수 없게.
  const { data: mine } = await admin
    .from('feedback')
    .select('id, message')
    .eq('user_id', user.id)
    .eq('resolved', true)
    .in('id', ids)
  if (!mine?.length) return

  // 이미 기록된 것은 다시 남기지 않는다(새로고침마다 호출될 수 있다).
  const { data: existing } = await admin
    .from('page_views')
    .select('visitor_id')
    .eq('path', '#event/feedback_ack')
    .in('visitor_id', mine.map(f => f.id))
  const seen = new Set((existing ?? []).map(r => r.visitor_id))
  const fresh = mine.filter(f => !seen.has(f.id))
  if (!fresh.length) return

  await admin.from('page_views').insert(
    fresh.map(f => ({
      path: '#event/feedback_ack',
      visitor_id: f.id,
      referrer: `해결 알림 확인 · ${f.message.slice(0, 80)}`,
    })),
  )

  // 텔레그램은 설정돼 있을 때만. 실패해도 기록은 이미 남았다.
  await sendTelegram(
    `✅ 불편사항 해결 알림을 고객이 확인했습니다\n\n${fresh.map(f => `· ${f.message.slice(0, 100)}`).join('\n')}`,
  ).catch(() => {})
}
