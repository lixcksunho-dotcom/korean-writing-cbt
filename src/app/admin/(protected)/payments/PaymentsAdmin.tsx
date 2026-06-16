'use client'

import { useState, useTransition } from 'react'
import { reconcilePayment } from './actions'

export type PaymentRow = {
  id: string
  status: string
  amount: number | null
  customerId: string | null
  orderName: string | null
  paidAt: string | null
  granted: boolean
}

function Result({ r }: { r: { ok: boolean; message: string } | null }) {
  if (!r) return null
  return (
    <span className={`ml-2 text-xs font-semibold ${r.ok ? 'text-emerald-600' : 'text-red-500'}`}>
      {r.message}
    </span>
  )
}

function RegrantButton({ paymentId, onDone }: { paymentId: string; onDone: () => void }) {
  const [pending, start] = useTransition()
  const [res, setRes] = useState<{ ok: boolean; message: string } | null>(null)
  return (
    <span className="flex items-center">
      <button
        disabled={pending}
        onClick={() => start(async () => { const r = await reconcilePayment(paymentId); setRes(r); if (r.ok) onDone() })}
        className="rounded-md bg-amber-500 px-2.5 py-1 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-50"
      >
        {pending ? '처리중…' : '재발급'}
      </button>
      <Result r={res} />
    </span>
  )
}

export default function PaymentsAdmin({ rows, listError }: { rows: PaymentRow[]; listError: string | null }) {
  const [manualId, setManualId] = useState('')
  const [manualRes, setManualRes] = useState<{ ok: boolean; message: string } | null>(null)
  const [pending, start] = useTransition()

  return (
    <div className="space-y-8">
      {/* 수동 재발급 — paymentId 핀포인트 복구(과거 사고 등) */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-1 text-sm font-bold text-gray-900">paymentId로 직접 재발급</h2>
        <p className="mb-3 text-xs text-gray-500">
          포트원 콘솔에서 결제는 PAID인데 구독이 안 나간 건의 결제번호(paymentId)를 입력해 재발급합니다.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={manualId}
            onChange={e => setManualId(e.target.value)}
            placeholder="sub-xxxxxxxx-..."
            className="min-w-[280px] flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
          />
          <button
            disabled={pending || !manualId.trim()}
            onClick={() => start(async () => setManualRes(await reconcilePayment(manualId)))}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-bold text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {pending ? '처리중…' : '재발급'}
          </button>
        </div>
        <Result r={manualRes} />
      </section>

      {/* 최근 결제 목록 — 미발급 PAID 건을 한눈에 */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-bold text-gray-900">최근 결제 (최대 20건)</h2>
        {listError ? (
          <p className="text-xs text-red-500">
            결제 목록을 불러오지 못했습니다: {listError}. 위 수동 재발급은 정상 동작합니다.
          </p>
        ) : rows.length === 0 ? (
          <p className="text-xs text-gray-500">최근 결제 내역이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-gray-500">
                <tr className="border-b border-gray-200">
                  <th className="py-2 pr-3">결제일</th>
                  <th className="py-2 pr-3">paymentId</th>
                  <th className="py-2 pr-3">상태</th>
                  <th className="py-2 pr-3">금액</th>
                  <th className="py-2 pr-3">구독</th>
                  <th className="py-2 pr-3">조치</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(p => {
                  const needGrant = p.status === 'PAID' && !p.granted
                  return (
                    <tr key={p.id} className={`border-b border-gray-100 ${needGrant ? 'bg-amber-50' : ''}`}>
                      <td className="py-2 pr-3 whitespace-nowrap text-gray-600">
                        {p.paidAt ? new Date(p.paidAt).toLocaleString('ko-KR') : '-'}
                      </td>
                      <td className="py-2 pr-3 font-mono text-[11px] text-gray-700">{p.id}</td>
                      <td className="py-2 pr-3">
                        <span className={p.status === 'PAID' ? 'text-emerald-600 font-semibold' : 'text-gray-500'}>{p.status}</span>
                      </td>
                      <td className="py-2 pr-3 text-gray-700">{p.amount != null ? `${p.amount.toLocaleString()}원` : '-'}</td>
                      <td className="py-2 pr-3">
                        {p.granted
                          ? <span className="text-emerald-600 font-semibold">발급됨</span>
                          : <span className="text-red-500 font-semibold">미발급</span>}
                      </td>
                      <td className="py-2 pr-3">
                        {needGrant ? <RegrantButton paymentId={p.id} onDone={() => location.reload()} /> : <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
