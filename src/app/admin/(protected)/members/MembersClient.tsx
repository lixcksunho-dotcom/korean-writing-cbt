'use client'

import { useState, useTransition } from 'react'
import { Search, UserPlus, Trash2, Loader2, Crown, Mail, X } from 'lucide-react'
import Link from 'next/link'
import { createMember, deleteMember, setMemberPaid } from './actions'
import type { RefundJudgement } from '@/lib/refundEligibility'

export type AdminMember = {
  id: string
  email: string
  name: string
  createdAt: string
  lastSignInAt: string | null
  provider: string
  paid: boolean
  refund: RefundJudgement
}

/**
 * @param members 이 쪽(100명)의 회원 — 전체가 아니다. 쪽 넘김은 page.tsx 의 AdminPager.
 * @param q 지금 적용된 검색어. 검색은 서버가 전원을 대상으로 한다(한 쪽 안에서만 거르면 다른 쪽 회원을 못 찾는다).
 */
export default function MembersClient({ members, q }: { members: AdminMember[]; q: string }) {
  const [showAdd, setShowAdd] = useState(false)
  const [globalErr, setGlobalErr] = useState('')

  return (
    <div>
      {/* 검색(서버, 전원 대상) + 추가 */}
      <div className="flex items-center gap-2 mb-4">
        <form action="/admin/members" method="get" role="search" className="relative flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-gray-600 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              name="q"
              defaultValue={q}
              placeholder="이메일 또는 이름 검색 (전체 회원)"
              aria-label="이메일 또는 이름 검색"
              className="w-full bg-white border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-gray-500"
            />
          </div>
          <button type="submit" className="min-h-11 px-3 rounded-lg text-sm font-bold border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 shrink-0">
            검색
          </button>
          {q && (
            <Link href="/admin/members" className="min-h-11 inline-flex items-center px-2 text-sm text-gray-600 hover:text-gray-900 shrink-0">
              지우기
            </Link>
          )}
        </form>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold bg-gray-900 text-white hover:bg-gray-700 transition-colors shrink-0"
        >
          <UserPlus className="h-4 w-4" /> 회원 추가
        </button>
      </div>

      {showAdd && <AddForm onClose={() => setShowAdd(false)} onError={setGlobalErr} />}
      {globalErr && <p className="text-xs text-red-600 mb-3">{globalErr}</p>}

      {/* 목록 */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-2.5 bg-gray-50 text-xs font-bold text-gray-600 uppercase">
          <span>회원</span><span>가입</span><span>유료</span><span>삭제</span>
        </div>
        <div className="divide-y">
          {members.length === 0 && <p className="text-sm text-gray-600 text-center py-10">{q ? '검색 결과가 없습니다.' : '회원이 없습니다.'}</p>}
          {members.map(m => <Row key={m.id} m={m} onError={setGlobalErr} />)}
        </div>
      </div>
    </div>
  )
}

function Row({ m, onError }: { m: AdminMember; onError: (s: string) => void }) {
  const [pending, start] = useTransition()
  const [paid, setPaid] = useState(m.paid)

  function togglePaid() {
    onError('')
    const next = !paid
    setPaid(next) // 낙관적
    start(async () => {
      try { await setMemberPaid(m.id, next) }
      catch (e) { setPaid(!next); onError(e instanceof Error ? e.message : '오류') }
    })
  }

  function remove() {
    if (!confirm(`'${m.email}' 회원을 삭제할까요? 되돌릴 수 없습니다.`)) return
    onError('')
    start(async () => {
      try { await deleteMember(m.id) }
      catch (e) { onError(e instanceof Error ? e.message : '오류') }
    })
  }

  return (
    <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-3 items-center text-sm">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-gray-900 truncate">{m.name || m.email.split('@')[0]}</span>
          {paid && <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
          {m.provider !== 'email' && <span className="text-xs text-gray-600 bg-gray-100 px-1.5 rounded">{m.provider}</span>}
        </div>
        <span className="text-xs text-gray-600 truncate block">{m.email}</span>
        {/* 환불 정책(/refund)이 "7일 이내 + AI 미사용"을 기준으로 삼는데, 문의가 왔을 때
            그 둘을 확인할 데가 없었다. 결제한 사람에게만 보여 준다. */}
        {m.refund.verdict !== 'no_payment' && (
          <span
            className={`mt-1 inline-block text-[11px] font-semibold px-1.5 py-0.5 rounded ${
              m.refund.verdict === 'refundable' ? 'bg-amber-50 text-amber-800' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {m.refund.verdict === 'refundable' ? '환불 대상 · ' : '환불 제한 · '}
            {m.refund.label}
          </span>
        )}
      </div>
      <span className="hidden sm:block text-xs text-gray-600 whitespace-nowrap">{new Date(m.createdAt).toLocaleDateString('ko-KR')}</span>
      <label className="flex items-center gap-1.5 min-h-11 cursor-pointer select-none">
        {pending ? <Loader2 className="h-4 w-4 animate-spin text-gray-600" /> : (
          <input type="checkbox" checked={paid} onChange={togglePaid} className="h-4 w-4 accent-emerald-600 cursor-pointer" />
        )}
        <span className={`text-xs font-bold ${paid ? 'text-emerald-700' : 'text-gray-600'}`}>유료</span>
      </label>
      <button onClick={remove} disabled={pending} className="text-red-700 hover:bg-red-50 p-1.5 rounded-lg disabled:opacity-40 justify-self-end">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

function AddForm({ onClose, onError }: { onClose: () => void; onError: (s: string) => void }) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [pw, setPw] = useState('')
  const [pending, start] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    onError('')
    start(async () => {
      try {
        await createMember(email, pw, name || undefined)
        onClose()
      } catch (err) {
        onError(err instanceof Error ? err.message : '회원 추가 실패')
      }
    })
  }

  return (
    <form onSubmit={submit} className="bg-white border rounded-xl p-4 mb-4 relative">
      <button type="button" onClick={onClose} aria-label="닫기" className="absolute right-3 top-3 text-gray-600 hover:text-gray-600"><X className="h-4 w-4" /></button>
      <p className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-1.5"><Mail className="h-4 w-4" /> 새 회원 추가</p>
      <div className="grid sm:grid-cols-3 gap-2 mb-3">
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="이메일" type="email" required className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-500" />
        <input value={name} onChange={e => setName(e.target.value)} placeholder="이름(선택)" className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-500" />
        <input value={pw} onChange={e => setPw(e.target.value)} placeholder="비밀번호(6자+)" type="text" required className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-500" />
      </div>
      <button disabled={pending} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} 추가하기
      </button>
      <p className="text-xs text-gray-600 mt-2">이메일 인증 완료 상태로 즉시 생성됩니다. 비밀번호는 회원에게 직접 전달하세요.</p>
    </form>
  )
}
