import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Shield, BookOpen, ArrowLeft, Star, LayoutDashboard, Users, Flag, CreditCard, BarChart3 } from 'lucide-react'

const ADMIN_NAV = [
  { href: '/admin', label: '대시보드', icon: LayoutDashboard },
  { href: '/admin/members', label: '회원 관리', icon: Users },
  { href: '/admin/reviews', label: '후기 관리', icon: Star },
  { href: '/admin/questions', label: '문제 관리', icon: BookOpen },
  { href: '/admin/reports', label: '신고', icon: Flag },
  { href: '/admin/payments', label: '결제 복구', icon: CreditCard },
  { href: '/admin/traffic', label: '방문 통계', icon: BarChart3 },
  { href: '/dashboard', label: '서비스로', icon: ArrowLeft },
]

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
        <div className="max-w-5xl mx-auto px-4 py-1 flex flex-col sm:flex-row sm:h-14 sm:items-center sm:justify-between">
          <Link href="/admin" className="flex items-center gap-2 font-bold py-2.5 hover:text-amber-300 transition-colors">
            <Shield className="h-4 w-4 text-amber-400" />
            관리자
          </Link>
          {/* 좁은 폭에선 8개가 한 줄에 안 들어가 '방문 통계'와 '서비스로'가 화면 밖으로 나가 있었다 */}
          <nav className="flex flex-wrap items-center gap-x-4">
            {ADMIN_NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-1.5 py-3 text-sm text-gray-300 hover:text-white transition-colors"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
