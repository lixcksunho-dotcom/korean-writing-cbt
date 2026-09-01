import { createAdminClient } from '@/lib/supabase/admin'
import { Gift } from 'lucide-react'
import { PROMO_CAMPAIGNS, promoOrderPrefix, promoState } from '@/lib/promoCampaign'
import { serverNow } from '@/lib/serverNow'

export const dynamic = 'force-dynamic'

// 행사 코드 현황 — 몇 명이 받아 갔고, 언제까지이며, 마감이 얼마나 남았는지.
// 코드 자체는 저장소(src/lib/promoCampaign.ts)에 있고, 발급 기록만 DB에서 읽는다.
export default async function AdminPromosPage() {
  const admin = createAdminClient()
  // 현재 시각은 렌더 밖(서버 액션)에서 받아 온다 — 렌더 본문·map 콜백에서 Date.now()를
  // 부르면 순수성 규칙에 걸린다.
  const now = await serverNow()

  const rows = await Promise.all(
    PROMO_CAMPAIGNS.map(async c => {
      const { count } = await admin
        .from('subscriptions')
        .select('id', { count: 'exact', head: true })
        .like('order_id', `${promoOrderPrefix(c.code)}%`)
      const { data: recent } = await admin
        .from('subscriptions')
        .select('user_id, created_at, expires_at')
        .like('order_id', `${promoOrderPrefix(c.code)}%`)
        .order('created_at', { ascending: false })
        .limit(5)
      return { c, used: count ?? 0, recent: recent ?? [], state: promoState(c, now) }
    }),
  )

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <Gift className="h-5 w-5 text-amber-500" />
        <h1 className="text-xl font-black text-gray-900">행사 코드</h1>
      </div>

      <p className="mb-5 rounded-xl border border-[#e2e8f0] bg-white p-4 text-sm text-gray-600">
        코드는 저장소 <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">src/lib/promoCampaign.ts</code>에
        있습니다. 새 행사를 열려면 그 파일에 한 줄 추가하고 배포하면 됩니다.
        발급은 <b>결제가 아니라 무료 발급(금액 0원)</b>으로 기록돼 매출 집계에 섞이지 않습니다.
      </p>

      <ul className="space-y-3">
        {rows.map(({ c, used, recent, state }) => {
          const pct = Math.min(100, Math.round((used / c.maxUses) * 100))
          return (
            <li key={c.code} className="rounded-xl border border-[#e2e8f0] bg-white p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <span className="font-mono text-base font-black text-gray-900">{c.code}</span>
                  <span className="ml-2 text-sm text-gray-600">{c.label}</span>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    state === '진행 중' ? 'bg-emerald-100 text-emerald-800'
                    : state === '시작 전' ? 'bg-gray-200 text-gray-700'
                    : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {state}
                </span>
              </div>

              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-black tabular-nums text-gray-900">{used}</span>
                <span className="text-sm text-gray-500">/ {c.maxUses}명 · {c.days}일 지급</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                <div className={`h-full rounded-full ${pct >= 90 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
              </div>

              <p className="mt-2.5 text-xs text-gray-500">
                {new Date(c.startsAt).toLocaleDateString('ko-KR')} ~ {new Date(c.endsAt).toLocaleDateString('ko-KR')}
              </p>

              {recent.length > 0 && (
                <div className="mt-3 border-t border-[#e2e8f0] pt-2.5">
                  <p className="mb-1.5 text-xs font-semibold text-gray-500">최근 발급</p>
                  <ul className="space-y-1 text-xs text-gray-600">
                    {recent.map(r => (
                      <li key={`${r.user_id}-${r.created_at}`} className="flex justify-between gap-3">
                        <span className="font-mono">{String(r.user_id).slice(0, 8)}</span>
                        <span>
                          {new Date(r.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          {' · '}
                          {new Date(r.expires_at).toLocaleDateString('ko-KR')}까지
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
