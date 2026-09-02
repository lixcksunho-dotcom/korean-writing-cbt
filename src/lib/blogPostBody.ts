// 글쓴이가 쓴 본문만 떼어 낸다.
//
// 왜 필요한가(실측 2026-09-02): 네이버 PostView 문서에는 본문 말고도 옆 메뉴,
// 공지글 목록, 이웃 블로그가 함께 들어 있다. 문서 전체로 판정하면
//   · 공지글 목록에 걸린 옛 글 제목 "한국실용글쓰기 CBT 추천!"이 본문 낱말 조건을 통과시키고
//   · 그 글의 썸네일이 본문 사진으로 잡힌다
// 실제로 사진 0장·본문 16자짜리 빈 글이 '사진 1장, 낱말 2/4개'로 판정됐다.

/** 여는 태그부터 짝이 맞는 닫는 태그까지 잘라 낸다. 못 찾으면 null. */
function sliceBalanced(html: string, open: RegExp, tag: string): string | null {
  const m = open.exec(html)
  if (!m || m.index === undefined) return null
  const start = m.index
  const re = new RegExp('<' + tag + '\\b|</' + tag + '\\s*>', 'gi')
  re.lastIndex = start
  let depth = 0
  let hit: RegExpExecArray | null
  while ((hit = re.exec(html)) !== null) {
    if (hit[0][1] === '/') {
      depth -= 1
      if (depth === 0) return html.slice(start, hit.index + hit[0].length)
    } else {
      depth += 1
    }
  }
  return null
}

const BODY_PATTERNS: [RegExp, string][] = [
  // 네이버 스마트에디터 ONE — 지금 쓰는 에디터
  [/<div[^>]*class="[^"]*se-main-container[^"]*"[^>]*>/i, 'div'],
  // 네이버 구 에디터
  [/<div[^>]*id="postViewArea"[^>]*>/i, 'div'],
  [/<div[^>]*class="[^"]*se_component_wrap[^"]*"[^>]*>/i, 'div'],
  // 티스토리·워드프레스·브런치
  [/<div[^>]*class="[^"]*(?:entry-content|article_view|tt_article_useless_p_margin|post-content)[^"]*"[^>]*>/i, 'div'],
  [/<article[^>]*>/i, 'article'],
]

export type PostBody = {
  /** 본문 HTML. 못 찾으면 문서 전체가 들어온다. */
  html: string
  /** 본문 영역을 실제로 찾아냈는가. false면 문서 전체로 어림잡은 것이다. */
  found: boolean
}

export function extractPostBody(raw: string): PostBody {
  // 스크립트·주석 안의 <div>가 깊이 세기를 흐트러뜨린다 — 먼저 걷어낸다
  const html = raw
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')

  for (const [open, tag] of BODY_PATTERNS) {
    const body = sliceBalanced(html, open, tag)
    // 껍데기만 있는 빈 컨테이너는 못 찾은 것으로 본다
    if (body && body.length > 80) return { html: body, found: true }
  }
  return { html, found: false }
}
