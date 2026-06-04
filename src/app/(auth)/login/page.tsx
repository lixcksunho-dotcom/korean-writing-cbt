"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { FileText, Eye, EyeOff } from "lucide-react";
import GoogleButton from "@/components/ui/GoogleButton";
// 카카오는 비즈 앱 전환 후 재활성화 예정 (KakaoButton 컴포넌트는 유지)
// import KakaoButton from "@/components/ui/KakaoButton";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      setLoading(false);
      return;
    }
    // 세션 쿠키가 서버(미들웨어)에 확실히 전달되도록 전체 내비게이션 사용
    // (router.push는 소프트 내비게이션이라 첫 로그인 시 쿠키가 늦게 반영되어 /login으로 되튕길 수 있음)
    window.location.assign("/dashboard");
  }

  const inputCls = "w-full bg-[#f8fafc] border-2 border-[#e2e8f0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1e3a5f] focus:bg-white transition-all placeholder:text-[#94a3b8]";

  return (
    <div className="min-h-screen flex">
      {/* 왼쪽 패널 (데스크탑) */}
      <div className="hidden lg:flex lg:w-5/12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#080f1e] via-[#0f1f3d] to-[#1e3a5f]" />
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-[#2d5488] rounded-full blur-3xl opacity-30" />
        <div className="absolute bottom-1/4 right-0 w-64 h-64 bg-[#d97706] rounded-full blur-3xl opacity-10" />
        <div className="relative flex flex-col justify-between p-10 w-full">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#f59e0b] to-[#d97706] flex items-center justify-center shadow-lg shadow-[#d97706]/30">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-white text-lg">한국실용글쓰기</span>
          </Link>
          <div>
            <h2 className="text-3xl font-black text-white mb-4 leading-tight">
              합격을 위한<br />
              <span className="text-gradient-gold">최고의 도구</span>
            </h2>
            <ul className="space-y-2.5">
              {["기출문제 CBT 무료 제공", "AI 원고지 즉시 채점·첨삭", "항목별 상세 피드백"].map(t => (
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
          {/* 모바일 로고 */}
          <Link href="/" className="flex items-center justify-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#f59e0b] to-[#d97706] flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-[#0f172a] text-lg">한국실용글쓰기</span>
          </Link>

          <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(15,31,61,0.1)] border border-[#e2e8f0] p-8">
            <h1 className="text-2xl font-black text-[#0f172a] mb-1 tracking-tight">로그인</h1>
            <p className="text-[#64748b] text-sm mb-7">계정에 로그인하여 학습을 이어가세요</p>

            <GoogleButton />

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#e2e8f0]" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs text-[#94a3b8]">또는 이메일로</span>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1.5">이메일</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="example@email.com" required autoComplete="email"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1.5">비밀번호</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="비밀번호를 입력하세요" required autoComplete="current-password"
                    className={`${inputCls} pr-11`}
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#64748b] transition-colors">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 flex items-center gap-2">
                  <span className="shrink-0">⚠</span>{error}
                </div>
              )}

              <button
                type="submit" disabled={loading}
                className="w-full btn-primary text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-60 mt-2"
              >
                {loading ? "로그인 중..." : "로그인"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[#64748b]">
              계정이 없으신가요?{" "}
              <Link href="/signup" className="text-[#1e3a5f] font-bold hover:underline">
                무료 회원가입
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
