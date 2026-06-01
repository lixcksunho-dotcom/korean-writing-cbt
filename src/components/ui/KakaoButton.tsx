"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function KakaoButton() {
  const [loading, setLoading] = useState(false);

  async function handleKakaoLogin() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // 비즈 앱이 아니면 카카오 이메일(account_email) 동의항목을 못 켜서
        // 기본 요청 시 KOE205가 발생함. 닉네임만 요청해 이 문제를 피한다.
        scopes: "profile_nickname",
      },
    });
  }

  return (
    <button
      onClick={handleKakaoLogin}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 rounded-xl py-3 text-sm font-medium text-[#3C1E1E] bg-[#FEE500] hover:brightness-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <svg className="animate-spin h-5 w-5 text-[#3C1E1E]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#3C1E1E" aria-hidden="true">
          <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.79 1.86 5.236 4.65 6.61-.205.74-.74 2.68-.847 3.096-.133.515.188.508.397.37.164-.11 2.6-1.766 3.66-2.488.69.102 1.405.156 2.14.156 5.523 0 10-3.477 10-7.744C22 6.477 17.523 3 12 3z" />
        </svg>
      )}
      카카오로 계속하기
    </button>
  );
}
