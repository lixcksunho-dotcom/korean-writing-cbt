'use client'

import { useState, useTransition } from 'react'
import { Star, X, MessageSquarePlus, CheckCircle2 } from 'lucide-react'
import { submitReview } from '@/app/(main)/review/actions'

export default function ReviewWriteModal({ defaultName }: { defaultName: string }) {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [displayName, setDisplayName] = useState(defaultName)
  const [content, setContent] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (content.trim().length < 10) { setError('10자 이상 작성해주세요.'); return }
    startTransition(async () => {
      try {
        await submitReview({ displayName, content, rating })
        setDone(true)
      } catch {
        setError('제출 중 오류가 발생했습니다.')
      }
    })
  }

  function handleClose() {
    setOpen(false)
    setTimeout(() => { setDone(false); setContent(''); setError('') }, 300)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30 transition-all hover:-translate-y-0.5"
      >
        <MessageSquarePlus className="h-4 w-4" />
        후기 남기기
      </button>

      {open && (
        <div className="fixed inset-0 bg-[#0f172a]/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#e2e8f0] w-full max-w-md p-7">
            {done ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                </div>
                <h3 className="text-lg font-black text-[#0f172a] mb-2">후기가 등록됐어요!</h3>
                <p className="text-sm text-[#64748b] mb-6">소중한 의견 감사합니다. 메인 페이지에 반영됩니다.</p>
                <button
                  onClick={handleClose}
                  className="w-full btn-primary text-white font-bold py-3 rounded-xl text-sm"
                >
                  닫기
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-lg font-black text-[#0f172a]">후기 남기기</h3>
                    <p className="text-xs text-[#94a3b8] mt-0.5">합격 후기를 남기고 5,000원 환급 받으세요</p>
                  </div>
                  <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-[#f1f5f9] transition-colors text-[#94a3b8]">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* 별점 */}
                  <div>
                    <label className="block text-xs font-semibold text-[#334155] mb-2">만족도</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setRating(s)}
                          onMouseEnter={() => setHoverRating(s)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="p-0.5 transition-transform hover:scale-110"
                        >
                          <Star className={`h-7 w-7 transition-colors ${
                            s <= (hoverRating || rating)
                              ? 'fill-[#f59e0b] text-[#f59e0b]'
                              : 'text-[#e2e8f0]'
                          }`} />
                        </button>
                      ))}
                      <span className="ml-2 text-sm text-[#64748b] self-center font-medium">
                        {['', '별로예요', '그저 그래요', '괜찮아요', '좋아요', '최고예요'][hoverRating || rating]}
                      </span>
                    </div>
                  </div>

                  {/* 이름 */}
                  <div>
                    <label className="block text-xs font-semibold text-[#334155] mb-1.5">닉네임</label>
                    <input
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      maxLength={20}
                      placeholder="표시될 이름을 입력하세요"
                      className="w-full bg-[#f8fafc] border-2 border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1e3a5f] transition-colors"
                      required
                    />
                  </div>

                  {/* 내용 */}
                  <div>
                    <label className="block text-xs font-semibold text-[#334155] mb-1.5">후기</label>
                    <textarea
                      value={content}
                      onChange={e => setContent(e.target.value.slice(0, 150))}
                      placeholder="서비스를 이용하며 느낀 점을 자유롭게 남겨주세요"
                      className="w-full bg-[#f8fafc] border-2 border-[#e2e8f0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1e3a5f] transition-colors resize-none h-28"
                      required
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-[#94a3b8]">최소 10자</span>
                      <span className={`text-xs font-medium ${content.length > 130 ? 'text-amber-500' : 'text-[#94a3b8]'}`}>
                        {content.length}/150
                      </span>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 text-xs text-red-600">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isPending || content.trim().length < 10}
                    className="w-full btn-gold text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending ? '등록 중...' : '후기 등록하기'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
