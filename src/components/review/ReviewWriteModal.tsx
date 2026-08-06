'use client'

import { useState, useTransition } from 'react'
import { Star, X, MessageSquarePlus, CheckCircle2, Upload, Calendar, Award } from 'lucide-react'
import { submitReview } from '@/app/(main)/review/actions'
import { createClient } from '@/lib/supabase/client'

const MAX_MB = 5

export default function ReviewWriteModal({ defaultName }: { defaultName: string }) {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [displayName, setDisplayName] = useState(defaultName)
  const [content, setContent] = useState('')
  const [examDate, setExamDate] = useState('')
  const [examScore, setExamScore] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function pickFile(f: File | null) {
    setError('')
    if (!f) { setFile(null); setPreview(''); return }
    if (!f.type.startsWith('image/')) { setError('이미지 파일만 올릴 수 있어요.'); return }
    if (f.size > MAX_MB * 1024 * 1024) { setError(`사진은 ${MAX_MB}MB 이하로 올려주세요.`); return }
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (content.trim().length < 10) { setError('후기를 10자 이상 작성해주세요.'); return }
    if (!examDate) { setError('시험 날짜를 입력해주세요.'); return }
    const score = Number(examScore)
    if (!examScore || isNaN(score) || score < 0 || score > 1000) { setError('시험 점수를 0~1000 사이로 입력해주세요.'); return }
    if (!file) { setError('점수 인증용 사진을 첨부해주세요.'); return }

    startTransition(async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setError('로그인이 필요합니다.'); return }

        // 인증 사진을 비공개 버킷의 본인 폴더에 업로드
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('review-proofs')
          .upload(path, file, { upsert: false, contentType: file.type })
        if (upErr) { setError('사진 업로드에 실패했어요. 잠시 후 다시 시도해주세요.'); return }

        await submitReview({
          displayName,
          content,
          rating,
          examDate,
          examScore: score,
          proofPath: path,
        })
        setDone(true)
      } catch {
        setError('제출 중 오류가 발생했습니다.')
      }
    })
  }

  function handleClose() {
    setOpen(false)
    setTimeout(() => {
      setDone(false); setContent(''); setError('')
      setExamDate(''); setExamScore(''); setFile(null); setPreview('')
    }, 300)
  }

  const inputCls = 'w-full bg-[#f8fafc] border-2 border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1e3a5f] transition-colors'

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-[#0f172a] text-sm font-bold px-4 py-3 rounded-xl shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30 transition-all hover:-translate-y-0.5"
      >
        <MessageSquarePlus className="h-4 w-4" />
        후기 남기기
      </button>

      {open && (
        <div className="fixed inset-0 bg-[#0f172a]/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:px-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-[#e2e8f0] w-full max-w-md p-6 sm:p-7 max-h-[92vh] overflow-y-auto">
            {done ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                </div>
                <h3 className="text-lg font-black text-[#0f172a] mb-2">후기가 등록됐어요!</h3>
                <p className="text-sm text-[#64748b] mb-6">소중한 후기 감사합니다. 인증 확인 후 환급이 진행됩니다.</p>
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
                    <h3 className="text-lg font-black text-[#0f172a]">합격 후기 남기기</h3>
                    <p className="text-xs text-[#64748b] mt-0.5">합격 후기를 남기고 5,000원 환급 받으세요</p>
                  </div>
                  <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-[#f1f5f9] transition-colors text-[#64748b]">
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

                  {/* 시험 날짜 · 점수 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="flex items-center gap-1 text-xs font-semibold text-[#334155] mb-1.5">
                        <Calendar className="h-3.5 w-3.5 text-[#1e3a5f]" /> 시험 날짜
                      </label>
                      <input
                        type="date"
                        value={examDate}
                        onChange={e => setExamDate(e.target.value)}
                        className={inputCls}
                        required
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-1 text-xs font-semibold text-[#334155] mb-1.5">
                        <Award className="h-3.5 w-3.5 text-[#1e3a5f]" /> 시험 점수
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={1000}
                        value={examScore}
                        onChange={e => setExamScore(e.target.value)}
                        placeholder="예: 820"
                        className={inputCls}
                        required
                      />
                    </div>
                  </div>

                  {/* 닉네임 */}
                  <div>
                    <label className="block text-xs font-semibold text-[#334155] mb-1.5">닉네임</label>
                    <input
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      maxLength={20}
                      placeholder="표시될 이름을 입력하세요"
                      className={inputCls}
                      required
                    />
                  </div>

                  {/* 내용 */}
                  <div>
                    <label className="block text-xs font-semibold text-[#334155] mb-1.5">후기</label>
                    <textarea
                      value={content}
                      onChange={e => setContent(e.target.value.slice(0, 150))}
                      placeholder="합격까지의 경험과 도움이 된 점을 자유롭게 남겨주세요"
                      className="w-full bg-[#f8fafc] border-2 border-[#e2e8f0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1e3a5f] transition-colors resize-none h-24"
                      required
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-[#64748b]">최소 10자</span>
                      <span className={`text-xs font-medium ${content.length > 130 ? 'text-amber-500' : 'text-[#64748b]'}`}>
                        {content.length}/150
                      </span>
                    </div>
                  </div>

                  {/* 점수 인증 사진 */}
                  <div>
                    <label className="block text-xs font-semibold text-[#334155] mb-1.5">점수 인증 사진</label>
                    <label className="flex items-center gap-3 w-full bg-[#f8fafc] border-2 border-dashed border-[#cbd5e1] rounded-xl px-4 py-3 text-sm cursor-pointer hover:border-[#1e3a5f] transition-colors">
                      {preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={preview} alt="인증 미리보기" className="h-12 w-12 rounded-lg object-cover border border-[#e2e8f0]" />
                      ) : (
                        <span className="h-12 w-12 rounded-lg bg-[#eef2f7] flex items-center justify-center text-[#1e3a5f] shrink-0">
                          <Upload className="h-5 w-5" />
                        </span>
                      )}
                      <span className="text-[#64748b] truncate">
                        {file ? file.name : `성적 확인 화면·증명서 사진 (${MAX_MB}MB 이하)`}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => pickFile(e.target.files?.[0] ?? null)}
                        className="hidden"
                      />
                    </label>
                    <p className="text-xs text-[#64748b] mt-1">인증 사진은 공개되지 않으며, 점수 확인·환급 용도로만 사용됩니다.</p>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 text-xs text-red-700">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full btn-gold font-bold py-3.5 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending ? '등록 중...' : '합격 후기 등록하기'}
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
