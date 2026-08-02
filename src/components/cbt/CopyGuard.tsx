'use client'

import { useEffect } from 'react'

// CBT 문제·지문·자료 복제 방지(억지력) + 저작권 고지.
//  - 복사/잘라내기/우클릭/드래그를 차단(단, 답안 입력칸 input·textarea는 정상 동작 허용)
//  - 본문 텍스트 선택 비활성(body 클래스 → globals.css의 .cbt-noselect)
// 클라이언트 차단은 완전 보안이 아니라 무단 복제에 대한 1차 억지 장치다.
export default function CopyGuard({ notice = true }: { notice?: boolean }) {
  useEffect(() => {
    const isEditable = (t: EventTarget | null) => {
      const el = t as HTMLElement | null
      const tag = el?.tagName
      return tag === 'TEXTAREA' || tag === 'INPUT' || (el?.isContentEditable ?? false)
    }
    const block = (e: Event) => { if (!isEditable(e.target)) e.preventDefault() }

    document.body.classList.add('cbt-noselect')
    document.addEventListener('copy', block)
    document.addEventListener('cut', block)
    document.addEventListener('contextmenu', block)
    document.addEventListener('dragstart', block)
    return () => {
      document.body.classList.remove('cbt-noselect')
      document.removeEventListener('copy', block)
      document.removeEventListener('cut', block)
      document.removeEventListener('contextmenu', block)
      document.removeEventListener('dragstart', block)
    }
  }, [])

  if (!notice) return null
  return (
    <p className="mt-6 text-center text-[11px] text-[#64748b] leading-relaxed select-none">
      ⓒ 본 문제·지문·자료의 저작권은 운영자(만물아들)에게 있습니다. 무단 복제·캡처·배포·전송을 금하며, 위반 시 관련 법령에 따라 책임을 물을 수 있습니다.
    </p>
  )
}
