import Navbar from "@/components/layout/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userEmail = user?.email ?? "";

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar userEmail={userEmail} />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        {children}
      </main>
      <footer className="bg-[#080f1e] text-white/30 text-center text-xs py-5">
        © 2024 한국실용글쓰기 CBT · 문의: support@kptest.cloud
      </footer>
    </div>
  );
}
