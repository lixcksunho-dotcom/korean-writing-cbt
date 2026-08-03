'use client'

import { useState, useMemo, useTransition } from 'react'
import { Search, UserPlus, Trash2, Loader2, Crown, Mail, X } from 'lucide-react'
import { createMember, deleteMember, setMemberPaid } from './actions'

export type AdminMember = {
  id: string
  email: string
  name: string
  createdAt: string
  lastSignInAt: string | null
  provider: string
  paid: boolean
}

export default function MembersClient({ members }: { members: AdminMember[] }) {
  const [q, setQ] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [globalErr, setGlobalErr] = useState('')

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase()
    if (!k) return members
    return members.filter(m => m.email.toLowerCase().includes(k) || m.name.toLowerCase().includes(k))
  }, [q, members])

  return (
    <div>
      {/* 검색 + 추가 */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="이메일 또는 이름 검색"
            className="w-full bg-white border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-gray-500"
          />
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold bg-gray-900 text-white hover:bg-gray-700 transition-colors shrink-0"
        >
          <UserPlus className="h-4 w-4" /> 회원 추가
        </button>
      </div>

      {showAdd && <AddForm onClose={() => setShowAdd(false)} onError={setGlobalErr} />}
      {globalErr && <p className="text-xs text-red-500 mb-3">{globalErr}</p>}

      {/* 목록 */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-2.5 bg-gray-50 text-xs font-bold text-gray-500 uppercase">
          <span>회원</span><span>가입</span><span>유료</span><span>삭제</span>
        </div>
        <div className="divide-y">
          {filtered.length === 0 && <p className="text-sm text-gray-400 text-center py-10">검색 결과가 없습니다.</p>}
          {filtered.map(m => <Row key={m.id} m={m} onError={setGlobalErr} />)}
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
          {m.provider !== 'email' && <span className="text-xs text-gray-400 bg-gray-100 px-1.5 rounded">{m.provider}</span>}
        </div>
        <span className="text-xs text-gray-400 truncate block">{m.email}</span>
      </div>
      <span className="hidden sm:block text-xs text-gray-500 whitespace-nowrap">{new Date(m.createdAt).toLocaleDateString('ko-KR')}</span>
      <label className="flex items-center gap-1.5 cursor-pointer select-none">
        {pending ? <Loader2 className="h-4 w-4 animate-spin text-gray-400" /> : (
          <input type="checkbox" checked={paid} onChange={togglePaid} className="h-4 w-4 accent-emerald-600 cursor-pointer" />
        )}
        <span className={`text-xs font-bold ${paid ? 'text-emerald-600' : 'text-gray-400'}`}>유료</span>
      </label>
      <button onClick={remove} disabled={pending} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg disabled:opacity-40 justify-self-end">
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
      <button type="button" onClick={onClose} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
      <p className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-1.5"><Mail className="h-4 w-4" /> 새 회원 추가</p>
      <div className="grid sm:grid-cols-3 gap-2 mb-3">
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="이메일" type="email" required className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-500" />
        <input value={name} onChange={e => setName(e.target.value)} placeholder="이름(선택)" className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-500" />
        <input value={pw} onChange={e => setPw(e.target.value)} placeholder="비밀번호(6자+)" type="text" required className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-500" />
      </div>
      <button disabled={pending} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} 추가하기
      </button>
      <p className="text-xs text-gray-400 mt-2">이메일 인증 완료 상태로 즉시 생성됩니다. 비밀번호는 회원에게 직접 전달하세요.</p>
    </form>
  )
}
