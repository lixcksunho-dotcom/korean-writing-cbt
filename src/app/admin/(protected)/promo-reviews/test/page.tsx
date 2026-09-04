import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { blogRuleSummary, judgeSelfTest } from './actions'
import BlogRuleTester from './BlogRuleTester'
import EventPopupPreview from './EventPopupPreview'

export const dynamic = 'force-dynamic'

export const metadata = { title: '블로그 이벤트 판정 실험실' }

// 실제 신청 화면과 같은 판정을 돌려 보는 자리. 저장도 지급도 하지 않는다.
export default async function BlogRuleTestPage() {
  const [rules, self] = await Promise.all([blogRuleSummary(), judgeSelfTest()])

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

      {/* 판정기는 네이버 HTML 모양에 기대고 있다. 저쪽이 바뀌면 우리 추출기가 조용히
          빈 본문을 읽고 **모든 신청이 조건 미달로 떨어진다** — 화면도 빌드도 멀쩡해서
          '신청이 안 들어온다'와 구분이 안 된다. 그래서 열 때마다 표본으로 확인한다. */}
      {self.passes && self.catchesMissingDisclosure ? (
        <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-900">
          판정기 자가 점검 통과 — 조건을 갖춘 표본은 통과시키고, 광고 표시를 뺀 표본은 그 규칙만 잡아냅니다.
        </p>
      ) : (
        <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-xs text-red-900">
          <p className="font-bold">판정기 자가 점검 실패 — 신청자 글이 아니라 판정기를 봐야 합니다.</p>
          {!self.passes && (
            <p className="mt-1">
              통과해야 하는 표본이 떨어졌습니다: {self.failedRules.join(' / ') || '(사유 없음)'}
            </p>
          )}
          {!self.catchesMissingDisclosure && (
            <p className="mt-1">광고 표시를 뺀 표본을 제대로 잡아내지 못합니다.</p>
          )}
          <p className="mt-1">네이버가 본문 구조를 바꿨거나 추출기가 깨졌을 수 있습니다.</p>
        </div>
      )}

      <ul className="mb-5 space-y-1 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4 text-sm text-[#334155]">
        <li>· 제목: {rules.titleKeywords.join(' 또는 ')}</li>
        <li>· 본문: {rules.bodyKeywords.join(', ')} <b>전부</b></li>
        <li>· 사진 {rules.minImages}장 이상 · 본문 {rules.minChars.toLocaleString('ko-KR')}자 이상</li>
        <li>· 스스로 묻고 답한 곳 {rules.minQa}번 이상</li>
        <li>· 광고 표시 문구가 글 첫머리에</li>
      </ul>

      <EventPopupPreview />

      <BlogRuleTester sample={rules.disclosureSample} />
    </div>
  )
}
