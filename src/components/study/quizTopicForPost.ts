// 블로그 글에 붙일 맛보기 문제의 주제를 고른다.
//
// 글 페이지 한 곳만 고치면 39편 전부에 붙는데, 그러면 같은 카테고리 글을 여러 편 읽는
// 사람이 매번 같은 문제를 만난다. 그래서 카테고리마다 후보를 여러 개 두고 slug로
// 갈라 준다. 무작위가 아니라 slug 기반이라 같은 글은 늘 같은 문제를 보여 준다
// (서버·클라이언트 렌더가 갈리면 하이드레이션이 깨진다).

const BY_CATEGORY: Record<string, string[]> = {
  grammar: ['spelling', 'standard-words', 'loanword-spelling', 'honorifics'],
  writing: ['manuscript-guide', 'essay-guide', 'business-writing'],
  study: ['spelling', 'idioms', 'proverbs'],
  'mock-exam': ['idioms', 'expressions', 'proverbs'],
  // 시험 정보 글이 가장 많아, 후보가 하나면 14편이 같은 문제를 달게 된다.
  'exam-info': ['essay-guide', 'manuscript-guide', 'spelling', 'business-writing'],
  guide: ['spelling', 'manuscript-guide'],
}

export function quizTopicForPost(category: string, slug: string): string | null {
  // KBS 글에 서술형·원고지 문제를 붙이면 엉뚱하다(KBS는 전부 객관식이다).
  if (slug.includes('KBS')) return 'kbs-korean'
  const candidates = BY_CATEGORY[category]
  if (!candidates?.length) return null
  let sum = 0
  for (const ch of slug) sum = (sum + ch.codePointAt(0)!) % 100000
  return candidates[sum % candidates.length]
}
