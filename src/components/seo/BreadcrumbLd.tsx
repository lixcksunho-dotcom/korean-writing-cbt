// 검색결과에 '홈 › 학습 자료 › {name}' 경로(빵부스러기)를 노출하는 BreadcrumbList 구조화데이터.
// 서버 컴포넌트 — script 태그만 출력한다. 부모(parent)를 안 주면 '학습 자료(/guides)'가 기본.
const SITE = 'https://kptest.cloud'

export default function BreadcrumbLd({
  name,
  path,
  parent = { name: '학습 자료', path: '/guides' },
}: {
  name: string
  path: string
  parent?: { name: string; path: string }
}) {
  const itemListElement = [
    { '@type': 'ListItem', position: 1, name: '홈', item: `${SITE}/` },
    { '@type': 'ListItem', position: 2, name: parent.name, item: `${SITE}${parent.path}` },
    { '@type': 'ListItem', position: 3, name, item: `${SITE}${path}` },
  ]
  const ld = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
}
