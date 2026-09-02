'use client'

import { useState, useTransition } from 'react'
import { PenLine, CheckCircle2, AlertCircle, Check, X } from 'lucide-react'
import { submitBlogReview } from '@/app/(main)/subscribe/blog-review-actions'
import { TITLE_KEYWORDS, BODY_KEYWORDS, MIN_IMAGES, MIN_CHARS, REWARD_DAYS, DISCLOSURE_SAMPLE, type RuleCheck } from '@/lib/blogPromoRules'
import DisclosureCopyBox from '@/components/subscribe/DisclosureCopyBox'

// 블로그에 홍보 글을 쓰면 이용권을 드리는 신청 화면.
// 조건을 '내고 나서' 알려 주면 늦다 — 쓰기 전에 보이도록 폼 위에 그대로 적는다.
export default function BlogReviewForm({ ownerCode }: { ownerCode: string }) {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState<{ autoPassed: boolean; granted: boolean; checks: RuleCheck[]; note: string } | null>(null)
  const [error, setError] = useState('')
  const [pending, start] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setResult(null)
    start(async () => {
      const r = await submitBlogReview(url)
      if (r.ok) setResult({ autoPassed: r.autoPassed, granted: r.granted, checks: r.checks, note: r.note })
      else setError(r.message)
    })
  }

  return (
    <section className="rounded-xl border border-[#e2e8f0] bg-white p-5">
      <div className="flex items-center gap-1.5 mb-1.5">
        <PenLine className="h-4 w-4 text-[#d97706]" aria-hidden="true" />
        <h3 className="text-sm font-bold text-[#0f172a]">블로그에 소개하고 이용권 {REWARD_DAYS}일 받기</h3>
      </div>
      <p className="text-xs text-[#64748b] mb-3.5">
        블로그에 실글패스 후기를 올리고 글 주소를 넣어 주세요. 확인되면 이용권을 드립니다.
      </p>

      <ol className="mb-4 space-y-2 rounded-lg bg-[#f8fafc] p-3.5 text-xs text-[#334155]">
        <li className="flex gap-2">
          <span className="font-bold text-[#d97706]">1</span>
          {/* join에 태그를 섞으면 React가 글자로 그려 '실글패스&lt;/b&gt; 또는'처럼 보인다 */}
          <span>
            제목에{' '}
            {TITLE_KEYWORDS.map((k, i) => (
              <span key={k}>
                {i > 0 && ' 또는 '}
                <b>{k}</b>
              </span>
            ))}
            {' '}중 하나를 넣어 주세요.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-[#d97706]">2</span>
          <span>
            본문에 다음 낱말이 <b>모두</b> 들어가야 해요:{' '}
            {BODY_KEYWORDS.map(k => (
              <span key={k} className="mr-1 inline-block rounded bg-white border border-[#e2e8f0] px-1.5 py-0.5 font-semibold">{k}</span>
            ))}
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-[#d97706]">3</span>
          <span>
            화면 사진을 <b>{MIN_IMAGES}장 이상</b> 넣고, 본문을{' '}
            <b>{MIN_CHARS.toLocaleString('ko-KR')}자 이상</b> 써 주세요(공백 제외).
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-[#d97706]">4</span>
          <span>
            아래 두 문구를 <b>복사해서 그대로</b> 붙여 주세요 — 광고 표시(법정 의무)와
            본인 확인용입니다.
          </span>
        </li>
      </ol>

      <div className="mb-4">
        <DisclosureCopyBox sample={DISCLOSURE_SAMPLE} ownerCode={ownerCode} />
      </div>

      {result ? (
        <div className={`rounded-lg border p-4 ${result.autoPassed ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`} role="status">
          <p className={`flex items-center gap-1.5 text-sm font-bold ${result.autoPassed ? 'text-emerald-900' : 'text-amber-900'}`}>
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {result.granted ? '이용권이 지급됐어요' : '신청이 접수됐어요'}
          </p>
          <p className={`mt-1 text-xs ${result.autoPassed ? 'text-emerald-800' : 'text-amber-800'}`}>{result.note}</p>
          {result.checks.length > 0 && (
            <ul className="mt-2.5 space-y-1">
              {result.checks.map(c => (
                <li key={c.rule} className="flex items-start gap-1.5 text-xs">
                  {c.ok
                    ? <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 mt-0.5" aria-hidden="true" />
                    : <X className="h-3.5 w-3.5 shrink-0 text-red-600 mt-0.5" aria-hidden="true" />}
                  <span className={c.ok ? 'text-[#475569]' : 'text-red-700'}>
                    {c.rule} <span className="text-[#64748b]">— {c.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="blog-url" className="sr-only">블로그 글 주소</label>
          <input
            id="blog-url"
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://blog.naver.com/…/글주소"
            className="min-w-0 flex-1 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2.5 text-sm text-[#0f172a] placeholder:text-[#64748b] focus:outline-none focus:border-[#1e3a5f] focus:bg-white transition-colors"
          />
          <button type="submit" disabled={pending || !url.trim()} className="btn-gold shrink-0 px-5 py-2.5 text-sm disabled:opacity-50">
            {pending ? '확인 중…' : '신청하기'}
          </button>
        </form>
      )}

      {error && (
        <p className="mt-2.5 flex items-start gap-1.5 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </section>
  )
}
