'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import { CalendarDays, X, ExternalLink, ArrowRight } from 'lucide-react'
import { useDialogFocus } from '@/components/ui/dialogFocus'
import { getSchedule, type Round } from '@/lib/examSchedule'

const WD = ['일', '월', '화', '수', '목', '금', '토']
function fmt(iso: string) {
  const d = new Date(`${iso}T00:00:00`)
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}(${WD[d.getDay()]})`
}
function startOfToday() {
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth(), n.getDate())
}
function daysBetween(fromIso: string) {
  const target = new Date(`${fromIso}T00:00:00`)
  return Math.ceil((target.getTime() - startOfToday().getTime()) / 86400000)
}

// 접수 마감(closed)과 시험 종료(done)는 다르다. 예전엔 접수가 끝나면 회차를 화면에서
// 통째로 뺐는데, 그러면 **이미 접수한 사람이 자기 시험일을 못 본다** — 접수 마감 뒤에도
// 시험까지 2~3주가 남는다. 그 사람에게는 그게 지금 가장 중요한 날짜다.
type Status = 'open' | 'addon' | 'upcoming' | 'closed' | 'done'
function statusOf(r: Round): Status {
  const today = startOfToday().getTime()
  const start = new Date(`${r.applyStart}T00:00:00`).getTime()
  const end = new Date(`${r.applyEnd}T23:59:59`).getTime()
  const addon = r.addonEnd ? new Date(`${r.addonEnd}T23:59:59`).getTime() : null
  const exam = new Date(`${r.examDate}T23:59:59`).getTime()
  if (today < start) return 'upcoming'
  if (today <= end) return 'open'
  if (addon !== null && today <= addon) return 'addon'
  if (today <= exam) return 'closed'
  return 'done'
}

/** 추가접수는 정기접수 마감 다음 날 시작한다. 'YYYY-MM-DD 다음날'로 적으면 읽기 나쁘다. */
function dayAfter(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00`)
  d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 아직 낼 수 있는가(정기 또는 추가접수 중) */
const canApply = (st: Status) => st === 'open' || st === 'addon'

// 시험을 푸는 화면(시간 제한 CBT·연습 풀이)에서는 어떤 것도 답안 위를 덮으면 안 된다.
const QUIET_ROUTES = [/^\/cbt\/[^/]+$/, /^\/practice\/(multiple|essay|types|refine|wrong|bookmarks)/, /^\/manuscript$/, /^\/subscribe/]

export default function ScheduleModal({ program = 'silyong' }: { program?: string }) {
  const [open, setOpen] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeDialog = useCallback(() => setOpen(false), [])
  const pathname = usePathname()
  const quiet = QUIET_ROUTES.some(re => re.test(pathname))
  // 활성 시험(실글/KBS)에 맞는 일정·제목·링크
  const { title, rounds, applyUrl, scheduleUrl } = getSchedule(program)

  // 자동으로 띄우지 않는다.
  //
  // 예전엔 세션당 1회 저절로 전면을 덮었다. 첫 방문자가 홈에 들어오면 아무것도 읽기 전에
  // 화면 전체가 가려지고, '가입 없이 문제 풀어보기' 버튼이 눌리지 않았다 — 실제로 재다가
  // 클릭이 막혀서 알았다. 알리려던 마감일보다 먼저 만나는 것이 벽이면 안 된다.
  //
  // 대신 마감일을 아래 떠 있는 버튼에 붙였다. 닫으면 사라지는 팝업보다, 늘 보이는
  // 'D-4'가 오래 남는다.

  // ESC로 닫기 + 열렸을 때 배경 스크롤 잠금
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  // 접수중이면 그 회차, 아니면 가장 가까운 회차를 대표로(배열은 날짜순).
  // 접수만 마감된 회차도 남긴다 — 시험이 아직 안 지났으면 그게 제일 급한 날짜다.
  const upcoming = rounds.filter(r => statusOf(r) !== 'done')
  const primary = upcoming.find(r => canApply(statusOf(r))) ?? upcoming[0] ?? rounds[rounds.length - 1]
  const primaryStatus = statusOf(primary)
  const dday =
    primaryStatus === 'open'
      ? daysBetween(primary.applyEnd)
      : primaryStatus === 'addon'
        ? daysBetween(primary.addonEnd!)
        : primaryStatus === 'upcoming'
          ? daysBetween(primary.applyStart)
          : primaryStatus === 'closed'
            ? daysBetween(primary.examDate)
            : 0

  useDialogFocus(open, dialogRef, closeDialog)

  if (quiet) return null

  return (
    <>
      {/* 다시 열기용 플로팅 버튼 — 좁은 화면에서는 아이콘만 남겨 본문 CTA를 덜 가린다 */}
      <button
        onClick={() => setOpen(true)}
        aria-label="시험 일정 보기"
        // 모바일 고정 CTA가 떠 있으면 그 높이만큼 올라간다(StickyMobileCTA가 알려 준다).
        // 안 그러면 '무료 시작' 버튼 위에 그대로 겹쳐 앉는다.
        style={{ bottom: 'calc(1.25rem + var(--sticky-cta-h, 0px))' }}
        className="fixed right-5 z-40 flex items-center gap-2 bg-[#0f1f3d]/95 backdrop-blur text-white text-sm font-bold p-3.5 sm:pl-3 sm:pr-4 sm:py-2.5 rounded-full shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition-all border border-white/10"
      >
        <CalendarDays className="h-4 w-4 text-[#f59e0b]" />
        <span className="hidden sm:inline">시험일정</span>
        {/* 접수 기간에만 남은 날을 보여 준다. 좁은 화면에서도 이건 남긴다 — 이게 요점이다. */}
        {canApply(primaryStatus) && (
          <span className="text-xs font-black text-[#f59e0b] tabular-nums">
            {dday === 0 ? 'D-DAY' : `D-${dday}`}
          </span>
        )}
      </button>

      {/* body로 빼서 띄운다 — 변환(transform)이 걸린 조상 안에 있으면 position:fixed가
          화면이 아니라 그 요소 기준이 되어 내용이 화면 밖으로 밀린다. */}
      {!open ? null : createPortal(
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="schedule-modal-title"
            className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="relative bg-gradient-to-br from-[#0f1f3d] to-[#1e3a5f] text-white px-6 pt-6 pb-5">
              <button
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              <div id="schedule-modal-title" className="inline-flex items-center gap-1.5 bg-white/10 text-white/90 text-xs font-semibold px-2.5 py-1 rounded-full mb-3">
                <CalendarDays className="h-3.5 w-3.5 text-[#f59e0b]" />
                {title}
              </div>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-black">{primary.round}</div>
                  {/* 일정 표(examSchedule.ts)는 손으로 채운다. 다 지나가면 화면은 안 깨지고
                      지난 회차를 계속 보여 주는데, 방문자에게는 그게 그냥 틀린 정보다.
                      남은 회차가 없을 때는 그렇다고 말하고 공식 일정으로 보낸다. */}
                  <div className="text-white/60 text-sm">
                    {upcoming.length === 0
                      ? '다음 회차 일정이 아직 안 나왔어요'
                      : primaryStatus === 'open' ? '접수 진행 중'
                        : primaryStatus === 'addon' ? '추가접수 진행 중'
                          : primaryStatus === 'upcoming' ? '접수 예정'
                            : primaryStatus === 'closed' ? '접수 마감 · 시험 준비 기간'
                              : '접수 마감'}
                  </div>
                </div>
                {primaryStatus !== 'done' && (
                  <div className="text-right">
                    <div className="text-3xl font-black text-[#f59e0b] leading-none">
                      D{dday === 0 ? '-DAY' : dday > 0 ? `-${dday}` : `+${-dday}`}
                    </div>
                    <div className="text-white/50 text-xs mt-1">
                      {primaryStatus === 'open' ? '접수 마감까지'
                        : primaryStatus === 'addon' ? '추가접수 마감까지'
                          : primaryStatus === 'closed' ? '시험까지' : '접수 시작까지'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 대표 회차 상세 */}
            <div className="px-6 py-5 border-b border-[#eef2f7]">
              <Row label="접수기간" value={`${fmt(primary.applyStart)} ~ ${fmt(primary.applyEnd)}`} highlight={primaryStatus === 'open'} />
              {primary.addonEnd && (
                <Row label="추가접수" value={`${fmt(dayAfter(primary.applyEnd))} ~ ${fmt(primary.addonEnd)}`} highlight={primaryStatus === 'addon'} />
              )}
              <Row label="시험일" value={fmt(primary.examDate)} />
              <Row label="합격발표" value={fmt(primary.resultDate)} />

              {upcoming.length === 0 && (
                <p className="mt-3 text-xs text-[#64748b] leading-relaxed">
                  위는 <b className="text-[#334155]">지난 회차</b>예요. 다음 회차가 공지되면 여기에 올려 둘게요 —
                  그전에는 공식 일정에서 확인해 주세요.
                </p>
              )}

              <a
                href={applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-gold mt-4 w-full flex items-center justify-center gap-2 font-bold py-3.5 rounded-xl text-sm"
              >
                {upcoming.length === 0 ? '공식 일정 확인하기' : '원서접수 바로가기'} <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            {/* 다가오는 회차 목록 */}
            <div className="px-6 py-4 overflow-y-auto">
              <div className="text-xs font-bold text-[#64748b] mb-2.5">다가오는 일정</div>
              <div className="space-y-1.5">
                {upcoming.slice(0, 5).map(r => {
                  const st = statusOf(r)
                  return (
                    <div key={r.round} className="flex items-center justify-between text-sm py-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#334155] w-14">{r.round}</span>
                        <StatusBadge status={st} />
                      </div>
                      <span className="text-[#64748b] text-xs">시험 {fmt(r.examDate)}</span>
                    </div>
                  )
                })}
              </div>

              <a
                href={scheduleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-xs text-[#64748b] hover:text-[#1e3a5f] transition-colors"
              >
                전체 일정 보기 (공식 홈페이지) <ExternalLink className="h-3 w-3" />
              </a>
              <p className="mt-2 text-xs text-[#b4bfce]">
                일정은 주관처 사정으로 변경될 수 있습니다. 접수 전 공식 홈페이지에서 확인하세요.
              </p>
            </div>

            {/* 저절로 뜨지 않으니 '오늘 하루 안 열기'는 뜻이 없다 — 직접 연 창은 닫기만 있으면 된다. */}
            <div className="flex items-center justify-end border-t border-[#eef2f7] px-5 py-3">
              <button
                onClick={() => setOpen(false)}
                className="text-xs font-bold text-[#1e3a5f] hover:underline"
              >
                닫기
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-[#64748b]">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'text-[#d97706]' : 'text-[#0f172a]'}`}>{value}</span>
    </div>
  )
}

function StatusBadge({ status }: { status: Status }) {
  const map = {
    open: { t: '접수중', c: 'bg-emerald-100 text-emerald-700' },
    upcoming: { t: '예정', c: 'bg-slate-100 text-slate-500' },
    // '마감'만 보이면 시험도 끝난 걸로 읽힌다. 접수만 끝난 회차는 그렇게 말해 준다.
    addon: { t: '추가접수', c: 'bg-emerald-100 text-emerald-700' },
    closed: { t: '접수마감', c: 'bg-amber-100 text-amber-700' },
    done: { t: '종료', c: 'bg-slate-100 text-slate-500' },
  }[status]
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${map.c}`}>{map.t}</span>
}
