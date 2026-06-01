import Link from 'next/link'
import { XCircle } from 'lucide-react'

export default async function FailPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; code?: string; reason?: string }>
}) {
  const { message, code } = await searchParams

  return (
    <div className="max-w-md mx-auto py-16 text-center">
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_4px_20px_rgba(15,31,61,0.08)] p-10">
        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
          <XCircle className="h-10 w-10 text-red-400" />
        </div>
        <h1 className="text-2xl font-black text-[#0f172a] mb-2">결제 실패</h1>
        <p className="text-[#64748b] text-sm mb-2">결제를 완료하지 못했습니다.</p>
        {message && (
          <p className="text-xs text-[#94a3b8] mb-6">{message} {code ? `(${code})` : ''}</p>
        )}
        <div className="space-y-3 mt-8">
          <Link href="/subscribe" className="w-full btn-primary flex items-center justify-center text-white font-bold py-3.5 rounded-xl text-sm">
            다시 시도하기
          </Link>
          <Link href="/dashboard" className="block text-sm text-[#64748b] hover:text-[#334155] transition-colors">
            대시보드로 이동
          </Link>
        </div>
      </div>
    </div>
  )
}
