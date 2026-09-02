'use server'

import {
  BODY_KEYWORDS,
  DISCLOSURE_SAMPLE,
  MIN_CHARS,
  MIN_IMAGES,
  TITLE_KEYWORDS,
  checkBlogHtml,
  extractTitle,
  isLikelyBlogPostUrl,
  type RuleCheck,
} from '@/lib/blogPromoRules'
import { countBodyChars, countPhotos, fetchBlogPost } from '@/lib/blogPromoFetch'

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
    }
  | { ok: false; message: string }

/**
 * 실제 신청과 똑같은 판정을 돌리되 **아무것도 저장하거나 지급하지 않는다.**
 *
 * 왜 따로 두나: 규칙을 손볼 때마다 진짜 신청을 넣어 보면 접수 기록과 지급이 남아
 * DB가 실험 찌꺼기로 더러워진다. 판정만 떼어내 마음대로 돌릴 자리가 필요하다.
 */
export async function runBlogRuleTest(url: string, ownerCode: string): Promise<RuleTestResult> {
  const link = (url ?? '').trim()
  if (!isLikelyBlogPostUrl(link)) {
    return { ok: false, message: '글 주소를 정확히 넣어 주세요(블로그 첫 화면이 아니라 글 주소여야 해요).' }
  }

  const fetched = await fetchBlogPost(link)
  if (fetched.html === null) return { ok: false, message: fetched.reason }

  const photos = countPhotos(fetched.html)
  const chars = countBodyChars(fetched.html)
  const code = ownerCode.trim() || undefined
  const result = checkBlogHtml(fetched.html, photos, code, chars)

  // 태그를 걷어낸 본문 앞부분. 광고 문구가 '글 첫머리'에 있는지는 이 순서로 판정된다.
  const excerpt = fetched.html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
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
  }
}

/** 규칙 값을 화면에 그대로 보여 준다 — 문서와 코드가 갈리지 않게 코드에서 읽어 온다. */
export async function blogRuleSummary() {
  return {
    titleKeywords: [...TITLE_KEYWORDS],
    bodyKeywords: [...BODY_KEYWORDS],
    minImages: MIN_IMAGES,
    minChars: MIN_CHARS,
    disclosureSample: DISCLOSURE_SAMPLE,
  }
}
