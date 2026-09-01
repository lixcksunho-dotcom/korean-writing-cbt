'use server'

// 현재 시각을 렌더 밖에서 읽는다.
// 서버 컴포넌트 본문·map 콜백에서 Date.now()를 부르면 '렌더 중 비순수 호출' 규칙에
// 걸린다. 시각이 필요한 화면은 이 함수로 받아 순수 함수에 인자로 넘긴다.
export async function serverNow(): Promise<number> {
  return Date.now()
}
