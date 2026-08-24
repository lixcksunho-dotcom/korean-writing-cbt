'use client'

import { useState, useTransition } from 'react'
import { BellRing, BellOff, TriangleAlert } from 'lucide-react'
import { sendTestAlert } from './alertChannelActions'
import type { ChannelStatus } from '@/lib/alertChannel'

// 알림이 닿는지를 화면에 드러낸다. 예전에 토큰이 없어 모든 알림이 조용히 버려졌는데,
// 화면 어디에도 그 사실이 없어서 아무도 몰랐다.
export default function AlertChannelCard({ status }: { status: ChannelStatus }) {
  const [pending, start] = useTransition()
  const [result, setResult] = useState<{ ok: boolean; detail: string } | null>(null)

  const tone = status.state === 'ready'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
    : status.state === 'partial'
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : 'border-gray-200 bg-gray-50 text-gray-800'
  const Icon = status.state === 'ready' ? BellRing : status.state === 'partial' ? TriangleAlert : BellOff

  return (
    <div className={`mb-6 rounded-xl border p-4 ${tone}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-black">
            <Icon className="h-4 w-4" /> 알림 채널
          </h2>
          <p className="mt-1 text-xs">{status.label}</p>
          {status.action && <p className="mt-1 text-xs font-semibold">{status.action}</p>}
        </div>
        <button
          onClick={() => start(async () => setResult(await sendTestAlert()))}
          disabled={pending}
          className="shrink-0 rounded-lg bg-gray-900 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {pending ? '보내는 중…' : '테스트 알림 보내기'}
        </button>
      </div>

      {result && (
        <p className={`mt-3 text-xs font-semibold ${result.ok ? 'text-emerald-800' : 'text-red-700'}`}>
          {result.ok
            ? '보냈습니다 — 휴대폰에 안 왔으면 대화방 id가 다른 곳을 가리키고 있습니다.'
            : `실패: ${result.detail}`}
        </p>
      )}
    </div>
  )
}
