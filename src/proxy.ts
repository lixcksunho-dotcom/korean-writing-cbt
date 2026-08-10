import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { stripBom, SB_URL, SB_ANON } from "@/lib/supabase/sanitize";

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Supabase가 아직 설정되지 않은 경우 auth 체크 건너뜀
  if (!supabaseUrl || !supabaseUrl.startsWith("http") || !supabaseKey) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    SB_URL,
    SB_ANON,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll().map((c) => ({ ...c, value: stripBom(c.value) }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, stripBom(value))
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, stripBom(value), options)
          );
        },
      },
    }
  );

  // getSession()은 쿠키 값을 그대로 신뢰하므로 위조 가능.
  // getUser()는 Supabase Auth 서버에 토큰을 검증 요청하므로 안전함.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // /subscribe(상품·가격·환불 안내)는 비로그인도 볼 수 있어야 한다(간편결제 가맹 심사 요건 + 전환).
  //   → 미들웨어로 막지 않고, 실제 결제·발급이 필요한 하위 페이지(success·history)는 페이지에서 자체 인증한다.
  const protectedRoutes = ["/dashboard", "/cbt", "/manuscript"];
  // 정확한 경로 세그먼트로만 매칭한다. startsWith만 쓰면 /manuscript-guide(공개 안내글) 같은
  // 접두사가 겹치는 공개 페이지까지 로그인으로 튕겨 버린다.
  const isProtected = protectedRoutes.some(
    (r) => pathname === r || pathname.startsWith(r + "/")
  );

  if (isProtected && !user) {
    // 가려던 곳을 남긴다. 안 남기면 로그인 후 무조건 /dashboard로 가서, 방금 누른 것과
    // 다른 화면이 뜬다. 공개 학습자료 15곳이 "무료 CBT 모의고사"로 /cbt를 가리키는데
    // 그게 전부 여기로 들어온다 — 유입의 맨 앞에서 의도가 통째로 버려지고 있었다.
    const to = new URL("/login", request.url);
    to.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(to);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}

// 필요한 경로에만 돌린다.
//
// 예전엔 사실상 모든 요청에 걸려 있었다. 여기서 getUser()를 부르므로, 공개 페이지까지
// 인증 왕복을 한 번씩 더 치르게 된다 — 공개 페이지는 그럴 이유가 없다.
// 게다가 이 미들웨어는 배포 환경에서 실행된 적이 없어(next.config.ts의 root 참고)
// 넓은 matcher가 실제로 쓰인 적도 없다. 켜는 김에 범위를 맞춘다.
//
//   보호 경로   : 로그인 확인 + 가려던 곳(next) 기록
//   /login·/signup : 이미 로그인한 사람을 대시보드로
export const config = {
  matcher: ["/dashboard/:path*", "/cbt/:path*", "/manuscript", "/manuscript/:path*", "/login", "/signup"],
};
