import Link from 'next/link'
import { Clock, ListChecks, PenLine, Save, ChevronRight, ArrowLeft } from 'lucide-react'
import type { ProgramConfig } from '@/lib/programs'

// 시험을 시작하기 전에 한 번 서는 자리.
//
// 왜 필요한가: 예전에는 회차를 누르는 순간 시험이 시작됐다 — 타이머가 돌고 세션이 만들어졌다.
// 그래서 '어떤 시험인지 보려고' 눌러 본 사람도 시작한 것이 됐고, 실측으로 열고 한 문제도
// 안 푼 회차가 112건이었다(풀다 그만둔 것은 6건뿐, 2026-09-08 check:dropoff).
//
// 사람이 돌아선 자리는 첫 화면이다. 몇 분짜리인지, 중간에 나갈 수 있는지, 한 문제만 풀어도
// 되는지를 먼저 알려 주고, 누른 사람만 시작한다.
export default function ExamIntro({
  cfg,
  round,
  objectiveCount,
  essayCount,
  startHref,
}: {
  cfg: ProgramConfig
  round: number
  objectiveCount: number
  essayCount: number
  startHref: string
}) {
  const facts = [
    { icon: Clock, label: '시험 시간', value: `${cfg.examMinutes}분` },
    { icon: ListChecks, label: '객관식', value: `${objectiveCount}문항` },
    { icon: PenLine, label: '서술형', value: `${essayCount}문항` },
  ]

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Link href="/cbt" className="mb-6 inline-flex items-center gap-1 text-sm text-[#64748b] hover:text-[#0f172a]">
        <ArrowLeft className="h-4 w-4" /> 회차 목록
      </Link>

      <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_4px_16px_rgba(15,31,61,0.06)]">
        <p className="text-xs font-bold text-[#1e3a5f]">{cfg.examName}</p>
        <h1 className="mt-1 text-2xl font-black text-[#0f172a]">모의고사 {round}회</h1>

        <dl className="mt-5 grid grid-cols-3 gap-2">
          {facts.map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3 text-center">
              <Icon className="mx-auto mb-1 h-4 w-4 text-[#64748b]" aria-hidden="true" />
              <dt className="text-[11px] text-[#64748b]">{label}</dt>
              <dd className="text-sm font-black text-[#0f172a]">{value}</dd>
            </div>
          ))}
        </dl>

        {/* 사람이 돌아서는 이유를 미리 지운다. 다만 실제와 다른 말은 쓰지 않는다 —
            시간이 다 되면 진짜로 자동 제출되고, 안 푼 문제는 진짜로 오답이 된다. */}
        <ul className="mt-5 space-y-2.5 text-sm text-[#334155]">
          <li className="flex gap-2">
            <Save className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
            <span><b>중간에 저장하고 나갈 수 있어요.</b> 다른 기기에서도 이어서 풉니다.</span>
          </li>
          <li className="flex gap-2">
            <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-[#64748b]" aria-hidden="true" />
            <span>다 못 풀어도 제출할 수 있어요. 다만 <b>안 푼 문제는 오답으로 계산</b>되니, 시간이 모자라면 저장하고 나갔다 이어서 푸는 편이 낫습니다.</span>
          </li>
          <li className="flex gap-2">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#64748b]" aria-hidden="true" />
            <span>실제 시험처럼 <b>시간이 다 되면 자동으로 제출</b>됩니다. 남은 시간은 화면 위에 계속 보여요.</span>
          </li>
        </ul>

        <Link
          href={startHref}
          className="mt-6 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#1e3a5f] py-3.5 text-sm font-black text-white transition-colors hover:bg-[#16304f]"
        >
          시작하기 <ChevronRight className="h-4 w-4" />
        </Link>
        <p className="mt-2 text-center text-xs text-[#94a3b8]">시작을 눌러야 시간이 갑니다. 그전까지는 아무것도 기록되지 않아요.</p>
      </div>
    </div>
  )
}
