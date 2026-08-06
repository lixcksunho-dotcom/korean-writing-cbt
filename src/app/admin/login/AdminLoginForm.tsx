'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Shield, Eye, EyeOff, Lock } from 'lucide-react'

export default function AdminLoginForm({ forbidden }: { forbidden: boolean }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState(forbidden ? '이 계정은 관리자 권한이 없습니다. 관리자 계정으로 로그인하세요.' : '')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      setLoading(false)
      return
    }
    // 권한 최종 확인은 (protected) 레이아웃이 서버에서 수행한다.
    // 관리자가 아니면 자동으로 /admin/login?error=forbidden 으로 되돌아온다.
    window.location.assign('/admin')
  }

  async function switchAccount() {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.assign('/admin/login')
  }

  const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400 transition-all placeholder:text-gray-400'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-amber-500/15 items-center justify-center mb-4">
            <Shield className="h-7 w-7 text-amber-400" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">관리자 로그인</h1>
          <p className="text-gray-400 text-sm mt-1">권한이 있는 계정만 접근할 수 있습니다.</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">이메일</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="admin@example.com" required autoComplete="email" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">비밀번호</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="비밀번호" required autoComplete="current-password" className={`${inputCls} pr-11`} />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-200 transition-colors">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-300 flex items-start gap-2">
                <span className="shrink-0">⚠</span><span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-400 text-gray-900 font-black py-3.5 rounded-xl text-sm disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
              <Lock className="h-4 w-4" />
              {loading ? '확인 중...' : '관리자 로그인'}
            </button>
          </form>

          {forbidden && (
            <button onClick={switchAccount} disabled={loading}
              className="mt-3 w-full text-xs text-gray-400 hover:text-gray-200 transition-colors">
              다른 계정으로 로그인 (현재 계정 로그아웃)
            </button>
          )}
        </div>

        {/* 어두운 배경이라 gray-600은 2.48까지 떨어진다 — 밝은 쪽으로 올린다 */}
        <p className="text-center text-xs text-gray-400 mt-6">실글패스 · 관리자 전용</p>
      </div>
    </div>
  )
}
