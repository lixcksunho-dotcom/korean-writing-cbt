'use client'

import { useState, useTransition } from 'react'
import { Check, X, FlaskConical, Loader2 } from 'lucide-react'
import { runBlogRuleTest, type RuleTestResult } from './actions'

export default function BlogRuleTester({ sample }: { sample: string }) {
  const [url, setUrl] = useState('')
  const [code, setCode] = useState('')
  const [res, setRes] = useState<RuleTestResult | null>(null)
  const [pending, start] = useTransition()

  function run() {
    if (!url.trim()) return
    start(async () => setRes(await runBlogRuleTest(url, code)))
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#e2e8f0] bg-white p-4">
        <label htmlFor="test-url" className="mb-1 block text-xs font-bold text-[#334155]">글 주소</label>
        <div className="flex flex-wrap gap-2">
          <input
            id="test-url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') run() }}
            placeholder="https://blog.naver.com/.../글주소"
            className="min-w-0 flex-1 rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm"
          />
          <button
            onClick={run}
            disabled={pending}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FlaskConical className="h-4 w-4" aria-hidden="true" />}
            {pending ? '읽는 중' : '판정 돌리기'}
          </button>
        </div>

        <label htmlFor="test-code" className="mb-1 mt-3 block text-xs font-bold text-[#334155]">
          본인 확인 코드 <span className="font-normal text-[#94a3b8]">(비우면 코드 검사를 건너뜁니다)</span>
        </label>
        <input
          id="test-code"
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder="SGP-XXXXXX"
          className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 font-mono text-sm"
        />
      </div>

      {res && !res.ok && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{res.message}</p>
      )}

      {res?.ok && (
        <div className="space-y-3">
          <div
            className={`rounded-xl border p-4 text-sm font-bold ${
              res.allPassed ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'
            }`}
          >
            {res.allPassed ? '모든 조건 통과 — 실제 신청이었다면 자동 지급됩니다' : '조건 미달 — 실제 신청이었다면 사람이 봐야 합니다'}
            <p className="mt-1 text-xs font-normal">여기서는 아무것도 저장·지급되지 않습니다.</p>
          </div>

          <dl className="grid grid-cols-2 gap-2 rounded-xl border border-[#e2e8f0] bg-white p-4 text-sm sm:grid-cols-4">
            {[
              ['제목', res.title],
              ['사진', `${res.photos}장`],
              ['본문', `${res.chars.toLocaleString('ko-KR')}자`],
              ['읽은 주소', res.via],
            ].map(([k, v]) => (
              <div key={k} className="min-w-0">
                <dt className="text-xs text-[#94a3b8]">{k}</dt>
                <dd className="truncate font-semibold text-[#0f172a]" title={v}>{v}</dd>
              </div>
            ))}
          </dl>

          <ul className="space-y-1.5 rounded-xl border border-[#e2e8f0] bg-white p-4">
            {res.checks.map(c => (
              <li key={c.rule} className="flex items-start gap-2 text-sm">
                {c.ok
                  ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                  : <X className="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />}
                <span className={c.ok ? 'text-[#334155]' : 'font-semibold text-[#0f172a]'}>
                  {c.rule}
                  <span className="ml-1.5 font-normal text-[#64748b]">— {c.detail}</span>
                </span>
              </li>
            ))}
          </ul>

          <details className="rounded-xl border border-[#e2e8f0] bg-white p-4">
            <summary className="cursor-pointer text-xs font-bold text-[#334155]">
              판정기가 읽은 본문 앞부분 (조건이 왜 걸렸는지 확인용)
            </summary>
            <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-[#64748b]">{res.excerpt}</p>
          </details>
        </div>
      )}

      <p className="rounded-xl bg-[#f8fafc] p-3 text-xs leading-relaxed text-[#64748b]">
        광고 표시 문구 예시 — <span className="font-mono text-[#334155]">{sample}</span>
      </p>
    </div>
  )
}
