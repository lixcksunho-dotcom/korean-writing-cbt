import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { stripBom, SB_URL, SB_ANON } from '@/lib/supabase/sanitize'
import { trackServerEvent } from '@/lib/analytics/trackServerEvent'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = await cookies()
    // ★ 세션 쿠키를 리다이렉트 '응답'에 직접 실어야 브라우저가 받는다.
    //   (next/headers cookieStore.set만으론 리다이렉트 응답에 누락될 수 있어 로그인 후 /dashboard가 /login으로 튕김)
    const response = NextResponse.redirect(`${origin}${next}`)
    const supabase = createServerClient(
      SB_URL,
      SB_ANON,
      {
        cookies: {
          getAll() {
            // 저장된 쿠키(PKCE 검증기 등)에 섞인 BOM/제어문자 제거 → 헤더 변환 오류 방지
            return cookieStore.getAll().map((c) => ({ ...c, value: stripBom(c.value) }))
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              const v = stripBom(value)
              try { cookieStore.set(name, v, options) } catch {}
              response.cookies.set(name, v, options)
            })
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // 신규가입 판별: 계정 생성시각이 방금(2분 이내)이면 이 OAuth 콜백이 최초 가입 흐름 —
      // signup 이벤트로 기록해 상단 퍼널(가입→구독) 완성. 실패해도 로그인 자체는 막지 않음.
      const user = data.session?.user
      if (user?.created_at) {
        const ageMs = Date.now() - new Date(user.created_at).getTime()
        if (ageMs >= 0 && ageMs < 120_000) {
          const provider = user.app_metadata?.provider ?? 'unknown'
          void trackServerEvent('signup', user.id, provider)
        }
      }
      return response
    }
    return NextResponse.redirect(`${origin}/login?error=auth&reason=${encodeURIComponent(error.message)}`)
  }

  return NextResponse.redirect(`${origin}/login?error=auth&reason=no_code`)
}
