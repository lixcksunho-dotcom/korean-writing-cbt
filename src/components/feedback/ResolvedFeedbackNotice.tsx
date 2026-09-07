'use client'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { acknowledgeResolvedNotices } from '@/app/(main)/resolved-notice-actions'
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

export type ResolvedNotice = { id: string; message: string; createdAt: string; reply?: string | null }

// 답글 안의 주소는 누를 수 있게 — "계정 화면에서 탈퇴하세요"라고 말하면서 길을 안 주면 헛걸음이다.
function renderReply(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+|\/[a-z][a-z0-9/-]*)/g)
  return parts.map((p, i) =>
    /^(https?:\/\/[^\s]+|\/[a-z][a-z0-9/-]*)$/.test(p)
      ? <a key={i} href={p} className="font-bold underline underline-offset-2">{p}</a>
      : <span key={i}>{p}</span>,
  )
}

const SEEN_KEY = 'silyong_resolved_feedback_seen_v1'

function parseSeen(raw: string | null): string[] {
  try {
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function readSeen(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]')
  } catch {
    return []
  }
}

// localStorage는 구독할 게 없다 — 서버에서는 없는 값이라는 것만 알면 된다.
const noSubscribe = () => () => {}
const readSeenRaw = () => {
  try {
    return localStorage.getItem(SEEN_KEY)
  } catch {
    return null
  }
}

export default function ResolvedFeedbackNotice({ items }: { items: ResolvedNotice[] }) {
  // 서버의 첫 그림에서는 localStorage가 없다. 이펙트에서 setState로 맞추면 렌더가
  // 한 번 더 도므로, 서버(null)와 브라우저(실제 값)를 같은 자리에서 읽는다.
  const seenRaw = useSyncExternalStore(noSubscribe, readSeenRaw, () => null)
  const [dismissed, setDismissed] = useState<string[]>([])
  const shown = useMemo(() => {
    const seen = [...parseSeen(seenRaw), ...dismissed]
    return items.filter(i => !seen.includes(i.id))
  }, [items, seenRaw, dismissed])

  // 띠가 실제로 떴다는 사실을 운영자에게 남긴다 — '처리함'이 전달됐는지 알 수 있도록.
  // 서버가 중복을 거르지만, 같은 화면에서 반복 호출할 이유는 없다.
  const ackedRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    const fresh = shown.filter(i => !ackedRef.current.has(i.id))
    if (!fresh.length) return
    fresh.forEach(i => ackedRef.current.add(i.id))
    acknowledgeResolvedNotices(fresh.map(i => i.id)).catch(() => {
      // 기록 실패가 알림 표시를 막으면 안 된다
    })
  }, [shown])

  if (shown.length === 0) return null

  function dismiss(id: string) {
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify([...readSeen(), id]))
    } catch {
      // 저장이 막혀 있어도 이번 화면에서는 닫히게 둔다
    }
    setDismissed(prev => [...prev, id])
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
            <p className="text-sm font-bold text-emerald-900">보내 주신 불편사항을 처리했습니다</p>
            {/* 운영자 답글이 있으면 그 글을, 없으면 한 줄 안내만. (예전엔 8/28 한 건에 맞춘 본문이 모든 문의에 굳어 있었다) */}
            <p className="mt-1 text-xs text-emerald-800 leading-relaxed whitespace-pre-wrap">
              {item.reply?.trim()
                ? renderReply(item.reply)
                : '말씀하신 부분을 확인해 고쳤습니다. 다시 겪으시면 고객센터에서 알려 주세요.'}
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
