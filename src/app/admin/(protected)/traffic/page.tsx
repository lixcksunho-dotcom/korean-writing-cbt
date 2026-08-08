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

/**
 * 검사 스크립트가 남긴 방문자를 골라낸다. 사람은 90초 안에 서로 다른 화면 8개를
 * 훑지 않는다 — 검사는 그렇게 훑는다.
 *
 * 2026-08-04부터 트래커가 navigator.webdriver를 보고 아예 안 남기지만, 그 전 기록은
 * 여기서 걸러야 한다. 안 거르면 30일 창이 지날 때까지 순방문자가 봇으로 부풀어 있다
 * (실제로 150명·3471뷰가 내 검사였다). npm run funnel과 같은 기준을 쓴다.
 */
function automatedVisitors(rows: Row[]): Set<string> {
  const byVisitor = new Map<string, { t: number; path: string }[]>()
  for (const r of rows) {
    const vid = r.visitor_id ?? '?'
    if (!byVisitor.has(vid)) byVisitor.set(vid, [])
    byVisitor.get(vid)!.push({ t: new Date(r.created_at).getTime(), path: r.path })
  }
  const bots = new Set<string>()
  for (const [vid, items] of byVisitor) {
    items.sort((a, b) => a.t - b.t)
    for (let i = 0; i < items.length; i++) {
      const paths = new Set<string>()
      for (let j = i; j < items.length && items[j].t - items[i].t <= 90_000; j++) paths.add(items[j].path)
      if (paths.size >= 8) { bots.add(vid); break }
    }
  }
  return bots
}

// 결제창에서 사용자가 스스로 닫은 경우 — 고칠 게 없는 정상 이탈이다.
const PAY_CANCELLED = new Set(['PAY_CANCELLED', 'USER_CANCEL', 'CANCEL', 'PAY_PROCESS_CANCELED'])

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
      <p className="text-xs font-semibold text-gray-600">{label}</p>
      <p className="mt-1 text-3xl font-black text-gray-900">{uv.toLocaleString()}<span className="ml-1 text-sm font-bold text-gray-600">명</span></p>
      <p className="mt-0.5 text-xs text-gray-600">페이지뷰 {pv.toLocaleString()}</p>
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
        <p className="text-sm text-red-600">
          데이터를 불러오지 못했습니다: {error.message}
          <br />
          마이그레이션 <code>022_page_views.sql</code>이 적용됐는지 확인해 주세요.
        </p>
      </div>
    )
  }

  const rawRows = (data ?? []) as Row[]
  const bots = automatedVisitors(rawRows.filter(r => !r.path.startsWith('#event/')))
  const allRows = rawRows.filter(r => !bots.has(r.visitor_id ?? '?'))
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
  // 사유는 trackEvent의 meta로 실려 page_views.referrer에 저장된다.
  const payFailRows = eventRows.filter(r => r.path === '#event/payment_fail')
  const payFailByReason = [...payFailRows.reduce((m, r) => {
    const key = r.referrer || '사유없음'
    if (!m.has(key)) m.set(key, [])
    m.get(key)!.push(r.created_at.slice(0, 10))
    return m
  }, new Map<string, string[]>())].map(([k, v]) => [k, v.sort()] as const).sort((a, b) => b[1].length - a[1].length)
  const payFailCancelled = payFailRows.filter(r => PAY_CANCELLED.has(r.referrer || '')).length
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
      <p className="mb-6 text-sm text-gray-600">
        실제 브라우저 방문 기준. 숫자는 순방문자, 작은 글씨는 페이지뷰입니다. (KST 기준)
        {bots.size > 0 && <> · 90초 안에 화면 8개 이상을 훑은 <b>{bots.size}명</b>은 검사 스크립트로 보고 뺐습니다.</>}
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
        <p className="mb-4 text-xs text-gray-600">방문 → 구독 페이지 → 결제까지 얼마나 이어지는지. 전체 전환율 {pct(conversions, month.uv)}.</p>
        <div className="grid grid-cols-3 gap-3">
          {funnel.map((f, i) => (
            <div key={f.label} className={`rounded-lg p-4 text-center ${i === 2 ? 'bg-emerald-50' : 'bg-gray-50'}`}>
              <p className="text-xs font-semibold text-gray-600">{f.label}</p>
              <p className={`mt-1 text-2xl font-black ${i === 2 ? 'text-emerald-700' : 'text-gray-900'}`}>{f.value.toLocaleString()}</p>
              <p className="mt-0.5 text-xs text-gray-600">{f.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 결제 이벤트 퍼널 */}
      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-1 text-sm font-bold text-gray-900">결제 퍼널 (30일 · 이벤트 기반)</h2>
        <p className="mb-4 text-xs text-gray-600">
          이용권 페이지 진입 → 실제 결제창 진입 → 결제 완료까지. 결제창 진입·실패는 이 트래킹으로만 보이는 값이에요.
        </p>
        {!hasEvents ? (
          <p className="rounded-lg bg-gray-50 p-4 text-xs text-gray-600">
            아직 이벤트 데이터가 없습니다. 방문자가 구독 페이지·결제를 거치면 여기에 쌓입니다.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              {payFunnel.map((f, i) => (
                <div key={f.label} className={`rounded-lg p-4 text-center ${i === 2 ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                  <p className="text-xs font-semibold text-gray-600">{f.label}</p>
                  <p className={`mt-1 text-2xl font-black ${i === 2 ? 'text-emerald-700' : 'text-gray-900'}`}>{f.value.toLocaleString()}</p>
                  <p className="mt-0.5 text-xs text-gray-600">{f.sub}</p>
                </div>
              ))}
            </div>
            {/* 사유를 나눠서 본다. 사용자가 결제창을 스스로 닫은 것과 정말 깨진 것을
                한 숫자로 묶으면 없는 불을 끄러 가게 된다. */}
            {payFailRows.length > 0 && (
              <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs font-bold text-gray-900">
                  결제 실패 {payFailRows.length}건 — 사용자 취소 {payFailCancelled}건 · 확인 필요 {payFailRows.length - payFailCancelled}건
                </p>
                <ul className="mt-2 space-y-1">
                  {payFailByReason.map(([reason, items]) => (
                    <li key={reason} className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-mono text-gray-700">{reason}</span>
                      <span className="text-gray-600">
                        {items.length}건 · {items[0]}
                        {items.length > 1 && items[0] !== items[items.length - 1] && `~${items[items.length - 1]}`}
                        <span className={`ml-2 font-bold ${PAY_CANCELLED.has(reason) ? 'text-gray-600' : 'text-red-700'}`}>
                          {PAY_CANCELLED.has(reason) ? '사용자 취소' : '확인 필요'}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
                {payFailRows.length - payFailCancelled > 0 && (
                  <p className="mt-2 text-xs text-red-700">
                    ‘확인 필요’가 여러 날에 걸쳐 있으면 결제수단·PG 설정을 점검하세요. 하루에 몰려 있으면 대개 실패 화면을 눌러 본 흔적이에요.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* 학습 활동(상단 퍼널) */}
      {hasEvents && (
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-1 text-sm font-bold text-gray-900">학습 활동 (30일)</h2>
          <p className="mb-4 text-xs text-gray-600">가입 후 실제로 써보는지 — 모의고사 완료와 AI 첨삭 무료 체험 사용량. 여기가 많을수록 구독으로 이어질 확률이 큽니다.</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-gray-50 p-4 text-center">
              <p className="text-xs font-semibold text-gray-600">모의고사 완료</p>
              <p className="mt-1 text-2xl font-black text-gray-900">{evCount('exam_completed').toLocaleString()}<span className="ml-1 text-sm font-bold text-gray-600">건</span></p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 text-center">
              <p className="text-xs font-semibold text-gray-600">AI 첨삭 무료체험 사용</p>
              <p className="mt-1 text-2xl font-black text-gray-900">{evCount('ai_trial_used').toLocaleString()}<span className="ml-1 text-sm font-bold text-gray-600">건</span></p>
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
              <span className="text-xs font-semibold text-gray-600">{d.pv || ''}</span>
              <div
                className="w-full rounded-t bg-amber-400"
                style={{ height: `${Math.round((d.pv / maxPv) * 104)}px`, minHeight: d.pv ? 3 : 0 }}
                title={`${d.label} · 방문자 ${d.uv} · 페이지뷰 ${d.pv}`}
              />
              <span className="text-[11px] text-gray-600">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 인기 페이지 */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-gray-900">인기 페이지 (30일)</h2>
          {topPaths.length === 0 ? (
            <p className="text-xs text-gray-600">아직 데이터가 없습니다.</p>
          ) : (
            <table className="w-full text-left text-xs">
              <tbody>
                {topPaths.map(([path, count]) => (
                  <tr key={path} className="border-b border-gray-100">
                    <td className="py-2 font-mono text-xs text-gray-700">{path}</td>
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
            <p className="text-xs text-gray-600">아직 데이터가 없습니다.</p>
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
