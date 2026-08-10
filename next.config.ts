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
const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
