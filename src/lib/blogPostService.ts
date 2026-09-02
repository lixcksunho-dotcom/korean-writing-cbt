import type { BlogCtaService } from '@/components/blog/BlogCTA'

// 이 글이 어느 시험을 다루는 글인가.
//
// 왜 필요한가: KBS한국어능력시험은 전 문항 객관식이라 '서술형 700점을 채점해 준다'는
// 제안이 아무 뜻이 없다. 그런데 KBS 글 16편이 전부 그 문구를 달고 있었다.
// 읽은 사람에게 맞지 않는 것을 팔면 그 자리에서 나간다.
//
// 제목으로 가른다 — 본문에는 비교·언급으로 두 이름이 다 나오지만, 제목은 그 글이
// 무엇에 대한 글인지를 말한다.

/** 실용글쓰기 글에도 KBS가 비교 대상으로 나온다 — 그런 글은 실용글쓰기 쪽이다. */
const SILYONG_MARKERS = ['실용글쓰기', '원고지', '실글패스']

export function blogPostService(title: string): BlogCtaService {
  const t = title.replace(/\s+/g, '')
  const kbs = t.includes('KBS한국어')
  if (!kbs) return 'silyong'
  // 두 시험을 함께 다루는 글(비교글)은 이 사이트 것으로 둔다 — 여기가 그 글의 집이다.
  if (SILYONG_MARKERS.some(m => t.includes(m.replace(/\s+/g, '')))) return 'silyong'
  return 'kbs'
}
