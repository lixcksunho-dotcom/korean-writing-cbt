import Navbar from "@/components/layout/Navbar";
import SiteFooter from "@/components/layout/SiteFooter";
import ScheduleModal from "@/components/schedule/ScheduleModal";
import { createClient } from "@/lib/supabase/server";
import { getActiveProgram } from "@/lib/programContext";
import { getProgram } from "@/lib/programs";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userEmail = user?.email ?? "";

  // 활성 모드에 따라 네비 브랜드(이름·색)를 바꾼다 — 실글패스 ↔ 한국어패스
  const program = await getActiveProgram();
  const cfg = getProgram(program);

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar userEmail={userEmail} brandName={cfg.serviceName} brandGradient={cfg.logoGradient} showManuscript={cfg.hasManuscript} />
      {/* pb-24: 우하단 플로팅 버튼이 마지막 카드의 CTA를 덮지 않도록 여백 확보 */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[200] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2.5 focus:text-sm focus:font-bold focus:text-[#0f172a] focus:shadow-lg focus:outline focus:outline-2 focus:outline-[#1e3a5f]"
      >
        본문 바로가기
      </a>
      <main id="main" tabIndex={-1} className="flex-1 max-w-6xl w-full mx-auto px-4 pt-8 pb-24">
        {children}
      </main>
      <SiteFooter />
      {/* 시험일정 팝업 — 활성 모드에 맞는 일정(실글=klata / KBS=kbskorean) */}
      <ScheduleModal program={program} />
    </div>
  );
}
