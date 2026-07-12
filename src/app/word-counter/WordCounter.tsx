'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

// 무료 글자수 세기 도구 — 공백 포함/제외, 단어·줄, 바이트(한글2·영문1), 원고지 칸수·매수.
// SEO 유입용 무료 도구 + 실글패스(서술형 글자수 제한) 자연 연결.
function countBytes(s: string): number {
  // 한글 등 2바이트(EUC-KR 기준 근사), ASCII 1바이트 — 원고지/제한 안내에 흔히 쓰는 기준
  let b = 0
  for (const ch of s) b += ch.charCodeAt(0) > 0x7f ? 2 : 1
  return b
}

export default function WordCounter() {
  const [text, setText] = useState('')
  const chars = Array.from(text)
  const withSpace = chars.filter((c) => c !== '\n').length
  const noSpace = chars.filter((c) => c !== '\n' && c !== ' ' && c !== '\t').length
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const lines = text ? text.split('\n').length : 0
  const bytes = countBytes(text)
  const wonGo = withSpace // 원고지 칸수(공백 포함)
  const sheets = (wonGo / 200) // 200자 원고지 매수

  const stats: { label: string; value: string; hint?: string }[] = [
    { label: '글자수 (공백 포함)', value: withSpace.toLocaleString() },
    { label: '글자수 (공백 제외)', value: noSpace.toLocaleString() },
    { label: '단어수', value: words.toLocaleString() },
    { label: '줄수', value: lines.toLocaleString() },
    { label: '바이트', value: bytes.toLocaleString(), hint: '한글2·영문1' },
    { label: '원고지 칸수', value: wonGo.toLocaleString(), hint: '공백 포함' },
    { label: '원고지 매수', value: sheets.toFixed(1), hint: '200자 기준' },
  ]

  return (
    <div className="space-y-5">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="여기에 글을 입력하거나 붙여넣으세요. 글자수가 실시간으로 계산됩니다."
        className="w-full h-64 border-2 border-[#e2e8f0] rounded-2xl px-5 py-4 text-base leading-relaxed focus:outline-none focus:border-[#1e3a5f] transition-colors bg-[#f8fafc] focus:bg-white resize-y"
        spellCheck={false}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-[#e2e8f0] px-4 py-3.5 text-center">
            <div className="text-2xl font-black text-[#1e3a5f] tabular-nums">{s.value}</div>
            <div className="text-xs font-semibold text-[#64748b] mt-1">{s.label}</div>
            {s.hint && <div className="text-[10px] text-[#94a3b8] mt-0.5">{s.hint}</div>}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setText('')}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[#64748b] bg-[#f1f5f9] hover:bg-[#e2e8f0] transition-colors"
        >
          지우기
        </button>
        <button
          onClick={() => { if (text) navigator.clipboard?.writeText(text) }}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[#1e3a5f] bg-[#1e3a5f]/8 hover:bg-[#1e3a5f]/15 transition-colors"
        >
          복사
        </button>
      </div>

      {/* 제품 연결 CTA */}
      <div className="bg-gradient-to-br from-[#0f1f3d] to-[#1e3a5f] rounded-2xl px-6 py-6 text-center">
        <p className="text-white font-bold text-lg mb-1.5">한국실용글쓰기 서술형, 글자수 제한 안에 쓰는 연습하세요</p>
        <p className="text-white/60 text-sm mb-4">실전 CBT 모의고사 + 서술형 AI 채점·첨삭으로 시험처럼 연습 · 합격까지 한 번에</p>
        <Link
          href="/"
          className="btn-gold inline-flex items-center gap-2 text-white font-bold px-7 py-3 rounded-xl text-sm"
        >
          무료로 시작하기 <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
