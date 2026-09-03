'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { X, Gift, Check, CalendarDays, ExternalLink } from 'lucide-react'
import { useDialogFocus } from '@/components/ui/dialogFocus'
import { createClient } from '@/lib/supabase/client'
import { getSchedule, type Round } from '@/lib/examSchedule'
import { BODY_KEYWORDS, MAX_REWARDS, MIN_CHARS, MIN_IMAGES, MIN_QA, REWARD_DAYS } from '@/lib/blogPromoRules'

// 첫 화면에 이벤트를 알린다.
//
// 팝업은 쉽게 미움받는다. 세 가지로 줄였다.
//   · 이미 이용권이 있는 사람에게는 띄우지 않는다(줄 것이 없다).
//   · '7일 동안 보지 않기'를 누르면 일주일간 안 나온다. 그냥 닫으면 이번 방문만 쉰다.
//   · 첫 화면 말고는 어디에도 안 띄운다.
//
// 시험 일정도 여기서 같이 보여 준다. 예전엔 일정 안내와 이벤트가 따로 떠서 둘이 겹쳤다 —
// 자동으로 뜨는 창이 둘이면 사람은 내용을 안 읽고 둘 다 닫는다.
//
// 저장은 브라우저에만 한다 — 안 뜨는 게 서버 문제로 번지면 안 된다.

const KEY = 'sgp_event_popup_hidden_until'
const HIDE_DAYS = 7

const WD = ['일', '월', '화', '수', '목', '금', '토']
function fmt(iso: string) {
  const d = new Date(`${iso}T00:00:00`)
  return `${d.getMonth() + 1}.${d.getDate()}(${WD[d.getDay()]})`
}
function daysUntil(iso: string) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return Math.ceil((new Date(`${iso}T00:00:00`).getTime() - today) / 86400000)
}

/** 아직 안 끝난 첫 회차. 다 지났으면 null — 지난 회차를 보여 주면 그냥 틀린 정보다. */
function nextRound(rounds: Round[]): Round | null {
  return rounds.find(r => daysUntil(r.examDate) >= 0) ?? null
}

function hiddenForNow(): boolean {
  try {
    const until = localStorage.getItem(KEY)
    return !!until && Date.now() < Number(until)
  } catch {
    return false // 저장이 막힌 브라우저에서는 그냥 보여 준다
  }
}

export default function EventPopup({
  enabled,
  /**
   * 관리자 실험실에서 실제 모습을 보려고 띄우는 경우.
   *
   * 손님에게 보일 때 걸리는 문(7일 숨김·이미 이용권 있음)을 건너뛴다. 그 문들 때문에
   * 정작 만든 사람이 화면을 한 번도 못 보는 일이 생긴다 — 한 번 닫으면 일주일간 안 뜬다.
   * 남은 자리 수와 마감 판정은 그대로 둔다. 실제와 다르게 보이면 미리보기가 아니다.
   */
  preview = false,
}: { enabled: boolean; preview?: boolean }) {
  const [open, setOpen] = useState(false)
  const [left, setLeft] = useState<number | null>(null)
  const { rounds, applyUrl } = getSchedule('silyong')
  const round = nextRound(rounds)
  const applyOpen = round ? daysUntil(round.applyEnd) >= 0 : false
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!enabled) return
    if (!preview && hiddenForNow()) return

    let cancelled = false
    let poll: ReturnType<typeof setInterval> | undefined
    const timer = setTimeout(async () => {
      // 이미 이용권이 있는 사람에게 '무료로 받으세요'는 실례다. 첫 화면은 정적으로 그려서
      // 서버가 로그인 상태를 모르므로 여기서 확인한다(첫 그림을 늦추지 않게 나중에 한 번).
      try {
        if (preview) throw new Error('미리보기 — 이용권 확인을 건너뛴다')
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .gt('expires_at', new Date().toISOString())
            .limit(1)
          if (data && data.length > 0) return
        }
      } catch {
        // 확인에 실패하면 그냥 보여 준다 — 안 뜨는 것보다 낫다
      }
      if (cancelled) return

      // 마감이면 아예 안 띄운다 — 끝난 행사를 광고하면 눌러 본 사람만 헛걸음한다.
      try {
        const quota = await (await fetch('/api/promo/quota', { cache: 'no-store' })).json()
        if (quota.closed) return
        if (typeof quota.left === 'number' && quota.total > 0) setLeft(quota.left)
      } catch {
        // 못 세면 그냥 보여 준다
      }
      if (cancelled) return

      // 자동으로 뜨는 창은 한 번에 하나만. 시험 일정 안내가 떠 있으면 그게 닫힐 때까지 기다린다 —
      // 둘이 겹쳐 뜨면 사람은 내용을 안 읽고 둘 다 닫는다(실측).
      const show = () => { if (!cancelled) setOpen(true) }
      if (!document.querySelector('[role="dialog"]')) return show()

      let waited = 0
      poll = setInterval(() => {
        waited += 700
        if (cancelled) return clearInterval(poll)
        if (!document.querySelector('[role="dialog"]') || waited > 60000) {
          clearInterval(poll)
          show()
        }
      }, 700)
    }, 900)

    return () => { cancelled = true; clearTimeout(timer); if (poll) clearInterval(poll) }
  }, [enabled, preview])

  useDialogFocus(open, ref, () => setOpen(false))


  function hideForAWhile() {
    try {
      localStorage.setItem(KEY, String(Date.now() + HIDE_DAYS * 24 * 60 * 60 * 1000))
    } catch {
      // 저장이 막혀 있으면 이번 방문만 닫힌다
    }
    setOpen(false)
  }

  const conditions = [
    `제목과 본문에 정해진 낱말 (${BODY_KEYWORDS.length}개)`,
    `사진 ${MIN_IMAGES}장 이상 · 본문 ${MIN_CHARS.toLocaleString('ko-KR')}자 이상`,
    `스스로 묻고 답한 곳 ${MIN_QA}번 이상`,
    '광고 표시 문구 (법정 의무 · 복사해 드립니다)',
  ]

  if (!open || typeof document === 'undefined') return null

  // 첫 화면 안쪽에 두면 그 안의 다른 층에 가려 버튼이 눌리지 않는다(실측) — body로 옮긴다.
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-popup-title"
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="relative bg-gradient-to-br from-[#0f1f3d] to-[#1e3a5f] px-6 py-7 text-center text-white">
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="닫기"
            className="absolute right-3 top-3 rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/15">
            <Gift className="h-5 w-5 text-amber-300" aria-hidden="true" />
          </div>
          <p className="text-xs font-semibold text-amber-300">
            블로그 후기 이벤트{left !== null && ` · ${left}자리 남음`}
          </p>
          <h2 id="event-popup-title" className="mt-1 text-xl font-black leading-snug">
            후기 한 편 쓰고
            <br />
            이용권 {REWARD_DAYS}일 무료로 받기
          </h2>
          <p className="mt-2 text-sm text-white/70">
            블로그에 후기를 올리고 주소만 넣으면 <b className="text-white">그 자리에서</b> 지급됩니다.
          </p>
        </div>

        {/* 시험 일정 — 이벤트보다 먼저 본다. 사람들이 첫 화면에서 가장 자주 찾는 것이 이 날짜다. */}
        {round && (
          <div className="border-b border-[#e2e8f0] bg-[#f8fafc] px-6 py-4">
            <div className="mb-2 flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-[#b45309]" aria-hidden="true" />
              <p className="text-xs font-bold text-[#0f172a]">{round.round}</p>
              <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold ${
                applyOpen ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {applyOpen ? `접수 D-${daysUntil(round.applyEnd)}` : '접수 마감'}
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <div className="flex justify-between">
                <dt className="text-[#64748b]">접수</dt>
                <dd className="font-semibold text-[#334155]">~{fmt(round.applyEnd)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#64748b]">시험</dt>
                <dd className="font-semibold text-[#334155]">{fmt(round.examDate)}</dd>
              </div>
            </dl>
            {applyOpen && (
              <a
                href={applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-[#b45309] hover:underline"
              >
                공식 접수 페이지로 <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            )}
          </div>
        )}

        <div className="px-6 py-5">
          <p className="mb-2.5 text-xs font-bold text-[#0f172a]">이벤트 조건</p>
          <ul className="space-y-2">
            {conditions.map(c => (
              <li key={c} className="flex items-start gap-2 text-sm text-[#334155]">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                <span>{c}</span>
              </li>
            ))}
          </ul>

          <Link
            href="/subscribe?promo=1#blog-review"
            onClick={() => setOpen(false)}
            className="mt-5 flex w-full items-center justify-center rounded-xl bg-[#1e3a5f] py-3.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            어떻게 쓰는지 보기
          </Link>

          {/* 여기는 '작은 글씨'가 아니라 고지다. 광고 표시 의무와 회수 조건은 이 창에서
              읽고 결정하는 내용이라, 흐리게 쓰면 안 읽힌다 — 예전엔 #94a3b8 11px이라
              흰 배경 대비가 2.6:1이었다(기준 4.5). 색을 올리고 한 급 키웠다.
              '꺼진다'만 쓰고 '되살아난다'를 빼면 한쪽만 말하는 것이 된다. */}
          <p className="mt-3 text-center text-xs leading-relaxed text-[#475569]">
            선착순 {MAX_REWARDS}명 · 계정당 1회 · 대가를 받고 쓰는 글이므로 광고 표시가 필요합니다.
            <br />
            받은 뒤 {REWARD_DAYS}일 동안 글이 공개돼 있어야 하고, 내리면 남은 기간이 멈춰요
            (다시 공개하면 되살아납니다).
          </p>
        </div>

        <button
          type="button"
          onClick={hideForAWhile}
          className="w-full border-t border-[#e2e8f0] py-3 text-xs font-semibold text-[#64748b] transition-colors hover:bg-[#f8fafc]"
        >
          {HIDE_DAYS}일 동안 보지 않기
        </button>
      </div>
    </div>,
    document.body,
  )
}
