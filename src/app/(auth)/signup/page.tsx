"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { FileText, CheckCircle, Eye, EyeOff } from "lucide-react";
import GoogleButton from "@/components/ui/GoogleButton";
// 카카오는 비즈 앱 전환 후 재활성화 예정 (KakaoButton 컴포넌트는 유지)
// import KakaoButton from "@/components/ui/KakaoButton";

export default function SignupPage() {
  const router = useRouter();
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
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    if (error) {
      setError(error.message.includes("already registered") ? "이미 가입된 이메일입니다." : "회원가입 중 오류가 발생했습니다.");
      setLoading(false);
      return;
    }
    if (data.session) { router.push("/dashboard"); router.refresh(); return; }
    setSuccess(true);
    setLoading(false);
  }

  const inputCls = "w-full bg-[#f8fafc] border-2 border-[#e2e8f0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1e3a5f] focus:bg-white transition-all placeholder:text-[#94a3b8]";

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(15,31,61,0.1)] border border-[#e2e8f0] p-10">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-black text-[#0f172a] mb-2">가입 완료!</h2>
            <p className="text-[#64748b] text-sm leading-relaxed">
              이메일로 인증 메일을 발송했습니다.<br />인증 후 로그인해주세요.
            </p>
            <button onClick={() => router.push("/login")}
              className="mt-6 w-full btn-primary text-white font-bold py-3.5 rounded-xl text-sm">
              로그인 하러 가기
            </button>
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
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#f59e0b] to-[#d97706] flex items-center justify-center shadow-lg shadow-[#d97706]/30">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-white text-lg">한국실용글쓰기</span>
          </Link>
          <div>
            <p className="text-white/40 text-sm mb-2">무료로 시작하세요</p>
            <h2 className="text-3xl font-black text-white mb-4 leading-tight">
              지금 가입하면<br />
              <span className="text-gradient-gold">모든 기능 무료!</span>
            </h2>
            <ul className="space-y-2.5">
              {["CBT 기출문제 전체 무료", "AI 원고지 채점 체험", "학습 기록 자동 저장"].map(t => (
                <li key={t} className="flex items-center gap-2 text-white/70 text-sm">
                  <span className="w-5 h-5 rounded-full bg-[#f59e0b]/20 flex items-center justify-center text-[#f59e0b] text-xs font-bold shrink-0">✓</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-white/30 text-xs">© 2024 한국실용글쓰기 CBT</p>
        </div>
      </div>

      {/* 오른쪽 폼 */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-[#f8fafc]">
        <div className="w-full max-w-md">
          <Link href="/" className="flex items-center justify-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#f59e0b] to-[#d97706] flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-[#0f172a] text-lg">한국실용글쓰기</span>
          </Link>

          <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(15,31,61,0.1)] border border-[#e2e8f0] p-8">
            <h1 className="text-2xl font-black text-[#0f172a] mb-1 tracking-tight">회원가입</h1>
            <p className="text-[#64748b] text-sm mb-7">무료로 시작하세요</p>

            <GoogleButton />

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#e2e8f0]" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs text-[#94a3b8]">또는 이메일로</span>
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
                    placeholder="6자리 이상" required autoComplete="new-password" className={`${inputCls} pr-11`} />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#64748b] transition-colors">
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
