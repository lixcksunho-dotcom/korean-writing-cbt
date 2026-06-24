import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { stripBom } from '@/lib/supabase/sanitize'

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
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return response
    }
    return NextResponse.redirect(`${origin}/login?error=auth&reason=${encodeURIComponent(error.message)}`)
  }

  return NextResponse.redirect(`${origin}/login?error=auth&reason=no_code`)
}
