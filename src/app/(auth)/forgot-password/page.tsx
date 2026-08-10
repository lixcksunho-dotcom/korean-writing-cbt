"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { MailCheck } from "lucide-react";
import LogoGlyph from "@/components/layout/LogoGlyph";

// 비밀번호를 잊은 사람을 위한 화면. 이게 없어서 이메일로 가입한 사람은 비밀번호를
// 잊으면 계정을 영영 못 썼다 — 결제한 사람이라면 산 것을 못 쓰는 상태가 된다.
//
// 재설정 링크는 /reset-password 로 바로 보낸다.
//
// /auth/callback 을 거치게 했다가 실패했다: 복구 링크는 `?code=`(PKCE)가 아니라
// `#access_token=…&type=recovery`(프래그먼트)로 돌아온다. 프래그먼트는 서버로
// 전송되지 않으므로 서버 라우트인 /auth/callback 은 그걸 볼 수 없고 'no_code'로 튕긴다.
// 프래그먼트는 브라우저에서만 읽을 수 있어 클라이언트 화면이 직접 받아야 한다.
// (/reset-password 가 Supabase 허용목록에 있는지는 generate_link 로 확인했다.)
const inputCls =
  "w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-3.5 text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:outline-none focus:border-[#1e3a5f] focus:bg-white transition-colors";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    // 그 메일로 가입한 계정이 있는지는 알려 주지 않는다. 알려 주면 어떤 주소가
    // 가입돼 있는지 확인하는 통로가 된다. 보냈다는 안내는 성공·실패 모두 같다.
    if (error && !/rate limit|too many/i.test(error.message)) {
      setSent(true);
      return;
    }
    if (error) {
      setError("잠시 후 다시 시도해 주세요. 요청이 너무 잦습니다.");
      return;
    }
    setSent(true);
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
          {sent ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <MailCheck className="h-7 w-7 text-emerald-600" aria-hidden />
              </div>
              <h1 className="text-lg font-black text-[#0f172a] mb-2">메일을 보냈어요</h1>
              <p className="text-sm text-[#64748b] leading-relaxed mb-6">
                가입된 주소라면 비밀번호를 다시 정하는 링크가 도착합니다.
                메일이 안 보이면 스팸함도 확인해 주세요.
              </p>
              <Link href="/login" className="w-full btn-primary flex items-center justify-center text-white font-bold py-3.5 rounded-xl text-sm">
                로그인으로 돌아가기
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-black text-[#0f172a] mb-1">비밀번호 재설정</h1>
              <p className="text-sm text-[#64748b] mb-5">
                가입하신 이메일을 적어 주시면 다시 정할 수 있는 링크를 보내 드려요.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="forgot-email" className="block text-xs font-semibold text-[#334155] mb-1.5">이메일</label>
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    required
                    autoComplete="email"
                    className={inputCls}
                  />
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
                  {loading ? "보내는 중..." : "재설정 링크 받기"}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-[#64748b]">
                구글로 가입하셨나요?{" "}
                <Link href="/login" className="text-[#1e3a5f] font-bold hover:underline">
                  구글로 로그인
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
