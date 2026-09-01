// 블로그 홍보 심사 규칙 — 무엇을 갖추면 이용권을 드리는지.
//
// 왜 규칙을 한 곳에 두는가: 신청 화면의 안내문, 자동 확인, 관리자 화면이 각자 다른
// 기준을 갖게 되면 "안내대로 썼는데 반려됐다"가 반드시 생긴다. 세 곳이 이 파일 하나를 본다.
//
// 자동 확인은 '거들 뿐'이다. 네이버·티스토리는 본문을 스크립트로 그리거나 iframe에
// 담아서, 서버가 글을 못 읽는 경우가 흔하다. 그때는 못 읽었다고 밝히고 사람이 본다 —
// 못 읽은 것을 '위반'으로 처리하면 멀쩡한 신청이 반려된다.

// 접수는 feedback 표를 재사용한다. path가 이 값이면 불편사항이 아니라 심사 신청이다.
// ('use server' 파일에서는 상수를 export할 수 없어 규칙 파일에 둔다 — 빌드가 막힌다.)
export const BLOG_REVIEW_PATH = '#promo/blog-review'

/** 제목에 이 중 하나는 들어가야 한다 */
export const TITLE_KEYWORDS = ['실글패스', '실용글쓰기시험'] as const

/** 본문에 이것들이 모두 들어가야 한다 */
export const BODY_KEYWORDS = ['실글패스', '실용글쓰기시험', '실용글쓰기CBT', '공기업자격증'] as const

/** 사진 최소 장수 */
export const MIN_IMAGES = 5

/** 승인 시 지급 일수 */
export const REWARD_DAYS = 30

export type RuleCheck = { rule: string; ok: boolean; detail: string }
export type BlogPromoResult = {
  /** 자동으로 판정할 수 있었는가. false면 사람이 봐야 한다. */
  readable: boolean
  checks: RuleCheck[]
  /** 자동 확인만으로 모든 조건을 만족했는가 */
  allPassed: boolean
}

/** 검사·비교용으로 공백과 대소문자를 지운다 — '실용글쓰기 CBT'처럼 띄어 쓰는 사람이 많다. */
function squash(s: string): string {
  return s.replace(/\s+/g, '').toLowerCase()
}

/** 태그를 걷어내고 글자만 남긴다(본문 판정용) */
function textOf(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
}

/** <title>과 og:title 중 있는 것 */
export function extractTitle(html: string): string {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
  if (og) return og[1]
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return t ? t[1].trim() : ''
}

/** 본문 이미지 수. og:image만 있는 껍데기 문서를 사진으로 세지 않게 img 태그만 센다. */
export function countImages(html: string): number {
  return (html.match(/<img\b/gi) ?? []).length
}

/**
 * 받아 온 HTML로 규칙을 판정한다.
 * @param html 신청한 주소에서 받아 온 문서
 */
export function checkBlogHtml(html: string): BlogPromoResult {
  const title = extractTitle(html)
  const body = squash(textOf(html))
  // 본문이 거의 비어 있으면 스크립트로 그리는 블로그다 — 읽은 척하지 않는다.
  const readable = body.length >= 400

  const titleHit = TITLE_KEYWORDS.filter(k => squash(title).includes(squash(k)))
  const bodyMissing = BODY_KEYWORDS.filter(k => !body.includes(squash(k)))
  const images = countImages(html)

  const checks: RuleCheck[] = [
    {
      rule: `제목에 ${TITLE_KEYWORDS.join(' 또는 ')}`,
      ok: titleHit.length > 0,
      detail: title ? (titleHit.length ? `찾음: ${titleHit.join(', ')}` : `제목: ${title.slice(0, 40)}`) : '제목을 못 읽음',
    },
    {
      rule: `본문에 ${BODY_KEYWORDS.join(', ')}`,
      ok: readable && bodyMissing.length === 0,
      detail: !readable ? '본문을 못 읽음' : bodyMissing.length ? `빠짐: ${bodyMissing.join(', ')}` : '모두 있음',
    },
    {
      rule: `사진 ${MIN_IMAGES}장 이상`,
      ok: images >= MIN_IMAGES,
      detail: `${images}장`,
    },
  ]

  return { readable, checks, allPassed: readable && checks.every(c => c.ok) }
}

/** 신청 주소가 블로그 글 주소로 보이는지 — 오타·홈 주소 제출을 걸러 준다. */
export function isLikelyBlogPostUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim())
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false
    // 도메인만 적어 낸 경우(글이 아니라 블로그 첫 화면)
    return u.pathname.replace(/\/+$/, '').length > 1
  } catch {
    return false
  }
}
