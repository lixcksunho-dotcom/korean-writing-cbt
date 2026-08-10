import { redirect } from 'next/navigation'

// 로그인 화면으로 보내면서 '가려던 곳'을 남긴다.
//
// 원래는 미들웨어(src/proxy.ts)가 이 일을 하도록 만들었는데, 배포 환경에서는 그게
// 실행되지 않는다. Next 16이 proxy를 빌드는 하면서도 middleware-manifest.json 에
// 등록하지 않고(비어 있다), Vercel은 그 매니페스트를 보고 배선한다. 로컬 next start 는
// 산출물을 직접 읽어 돌기 때문에 로컬에서만 되는 상태였다.
//
// 그래서 각 화면이 직접 남긴다. 미들웨어가 되살아나도 충돌하지 않는다 —
// 어느 쪽이 먼저 잡든 결과는 같다.
export function redirectToLogin(next: string): never {
  redirect(`/login?next=${encodeURIComponent(next)}`)
}
