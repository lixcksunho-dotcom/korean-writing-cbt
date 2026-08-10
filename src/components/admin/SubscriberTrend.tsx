import { buildSubscriberReport, deltaLabel } from '@/lib/subscriberReport'

// 신규 구독(결제) 유입 추이를 관리자 화면에서 바로 본다.
//
// 같은 수치를 매일 아침 텔레그램으로 보내는 경로(api/cron/subscriber-report)가 이미
// 있는데, TELEGRAM_BOT_TOKEN·CHAT_ID 가 설정되지 않아 아무 데도 안 나오고 있었다.
// 알림이 설정에 의존하면 설정이 빠진 동안은 없는 것과 같다 — 화면에도 둔다.
//
// 막대는 한 계열뿐이라 범례가 필요 없다(제목이 곧 계열 이름이다). 값은 막대 옆에
// 직접 붙여서, 길이를 눈대중으로 읽게 만들지 않는다.

function Bars({ rows, max }: { rows: { label: string; value: number }[]; max: number }) {
  return (
    <ul className="space-y-1">
      {rows.map(r => (
        <li key={r.label} className="flex items-center gap-2">
          <span className="w-12 shrink-0 text-[11px] tabular-nums text-gray-600">{r.label}</span>
          <span className="flex-1 h-3 rounded-sm bg-gray-100 overflow-hidden" aria-hidden>
            <span
              className="block h-full rounded-sm bg-[#2a78d6]"
              style={{ width: max > 0 ? `${Math.max(r.value > 0 ? 4 : 0, (r.value / max) * 100)}%` : 0 }}
            />
          </span>
          <span className="w-8 shrink-0 text-right text-[11px] font-semibold tabular-nums text-gray-900">{r.value}</span>
        </li>
      ))}
    </ul>
  )
}

export default async function SubscriberTrend() {
  const r = await buildSubscriberReport()
  const weekMax = Math.max(1, ...r.weeks.map(w => w.count))
  const dayMax = Math.max(1, ...r.days.map(d => d.visitors))

  return (
    <div className="bg-white border rounded-xl p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-bold text-gray-900">신규 결제 유입 추이</h2>
        {/* 위 지표 카드의 '누적 결제'와 숫자가 다르다. 여기는 0원(관리자 무료 지급)과
            검사 계정을 뺀 '실제로 돈이 들어온 건'만 센다 — 나란히 두면 오해되므로 밝힌다. */}
        <span className="text-xs text-gray-600">실결제 누적 {r.total}건 <span className="text-gray-500">(무료 지급·검사 계정 제외)</span></span>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2">
            주별 신규 결제 <span className="font-normal text-gray-600">(최근 10주 · 주 시작일)</span>
          </p>
          <Bars rows={r.weeks.map(w => ({ label: w.label, value: w.count }))} max={weekMax} />
          <p className="mt-2 text-xs text-gray-600">
            최근 7일 {r.last7}건 · 그 전 7일 {r.prev7}건 — {deltaLabel(r.last7, r.prev7)}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2">
            일별 방문자 <span className="font-normal text-gray-600">(순방문 · 검사 트래픽 제외)</span>
          </p>
          <Bars rows={r.days.map(d => ({ label: d.label, value: d.visitors }))} max={dayMax} />
          <p className="mt-2 text-xs text-gray-600">
            {/* 비교 구간에 오염된 날이 섞였으면 증감을 말하지 않는다 — 틀린 숫자보다 침묵이 낫다 */}
            {r.visitorsComparable
              ? <>최근 7일 {r.visitors7}명 · 그 전 7일 {r.visitorsPrev7}명 — {deltaLabel(r.visitors7, r.visitorsPrev7)}</>
              : <>최근 {r.visitorDaysCounted}일만 집계 가능 — 그 전 구간에 검사 트래픽이 섞여 비교하지 않습니다</>}
          </p>
        </div>
      </div>

      <p className="mt-4 pt-3 border-t text-xs text-gray-600">
        최근 7일: 가입 {r.signup7}명 · 이용권 화면 {r.subscribeView7}명 · 결제 시작 {r.paymentStart7}명 · 결제 {r.last7}건
        {r.daysSinceLast !== null && <> · 마지막 결제 {r.daysSinceLast}일 전</>}
      </p>
    </div>
  )
}
