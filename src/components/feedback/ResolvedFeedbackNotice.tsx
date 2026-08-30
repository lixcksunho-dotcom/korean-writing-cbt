'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, X } from 'lucide-react'

// 불편사항을 남긴 사람에게 '고쳤습니다'라고 알려 주는 띠.
//
// 왜 필요한가: 문의를 받아 고쳐 놓아도 알릴 길이 없었다. 문의한 사람은 고쳐진 줄 모르고,
// 자기 글이 읽히기는 했는지도 모른 채 떠난다. 실제로 결제까지 한 분이 '방금 푼 회차를
// 다시 볼 수 없다'고 남겼는데(2026-08-28), 고친 뒤에도 그분이 다시 들어와 그 화면을
// 우연히 발견하지 않는 한 알 수가 없었다.
//
// 표를 새로 만들지 않았다. feedback 표에 이미 resolved 칸이 있으니, 관리자가 그것을
// 켜면 그 글을 쓴 사람에게만 이 띠가 뜬다. 읽고 닫으면 그 기기에서는 다시 안 뜬다
// (localStorage). 기기를 바꾸면 한 번 더 뜨는데, 알림을 놓치는 것보다는 낫다.

export type ResolvedNotice = { id: string; message: string; createdAt: string }

const SEEN_KEY = 'silyong_resolved_feedback_seen_v1'

function readSeen(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]')
  } catch {
    return []
  }
}

export default function ResolvedFeedbackNotice({ items }: { items: ResolvedNotice[] }) {
  // 서버와 첫 그림이 어긋나지 않게, 무엇을 봤는지는 붙은 뒤에 읽는다.
  const [shown, setShown] = useState<ResolvedNotice[]>([])

  useEffect(() => {
    const seen = readSeen()
    setShown(items.filter(i => !seen.includes(i.id)))
  }, [items])

  if (shown.length === 0) return null

  function dismiss(id: string) {
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify([...readSeen(), id]))
    } catch {
      // 저장이 막혀 있어도 이번 화면에서는 닫히게 둔다
    }
    setShown(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div className="mb-5 space-y-2">
      {shown.map(item => (
        <div
          key={item.id}
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-start gap-3"
        >
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-emerald-900">보내 주신 불편사항이 해결되었습니다</p>
            <p className="mt-1 text-xs text-emerald-800 leading-relaxed">
              이제 <strong>CBT 문제풀기</strong>에서 이미 푼 회차의 <strong>‘마지막 시도 · 결과 다시 보기’</strong>를
              누르면 그때 푼 답안과 해설을 다시 보실 수 있습니다. 서술형 AI 채점도 그 화면에서 이어서
              받으실 수 있습니다.
            </p>
            <p className="mt-1.5 text-[11px] text-emerald-700">
              남겨 주신 글: “{item.message.length > 60 ? `${item.message.slice(0, 60)}…` : item.message}”
            </p>
          </div>
          <button
            onClick={() => dismiss(item.id)}
            aria-label="알림 닫기"
            className="shrink-0 rounded-md p-1 text-emerald-700 hover:bg-emerald-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
