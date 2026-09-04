import type { NextConfig } from "next";

// turbopack.root를 반드시 지정해야 한다. 안 주면 Turbopack이 폴더 이름(`실용글쓰기`)에서
// 프로젝트 식별자를 만들다가 한글에서 바이트 경계를 잘못 잘라 빌드가 통째로 깨진다.
//   TurbopackInternalError: start byte index 4 is not a char boundary; it is inside '용'
//
// 예전엔 이 값이 "C:\\Users\\선호\\실용글쓰기"로 박혀 있었다. 내 컴퓨터에서는 맞지만
// Vercel(리눅스)에는 없는 경로다. 그래서 **배포된 서버에서는 proxy(미들웨어)가 아예
// 실행되지 않았다** — 로그인 상태로 /login에 가도 안 튕기고, 보호 경로 리다이렉트도
// 미들웨어가 아니라 각 페이지의 redirect('/login')가 대신하고 있었다.
// (다행히 페이지가 자체 검사를 해서 보안 구멍은 아니었다.)
//
// 빌드가 실행되는 곳의 절대경로를 쓴다. 로컬에서는 예전과 같은 값이 되고, Vercel에서는
// 체크아웃된 경로가 된다. import.meta.dirname 대신 process.cwd()를 쓰는 이유는,
// 설정 파일이 CJS로 변환되는 환경에서 import.meta가 깨질 수 있기 때문이다 —
// 설정이 깨지면 빌드가 통째로 실패하고 예전 배포가 그대로 살아 있게 된다.
// 브라우저에 지시하는 기본 방어선. 넣지 않으면 브라우저는 관대한 쪽으로 동작한다.
//
// CSP(스크립트 출처 제한)는 **일부러 뺐다**. 결제창(포트원·이니시스)·구글 로그인이
// 여러 도메인을 오가는데, 목록을 하나라도 빠뜨리면 결제가 통째로 막힌다.
// 막는 이득보다 결제가 죽는 손해가 크다 — 넣으려면 실제 결제창을 띄워 놓고
// 하나씩 확인하면서 붙여야 한다(그때까지는 여기 없는 게 맞다).
const SECURITY_HEADERS = [
  // 우리 화면을 남의 사이트가 iframe으로 덮어씌워 클릭을 가로채는 것을 막는다.
  // DENY가 아니라 SAMEORIGIN인 이유: 우리 화면 안에서 우리 화면을 여는 경우를 남겨 둔다.
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // 브라우저가 파일 내용을 보고 타입을 멋대로 추측하지 못하게 한다(업로드물 실행 방지).
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // 외부로 나갈 때 전체 주소를 넘기지 않는다. 주소에 세션·주문번호가 실릴 수 있다.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // 쓰지 않는 장치 권한은 아예 닫아 둔다.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
];

// 빌드 시점의 커밋을 값으로 박는다. 배포가 뒤처졌는지 밖에서 물어볼 수 있어야 한다.
function buildCommit(): string {
  const fromVercel = process.env.VERCEL_GIT_COMMIT_SHA
  if (fromVercel) return fromVercel.slice(0, 7)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('node:child_process').execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'unknown'   // git이 없는 빌드 환경에서도 빌드는 깨지지 않아야 한다
  }
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_COMMIT: buildCommit(),
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
  // KBS 기능은 전용 서비스(kbstest.cloud)로 이전했다(2026-08-31). 북마크·검색으로
  // 들어오는 옛 주소를 새집으로 보낸다. proxy(미들웨어)가 아니라 여기 두는 이유:
  // 위 주석대로 배포 환경에서 미들웨어가 안 돌던 전례가 있고, 정적 리다이렉트는
  // 설정 계층이 가장 확실하다.
  async redirects() {
    // /try?t=slug 로 이미 내보낸 주소가 있다(사이트맵에 실렸다). 경로 방식으로 바꾸면서
    // 옛 주소가 죽으면 색인된 것이 통째로 사라진다 — 새 주소로 넘겨 준다. (try-topic-legacy)
    // 질의 문자열은 has 로 받고, 목적지에는 붙이지 않는다.

    return [
      {
        source: '/try',
        has: [{ type: 'query', key: 't', value: '(?<topic>[a-z]+)' }],
        destination: '/try/:topic',
        permanent: true,
      },
      { source: '/practice/kbs-types', destination: 'https://kbstest.cloud/practice', permanent: true },
      { source: '/cbt/kbs-:examId', destination: 'https://kbstest.cloud/cbt', permanent: true },
      { source: '/cbt/kbs-:examId/:path*', destination: 'https://kbstest.cloud/cbt', permanent: true },
    ];
  },
};

export default nextConfig;
