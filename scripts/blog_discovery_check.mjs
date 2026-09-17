// 죽은 주소를 그 블로그의 실글패스 글로 되찾는 부품이 맞게 도는지 본다.
//   npm run check:blog-discovery
//
// 왜 필요한가: 사후 확인이 옛 글 번호(404)·대문 주소를 붙들고 매 회차 '못 읽음'을
// 알렸다(2026-09-16 실측: 12건 중 9건). RSS 로 그 블로그의 실글패스 글을 찾아 바꾸는데,
// 잘못 잡으면 남의 글·엉뚱한 글로 바꿔 버린다. 네트워크 없이 실제 RSS 생김새로 대조한다.

import { naverBlogId, parseRssPosts, pickPromoPost } from '../src/lib/blogPostDiscovery.ts'

let pass = 0, fail = 0
const ok = (n, d = '') => { pass++; console.log(`  ○ ${n}${d ? ` — ${d}` : ''}`) }
const bad = (n, d = '') => { fail++; console.log(`  × ${n}${d ? ` — ${d}` : ''}`) }
const is = (name, got, want) => (got === want ? ok(name, String(got)) : bad(name, `${got} (기대 ${want})`))

console.log('\n블로그 실글패스 글 되찾기\n')

// ── 블로그 id 뽑기 ──────────────────────────────────────────────────────────
is('대문 주소', naverBlogId('https://blog.naver.com/hwa_annn'), 'hwa_annn')
is('글 주소', naverBlogId('https://blog.naver.com/jin2jjin2/224412606372'), 'jin2jjin2')
is('PostView 주소', naverBlogId('https://blog.naver.com/PostView.naver?blogId=ida0717&logNo=224409589259'), 'ida0717')
is('네이버가 아니면 null', naverBlogId('https://somebody.tistory.com/12'), null)

// ── 실제 RSS 생김새(2026-09-17 rss.blog.naver.com 실측 축약) ────────────────
const RSS = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>김레또</title>
<link>https://blog.naver.com/jin2jjin2</link>
<item><author>jin2jjin2</author><category><![CDATA[맛집]]></category>
<title><![CDATA[불끈낙지보쌈 덕천점 | 불향 가득 낙지 볶음 · 덕천역 근처 밥집 추천]]></title>
<link><![CDATA[https://blog.naver.com/jin2jjin2/224415026620?fromRss=true&trackingCode=rss]]></link>
<guid>https://blog.naver.com/jin2jjin2/224415026620</guid><pubDate>Thu, 17 Sep 2026 16:07:14 +0900</pubDate></item>
<item><author>jin2jjin2</author><category><![CDATA[자격증]]></category>
<title><![CDATA[실용글쓰기시험 실글패스 | 무료 모의고사 사이트·CBT 문제·서술형 9번 모음]]></title>
<link><![CDATA[https://blog.naver.com/jin2jjin2/224412618624?fromRss=true&trackingCode=rss]]></link>
<guid>https://blog.naver.com/jin2jjin2/224412618624</guid><pubDate>Tue, 15 Sep 2026 16:21:00 +0900</pubDate></item>
<item><author>jin2jjin2</author>
<title><![CDATA[제주 카이트서핑 후기]]></title>
<guid>https://blog.naver.com/jin2jjin2/224400000001</guid></item>
</channel></rss>`

const posts = parseRssPosts(RSS)
is('글 3개를 읽는다', posts.length, 3)
is('제목은 CDATA 안에서 꺼낸다', posts[1].title.startsWith('실용글쓰기시험 실글패스'), true)
is('주소는 guid(꼬리 없는 것)를 쓴다', posts[0].url, 'https://blog.naver.com/jin2jjin2/224415026620')

// ── 고르기 ──────────────────────────────────────────────────────────────────
const hit = pickPromoPost(posts)
is('제목에 정한 낱말이 든 글을 고른다', hit?.url, 'https://blog.naver.com/jin2jjin2/224412618624')
is('맛집 글은 안 고른다(첫 글이라도)', hit?.url !== posts[0].url, true)
is('공백·대소문자를 무시한다', pickPromoPost([{ title: '실 글 패 스 후기', url: 'u' }])?.url, 'u')
is('낱말 없는 블로그는 null(대체할 글 없음 — hwa_annn 실측)', pickPromoPost(posts.filter((_, i) => i !== 1)), null)
is('빈 RSS 는 null', pickPromoPost(parseRssPosts('<rss></rss>')), null)

console.log(`\n${pass}건 통과 · ${fail}건 실패 — ${fail ? '되찾기에 구멍이 있다.' : '제 글만 되찾는다.'}`)
process.exit(fail ? 1 : 0)
