import { createAdminClient } from '@/lib/supabase/admin'
import { triageAlert, type AlertTriage } from '@/lib/operatorAlertTriage'
import { isCheckArtifact } from '@/lib/operatorAlertTriage'

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

  // 검사가 만든 자국은 폰을 울리지 않는다. 기록은 위에서 이미 남겼다 —
  // 검사가 돌았다는 사실은 쓸모가 있지만, 그것 때문에 새벽에 알림이 오면 안 된다.
  // 아홉 개가 가짜면 사람은 목록을 안 읽게 되고, 그때 진짜 하나가 묻힌다.
  if (isCheckArtifact(`${summary} ${ref ?? ''}`)) return

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


export type OperatorAlert = {
  kind: AlertKind
  label: string
  summary: string
  ref: string | null
  at: string
  /** 사람이 봐야 하는가, 검사 자국인가, 스스로 끝난 일인가 */
  triage: AlertTriage
  /** 고객이 남긴 것이면 처리했는지. 고객 건이 아니면 null. */
  resolved: boolean | null
}

/**
 * 관리자 화면용. 최근 사고를 새 것부터 돌려준다.
 *
 * 검사 자국이 섞여 있어 그냥 12개를 자르면 진짜 사고가 밀려 안 보인다(실측: 12건 중
 * 9건이 검사 자국이었다). 넉넉히 읽고 갈라서 돌려준다.
 */
export async function recentOperatorAlerts(days = 14, limit = 12): Promise<OperatorAlert[]> {
  const since = new Date(Date.now() - days * 86400_000).toISOString()
  const { data } = await createAdminClient()
    .from('page_views')
    .select('path, referrer, visitor_id, created_at')
    .like('path', '#event/alert_%')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(Math.max(limit * 6, 60))

  const all = (data ?? []).map(r => {
    const kind = String(r.path).replace('#event/alert_', '') as AlertKind
    const summary = r.referrer ?? ''
    const ref = r.visitor_id ?? null
    return {
      kind,
      label: KIND_LABEL[kind] ?? kind,
      summary,
      ref,
      at: r.created_at as string,
      triage: triageAlert(summary, ref),
      resolved: null as boolean | null,
    }
  })

  // 고객이 남긴 건은 '처리했는지'가 가장 궁금한 정보다. 알림에는 그 상태가 없어서
  // 처리를 끝내고도 목록에는 계속 빨갛게 남아 있었다 — 다 한 일을 또 보게 된다.
  // 알림 문구가 접수 내용으로 시작하므로 그것으로 되짚는다.
  const { data: fb } = await createAdminClient()
    .from('feedback')
    .select('message, resolved, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(200)

  const withResolved = all.map(a => {
    if (a.kind !== 'feedback') return a
    const head = a.summary.slice(0, 40)
    const hit = (fb ?? []).find(x => head && String(x.message).startsWith(head.slice(0, Math.min(40, head.length))))
    return { ...a, resolved: hit ? Boolean(hit.resolved) : a.resolved }
  })

  // 처리 끝난 고객 건은 '볼 것'에서 내린다 — 다 한 일이 목록을 채우면 안 된다.
  const settled = withResolved.map(a =>
    a.triage === 'actionable' && a.resolved === true ? { ...a, triage: 'settled' as AlertTriage } : a,
  )

  // 사람이 볼 것을 먼저 채운다. 자리가 남으면 나머지도 준다 —
  // 화면에서 접어 두되, 있었다는 사실 자체는 숨기지 않는다.
  const actionable = settled.filter(a => a.triage === 'actionable')
  const rest = settled.filter(a => a.triage !== 'actionable')
  return [...actionable.slice(0, limit), ...rest.slice(0, limit)]
}
