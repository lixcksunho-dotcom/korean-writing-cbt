import { createAdminClient } from '@/lib/supabase/admin'

// 운영자가 알아야 하는 사고를 한 곳으로 모은다.
//
// 왜 만들었나: 알림을 텔레그램으로만 보내고 있었는데 TELEGRAM_BOT_TOKEN·CHAT_ID가
// 아직 설정되지 않아 **전부 조용히 버려지고 있었다**. 결제 실패도, AI 채점 실패도,
// 문제 오류 신고도 마찬가지다. 알림이 설정에 의존하면 설정이 빠진 동안은 없는 것과 같다.
//
// 그래서 두 곳에 보낸다:
//   1) 기록  — page_views 재사용(`#event/alert_*`). 마이그레이션이 필요 없고,
//              퍼널·방문통계는 이미 `#event/` 접두사를 걸러내므로 숫자가 오염되지 않는다.
//   2) 텔레그램 — 설정돼 있을 때만. 없어도 1)이 남으므로 사고가 사라지지 않는다.
//
// 기록은 관리자 첫 화면에서 바로 보인다.

export type AlertKind = 'payment' | 'ai_grading' | 'question_report' | 'page_error'

const KIND_LABEL: Record<AlertKind, string> = {
  payment: '결제',
  ai_grading: 'AI 채점',
  question_report: '문제 신고',
  page_error: '화면 오류',
}

/**
 * @param ref 사고를 특정하는 값(주문번호·사용자 id 등). 64자로 잘린다.
 * @param telegramText 텔레그램으로 보낼 전문. 없으면 summary를 쓴다.
 */
export async function recordOperatorAlert(
  kind: AlertKind,
  summary: string,
  ref?: string,
  telegramText?: string,
): Promise<void> {
  // 기록이 먼저다 — 텔레그램이 막혀도 사고는 남아야 한다.
  try {
    await createAdminClient().from('page_views').insert({
      path: `#event/alert_${kind}`,
      visitor_id: ref ? ref.slice(0, 64) : null,
      referrer: summary.slice(0, 512),
    })
  } catch {
    // 알림 기록 실패가 결제·채점 흐름을 막으면 안 된다
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 4000)
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: telegramText ?? `⚠️ ${KIND_LABEL[kind]}\n\n${summary}`,
        disable_web_page_preview: true,
      }),
      signal: controller.signal,
    })
  } catch {
    // 무시
  } finally {
    clearTimeout(timer)
  }
}

export type OperatorAlert = { kind: AlertKind; label: string; summary: string; ref: string | null; at: string }

/** 관리자 화면용. 최근 사고를 새 것부터 돌려준다. */
export async function recentOperatorAlerts(days = 14, limit = 12): Promise<OperatorAlert[]> {
  const since = new Date(Date.now() - days * 86400_000).toISOString()
  const { data } = await createAdminClient()
    .from('page_views')
    .select('path, referrer, visitor_id, created_at')
    .like('path', '#event/alert_%')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data ?? []).map(r => {
    const kind = String(r.path).replace('#event/alert_', '') as AlertKind
    return {
      kind,
      label: KIND_LABEL[kind] ?? kind,
      summary: r.referrer ?? '',
      ref: r.visitor_id ?? null,
      at: r.created_at as string,
    }
  })
}
