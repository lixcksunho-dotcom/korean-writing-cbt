"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

// 모바일에서 히어로를 지나 스크롤하면 하단에 고정 노출되는 전환 CTA.
// 모바일 비중이 큰 시험 준비생 특성상 상시 노출 CTA가 가입 전환을 끌어올린다.
export default function StickyMobileCTA() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      // 최하단(푸터)에서는 숨겨 콘텐츠·약관 링크를 가리지 않는다.
      const nearBottom =
        window.innerHeight + y >= document.documentElement.scrollHeight - 140;
      setShow(y > 480 && !nearBottom);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      className={`sm:hidden fixed inset-x-0 bottom-0 z-40 transition-transform duration-300 ${
        show ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-3 mb-3 flex items-center gap-3 rounded-2xl border border-[#e2e8f0] bg-white/95 backdrop-blur-md px-4 py-3 shadow-[0_-2px_24px_rgba(15,31,61,0.12)]">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-black text-[#0f172a] leading-tight">CBT 무료 · AI 첨삭 무료 체험</p>
          <p className="text-[11px] text-[#64748b] leading-tight">가입만 하면 바로 시작 · 자동결제 없음</p>
        </div>
        <Link
          href="/signup"
          className="btn-gold shrink-0 inline-flex items-center gap-1 font-bold px-5 py-3 rounded-xl text-sm"
        >
          무료 시작 <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
