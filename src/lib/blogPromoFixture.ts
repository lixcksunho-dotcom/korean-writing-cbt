import {
  BODY_KEYWORDS,
  MIN_CHARS,
  MIN_IMAGES,
  MIN_QA,
  TITLE_KEYWORDS,
} from './blogPromoRules.ts'

// 판정기가 살아 있는지 확인할 표본 글.
//
// 왜 필요한가: 판정은 네이버가 내려주는 HTML 모양에 기대고 있다. 저쪽이 구조를 바꾸면
// 우리 추출기가 조용히 빈 본문을 읽고, 그때부터 **모든 신청이 '조건 미달'로 떨어진다.**
// 화면도 빌드도 멀쩡하니 아무도 모른다 — 신청이 안 들어오는 것과 구분이 안 된다.
//
// 그래서 '이런 글이면 반드시 통과한다'를 코드로 박아 두고, 실험실을 열 때마다 돌린다.
// 이게 떨어지면 신청자 글이 아니라 판정기가 고장 난 것이다.
//
// 규칙 값(낱말·장수·글자수)에서 만들어 낸다. 규칙을 고치면 표본도 따라 바뀌므로
// '규칙은 바꿨는데 표본은 옛날 것'이 될 수 없다.

/** 조건을 모두 채우는 글. 실제 네이버 본문 구조(se-main-container)를 흉내 낸다. */
export function passingPostHtml(): string {
  const title = `${TITLE_KEYWORDS[0]} 한 달 써 본 후기`

  // 광고 표시는 글 첫머리에 있어야 한다(공정위 표시 의무).
  const disclosure = `광고 · 이 글은 ${TITLE_KEYWORDS[0]}로부터 이용권을 무료로 제공받아 작성했습니다.`

  // 물음표 뒤에 답이 이어져야 '스스로 묻고 답한 곳'으로 센다.
  const qa = Array.from({ length: MIN_QA }, (_, i) =>
    `<p>Q${i + 1}. 독학으로도 준비할 수 있을까요?</p>` +
    `<p>혼자서도 됩니다. 다만 서술형은 스스로 채점하기 어려워서, 채점해 주는 도구를 하나 두는 편이 훨씬 빨랐습니다. ` +
    `저는 실제로 그렇게 준비했고 시간이 많이 줄었어요.</p>`,
  ).join('')

  // 본문 낱말을 모두 넣고, 글자 수를 넉넉히 채운다.
  const filler = `${BODY_KEYWORDS.join(' ')} 시험을 준비하면서 느낀 점을 적어 둡니다. `
  const body = filler.repeat(Math.ceil((MIN_CHARS * 1.3) / filler.length))

  // 사진은 서로 다른 주소여야 한 장씩 센다(같은 사진을 여러 번 붙여 장수를 채우는 것을 막는다).
  const images = Array.from({ length: MIN_IMAGES }, (_, i) =>
    `<div class="se-module se-module-image"><img src="https://postfiles.pstatic.net/sample-${i + 1}.jpg" alt=""></div>`,
  ).join('')

  return [
    '<html><head>',
    `<meta property="og:title" content="${title}">`,
    `<title>${title}</title>`,
    '</head><body>',
    // 옆 메뉴·공지 목록이 있어도 본문만 읽어야 한다 — 그 함정도 함께 시험한다.
    '<div class="blog-menu"><a href="/x">다른 사람 글: 공기업자격증 후기</a></div>',
    '<div class="se-main-container">',
    `<p>${disclosure}</p>`,
    images,
    `<p>${body}</p>`,
    qa,
    '</div>',
    '</body></html>',
  ].join('')
}

/** 광고 표시만 빠진 글. 그 규칙이 실제로 걸러내는지 확인할 때 쓴다. */
export function missingDisclosureHtml(): string {
  return passingPostHtml().replace(/광고 · 이 글은[^<]*/, '오늘은 시험 후기를 써 봅니다.')
}
