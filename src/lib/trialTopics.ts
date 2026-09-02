// 맛보기에서 고를 수 있는 유형.
//
// 왜 나눴나: 설명 페이지에서 세 문항을 풀고 '다른 유형도 풀어보기'를 누르면 늘 같은
// 다섯 문항이 나왔다. 첫 문항 문구까지 똑같아서, 다른 것을 준다고 해놓고 같은 것을
// 준 셈이다. 그리고 검색은 '맞춤법 문제'·'띄어쓰기 문제'처럼 유형으로 들어온다 —
// 유형이 주소에 있으면 그 사람이 찾던 것을 첫 화면에 바로 보여 줄 수 있다.
//
// 낱말은 문항 본문에서 찾는다. 유형 표가 따로 없어서다(있으면 그걸 썼을 것이다).

export type TrialTopic = {
  /** 주소에 쓰는 값 */
  slug: string
  label: string
  /** 문항 본문에서 찾을 낱말 */
  keyword: string
}

export const TRIAL_TOPICS: TrialTopic[] = [
  { slug: 'spelling', label: '맞춤법', keyword: '맞춤법' },
  { slug: 'loanword', label: '외래어 표기', keyword: '외래어' },
  { slug: 'spacing', label: '띄어쓰기', keyword: '띄어쓰기' },
  { slug: 'honorific', label: '높임 표현', keyword: '높임' },
  { slug: 'standard', label: '표준어', keyword: '표준어' },
  { slug: 'official', label: '공문서', keyword: '공문서' },
]

export function findTrialTopic(slug: string | undefined): TrialTopic | null {
  if (!slug) return null
  return TRIAL_TOPICS.find(t => t.slug === slug) ?? null
}
