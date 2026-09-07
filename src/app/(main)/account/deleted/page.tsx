import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

export const metadata: Metadata = { title: '탈퇴 완료', robots: { index: false } }

// 탈퇴 직후 도착하는 화면. 로그인은 이미 끊겨 있다.
export default function AccountDeletedPage() {
  return (
    <div className="max-w-xl mx-auto text-center py-12">
      <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-4" aria-hidden="true" />
      <h1 className="text-2xl font-black text-[#0f172a] mb-2">탈퇴가 완료됐어요</h1>
      <p className="text-sm text-[#475569] leading-relaxed mb-8">
        로그인 정보와 학습 기록을 지웠습니다. 결제 기록은 법령에 따라 5년간 보관하되 누구의 것인지는 끊어 두었어요.
        그동안 함께해 주셔서 고맙습니다.
      </p>
      <Link href="/" className="inline-flex min-h-[44px] items-center px-6 rounded-xl bg-[#1e3a5f] text-white text-sm font-bold">
        첫 화면으로
      </Link>
    </div>
  )
}
