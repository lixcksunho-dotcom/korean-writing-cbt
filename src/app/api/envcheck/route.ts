import { NextResponse } from "next/server";

// 임시 진단용: 런타임 env 값에 BOM/비ASCII 문자가 있는지 char code로 점검.
// (anon 키는 공개값이라 안전. 확인 후 이 라우트는 삭제 예정)
export const dynamic = "force-dynamic";

function analyze(name: string, v: string | undefined) {
  if (v == null) return { name, present: false };
  const codes = Array.from(v).map((c) => c.charCodeAt(0));
  const bad = codes
    .map((c, i) => ({ i, c }))
    .filter((x) => x.c > 126 || x.c < 32);
  return {
    name,
    length: v.length,
    first12: codes.slice(0, 12),
    badChars: bad.slice(0, 10), // index와 charCode (예: {i:7,c:65279}=BOM)
  };
}

export async function GET() {
  return NextResponse.json({
    url: analyze("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    anon: analyze("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    service: analyze("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY),
    siteUrl: analyze("NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL),
  });
}
