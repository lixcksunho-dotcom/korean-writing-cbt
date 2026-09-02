import { TrendingUp, AlertTriangle } from 'lucide-react'
import type { SalesSummary } from '@/lib/dailySales'

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`

function Stat({ label, count, amount, accent }: { label: string; count: number; amount: number; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? 'border-[#1e3a5f] bg-[#0f1f3d] text-white' : 'border-[#e2e8f0] bg-white'}`}>
      <p className={`text-xs ${accent ? 'text-white/60' : 'text-[#475569]'}`}>{label}</p>
      <p className={`mt-1 text-xl font-black tabular-nums ${accent ? 'text-white' : 'text-[#0f172a]'}`}>{won(amount)}</p>
      <p className={`text-xs tabular-nums ${accent ? 'text-white/60' : 'text-[#64748b]'}`}>{count}건</p>
    </div>
  )
}

// 날짜별 판매. 막대는 그날 매출을 기간 최대치에 견줘 그린다 —
// 절대 높이가 아니라 서로 견주는 것이 목적이라 세로 눈금은 붙이지 않는다.
export default function DailySales({ summary }: { summary: SalesSummary }) {
  const max = Math.max(1, ...summary.days.map(d => d.amount))
  const active = summary.days.filter(d => d.count > 0)
  const avgPerActiveDay = active.length ? Math.round(summary.last30.amount / active.length) : 0

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-emerald-600" aria-hidden="true" />
        <h2 className="text-lg font-black text-[#0f172a]">날짜별 판매</h2>
        <span className="text-xs text-[#475569]">우리가 발급한 이용권 기준 · 한국 시간</span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="오늘" count={summary.today.count} amount={summary.today.amount} accent />
        <Stat label="최근 7일" count={summary.last7.count} amount={summary.last7.amount} />
        <Stat label="최근 30일" count={summary.last30.count} amount={summary.last30.amount} />
        <Stat label="전체" count={summary.all.count} amount={summary.all.amount} />
      </div>

      <div className="rounded-xl border border-[#e2e8f0] bg-white p-4">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-xs font-semibold text-[#475569]">최근 30일</p>
          <p className="text-xs text-[#475569]">
            판매가 있던 날 {active.length}일 · 그날 평균 {won(avgPerActiveDay)}
          </p>
        </div>

        {/* 가로로 넘치면 안에서만 스크롤한다 — 페이지가 옆으로 밀리면 안 된다 */}
        <div className="overflow-x-auto">
          <div className="flex min-w-[560px] items-end gap-[3px]" style={{ height: 96 }}>
            {summary.days.map(d => (
              <div
                key={d.date}
                className="group relative flex-1"
                title={`${d.date} · ${d.count}건 · ${won(d.amount)}`}
              >
                <div
                  className={`w-full rounded-t ${d.amount > 0 ? 'bg-[#1e3a5f]' : 'bg-[#eef2f7]'}`}
                  style={{ height: Math.max(3, Math.round((d.amount / max) * 92)) }}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="mt-1.5 flex justify-between text-xs text-[#475569]">
          <span>{summary.days[0]?.date.slice(5)}</span>
          <span>{summary.days[summary.days.length - 1]?.date.slice(5)}</span>
        </div>

        {active.length > 0 && (
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-[#e2e8f0] text-left text-xs text-[#475569]">
                <th className="pb-1.5 font-medium">날짜</th>
                <th className="pb-1.5 text-right font-medium">건수</th>
                <th className="pb-1.5 text-right font-medium">매출</th>
                <th className="pb-1.5 text-right font-medium">취소·무료</th>
              </tr>
            </thead>
            <tbody>
              {[...active].reverse().map(d => (
                <tr key={d.date} className="border-b border-[#f1f5f9] last:border-0">
                  <td className="py-1.5 tabular-nums text-[#334155]">{d.date}</td>
                  <td className="py-1.5 text-right tabular-nums text-[#334155]">{d.count}</td>
                  <td className="py-1.5 text-right font-semibold tabular-nums text-[#0f172a]">{won(d.amount)}</td>
                  <td className="py-1.5 text-right tabular-nums text-[#475569]">
                    {d.cancelled || d.free ? `${d.cancelled ? `취소 ${d.cancelled}` : ''}${d.cancelled && d.free ? ' · ' : ''}${d.free ? `무료 ${d.free}` : ''}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <p className="mt-3 text-xs text-[#475569]">
          무료 발급 {summary.freeTotal}건(행사·답례)은 매출에서 뺐고, 취소 {summary.cancelledTotal}건도 뺐습니다.
        </p>

        {summary.suspicious.length > 0 && (
          // 조용히 빼면 숫자가 왜 다른지 나중에 아무도 못 밝힌다. 넣되 드러낸다.
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div>
              <b>결제로 보기 어려운 건이 {summary.suspicious.length}건 섞여 있습니다</b>(위 매출에 포함됨).
              <ul className="mt-1 space-y-0.5">
                {summary.suspicious.slice(0, 5).map(s => (
                  <li key={s.key} className="font-mono">{s.date} · {won(s.amount)} · {s.key}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
