import { getAllPosts, catTheme } from '@/lib/blog'

const SITE_URL = 'https://kptest.cloud'

// 네이버 서치어드바이저는 소유확인·사이트맵과 별개로 RSS 제출을 받는다.
// 사이트맵이 '어떤 URL이 있는지'라면 RSS는 '무엇이 새로 올라왔는지'라, 신규 글 수집이 빨라진다.
export const dynamic = 'force-static'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// RSS pubDate는 RFC822 고정 포맷 — 로케일에 흔들리지 않게 직접 조립한다.
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function rfc822(iso: string): string {
  const d = new Date(`${iso}T09:00:00+09:00`)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${DAYS[d.getUTCDay()]}, ${p(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} GMT`
}

export function GET(): Response {
  const posts = getAllPosts()
  const items = posts
    .map((p) => {
      // 한글 슬러그는 인코딩해야 리더·수집기가 링크를 깨뜨리지 않는다(sitemap과 동일 규칙).
      const url = `${SITE_URL}/blog/${encodeURIComponent(p.slug)}`
      const date = rfc822(p.date)
      return [
        '    <item>',
        `      <title>${esc(p.title)}</title>`,
        `      <link>${url}</link>`,
        `      <guid isPermaLink="true">${url}</guid>`,
        `      <description>${esc(p.excerpt)}</description>`,
        `      <category>${esc(p.categoryLabel || catTheme(p.category).label)}</category>`,
        date ? `      <pubDate>${date}</pubDate>` : '',
        '    </item>',
      ]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>실글패스 블로그</title>
    <link>${SITE_URL}/blog</link>
    <description>한국실용글쓰기·KBS한국어능력시험 시험 정보, 공부법, 맞춤법·서술형 작성법</description>
    <language>ko</language>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  })
}
