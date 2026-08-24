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

export type AlertKind = 'payment' | 'ai_grading' | 'question_report' | 'page_error' | 'feedback'

const KIND_LABEL: Record<AlertKind, string> = {
  payment: '결제',
  ai_grading: 'AI 채점',
  question_report: '문제 신고',
  page_error: '화면 오류',
  feedback: '불편사항',
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

  const sent = await sendTelegram(telegramText ?? `⚠️ ${KIND_LABEL[kind]}

${summary}`)
  // 전송 실패를 삼키면 '알림을 보냈다'와 '아무 데도 안 갔다'가 구분되지 않는다.
  // 알림 흐름을 막지는 않되(기록은 이미 남았다) 로그에는 반드시 남긴다.
  if (!sent.ok) console.error(`[operator-alert] 텔레그램 전송 실패(${kind}): ${sent.detail}`)
}

/** 텔레그램 설정이 둘 다 있는지. 화면에 '알림이 실제로 가는지'를 보여 주는 데 쓴다. */
export function alertChannelEnv(): { hasToken: boolean; hasChatId: boolean } {
  return {
    hasToken: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    hasChatId: Boolean(process.env.TELEGRAM_CHAT_ID),
  }
}

/**
 * 텔레그램 한 통. 결과를 돌려준다 — 부르는 쪽이 실패를 알 수 있어야 한다.
 * 실패 사유는 응답 본문만 짧게 싣는다(토큰이 섞이면 안 된다).
 */
export async function sendTelegram(text: string): Promise<{ ok: boolean; detail: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    return { ok: false, detail: !token && !chatId ? '토큰·대화방 id 둘 다 없음' : !token ? '봇 토큰 없음' : '대화방 id 없음' }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 6000)
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      signal: controller.signal,
    })
    if (res.ok) return { ok: true, detail: '전송됨' }
    // 텔레그램은 실패 이유를 본문에 준다(잘못된 chat_id·봇 차단 등). 그게 없으면 고칠 수가 없다.
    const body = await res.text().catch(() => '')
    return { ok: false, detail: `${res.status} ${body.slice(0, 200)}` }
  } catch (e) {
    return { ok: false, detail: (e as Error).name === 'AbortError' ? '시간 초과(6초)' : String((e as Error).message).slice(0, 120) }
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
