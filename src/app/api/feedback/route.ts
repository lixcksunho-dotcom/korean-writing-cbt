import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { recordOperatorAlert } from '@/lib/operatorAlerts'
import { judgeFeedback, normalizeContact } from '@/lib/feedbackMessage'

// 고객 불편사항 접수. 지금까지 문의 수단이 이메일(mailto)뿐이라 메일 앱을 여는 사람만
// 말할 수 있었다 — 대부분은 조용히 떠나고, 무엇이 불편했는지는 영영 알 수 없었다.
//
// feedback 테이블은 정책을 열지 않아 service_role로만 읽고 쓴다(라우트를 거치게 하는 이유).
// 로그인하지 않은 사람도 접수할 수 있어야 한다 — 결제 전에 막힌 사람이 가장 할 말이 많다.

export async function POST(req: Request) {
  let body: { message?: unknown; contact?: unknown; path?: unknown }
  try {
    body = await req.json()
  } catch {
    return Response.json({ ok: false, reason: 'bad_request' }, { status: 400 })
  }

  const verdict = judgeFeedback(body.message)
  if (!verdict.ok) return Response.json({ ok: false, reason: verdict.reason }, { status: 400 })

  // 로그인했으면 누가 보냈는지 남긴다(선택). 안 했어도 접수는 된다.
  let userId: string | null = null
  try {
    const { data } = await (await createClient()).auth.getUser()
    userId = data.user?.id ?? null
  } catch {
    // 세션을 못 읽어도 접수를 막지 않는다
  }

  const path = typeof body.path === 'string' ? body.path.slice(0, 200) : null

  // supabase-js는 throw 대신 {error}를 준다. 안 받으면 접수 실패가 조용히 지나가고
  // 화면에는 '보냈습니다'가 뜬다 — 이 프로젝트에서 실제로 여러 번 난 사고다.
  const { error } = await createAdminClient().from('feedback').insert({
    user_id: userId,
    message: verdict.message,
    contact: normalizeContact(body.contact),
    path,
    user_agent: (req.headers.get('user-agent') ?? '').slice(0, 300) || null,
  })

  if (error) {
    console.error('[feedback] 저장 실패:', error.message)
    // 접수자에게는 실패를 숨기지 않는다. 대신 화면이 이메일 안내로 되돌려 준다.
    return Response.json({ ok: false, reason: 'save_failed' }, { status: 503 })
  }

  await recordOperatorAlert(
    'feedback',
    `${verdict.message.slice(0, 160)}${verdict.truncated ? ' …(잘림)' : ''}${path ? ` [${path}]` : ''}`,
    userId ?? undefined,
  )

  return Response.json({ ok: true, truncated: verdict.truncated })
}
