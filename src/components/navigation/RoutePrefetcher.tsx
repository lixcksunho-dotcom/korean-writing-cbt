'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// 다음에 갈 자리를 한가할 때 미리 받아 둔다.
//
// 왜 필요한가: Next는 링크가 화면에 들어와야 미리 받는다. 그래서 첫 화면에 보이는
// 링크(/try)는 눌러도 139ms인데, 푸터에 있는 링크(/blog·/spelling)는 화면에 들어온 적이
// 없어 누르는 순간부터 받기 시작한다 — 0.9~2.0초를 서서 기다린다.
//
// 사람이 스크롤할 때까지 기다릴 이유가 없다. 그릴 것을 다 그린 뒤, 놀고 있는 틈에 받아 둔다.

// 목록은 감이 아니라 최근 30일 실제 조회수로 정했다.
// 머리말에 있는 링크(/try·/login·/signup)는 늘 화면에 있어 Next가 알아서 미리 받는다 —
// 재 보면 115~167ms다. 여기 넣을 것은 **아래로 내려야 보이는데 사람이 많이 가는** 자리뿐이다.
const NEXT_STOPS = ['/manuscript-guide', '/exam-compare', '/exam-info']

export default function RoutePrefetcher({ routes = NEXT_STOPS }: { routes?: string[] }) {
  const router = useRouter()

  useEffect(() => {
    // 데이터를 아끼는 중이거나 느린 회선이면 하지 않는다 — 도움이 아니라 부담이 된다.
    const conn = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string }
    }).connection
    if (conn?.saveData) return
    if (conn?.effectiveType && /^(slow-)?2g$/.test(conn.effectiveType)) return

    const timers: number[] = []
    const start = () => {
      // 한 번에 몰아 받으면 지금 화면의 남은 일과 다툰다. 한 자리씩 띄워 받는다.
      routes.forEach((r, i) => {
        timers.push(window.setTimeout(() => router.prefetch(r), i * 300))
      })
    }

    // 브라우저가 한가해질 때까지 기다린다. 없으면 조금 늦춰서 시작한다.
    const useIdle = typeof requestIdleCallback === 'function'
    const handle = useIdle
      ? requestIdleCallback(start, { timeout: 3000 })
      : window.setTimeout(start, 1500)

    return () => {
      timers.forEach(clearTimeout)
      if (useIdle) cancelIdleCallback(handle)
      else clearTimeout(handle)
    }
  }, [router, routes])

  return null
}
