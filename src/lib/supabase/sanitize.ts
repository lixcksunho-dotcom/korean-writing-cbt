// 쿠키/헤더 값에 섞인 BOM(U+FEFF)·제로폭·제어문자를 제거.
// 이런 문자가 ByteString 변환(Set-Cookie/헤더)에서 "value greater than 255" 오류를 일으켜
// 구글 로그인 콜백(exchangeCodeForSession)이 실패하고 /login으로 되튕기던 문제를 막는다.
export function stripBom(s: string | undefined | null): string {
  if (!s) return "";
  let out = "";
  for (const ch of s) {
    const c = ch.charCodeAt(0);
    if (c === 0xfeff || c === 0xfffe || c === 0x200b) continue; // BOM/zero-width
    if (c < 0x20 && c !== 0x09 && c !== 0x0a && c !== 0x0d) continue; // C0 제어(탭/개행 제외)
    if (c >= 0x7f && c <= 0x9f) continue; // DEL/C1 제어
    out += ch;
  }
  return out;
}

// Supabase 환경변수에 섞인 BOM/제어문자를 제거한 안전한 값.
// 런타임 env(서버)나 인라인(클라)에 BOM이 있어도 ByteString 헤더 오류를 막는다.
export const SB_URL = stripBom(process.env.NEXT_PUBLIC_SUPABASE_URL);
export const SB_ANON = stripBom(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
