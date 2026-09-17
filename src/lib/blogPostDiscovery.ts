// 죽은 주소를 그 블로그의 실글패스 글로 되찾는다.
//
// 왜 필요한가: 손님이 글을 고쳐 다시 올리면 네이버는 새 글 번호를 준다(옛 번호는 404).
// 대문 주소만 낸 사람도 있다. 사후 확인이 옛 주소를 붙들고 매 회차 '못 읽음'을 알리는
// 대신, 네이버가 로그인 없이 공개로 주는 RSS(rss.blog.naver.com/{id}.xml)에서 제목에
// 정한 낱말이 든 글을 찾아 그 글로 바꾼다(운영자 지시 2026-09-17 "그 블로그에 실글패스
// 글이 보이면 그 글로 대체해"). RSS 는 최근 글 50개의 제목·주소를 준다(실측).
import { TITLE_KEYWORDS } from './blogPromoRules.ts'

export type RssPost = { title: string; url: string }

/** 네이버 블로그 주소(대문·글 어느 쪽이든)에서 블로그 id 를 뽑는다. 네이버가 아니면 null. */
export function naverBlogId(raw: string): string | null {
  const m = raw.trim().match(/blog\.naver\.com\/(?:PostView\.naver\?blogId=)?([A-Za-z0-9_-]+)/)
  return m ? m[1] : null
}

/** RSS 문서에서 글 제목·주소만 뽑는다. 제목은 CDATA 안에 있고, 주소는 guid 가 깨끗하다
 *  (link 는 ?fromRss=… 꼬리가 붙는다). 순수 함수라 검사에서 그대로 돌린다. */
export function parseRssPosts(xml: string): RssPost[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .map(m => m[1])
    .map(it => ({
      title: (it.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1] ?? '').trim(),
      url: (it.match(/<guid>([^<]*)<\/guid>/)?.[1] ?? '').trim(),
    }))
    .filter(p => p.title && p.url)
}

/** 제목 대조는 심사 규칙과 같은 방식(공백·대소문자 무시)이어야 같은 글을 같은 답으로 본다. */
const squash = (s: string) => s.replace(/\s+/g, '').toLowerCase()

/** 제목에 정한 낱말이 든 첫 글. RSS 는 새 글이 앞이라 가장 최근 후기가 잡힌다. 없으면 null. */
export function pickPromoPost(posts: RssPost[]): RssPost | null {
  return posts.find(p => TITLE_KEYWORDS.some(k => squash(p.title).includes(squash(k)))) ?? null
}

const UA = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0 Safari/537.36',
}

/** 그 블로그의 실글패스 글. 네이버가 아니거나 못 찾으면 null — 대체할 글이 없다는 뜻이다. */
export async function discoverPromoPost(raw: string): Promise<RssPost | null> {
  const id = naverBlogId(raw)
  if (!id) return null
  try {
    const res = await fetch(`https://rss.blog.naver.com/${id}.xml`, { headers: UA, signal: AbortSignal.timeout(12000) })
    if (!res.ok) return null
    return pickPromoPost(parseRssPosts(await res.text()))
  } catch {
    return null // RSS 가 잠깐 막힌 것으로 남의 주소를 바꾸면 안 된다 — 이번 회차는 그냥 넘긴다
  }
}
