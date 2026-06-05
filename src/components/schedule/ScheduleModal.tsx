'use client'

import { useEffect, useState } from 'react'
import { CalendarDays, X, ExternalLink, ArrowRight } from 'lucide-react'

// 한국실용글쓰기 정기시험 일정 (출처: https://www.klata.or.kr/test/schedule)
// ⚠️ 일정은 주관처 사정으로 변경될 수 있습니다. 새 회차 공지 시 이 배열을 갱신하세요.
const APPLY_URL = 'https://www.klata.or.kr/testing_accept/'
const SCHEDULE_URL = 'https://www.klata.or.kr/test/schedule'

type Round = { round: string; applyStart: string; applyEnd: string; examDate: string; resultDate: string }

const SCHEDULE: Round[] = [
  { round: '제117회', applyStart: '2025-12-15', applyEnd: '2026-01-05', examDate: '2026-01-17', resultDate: '2026-02-17' },
  { round: '제118회', applyStart: '2026-02-16', applyEnd: '2026-03-09', examDate: '2026-03-21', resultDate: '2026-04-21' },
  { round: '제119회', applyStart: '2026-04-13', applyEnd: '2026-05-04', examDate: '2026-05-16', resultDate: '2026-06-16' },
  { round: '제120회', applyStart: '2026-06-08', applyEnd: '2026-06-29', examDate: '2026-07-11', resultDate: '2026-08-11' },
  { round: '제121회', applyStart: '2026-08-17', applyEnd: '2026-09-07', examDate: '2026-09-19', resultDate: '2026-10-20' },
  { round: '제122회', applyStart: '2026-10-19', applyEnd: '2026-11-09', examDate: '2026-11-21', resultDate: '2026-12-22' },
  { round: '제123회', applyStart: '2026-12-14', applyEnd: '2027-01-04', examDate: '2027-01-16', resultDate: '2027-02-16' },
]

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
function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

type Status = 'open' | 'upcoming' | 'closed'
function statusOf(r: Round): Status {
  const today = startOfToday().getTime()
  const start = new Date(`${r.applyStart}T00:00:00`).getTime()
  const end = new Date(`${r.applyEnd}T23:59:59`).getTime()
  if (today < start) return 'upcoming'
  if (today <= end) return 'open'
  return 'closed'
}

export default function ScheduleModal() {
  const [open, setOpen] = useState(false)

  // 세션당 1회 자동 노출. 단 '오늘 하루 안 열기'를 누른 날(localStorage)에는 자동으로 안 뜬다.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const today = todayKey()
    if (localStorage.getItem('kpt_schedule_hide') === today) return
    if (!sessionStorage.getItem('kpt_schedule_seen')) {
      setOpen(true)
      sessionStorage.setItem('kpt_schedule_seen', '1')
    }
  }, [])

  // 오늘 하루 자동 노출 끄기 (floating 버튼으로는 언제든 다시 열 수 있음)
  function hideForToday() {
    if (typeof window !== 'undefined') localStorage.setItem('kpt_schedule_hide', todayKey())
    setOpen(false)
  }

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

  // 접수중이면 그 회차, 아니면 다음 접수예정 회차를 대표로
  const upcoming = SCHEDULE.filter(r => statusOf(r) !== 'closed')
  const primary = upcoming.find(r => statusOf(r) === 'open') ?? upcoming[0] ?? SCHEDULE[SCHEDULE.length - 1]
  const primaryStatus = statusOf(primary)
  const dday =
    primaryStatus === 'open'
      ? daysBetween(primary.applyEnd)
      : primaryStatus === 'upcoming'
        ? daysBetween(primary.applyStart)
        : 0

  return (
    <>
      {/* 다시 열기용 플로팅 버튼 */}
      <button
        onClick={() => setOpen(true)}
        aria-label="시험 일정 보기"
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 bg-[#0f1f3d] text-white text-sm font-bold pl-3 pr-4 py-2.5 rounded-full shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition-all border border-white/10"
      >
        <CalendarDays className="h-4 w-4 text-[#f59e0b]" />
        시험일정
      </button>

      {!open ? null : (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
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
              <div className="inline-flex items-center gap-1.5 bg-white/10 text-white/90 text-xs font-semibold px-2.5 py-1 rounded-full mb-3">
                <CalendarDays className="h-3.5 w-3.5 text-[#f59e0b]" />
                한국실용글쓰기 시험 일정
              </div>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-black">{primary.round}</div>
                  <div className="text-white/60 text-sm">
                    {primaryStatus === 'open' ? '접수 진행 중' : primaryStatus === 'upcoming' ? '접수 예정' : '접수 마감'}
                  </div>
                </div>
                {primaryStatus !== 'closed' && (
                  <div className="text-right">
                    <div className="text-3xl font-black text-[#f59e0b] leading-none">
                      D{dday === 0 ? '-DAY' : dday > 0 ? `-${dday}` : `+${-dday}`}
                    </div>
                    <div className="text-white/50 text-xs mt-1">
                      {primaryStatus === 'open' ? '접수 마감까지' : '접수 시작까지'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 대표 회차 상세 */}
            <div className="px-6 py-5 border-b border-[#eef2f7]">
              <Row label="접수기간" value={`${fmt(primary.applyStart)} ~ ${fmt(primary.applyEnd)}`} highlight={primaryStatus === 'open'} />
              <Row label="시험일" value={fmt(primary.examDate)} />
              <Row label="합격발표" value={fmt(primary.resultDate)} />

              <a
                href={APPLY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-gold mt-4 w-full flex items-center justify-center gap-2 text-white font-bold py-3.5 rounded-xl text-sm"
              >
                원서접수 바로가기 <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            {/* 다가오는 회차 목록 */}
            <div className="px-6 py-4 overflow-y-auto">
              <div className="text-xs font-bold text-[#94a3b8] mb-2.5">다가오는 일정</div>
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
                href={SCHEDULE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-xs text-[#64748b] hover:text-[#1e3a5f] transition-colors"
              >
                전체 일정 보기 (공식 홈페이지) <ExternalLink className="h-3 w-3" />
              </a>
              <p className="mt-2 text-[11px] text-[#b4bfce]">
                일정은 주관처 사정으로 변경될 수 있습니다. 접수 전 공식 홈페이지에서 확인하세요.
              </p>
            </div>

            {/* 하단 바: 오늘 하루 안 열기 / 닫기 */}
            <div className="flex items-center justify-between border-t border-[#eef2f7] px-5 py-3">
              <button
                onClick={hideForToday}
                className="text-xs font-semibold text-[#94a3b8] hover:text-[#64748b] transition-colors"
              >
                오늘 하루 안 열기
              </button>
              <button
                onClick={() => setOpen(false)}
                className="text-xs font-bold text-[#1e3a5f] hover:underline"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-[#94a3b8]">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'text-[#d97706]' : 'text-[#0f172a]'}`}>{value}</span>
    </div>
  )
}

function StatusBadge({ status }: { status: Status }) {
  const map = {
    open: { t: '접수중', c: 'bg-emerald-100 text-emerald-700' },
    upcoming: { t: '예정', c: 'bg-slate-100 text-slate-500' },
    closed: { t: '마감', c: 'bg-slate-100 text-slate-400' },
  }[status]
  return <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${map.c}`}>{map.t}</span>
}
