'use client'

import { useState, useTransition } from 'react'
import { Star, BadgeCheck, Eye, EyeOff, Trash2, ImageOff, ExternalLink, Loader2 } from 'lucide-react'
import { setReviewVerified, setReviewVisible, deleteReview } from './actions'

export type AdminReview = {
  id: string
  displayName: string
  content: string
  rating: number
  examDate: string | null
  examScore: number | null
  verified: boolean
  isVisible: boolean
  createdAt: string
  proofUrl: string | null
  hasProof: boolean
}

export default function ReviewAdminList({ reviews }: { reviews: AdminReview[] }) {
  if (reviews.length === 0) {
    return <p className="text-sm text-gray-500 bg-white border rounded-xl p-8 text-center">등록된 후기가 없습니다.</p>
  }
  return (
    <div className="space-y-3">
      {reviews.map(r => <Row key={r.id} r={r} />)}
    </div>
  )
}

function Row({ r }: { r: AdminReview }) {
  const [pending, start] = useTransition()
  const [err, setErr] = useState('')

  function run(fn: () => Promise<void>) {
    setErr('')
    start(async () => {
      try { await fn() } catch (e) { setErr(e instanceof Error ? e.message : '오류') }
    })
  }

  return (
    <div className={`bg-white border rounded-xl p-4 flex gap-4 ${!r.isVisible ? 'opacity-60' : ''}`}>
      {/* 인증 사진 */}
      <div className="shrink-0">
        {r.proofUrl ? (
          <a href={r.proofUrl} target="_blank" rel="noreferrer" className="block relative group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={r.proofUrl} alt="점수 인증" className="w-24 h-24 object-cover rounded-lg border" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity">
              <ExternalLink className="h-5 w-5 text-white" />
            </span>
          </a>
        ) : (
          <div className="w-24 h-24 rounded-lg border bg-gray-50 flex flex-col items-center justify-center text-gray-300 gap-1">
            <ImageOff className="h-5 w-5" />
            <span className="text-xs text-gray-400">사진 없음</span>
          </div>
        )}
      </div>

      {/* 내용 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-bold text-gray-900 text-sm">{r.displayName}</span>
          <span className="flex items-center gap-0.5 text-amber-500">
            {Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="h-3 w-3 fill-current" />)}
          </span>
          {r.verified && (
            <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
              <BadgeCheck className="h-3 w-3" /> 점수 인증
            </span>
          )}
          {!r.isVisible && <span className="text-xs font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">숨김</span>}
        </div>
        <p className="text-sm text-gray-700 leading-relaxed mb-1.5 whitespace-pre-wrap">{r.content}</p>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          {r.examScore != null && <span>점수 <b className="text-gray-600">{r.examScore}점</b></span>}
          {r.examDate && <span>시험일 {r.examDate}</span>}
          <span>{new Date(r.createdAt).toLocaleDateString('ko-KR')}</span>
        </div>

        {/* 액션 */}
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => run(() => setReviewVerified(r.id, !r.verified))}
            disabled={pending || !r.hasProof}
            title={!r.hasProof ? '인증 사진이 없어 확정할 수 없어요' : ''}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-40 ${
              r.verified ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-gray-900 text-white hover:bg-gray-700'
            }`}
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BadgeCheck className="h-3.5 w-3.5" />}
            {r.verified ? '인증 해제' : '점수 인증 확정'}
          </button>
          <button
            onClick={() => run(() => setReviewVisible(r.id, !r.isVisible))}
            disabled={pending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-40"
          >
            {r.isVisible ? <><EyeOff className="h-3.5 w-3.5" /> 숨기기</> : <><Eye className="h-3.5 w-3.5" /> 표시</>}
          </button>
          <button
            onClick={() => { if (confirm('이 후기를 삭제할까요? 인증 사진도 함께 삭제됩니다.')) run(() => deleteReview(r.id)) }}
            disabled={pending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" /> 삭제
          </button>
          {err && <span className="text-xs text-red-500">{err}</span>}
        </div>
      </div>
    </div>
  )
}
