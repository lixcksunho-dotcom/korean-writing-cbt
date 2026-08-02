import { createAdminClient } from '@/lib/supabase/admin'
import { BarChart3 } from 'lucide-react'

export const dynamic = 'force-dynamic'

type Row = { path: string; visitor_id: string | null; referrer: string | null; created_at: string }

function startOfTodayKST(): Date {
  // KST(UTC+9) 자정 기준
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 3600 * 1000)
  kst.setUTCHours(0, 0, 0, 0)
  return new Date(kst.getTime() - 9 * 3600 * 1000)
}

function refererLabel(ref: string | null): string {
  if (!ref) return '직접 유입 / 앱'
  try {
    const h = new URL(ref).hostname.replace(/^www\./, '')
    return h || '직접 유입 / 앱'
  } catch {
    return ref.slice(0, 40)
  }
}

function StatCard({ label, pv, uv }: { label: string; pv: number; uv: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-black text-gray-900">{uv.toLocaleString()}<span className="ml-1 text-sm font-bold text-gray-400">명</span></p>
      <p className="mt-0.5 text-xs text-gray-500">페이지뷰 {pv.toLocaleString()}</p>
    </div>
  )
}

const DAY = 24 * 3600 * 1000

// 시각 기준은 한 번만 읽는다 — 따로 호출하면 자정을 걸칠 때 창끼리 어긋난다.
function timeWindows() {
  const now = Date.now()
  return { since: new Date(now - 30 * DAY).toISOString(), d7: now - 7 * DAY, d30: now - 30 * DAY }
}

export default async function AdminTrafficPage() {
  const admin = createAdminClient()
  const { since, d7, d30 } = timeWindows()

  const { data, error } = await admin
    .from('page_views')
    .select('path, visitor_id, referrer, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(50000)

  if (error) {
    return (
      <div>
        <div className="mb-6 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-amber-500" />
          <h1 className="text-xl font-black text-gray-900">방문 통계</h1>
        </div>
        <p className="text-sm text-red-500">
          데이터를 불러오지 못했습니다: {error.message}
          <br />
          마이그레이션 <code>022_page_views.sql</code>이 적용됐는지 확인해 주세요.
        </p>
      </div>
    )
  }

  const allRows = (data ?? []) as Row[]
  // 퍼널 이벤트(#event/*)는 방문통계 집계에서 분리 — 페이지뷰/인기페이지 오염 방지
  const rows = allRows.filter(r => !r.path.startsWith('#event/'))
  const eventRows = allRows.filter(r => r.path.startsWith('#event/'))
  const evUv = (name: string) =>
    new Set(eventRows.filter(r => r.path === `#event/${name}`).map(r => r.visitor_id ?? '?')).size
  const evCount = (name: string) => eventRows.filter(r => r.path === `#event/${name}`).length

  // 전환 퍼널용: 최근 30일 구독 발급 수
  const { count: subs30 } = await admin
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', since)

  const todayStart = startOfTodayKST().getTime()

  function agg(fromMs: number) {
    const sub = rows.filter(r => new Date(r.created_at).getTime() >= fromMs)
    return { pv: sub.length, uv: new Set(sub.map(r => r.visitor_id ?? '?')).size }
  }
  const today = agg(todayStart)
  const week = agg(d7)
  const month = agg(d30)

  // 인기 페이지 / 유입경로 (30일)
  const pathCount = new Map<string, number>()
  const refCount = new Map<string, number>()
  for (const r of rows) {
    pathCount.set(r.path, (pathCount.get(r.path) ?? 0) + 1)
    const rl = refererLabel(r.referrer)
    refCount.set(rl, (refCount.get(rl) ?? 0) + 1)
  }
  const topPaths = [...pathCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
  const topRefs = [...refCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)

  // 전환 퍼널(30일): 전체 방문자 → 구독페이지(/subscribe) 방문자 → 결제 전환(구독 발급)
  const subscribeUv = new Set(
    rows.filter(r => r.path === '/subscribe').map(r => r.visitor_id ?? '?'),
  ).size
  const conversions = subs30 ?? 0
  const pct = (n: number, d: number) => (d > 0 ? `${((n / d) * 100).toFixed(1)}%` : '—')
  const funnel = [
    { label: '전체 방문자', value: month.uv, sub: '최근 30일 순방문자' },
    { label: '구독 페이지 방문', value: subscribeUv, sub: `방문자의 ${pct(subscribeUv, month.uv)}` },
    { label: '결제 전환', value: conversions, sub: `구독페이지 방문의 ${pct(conversions, subscribeUv)}` },
  ]

  // 결제 이벤트 퍼널(30일): 구독페이지 진입 → 결제창 진입 → 결제 완료 / 실패
  // subscribe_view·payment_started·payment_fail는 이벤트 트래킹으로만 보이는 값(기존엔 측정 불가였음)
  const evSubView = evUv('subscribe_view')
  const evPayStart = evUv('payment_started')
  const evPaySuccess = evCount('purchase_success')
  const evPayFail = evCount('payment_fail')
  const hasEvents = eventRows.length > 0
  const payFunnel = [
    { label: '구독페이지 진입', value: evSubView, sub: '이용권 페이지 순방문자' },
    { label: '결제창 진입', value: evPayStart, sub: `진입의 ${pct(evPayStart, evSubView)}` },
    { label: '결제 완료', value: evPaySuccess, sub: `결제창의 ${pct(evPaySuccess, evPayStart)}` },
  ]

  // 최근 14일 일별 추이 (KST 날짜 기준)
  const days: { label: string; pv: number; uv: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const dayStart = todayStart - i * 24 * 3600 * 1000
    const dayEnd = dayStart + 24 * 3600 * 1000
    const sub = rows.filter(r => {
      const t = new Date(r.created_at).getTime()
      return t >= dayStart && t < dayEnd
    })
    const label = new Date(dayStart + 9 * 3600 * 1000).toISOString().slice(5, 10) // MM-DD
    days.push({ label, pv: sub.length, uv: new Set(sub.map(r => r.visitor_id ?? '?')).size })
  }
  const maxPv = Math.max(1, ...days.map(d => d.pv))

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-amber-500" />
        <h1 className="text-xl font-black text-gray-900">방문 통계</h1>
      </div>
      <p className="mb-6 text-sm text-gray-500">
        실제 브라우저 방문 기준(관리자·봇성 요청 제외). 숫자는 순방문자, 작은 글씨는 페이지뷰입니다. (KST 기준)
      </p>

      {/* 요약 카드 */}
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="오늘" pv={today.pv} uv={today.uv} />
        <StatCard label="최근 7일" pv={week.pv} uv={week.uv} />
        <StatCard label="최근 30일" pv={month.pv} uv={month.uv} />
      </div>

      {/* 전환 퍼널 */}
      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-1 text-sm font-bold text-gray-900">전환 퍼널 (30일)</h2>
        <p className="mb-4 text-xs text-gray-500">방문 → 구독 페이지 → 결제까지 얼마나 이어지는지. 전체 전환율 {pct(conversions, month.uv)}.</p>
        <div className="grid grid-cols-3 gap-3">
          {funnel.map((f, i) => (
            <div key={f.label} className={`rounded-lg p-4 text-center ${i === 2 ? 'bg-emerald-50' : 'bg-gray-50'}`}>
              <p className="text-xs font-semibold text-gray-500">{f.label}</p>
              <p className={`mt-1 text-2xl font-black ${i === 2 ? 'text-emerald-600' : 'text-gray-900'}`}>{f.value.toLocaleString()}</p>
              <p className="mt-0.5 text-[11px] text-gray-400">{f.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 결제 이벤트 퍼널 */}
      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-1 text-sm font-bold text-gray-900">결제 퍼널 (30일 · 이벤트 기반)</h2>
        <p className="mb-4 text-xs text-gray-500">
          이용권 페이지 진입 → 실제 결제창 진입 → 결제 완료까지. 결제창 진입·실패는 이 트래킹으로만 보이는 값이에요.
        </p>
        {!hasEvents ? (
          <p className="rounded-lg bg-gray-50 p-4 text-xs text-gray-400">
            아직 이벤트 데이터가 없습니다. 방문자가 구독 페이지·결제를 거치면 여기에 쌓입니다.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              {payFunnel.map((f, i) => (
                <div key={f.label} className={`rounded-lg p-4 text-center ${i === 2 ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                  <p className="text-xs font-semibold text-gray-500">{f.label}</p>
                  <p className={`mt-1 text-2xl font-black ${i === 2 ? 'text-emerald-600' : 'text-gray-900'}`}>{f.value.toLocaleString()}</p>
                  <p className="mt-0.5 text-[11px] text-gray-400">{f.sub}</p>
                </div>
              ))}
            </div>
            {evPayFail > 0 && (
              <p className="mt-3 rounded-lg bg-red-50 px-4 py-2.5 text-xs text-red-600">
                ⚠️ 결제 실패 {evPayFail.toLocaleString()}건 — 결제창까지 갔다가 실패한 사용자예요. 실패가 잦으면 결제수단·PG 설정을 점검하세요.
              </p>
            )}
          </>
        )}
      </div>

      {/* 학습 활동(상단 퍼널) */}
      {hasEvents && (
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-1 text-sm font-bold text-gray-900">학습 활동 (30일)</h2>
          <p className="mb-4 text-xs text-gray-500">가입 후 실제로 써보는지 — 모의고사 완료와 AI 첨삭 무료 체험 사용량. 여기가 많을수록 구독으로 이어질 확률이 큽니다.</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-gray-50 p-4 text-center">
              <p className="text-xs font-semibold text-gray-500">모의고사 완료</p>
              <p className="mt-1 text-2xl font-black text-gray-900">{evCount('exam_completed').toLocaleString()}<span className="ml-1 text-sm font-bold text-gray-400">건</span></p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 text-center">
              <p className="text-xs font-semibold text-gray-500">AI 첨삭 무료체험 사용</p>
              <p className="mt-1 text-2xl font-black text-gray-900">{evCount('ai_trial_used').toLocaleString()}<span className="ml-1 text-sm font-bold text-gray-400">건</span></p>
            </div>
          </div>
        </div>
      )}

      {/* 일별 추이 */}
      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-bold text-gray-900">최근 14일 추이</h2>
        <div className="flex items-end gap-1.5" style={{ height: 140 }}>
          {days.map(d => (
            <div key={d.label} className="flex flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[10px] font-semibold text-gray-500">{d.pv || ''}</span>
              <div
                className="w-full rounded-t bg-amber-400"
                style={{ height: `${Math.round((d.pv / maxPv) * 104)}px`, minHeight: d.pv ? 3 : 0 }}
                title={`${d.label} · 방문자 ${d.uv} · 페이지뷰 ${d.pv}`}
              />
              <span className="text-[9px] text-gray-400">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 인기 페이지 */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-gray-900">인기 페이지 (30일)</h2>
          {topPaths.length === 0 ? (
            <p className="text-xs text-gray-400">아직 데이터가 없습니다.</p>
          ) : (
            <table className="w-full text-left text-xs">
              <tbody>
                {topPaths.map(([path, count]) => (
                  <tr key={path} className="border-b border-gray-100">
                    <td className="py-2 font-mono text-[11px] text-gray-700">{path}</td>
                    <td className="py-2 text-right font-semibold text-gray-900">{count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 유입 경로 */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-gray-900">유입 경로 (30일)</h2>
          {topRefs.length === 0 ? (
            <p className="text-xs text-gray-400">아직 데이터가 없습니다.</p>
          ) : (
            <table className="w-full text-left text-xs">
              <tbody>
                {topRefs.map(([ref, count]) => (
                  <tr key={ref} className="border-b border-gray-100">
                    <td className="py-2 text-gray-700">{ref}</td>
                    <td className="py-2 text-right font-semibold text-gray-900">{count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
