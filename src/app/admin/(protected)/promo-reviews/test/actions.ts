'use server'

import {
  BODY_KEYWORDS,
  DISCLOSURE_SAMPLE,
  MIN_CHARS,
  MIN_IMAGES,
  MIN_QA,
  TITLE_KEYWORDS,
  checkBlogHtml,
  extractTitle,
  isLikelyBlogPostUrl,
  type RuleCheck,
} from '@/lib/blogPromoRules'
import { countBodyChars, countPhotos, fetchBlogPost } from '@/lib/blogPromoFetch'
import { passingPostHtml, missingDisclosureHtml } from '@/lib/blogPromoFixture'
import { extractPostBody } from '@/lib/blogPostBody'

export type RuleTestResult =
  | {
      ok: true
      via: string
      title: string
      photos: number
      chars: number
      checks: RuleCheck[]
      allPassed: boolean
      /** 판정기가 실제로 읽어 낸 본문 — 규칙이 왜 걸렸는지 눈으로 확인한다 */
      excerpt: string
      /** 글쓴이 본문 영역을 찾아냈는지. 못 찾으면 판정이 통째로 달라진다. */
      bodyFound: boolean
    }
  | { ok: false; message: string }

/**
 * 실제 신청과 똑같은 판정을 돌리되 **아무것도 저장하거나 지급하지 않는다.**
 *
 * 왜 따로 두나: 규칙을 손볼 때마다 진짜 신청을 넣어 보면 접수 기록과 지급이 남아
 * DB가 실험 찌꺼기로 더러워진다. 판정만 떼어내 마음대로 돌릴 자리가 필요하다.
 */
export async function runBlogRuleTest(url: string): Promise<RuleTestResult> {
  const link = (url ?? '').trim()
  if (!isLikelyBlogPostUrl(link)) {
    return { ok: false, message: '글 주소를 정확히 넣어 주세요(블로그 첫 화면이 아니라 글 주소여야 해요).' }
  }

  const fetched = await fetchBlogPost(link)
  if (fetched.html === null) return { ok: false, message: fetched.reason }

  const photos = countPhotos(fetched.html)
  const chars = countBodyChars(fetched.html)
  const result = checkBlogHtml(fetched.html, photos, chars)

  // 판정기가 실제로 읽는 것과 **같은 본문**을 보여 준다.
  //
  // 예전에는 문서 전체에서 태그만 걷어내 보여 줬다. 그런데 판정은 글쓴이가 쓴 본문만
  // 떼어내서 본다(옆 메뉴·공지 목록이 조건을 통과시키던 일이 있었다). 둘이 다르면
  // 화면에는 광고 문구가 보이는데 판정은 '못 찾음'이라고 답하는 일이 생긴다 —
  // 실험실이 거짓말을 하는 셈이라, 규칙을 고칠 때 엉뚱한 곳을 뜯게 된다.
  const post = extractPostBody(fetched.html)
  const excerpt = post.html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|​/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1200)

  return {
    ok: true,
    via: fetched.via,
    title: extractTitle(fetched.html) || '(제목을 읽지 못함)',
    photos,
    chars,
    checks: result.checks,
    allPassed: result.allPassed,
    excerpt,
    bodyFound: post.found,
  }
}

/** 규칙 값을 화면에 그대로 보여 준다 — 문서와 코드가 갈리지 않게 코드에서 읽어 온다. */
export async function blogRuleSummary() {
  return {
    titleKeywords: [...TITLE_KEYWORDS],
    bodyKeywords: [...BODY_KEYWORDS],
    minImages: MIN_IMAGES,
    minChars: MIN_CHARS,
    minQa: MIN_QA,
    disclosureSample: DISCLOSURE_SAMPLE,
  }
}

/**
 * 붙여넣은 글로 판정한다. 주소를 못 읽는 상황에서도 규칙을 시험할 수 있어야 한다.
 *
 * 왜 필요한가: 비공개 글, 아직 안 올린 초안, 네이버가 우리를 막은 경우에는 주소로
 * 시험할 방법이 없다. 그런데 규칙을 고칠 때 가장 보고 싶은 것이 바로 그런 글이다.
 *
 * 태그가 없는 맨 글이면 본문 영역으로 감싸 준다 — 안 그러면 추출기가 본문을 못 찾는다.
 */
export async function runBlogRuleTestOnHtml(raw: string, title = ''): Promise<RuleTestResult> {
  const text = (raw ?? '').trim()
  if (text.length < 50) return { ok: false, message: '글을 붙여넣어 주세요(50자 이상).' }

  const looksLikeHtml = /<[a-z][\s\S]*>/i.test(text)
  const html = looksLikeHtml
    ? text
    : [
        '<html><head>',
        `<meta property="og:title" content="${title.replace(/"/g, '&quot;')}">`,
        `<title>${title}</title>`,
        '</head><body><div class="se-main-container">',
        // 빈 줄로 문단을 나누고, 한 줄 바꿈은 <br>로 둔다.
        text.split(/\n{2,}/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join(''),
        '</div></body></html>',
      ].join('')

  const photos = countPhotos(html)
  const chars = countBodyChars(html)
  const result = checkBlogHtml(html, photos, chars)
  const post = extractPostBody(html)

  return {
    ok: true,
    via: looksLikeHtml ? '붙여넣은 HTML' : '붙여넣은 글(본문으로 감쌈)',
    title: extractTitle(html) || (title || '(제목 없음)'),
    photos,
    chars,
    checks: result.checks,
    allPassed: result.allPassed,
    excerpt: post.html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;|​/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1200),
    bodyFound: post.found,
  }
}

/**
 * 판정기가 아직 살아 있는지 스스로 확인한다.
 *
 * 판정은 네이버 HTML 모양에 기대고 있어서, 저쪽이 바뀌면 우리 추출기가 조용히 빈 본문을
 * 읽고 **모든 신청이 조건 미달로 떨어진다.** 화면도 빌드도 멀쩡해서 아무도 모르고,
 * '신청이 안 들어온다'와 구분이 안 된다. 그래서 실험실을 열 때마다 표본으로 확인한다.
 */
export async function judgeSelfTest() {
  const good = passingPostHtml()
  const bad = missingDisclosureHtml()
  const goodResult = checkBlogHtml(good, countPhotos(good), countBodyChars(good))
  const badResult = checkBlogHtml(bad, countPhotos(bad), countBodyChars(bad))
  const badDisclosureOnly =
    !badResult.allPassed && badResult.checks.filter(c => !c.ok).length === 1

  return {
    passes: goodResult.allPassed,
    catchesMissingDisclosure: badDisclosureOnly,
    failedRules: goodResult.checks.filter(c => !c.ok).map(c => `${c.rule} (${c.detail})`),
  }
}
