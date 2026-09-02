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

/** 본문 최소 글자 수(공백 제외). 체험단 기준이 보통 1,000~1,500자다.
 *  한두 줄 쓰고 사진만 붙인 글은 홍보가 되지 않는다. */
export const MIN_CHARS = 1500

/** 승인 시 지급 일수 */
export const REWARD_DAYS = 30

// ── 공정위 표시 의무 ────────────────────────────────────────────────────────
//
// 이용권을 주고 글을 받으면 그것은 광고다. '추천·보증 등에 관한 표시·광고 심사지침'에
// 따라 **경제적 이해관계를 밝혀야 한다.** 안 밝히면 광고주(우리)가 제재를 받는다 —
// 시정명령, 관련매출액 2% 이내 과징금까지 갈 수 있다. 글쓴이만의 문제가 아니다.
//
// 그래서 '있으면 좋은 것'이 아니라 **없으면 지급하지 않는 조건**으로 둔다.
//
// 규정에서 확인한 것(2026-09-02):
//  · 위치 — 제목 또는 본문 첫 부분. '더보기'를 눌러야 보이는 자리·댓글은 인정 안 됨
//  · 형식 — 배경과 구분되게, 알아보기 쉬운 크기·색
//  · 금지 — '체험단', '체험 후기', 'AD', 'PR', '내돈내산',
//           '소정의 수수료를 지급받을 수 있음'처럼 조건부·불확정 표현

/** 이 중 하나가 글에 있어야 한다(지침의 표준 문구 계열) */
export const DISCLOSURE_PHRASES = [
  '광고',            // '유료광고'·'광고 포함'도 이 낱말을 품는다
  '유료 광고',
  '대가를 받',       // '소정의 대가를 받고 작성'
  '무료로 제공받',
  '이용권을 제공받',
  '무상으로 제공받',
] as const

/** 이런 표현만으로는 공개로 인정되지 않는다 */
export const DISCLOSURE_NOT_ENOUGH = [
  '체험단', '체험후기', '체험 후기', '내돈내산', '기자단',
  'AD', 'PR', 'Advertisement', 'sponsored',
  '지급받을 수 있', '제공받을 수 있',   // 조건부·불확정 표현
] as const

/** 우리가 권하는 문구 — 화면과 안내가 같은 문장을 쓴다 */
export const DISCLOSURE_SAMPLE =
  '이 글은 실글패스로부터 이용권을 무료로 제공받아 작성한 광고입니다.'

export type RuleCheck = {
  rule: string
  ok: boolean
  detail: string
  /** 낱말별 통과 여부. 있으면 화면에서 하나씩 ✓/✗로 보여 준다. */
  items?: { label: string; ok: boolean }[]
}
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
 * @param html    신청한 주소에서 받아 온 문서(본문이 들어 있는 것)
 * @param photos  본문 사진 수(사이트마다 세는 법이 달라 밖에서 세어 넘긴다)
 */
export function checkBlogHtml(html: string, photos?: number, bodyChars?: number): BlogPromoResult {
  const title = extractTitle(html)
  const raw = textOf(html)
  const body = squash(raw)
  // 본문이 거의 비어 있으면 스크립트로 그리는 블로그다 — 읽은 척하지 않는다.
  const readable = body.length >= 400

  const titleHit = TITLE_KEYWORDS.filter(k => squash(title).includes(squash(k)))
  const bodyMissing = BODY_KEYWORDS.filter(k => !body.includes(squash(k)))
  const images = photos ?? (html.match(/<img/gi) ?? []).length
  // 글자 수는 본문만 세어 밖에서 넘긴다(네이버는 UI 글자가 1,000자 넘게 섞인다)
  const chars = bodyChars ?? body.length

  const checks: RuleCheck[] = [
    {
      rule: `제목에 ${TITLE_KEYWORDS.join(' 또는 ')} 중 하나`,
      ok: titleHit.length > 0,
      detail: !title ? '제목을 못 읽음' : `제목: ${title.slice(0, 60)}`,
      items: TITLE_KEYWORDS.map(k => ({ label: k, ok: titleHit.includes(k) })),
    },
    {
      rule: `본문에 ${BODY_KEYWORDS.length}개 낱말 모두`,
      ok: readable && bodyMissing.length === 0,
      detail: !readable ? '본문을 못 읽음'
        : bodyMissing.length ? `${BODY_KEYWORDS.length - bodyMissing.length}/${BODY_KEYWORDS.length}개 있음`
        : '모두 있음',
      items: BODY_KEYWORDS.map(k => ({ label: k, ok: readable && !bodyMissing.includes(k) })),
    },
    {
      rule: `사진 ${MIN_IMAGES}장 이상`,
      ok: images >= MIN_IMAGES,
      detail: images >= MIN_IMAGES ? `${images}장` : `${images}장 — ${MIN_IMAGES - images}장 더 필요해요`,
    },
    {
      rule: `본문 ${MIN_CHARS.toLocaleString('ko-KR')}자 이상`,
      ok: readable && chars >= MIN_CHARS,
      detail: !readable ? '본문을 못 읽음'
        : chars >= MIN_CHARS ? `${chars.toLocaleString('ko-KR')}자`
        : `${chars.toLocaleString('ko-KR')}자 — ${(MIN_CHARS - chars).toLocaleString('ko-KR')}자 더 필요해요`,
    },
  ]

  // 공정위 표시 의무 — 없으면 지급하지 않는다. 안 밝히면 광고주인 우리가 제재를 받는다.
  {
    const head = squash(raw.slice(0, 600))     // 제목~본문 첫머리
    const anywhere = squash(raw)
    const hasPhrase = DISCLOSURE_PHRASES.some(k => anywhere.includes(squash(k)))
    const inHead = DISCLOSURE_PHRASES.some(k => head.includes(squash(k)))
    const weakOnly = !hasPhrase && DISCLOSURE_NOT_ENOUGH.some(k => anywhere.includes(squash(k)))
    checks.push({
      rule: '광고임을 밝히는 문구(글 첫머리)',
      ok: readable && hasPhrase && inHead,
      detail: !readable ? '본문을 못 읽음'
        : !hasPhrase ? (weakOnly ? "'체험단'·'AD' 같은 말로는 부족합니다 — '광고' 또는 '대가를 받고'가 들어가야 해요" : '못 찾음')
        : !inHead ? '글 뒤쪽에 있어요 — 제목이나 첫 부분으로 옮겨 주세요'
        : '확인됨',
    })
  }


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
