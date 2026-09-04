import { NextResponse } from 'next/server'

// 지금 라이브에 올라가 있는 것이 어느 시점 코드인지 밝힌다.
//
// 왜 필요한가: 자매 서비스(KBS패스)에서 Git 자동 배포가 막혀 커밋 40여 개가 5일 동안
// 사이트에 안 올라갔는데, 5일 내내 아무도 못 알아챘다 — 화면은 멀쩡하고, 프로덕션을
// 보는 검사도 전부 '통과'라고 답했다. 옛 코드가 통과하고 있었던 것이다.
// 여기는 지금 Git 배포가 되지만, 안 되는 날 조용히 같은 일이 난다.
//
// 커밋 해시를 빌드 때 박아 두면, 바깥에서 한 번 물어보는 것으로 '뒤처졌는지'를 안다.
// VERCEL_GIT_COMMIT_SHA는 Git 연동 배포에만 붙으므로, CLI 배포에서는 빌드 때 넣은
// 값을 쓴다(next.config.ts의 env).

export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json({
    commit: process.env.NEXT_PUBLIC_BUILD_COMMIT ?? process.env.VERCEL_GIT_COMMIT_SHA ?? 'unknown',
    builtAt: process.env.NEXT_PUBLIC_BUILD_TIME ?? 'unknown',
  })
}
