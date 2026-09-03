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
