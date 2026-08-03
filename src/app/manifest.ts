import type { MetadataRoute } from 'next'

// 홈 화면에 추가했을 때 앱처럼 열리게 한다.
// 이 시험은 몇 주에 걸쳐 반복해서 들어오는 종류라, 아이콘 한 번 박아 두면 재방문이 쉬워진다.
//
// 서비스 워커는 두지 않는다. 안드로이드 설치 배너는 워커가 있어야 뜨지만, 문항·시험 화면을
// 캐시가 대신 내주면 지난 회차나 낡은 문제가 보일 수 있다. iOS의 '홈 화면에 추가'는
// 워커 없이도 이 매니페스트만으로 앱처럼 열린다 — 위험을 지고 얻을 만큼은 아니다.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '실글패스 — 한국실용글쓰기 · KBS한국어 CBT',
    short_name: '실글패스',
    description:
      '기출 유형 CBT 모의고사와 서술형·원고지 AI 채점·첨삭. 실전과 같은 제한 시간으로 풀고 바로 채점받으세요.',
    lang: 'ko',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f8fafc',
    theme_color: '#0f1f3d',
    categories: ['education'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: '무료 CBT 모의고사', short_name: 'CBT', url: '/cbt' },
      { name: '원고지 AI 첨삭', short_name: 'AI 첨삭', url: '/manuscript' },
      { name: '학습 자료 모음', short_name: '학습자료', url: '/guides' },
    ],
  }
}
