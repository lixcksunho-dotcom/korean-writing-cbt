import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// 임시 진단 라우트 — 결제 검증/구독발급 실패 원인 판별용. 검증 후 삭제.
// 시크릿 값은 절대 응답에 싣지 않고, 동작 여부(boolean)와 길이만 보고한다.
const DIAG_TOKEN = 'kp-diag-7Yx2Qa91'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('k') !== DIAG_TOKEN) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const out: Record<string, unknown> = {}

  // 1) 환경변수 존재/길이 (값은 노출 안 함)
  out.env = {
    PORTONE_API_SECRET_len: (process.env.PORTONE_API_SECRET || '').length,
    SERVICE_ROLE_len: (process.env.SUPABASE_SERVICE_ROLE_KEY || '').length,
    SERVICE_ROLE_prefix: (process.env.SUPABASE_SERVICE_ROLE_KEY || '').slice(0, 6),
    SUPABASE_URL_set: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  }

  // 2) PORTONE_API_SECRET 검증: 알려진 결제건 단건조회 (reason=confirm 후보)
  try {
    const pid = 'sub-44e36466-be76-49a8-86cc-80e457431057'
    const r = await fetch(`https://api.portone.io/payments/${encodeURIComponent(pid)}`, {
      headers: { Authorization: `PortOne ${process.env.PORTONE_API_SECRET}` },
      cache: 'no-store',
    })
    out.portone = { ok: r.ok, status: r.status }
  } catch (e) {
    out.portone = { ok: false, error: String(e) }
  }

  // 3) SERVICE_ROLE 검증: admin API 호출 성공 여부 (reason=save 후보)
  try {
    const admin = createAdminClient()
    const { data, error } = await admin.auth.admin.listUsers({ perPage: 1 })
    out.serviceRole = error
      ? { ok: false, status: error.status, message: error.message }
      : { ok: true, sampleUserCount: data.users.length }
  } catch (e) {
    out.serviceRole = { ok: false, error: String(e) }
  }

  return NextResponse.json(out)
}
