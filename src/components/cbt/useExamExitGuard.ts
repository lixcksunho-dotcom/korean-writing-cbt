'use client'

import { useEffect, useRef, useState } from 'react'

// 시험 도중 화면을 벗어나려는 시도를 붙잡아, 어디로 가려 했는지 알려 준다.
//
// 왜 필요한가: 39문항짜리 시험을 끝까지 앉아서 푸는 사람은 드물다. 전화가 오고, 회사에
// 가고, 그냥 탭을 닫는다. 그때 아무것도 묻지 않으면 답안은 이 브라우저에만 남는다.
// 출근길에 휴대폰으로 풀다 집에서 노트북을 켜면 아무것도 없고, 사람은 다시 오지 않는다.
// 그래서 나가려는 순간에 붙잡아 서버에 남길지 물어본다.
//
// 뒤로 가기는 '어디로'가 정해져 있지 않아, 붙잡은 뒤 시험 목록으로 보낸다 — 시험에서
// 나가면 목록이라는 게 사람이 기대하는 자리다.
export const EXIT_TO_EXAM_LIST = '/cbt'

export function useExamExitGuard(active: boolean): {
  pendingHref: string | null
  release: () => void
} {
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const activeRef = useRef(active)
  useEffect(() => { activeRef.current = active }, [active])

  // 앱 안의 링크(상단 메뉴·로고 등)를 누르는 경우. Next의 Link도 결국 <a>라
  // 캡처 단계에서 잡으면 라우터가 움직이기 전에 멈출 수 있다.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!activeRef.current) return
      // 새 탭·다운로드 같은 의도된 이탈은 시험에서 나가는 게 아니므로 건드리지 않는다.
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const anchor = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return
      const url = new URL(anchor.href, window.location.href)
      if (url.origin !== window.location.origin) return
      if (url.pathname === window.location.pathname) return
      e.preventDefault()
      e.stopPropagation()
      setPendingHref(url.pathname + url.search)
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  // 뒤로 가기. 파수꾼 기록을 하나 얹어 두고, 뒤로 갈 때마다 도로 얹어 화면을 지킨다.
  useEffect(() => {
    if (!active) return
    window.history.pushState(null, '', window.location.href)
    const onPop = () => {
      if (!activeRef.current) return
      window.history.pushState(null, '', window.location.href)
      setPendingHref(EXIT_TO_EXAM_LIST)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [active])

  // 탭을 닫거나 새로고침하는 경우. 여기서는 우리 창을 띄울 수 없어 브라우저 기본 경고에
  // 기댄다 — 실수로 닫는 것만 막아도 값어치가 있다.
  useEffect(() => {
    if (!active) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [active])

  return { pendingHref, release: () => setPendingHref(null) }
}
