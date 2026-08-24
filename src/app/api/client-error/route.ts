import { createAdminClient } from '@/lib/supabase/admin'
import { recordOperatorAlert } from '@/lib/operatorAlerts'

// 화면이 터졌다는 사실을 운영자에게 알린다.
//
// 오류 경계(error.tsx)는 클라이언트 컴포넌트라 console.error가 **브라우저 콘솔**로만 간다.
// 사용자는 "일시적인 오류가 발생했어요"를 보고 나가고, 사장님은 무슨 일이 있었는지
// 알 방법이 없다. 사용자가 직접 알려 주지 않는 한 그걸로 끝이다.
//
// 이 라우트는 인증 없이 열려 있다(오류는 로그인 전에도 난다). 그래서 '무엇이 들어올 수
// 있는지'를 좁히는 게 방어선이다 — /api/track와 같은 원칙.
//
// 같은 오류가 반복되면 관리자 화면이 그것만으로 덮인다(최근 알림 12건만 보인다).
// digest가 같은 알림이 최근 1시간 안에 있으면 새로 남기지 않는다.

const MAX = 200
const DEDUPE_MS = 60 * 60_000

export async function POST(req: Request) {
  try {
    const { digest, message, path, stale } = await req.json()
    const ref = typeof digest === 'string' && digest ? digest.slice(0, 64) : 'no-digest'
    const where = typeof path === 'string' ? path.slice(0, 120) : '(경로 불명)'
    const what = typeof message === 'string' && message ? message.slice(0, MAX) : '(메시지 없음)'

    const since = new Date(Date.now() - DEDUPE_MS).toISOString()
    const { data: recent } = await createAdminClient()
      .from('page_views')
      .select('id')
      .eq('path', '#event/alert_page_error')
      .eq('visitor_id', ref)
      .gte('created_at', since)
      .limit(1)
    if (recent && recent.length > 0) return new Response(null, { status: 204 })

    // 새로고침으로 스스로 복구된 건은 그렇게 적는다 — 손댈 게 없는 사고와
    // 진짜로 사람이 막힌 사고를 같은 줄로 보면 급한 것을 놓친다.
    const prefix = stale === true ? '[배포 직후 조각 · 새로고침으로 복구] ' : ''
    await recordOperatorAlert('page_error', `${prefix}${where} — ${what}`, ref)
    return new Response(null, { status: 204 })
  } catch {
    // 오류 보고가 또 오류를 내면 안 된다
    return new Response(null, { status: 204 })
  }
}
