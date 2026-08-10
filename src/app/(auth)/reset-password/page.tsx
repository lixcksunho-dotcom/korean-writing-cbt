"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff } from "lucide-react";
import LogoGlyph from "@/components/layout/LogoGlyph";

// 재설정 링크는 `#access_token=…&refresh_token=…&type=recovery` 형태로 여기에 떨어진다.
//
// 두 번 헛짚었다. 기록해 둔다.
//  1) /auth/callback(서버 라우트)을 거치게 했다 → 프래그먼트는 서버로 전송되지 않아
//     'no_code'로 튕겼다.
//  2) 클라이언트로 바로 보냈지만 supabase-js가 알아서 읽어 줄 거라 봤다 → 안 읽는다.
//     @supabase/ssr의 브라우저 클라이언트는 PKCE 흐름이라 암시적 흐름(#access_token)을
//     무시한다(실측: 프래그먼트는 도착하는데 세션 쿠키가 안 생긴다).
// 그래서 프래그먼트를 직접 읽어 setSession으로 세션을 세운다.
//
// 링크가 만료됐거나 이미 쓴 경우엔 토큰 자체가 없거나 거부된다. 그때 빈 폼을 보여 주면
// 새 비밀번호를 넣고 눌렀는데 아무 일도 안 일어난다 — 무엇이 잘못됐는지 알 수 없다.
// 그래서 '다시 받으세요'로 안내한다.
const inputCls =
  "w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-3.5 text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:outline-none focus:border-[#1e3a5f] focus:bg-white transition-colors";

const MIN_LENGTH = 6;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState<"checking" | "ok" | "expired">("checking");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let alive = true;

    (async () => {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const access_token = hash.get("access_token");
      const refresh_token = hash.get("refresh_token");

      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        // 주소창에서 토큰을 지운다 — 남겨 두면 새로고침·공유 시 그대로 노출된다.
        window.history.replaceState(null, "", window.location.pathname);
        if (!alive) return;
        setReady(error ? "expired" : "ok");
        return;
      }

      // 프래그먼트가 없다면 이미 로그인한 사람이 직접 들어온 경우일 수 있다.
      const { data } = await supabase.auth.getUser();
      if (alive) setReady(data.user ? "ok" : "expired");
    })();

    return () => { alive = false };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < MIN_LENGTH) {
      setError(`비밀번호는 ${MIN_LENGTH}자 이상이어야 합니다.`);
      return;
    }
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError("비밀번호를 바꾸지 못했어요. 링크가 만료됐을 수 있으니 다시 받아 주세요.");
      return;
    }
    // 이미 로그인된 상태이므로 바로 학습으로 보낸다.
    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <Link href="/" aria-label="실글패스 홈으로" className="inline-flex items-center gap-2">
            <LogoGlyph className="h-8 w-8" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_4px_20px_rgba(15,31,61,0.08)] p-7">
          {ready === "checking" ? (
            <p className="text-sm text-[#64748b] text-center py-6">확인하는 중...</p>
          ) : ready === "expired" ? (
            <div className="text-center">
              <h1 className="text-lg font-black text-[#0f172a] mb-2">링크가 만료됐어요</h1>
              <p className="text-sm text-[#64748b] leading-relaxed mb-6">
                재설정 링크는 한 번만, 정해진 시간 안에서만 쓸 수 있어요. 새로 받아 주세요.
              </p>
              <Link href="/forgot-password" className="w-full btn-primary flex items-center justify-center text-white font-bold py-3.5 rounded-xl text-sm">
                링크 다시 받기
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-black text-[#0f172a] mb-1">새 비밀번호 정하기</h1>
              <p className="text-sm text-[#64748b] mb-5">앞으로 이 비밀번호로 로그인합니다.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="new-password" className="block text-xs font-semibold text-[#334155] mb-1.5">새 비밀번호</label>
                  <div className="relative">
                    <input
                      id="new-password"
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder={`${MIN_LENGTH}자 이상`}
                      required
                      minLength={MIN_LENGTH}
                      autoComplete="new-password"
                      className={`${inputCls} pr-14`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 보기"}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-3.5 rounded-lg text-[#64748b] hover:text-[#334155] transition-colors"
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                    <span className="shrink-0">⚠</span>{error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-60"
                >
                  {loading ? "바꾸는 중..." : "비밀번호 바꾸기"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
