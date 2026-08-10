'use client'

import Link from 'next/link'
import { useMemo, useSyncExternalStore } from 'react'
import { ChevronRight } from 'lucide-react'
import { readDraftRaw, parseDraft } from '@/lib/examDraft'

// 시험 카드의 '이어풀기 가능' 표시와 시작 버튼.
//
// 왜 클라이언트 컴포넌트인가: 서버 중간저장('저장하고 나가기')은 유료 기능이라
// 무료 회원의 답안은 브라우저(localStorage)에만 남는다. 목록은 서버에서 그리므로
// 그 사실을 알 수 없었고, 그래서 **무료 회원에게는 이어풀기 표시가 아예 안 떴다**.
// 실측: 미완료 세션 73건 중 68건이 서버 저장 없음 — 그 사람들은 목록에서
// '시작하기'만 보고, 눌러야 비로소 "쓰다 만 답안이 있어요" 배너를 만났다.
// 풀던 게 있다는 걸 모르면 다시 안 들어온다.
//
// 유료 기능을 푸는 게 아니다. 시계를 멈추고 다른 기기에서 이어받는 건 여전히 유료다.
// 여기서 더해 주는 건 '이 브라우저에 내 답안이 남아 있다'는 사실뿐이다.

const noSubscribe = () => () => {}

export default function ExamResumeAction({
  href,
  openSessionId,
  serverResumable,
  hasPrev,
}: {
  href: string
  /** 진행 중(미완료) 세션 id. 없으면 브라우저 임시본도 있을 수 없다. */
  openSessionId: string | null
  /** 서버에 중간저장이 있는가(유료 '저장하고 나가기') */
  serverResumable: boolean
  hasPrev: boolean
}) {
  // 서버 렌더에서는 null → 첫 페인트가 서버와 어긋나지 않는다(원고지·연습과 같은 방식).
  const raw = useSyncExternalStore(
    noSubscribe,
    () => (openSessionId ? readDraftRaw(openSessionId) : null),
    () => null,
  )
  const localDraft = useMemo(() => parseDraft(raw), [raw])

  const resumable = serverResumable || !!localDraft
  const answered = localDraft ? Object.keys(localDraft.answers).length : 0

  return (
    <>
      {resumable && (
        <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-semibold">
          {answered > 0 ? `이어풀기 ${answered}문항` : '이어풀기 가능'}
        </span>
      )}
      <Link
        href={href}
        className="flex-1 btn-primary flex items-center justify-center gap-1.5 text-white font-semibold py-3 rounded-xl text-sm"
      >
        {resumable ? '이어풀기' : hasPrev ? '다시 풀기' : '시작하기'}
        <ChevronRight className="h-4 w-4" />
      </Link>
    </>
  )
}
