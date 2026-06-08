"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { BookOpen, LayoutDashboard, Menu, X, LogOut, PenLine, Sparkles, ListChecks } from "lucide-react";
import LogoGlyph from "@/components/layout/LogoGlyph";

const navItems = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/cbt", label: "CBT 문제풀기", icon: BookOpen },
  { href: "/practice", label: "유형별 연습", icon: ListChecks },
  { href: "/manuscript", label: "원고지 채점", icon: PenLine },
];

export default function Navbar({ userEmail = "" }: { userEmail?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="bg-[#0f1f3d]/95 backdrop-blur-md text-white shadow-[0_1px_0_rgba(255,255,255,0.08)] sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* 로고 */}
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#f59e0b] to-[#d97706] flex items-center justify-center shadow-lg shadow-[#d97706]/30">
              <LogoGlyph className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-white hidden sm:block tracking-tight">실글패스</span>
            <span className="font-bold text-white sm:hidden tracking-tight">실글패스</span>
          </Link>

          {/* 데스크탑 메뉴 */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    active
                      ? "text-white bg-white/12"
                      : "text-white/60 hover:text-white hover:bg-white/8"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  {active && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#f59e0b]" />
                  )}
                </Link>
              );
            })}
            <div className="w-px h-5 bg-white/10 mx-1" />
            <Link
              href="/subscribe"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-[#d97706] to-[#f59e0b] text-white shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30 transition-all"
            >
              <Sparkles className="h-3.5 w-3.5" />
              구독
            </Link>
            <div className="w-px h-5 bg-white/10 mx-1" />
            {userEmail && (
              <span className="text-xs text-white/40 max-w-[140px] truncate hidden xl:block">
                {userEmail}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white/50 hover:text-white hover:bg-white/8 transition-all"
            >
              <LogOut className="h-4 w-4" />
              로그아웃
            </button>
          </div>

          {/* 모바일 햄버거 */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* 모바일 메뉴 */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#0f1f3d]">
          <div className="px-4 py-3 space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm font-medium transition-colors",
                  pathname.startsWith(href)
                    ? "bg-white/12 text-white"
                    : "text-white/60 hover:bg-white/8 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
            {userEmail && (
              <div className="px-3 py-2 text-xs text-white/30 truncate border-t border-white/10 mt-1 pt-3">
                {userEmail}
              </div>
            )}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm font-medium text-white/50 hover:bg-white/8 hover:text-white transition-colors"
            >
              <LogOut className="h-4 w-4" />
              로그아웃
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
