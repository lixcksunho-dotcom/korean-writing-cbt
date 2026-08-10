import Link from 'next/link'
import { XCircle, Clock, AlertTriangle } from 'lucide-react'
import EventTracker from '@/components/analytics/EventTracker'

// 실패 유형별 안내. 특히 결제는 됐는데 발급만 지연된 경우(save/status)는
// 재결제를 유도하면 이중 결제가 되므로, '재시도' 대신 '대시보드 확인'으로 안내한다.
type View = {
  kind: 'pending' | 'support' | 'retry'
  title: string
  desc: string
}

function resolve(reason?: string, code?: string): View {
  // 결제 게이트웨이가 code를 실어 보냈다면 실제 결제 실패(취소·한도초과 등) → 재시도 안전.
  if (code) {
    return { kind: 'retry', title: '결제 실패', desc: '결제가 완료되지 않았습니다. 다시 시도해 주세요.' }
  }
  switch (reason) {
    case 'save':
    case 'status':
      // 결제 자체는 접수/완료됐으나 이용권 발급이 지연된 상태.
      // 서버 웹훅이 자동으로 재처리하므로 재결제하면 안 된다.
      return {
        kind: 'pending',
        title: '결제 처리 중이에요',
        desc: '결제는 정상 접수되었고 이용권 발급만 잠시 지연되고 있어요. 보통 몇 분 안에 자동으로 처리됩니다. 중복 결제를 막기 위해 다시 결제하지 마시고, 잠시 후 대시보드에서 확인해 주세요.',
      }
    case 'amount':
      return {
        kind: 'support',
        title: '결제 금액 확인 필요',
        desc: '결제 금액 확인에 문제가 있었어요. 이미 결제가 되었다면 중복 결제하지 마시고 고객센터로 문의해 주세요.',
      }
    default:
      // confirm / no_user / user_mismatch 등 — 결제 확인 실패. 재시도 또는 문의.
      return {
        kind: 'retry',
        title: '결제 확인 실패',
        desc: '결제 정보를 확인하지 못했어요. 결제가 되지 않았다면 다시 시도하고, 이미 결제되었다면 고객센터로 문의해 주세요.',
      }
  }
}

export default async function FailPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; code?: string; reason?: string; order?: string }>
}) {
  const { message, code, reason, order } = await searchParams
  const view = resolve(reason, code)

  const icon =
    view.kind === 'pending' ? <Clock className="h-10 w-10 text-amber-500" />
    : view.kind === 'support' ? <AlertTriangle className="h-10 w-10 text-amber-500" />
    : <XCircle className="h-10 w-10 text-red-600" />
  const iconBg = view.kind === 'retry' ? 'bg-red-50' : 'bg-amber-50'

  return (
    <div className="max-w-md mx-auto py-16 text-center">
      <EventTracker event="payment_fail" meta={code || reason || undefined} />
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-[0_4px_20px_rgba(15,31,61,0.08)] p-10">
        <div className={`w-20 h-20 rounded-full ${iconBg} flex items-center justify-center mx-auto mb-5`}>
          {icon}
        </div>
        <h1 className="text-2xl font-black text-[#0f172a] mb-2">{view.title}</h1>
        <p className="text-[#64748b] text-sm mb-2 leading-relaxed">{view.desc}</p>
        {message && (
          <p className="text-xs text-[#64748b] mb-2">{message} {code ? `(${code})` : ''}</p>
        )}
        {/* 문의할 때 "어느 결제인지"를 댈 수 있어야 한다. 없으면 사용자도 우리도 못 찾는다. */}
        {order && (
          <p className="mt-3 rounded-lg bg-[#f8fafc] px-3 py-2 text-xs text-[#475569]">
            주문번호 <span className="font-mono font-semibold text-[#0f172a] break-all">{order}</span>
            <span className="block mt-0.5 text-[#64748b]">문의하실 때 이 번호를 알려 주세요.</span>
          </p>
        )}
        <div className="space-y-3 mt-8">
          {view.kind === 'pending' ? (
            <Link href="/dashboard" className="w-full btn-primary flex items-center justify-center text-white font-bold py-3.5 rounded-xl text-sm">
              대시보드에서 확인하기
            </Link>
          ) : view.kind === 'support' ? (
            <Link href="/support" className="w-full btn-primary flex items-center justify-center text-white font-bold py-3.5 rounded-xl text-sm">
              고객센터 문의하기
            </Link>
          ) : (
            <Link href="/subscribe" className="w-full btn-primary flex items-center justify-center text-white font-bold py-3.5 rounded-xl text-sm">
              다시 시도하기
            </Link>
          )}
          <Link href="/dashboard" className="block text-sm text-[#64748b] hover:text-[#334155] transition-colors">
            대시보드로 이동
          </Link>
        </div>
      </div>
    </div>
  )
}
