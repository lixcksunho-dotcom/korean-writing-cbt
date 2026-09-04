'use client'

import { useState, useTransition } from 'react'
import { Check, X, FlaskConical, Loader2 } from 'lucide-react'
import { runBlogRuleTest, runBlogRuleTestOnHtml, type RuleTestResult } from './actions'
import DisclosureImage from '@/components/subscribe/DisclosureImage'

export default function BlogRuleTester({ sample }: { sample: string }) {
  const [url, setUrl] = useState('')
  // 주소로 못 읽는 글도 시험할 수 있어야 한다 — 비공개, 아직 안 올린 초안,
  // 네이버가 우리를 막은 경우. 규칙을 고칠 때 가장 보고 싶은 것이 바로 그런 글이다.
  const [mode, setMode] = useState<'url' | 'paste'>('url')
  const [paste, setPaste] = useState('')
  const [pasteTitle, setPasteTitle] = useState('')
  const [res, setRes] = useState<RuleTestResult | null>(null)
  const [pending, start] = useTransition()

  function run() {
    if (mode === 'paste') {
      if (paste.trim().length < 50) return
      start(async () => setRes(await runBlogRuleTestOnHtml(paste, pasteTitle)))
      return
    }
    if (!url.trim()) return
    start(async () => setRes(await runBlogRuleTest(url)))
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#e2e8f0] bg-white p-4">
        <div className="mb-3 flex gap-1.5">
          {([['url', '주소로'], ['paste', '붙여넣기로']] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => { setMode(k); setRes(null) }}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                mode === k ? 'bg-[#1e3a5f] text-white' : 'bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === 'paste' ? (
          <>
            <label htmlFor="paste-title" className="mb-1 block text-xs font-bold text-[#334155]">제목(선택)</label>
            <input
              id="paste-title"
              value={pasteTitle}
              onChange={e => setPasteTitle(e.target.value)}
              placeholder="실글패스 한 달 써 본 후기"
              className="mb-2 w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm"
            />
            <label htmlFor="paste-body" className="mb-1 block text-xs font-bold text-[#334155]">
              글 내용 (HTML이든 맨 글이든)
            </label>
            <textarea
              id="paste-body"
              value={paste}
              onChange={e => setPaste(e.target.value)}
              rows={8}
              placeholder="블로그 편집기에서 복사해 붙여넣거나, 아직 안 올린 초안을 그대로 넣어 보세요."
              className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 font-mono text-xs"
            />
            <p className="mt-1 text-xs text-[#64748b]">
              맨 글을 넣으면 본문 영역으로 감싸서 판정합니다. 사진 수는 HTML을 넣어야 셀 수 있어요.
            </p>
            <button
              onClick={run}
              disabled={pending || paste.trim().length < 50}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FlaskConical className="h-4 w-4" aria-hidden="true" />}
              {pending ? '판정 중' : '판정 돌리기'}
            </button>
          </>
        ) : (
        <>
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
        </>
        )}
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

          <ul className="space-y-2.5 rounded-xl border border-[#e2e8f0] bg-white p-4">
            {res.checks.map(c => (
              <li key={c.rule} className="text-sm">
                <div className="flex items-start gap-2">
                  {c.ok
                    ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                    : <X className="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />}
                  <span className={c.ok ? 'text-[#334155]' : 'font-semibold text-[#0f172a]'}>
                    {c.rule}
                    <span className="ml-1.5 font-normal text-[#64748b]">— {c.detail}</span>
                  </span>
                </div>
                {/* 낱말은 하나씩 보여 준다 — '빠짐: A, B'로는 어느 낱말을 어디에 더 넣어야 하는지 바로 안 보인다 */}
                {c.items && (
                  <div className="ml-6 mt-1.5 flex flex-wrap gap-1.5">
                    {c.items.map(it => (
                      <span
                        key={it.label}
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${
                          it.ok
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-red-200 bg-red-50 text-red-700'
                        }`}
                      >
                        {it.ok ? <Check className="h-3 w-3" aria-hidden="true" /> : <X className="h-3 w-3" aria-hidden="true" />}
                        {it.label}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>

          {/* 본문 영역을 못 찾으면 판정이 통째로 달라진다 — 조용히 넘어가면 안 된다. */}
          {!res.bodyFound && (
            <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
              글쓴이 본문 영역을 못 찾았습니다. 문서 전체를 대신 읽었으니, 아래 본문이
              옆 메뉴·공지 목록까지 섞여 있을 수 있어요.
            </p>
          )}

          <details className="rounded-xl border border-[#e2e8f0] bg-white p-4">
            <summary className="cursor-pointer text-xs font-bold text-[#334155]">
              판정기가 읽은 본문 앞부분 (조건이 왜 걸렸는지 확인용)
            </summary>
            <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-[#64748b]">{res.excerpt}</p>
          </details>
        </div>
      )}

      <div className="rounded-xl bg-[#f8fafc] p-3">
        <p className="mb-2 text-xs font-bold text-[#334155]">신청자에게 주는 광고 표시</p>
        <DisclosureImage sample={sample} fileName="실글패스-광고표시.png" />
        <p className="mt-2 text-xs leading-relaxed text-[#64748b]">
          함께 붙이게 하는 한 줄 — <span className="font-mono text-[#334155]">{sample}</span>
          <br />
          그림 속 글씨는 기계가 못 읽으므로, 판정은 이 한 줄로 합니다.
        </p>
      </div>
    </div>
  )
}
