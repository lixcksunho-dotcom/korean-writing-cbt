'use client'

import { useEffect } from 'react'
import { Save, LogOut, AlertCircle } from 'lucide-react'

// 시험 도중 나가려 할 때 묻는 창. 답안을 서버에 남길지가 이 창의 전부다.
export default function ExamExitDialog({
  answeredCount,
  totalCount,
  saving,
  error,
  onStay,
  onSaveExit,
  onDiscardExit,
}: {
  answeredCount: number
  totalCount: number
  saving: boolean
  error: string
  onStay: () => void
  onSaveExit: () => void
  onDiscardExit: () => void
}) {
  // Esc는 '계속 풀기'다 — 나가기가 기본값이면 실수로 시험을 버리게 된다.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onStay() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onStay, saving])

  return (
    <div className="fixed inset-0 bg-[#0f172a]/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div role="dialog" aria-modal="true" aria-label="시험에서 나가기" className="bg-white rounded-2xl p-7 max-w-sm w-full shadow-2xl border border-[#e2e8f0]">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <AlertCircle className="h-5 w-5 text-amber-500" />
          </div>
          <h3 className="text-lg font-bold text-[#0f172a]">시험에서 나갈까요?</h3>
        </div>

        <p className="text-sm text-[#475569] mb-5 leading-relaxed">
          지금까지 <b className="text-[#0f172a]">{answeredCount}/{totalCount}문항</b>을 풀었어요.
          저장해 두면 다른 기기에서도 이어서 풀 수 있어요.
          <span className="block mt-1 text-xs text-[#64748b]">시험 시간은 나가 있는 동안에도 계속 흘러갑니다.</span>
        </p>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={onSaveExit}
            disabled={saving}
            className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? '저장 중...' : '저장하고 나가기'}
          </button>
          <button
            type="button"
            onClick={onDiscardExit}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#e2e8f0] py-3 text-sm font-semibold text-[#64748b] transition-colors hover:bg-[#f8fafc] disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
            저장하지 않고 나가기
          </button>
          <button
            type="button"
            onClick={onStay}
            disabled={saving}
            className="w-full py-2 text-xs font-semibold text-[#94a3b8] transition-colors hover:text-[#475569] disabled:opacity-50"
          >
            계속 풀기
          </button>
        </div>

        <p className="mt-3 text-center text-[11px] text-[#94a3b8]">
          저장하지 않고 나가면 이 답안은 서버에 남지 않아요.
        </p>
      </div>
    </div>
  )
}
