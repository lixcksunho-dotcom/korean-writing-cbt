import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Shield, BookOpen, ArrowLeft, Star, LayoutDashboard, Users, Flag } from 'lucide-react'

// 관리자 전용 보호 영역. 권한이 없으면 전용 로그인(/admin/login)으로 보낸다.
export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
  if (!adminEmails.includes(user.email ?? '')) redirect('/admin/login?error=forbidden')

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-900 text-white">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2 font-bold hover:text-amber-300 transition-colors">
            <Shield className="h-4 w-4 text-amber-400" />
            관리자
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/admin" className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition-colors">
              <LayoutDashboard className="h-4 w-4" />
              대시보드
            </Link>
            <Link href="/admin/members" className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition-colors">
              <Users className="h-4 w-4" />
              회원 관리
            </Link>
            <Link href="/admin/reviews" className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition-colors">
              <Star className="h-4 w-4" />
              후기 관리
            </Link>
            <Link href="/admin/questions" className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition-colors">
              <BookOpen className="h-4 w-4" />
              문제 관리
            </Link>
            <Link href="/admin/reports" className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition-colors">
              <Flag className="h-4 w-4" />
              신고
            </Link>
            <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition-colors">
              <ArrowLeft className="h-4 w-4" />
              서비스로
            </Link>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
