'use client'

// 결과 화면의 여러 서술형 채점 버튼이 '1회 무료 체험'을 공유하도록 묶는 컨텍스트.
// 한 문항에서 체험을 쓰면 나머지 문항은 즉시 잠금 상태가 된다.
import { createContext, useContext, useState } from 'react'

type Ctx = { remaining: number; spend: () => void }

const AiTrialCtx = createContext<Ctx>({ remaining: 0, spend: () => {} })

export function AiTrialProvider({
  initialRemaining,
  children,
}: {
  initialRemaining: number
  children: React.ReactNode
}) {
  const [remaining, setRemaining] = useState(initialRemaining)
  return (
    <AiTrialCtx.Provider value={{ remaining, spend: () => setRemaining(r => Math.max(0, r - 1)) }}>
      {children}
    </AiTrialCtx.Provider>
  )
}

export const useAiTrial = () => useContext(AiTrialCtx)
