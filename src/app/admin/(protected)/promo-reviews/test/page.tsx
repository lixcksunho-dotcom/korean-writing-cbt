import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { blogRuleSummary } from './actions'
import BlogRuleTester from './BlogRuleTester'

export const dynamic = 'force-dynamic'

export const metadata = { title: '블로그 이벤트 판정 실험실' }

// 실제 신청 화면과 같은 판정을 돌려 보는 자리. 저장도 지급도 하지 않는다.
export default async function BlogRuleTestPage() {
  const rules = await blogRuleSummary()

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/admin/promo-reviews" className="mb-4 inline-flex items-center gap-1.5 text-sm text-[#64748b] hover:text-[#1e3a5f]">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        홍보 신청 목록으로
      </Link>

      <h1 className="text-2xl font-black text-[#0f172a]">블로그 이벤트 판정 실험실</h1>
      <p className="mt-1 mb-5 text-sm text-[#64748b]">
        아무 글 주소나 넣어 판정을 돌려 봅니다. 접수도 지급도 되지 않으므로 마음껏 실험해도 됩니다.
      </p>

      <ul className="mb-5 space-y-1 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4 text-sm text-[#334155]">
        <li>· 제목: {rules.titleKeywords.join(' 또는 ')}</li>
        <li>· 본문: {rules.bodyKeywords.join(', ')} <b>전부</b></li>
        <li>· 사진 {rules.minImages}장 이상 · 본문 {rules.minChars.toLocaleString('ko-KR')}자 이상</li>
        <li>· 광고 표시 문구가 글 첫머리에 · 본인 확인 코드가 본문에</li>
      </ul>

      <BlogRuleTester sample={rules.disclosureSample} />
    </div>
  )
}
