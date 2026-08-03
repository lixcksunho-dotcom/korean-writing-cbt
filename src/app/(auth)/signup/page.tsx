"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle, Eye, EyeOff } from "lucide-react";
import LogoGlyph from "@/components/layout/LogoGlyph";
import GoogleButton from "@/components/ui/GoogleButton";
import { trackEvent } from "@/lib/analytics/trackEvent";
// 카카오는 비즈 앱 전환 후 재활성화 예정 (KakaoButton 컴포넌트는 유지)
// import KakaoButton from "@/components/ui/KakaoButton";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("비밀번호는 6자리 이상이어야 합니다."); return; }
    if (password !== confirmPassword) { setError("비밀번호가 일치하지 않습니다."); return; }
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        // 인증 메일의 확인 링크가 이 주소로 돌아오게 한다(없으면 Site URL=localhost로 감).
        // /auth/callback 이 code를 세션으로 교환 후 /dashboard 로 보낸다.
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message.includes("already registered") ? "이미 가입된 이메일입니다." : "회원가입 중 오류가 발생했습니다.");
      setLoading(false);
      return;
    }
    // 가입은 여기서 이미 끝났다. 인증 메일을 언제 누를지는 사람마다 달라서
    // /auth/callback 쪽 '생성 2분 이내' 판정으로는 대부분 놓친다(계정 48개 중 이벤트 4건이었다).
    trackEvent("signup", "email");
    if (data.session) { window.location.assign("/dashboard"); return; }
    setSuccess(true);
    setLoading(false);
  }

  const inputCls = "w-full bg-[#f8fafc] border-2 border-[#e2e8f0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1e3a5f] focus:bg-white transition-all placeholder:text-[#64748b]";

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(15,31,61,0.1)] border border-[#e2e8f0] p-10">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-black text-[#0f172a] mb-2">메일함을 확인해주세요</h2>
            <p className="text-[#64748b] text-sm leading-relaxed">
              <span className="font-semibold text-[#0f172a]">{email || "가입하신 이메일"}</span>로<br />인증 메일을 보냈어요. 링크를 누르면 바로 시작됩니다.
            </p>
            <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700 text-left leading-relaxed">
              💡 메일이 안 보이면 <b>스팸함</b>을 확인하거나, 1~2분 후 다시 확인해주세요.
            </div>
            <button onClick={() => window.location.assign("/login")}
              className="mt-5 w-full btn-primary text-white font-bold py-3.5 rounded-xl text-sm">
              인증 후 로그인하기
            </button>
            <p className="mt-3 text-xs text-[#64748b]">메일 인증이 번거롭다면 <button onClick={() => window.location.assign("/signup")} className="text-emerald-600 font-semibold hover:underline">구글로 다시 시작</button>하면 인증 없이 바로 이용할 수 있어요.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* 왼쪽 패널 */}
      <div className="hidden lg:flex lg:w-5/12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#080f1e] via-[#0f1f3d] to-[#1e3a5f]" />
        <div className="absolute top-1/3 -right-20 w-72 h-72 bg-[#d97706] rounded-full blur-3xl opacity-10" />
        <div className="relative flex flex-col justify-between p-10 w-full">
          <Link href="/" className="flex items-center gap-2.5 py-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#f59e0b] to-[#d97706] flex items-center justify-center shadow-lg shadow-[#d97706]/30">
              <LogoGlyph className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-white text-lg">실글패스</span>
          </Link>
          <div>
            <p className="text-white/40 text-sm mb-2">가입은 무료예요</p>
            <h2 className="text-3xl font-black text-white mb-4 leading-tight">
              CBT는 무료,<br />
              <span className="text-gradient-gold">AI 첨삭은 무료 체험!</span>
            </h2>
            <ul className="space-y-2.5">
              {["CBT 기출 모의고사 무료", "서술형 AI 첨삭 3회 무료 체험", "학습 기록 자동 저장"].map(t => (
                <li key={t} className="flex items-center gap-2 text-white/70 text-sm">
                  <span className="w-5 h-5 rounded-full bg-[#f59e0b]/20 flex items-center justify-center text-[#f59e0b] text-xs font-bold shrink-0">✓</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-white/30 text-xs">© 실글패스</p>
        </div>
      </div>

      {/* 오른쪽 폼 */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-[#f8fafc]">
        <div className="w-full max-w-md">
          <Link href="/" className="flex items-center justify-center gap-2 py-1 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#f59e0b] to-[#d97706] flex items-center justify-center">
              <LogoGlyph className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-[#0f172a] text-lg">실글패스</span>
          </Link>

          <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(15,31,61,0.1)] border border-[#e2e8f0] p-8">
            <h1 className="text-2xl font-black text-[#0f172a] mb-1 tracking-tight">회원가입</h1>
            <p className="text-[#64748b] text-sm mb-7">무료로 시작하세요</p>

            <GoogleButton />
            <p className="mt-2 text-center text-xs text-emerald-600 font-medium">✓ 가장 빠른 방법 · 인증 메일 없이 바로 시작</p>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#e2e8f0]" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs text-[#64748b]">또는 이메일로</span>
              </div>
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1.5">이름</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="홍길동" required className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1.5">이메일</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="example@email.com" required autoComplete="email" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1.5">비밀번호</label>
                <div className="relative">
                  <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="6자리 이상" required autoComplete="new-password" className={`${inputCls} pr-14`} />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 보기"}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-3.5 rounded-lg text-[#64748b] hover:text-[#334155] transition-colors">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1.5">비밀번호 확인</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="비밀번호를 다시 입력하세요" required className={inputCls} />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 flex items-center gap-2">
                  <span className="shrink-0">⚠</span>{error}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full btn-primary text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-60 mt-2">
                {loading ? "처리 중..." : "무료 회원가입"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[#64748b]">
              이미 계정이 있으신가요?{" "}
              <Link href="/login" className="text-[#1e3a5f] font-bold hover:underline">로그인</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
