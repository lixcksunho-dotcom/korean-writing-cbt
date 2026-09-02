// 판정 실험실이 (1) 실제 규칙을 그대로 쓰고 (2) 아무것도 저장·지급하지 않는지 확인한다.
import fs from 'node:fs'
import {
  checkBlogHtml,
  BODY_KEYWORDS,
  DISCLOSURE_SAMPLE,
  MIN_CHARS,
  MIN_IMAGES,
  TITLE_KEYWORDS,
  countSelfQa,
} from '../src/lib/blogPromoRules.ts'
import {
  blogFetchCandidates,
  countBodyChars,
  countPhotos,
  fetchBlogPost,
  naverBlockedReason,
} from '../src/lib/blogPromoFetch.ts'
import { extractPostBody } from '../src/lib/blogPostBody.ts'

let pass = 0, fail = 0
const ok = (n, c, d = '') => {
  if (c) pass++
  else fail++
  console.log(`${c ? '  OK' : '실패'}  ${n}${d && !c ? ` — ${d}` : ''}`)
}

const DIR = 'src/app/admin/(protected)/promo-reviews/test'
const actions = fs.readFileSync(`${DIR}/actions.ts`, 'utf8')
const page = fs.readFileSync(`${DIR}/page.tsx`, 'utf8')
const client = fs.readFileSync(`${DIR}/BlogRuleTester.tsx`, 'utf8')

// 지급·저장이 섞이면 실험이 실제 이용권을 만든다 — 실험실의 존재 이유가 무너진다.
for (const banned of ['insert(', 'update(', 'upsert(', 'delete(', 'createAdminClient', 'subscriptions']) {
  ok(`실험실이 ${banned} 를 쓰지 않음`, !actions.includes(banned))
}
ok('실제 규칙 모듈을 그대로 씀', actions.includes("from '@/lib/blogPromoRules'") && actions.includes("from '@/lib/blogPromoFetch'"))
ok('규칙 값을 코드에서 읽어 화면에 보여 줌', page.includes('blogRuleSummary') && page.includes('rules.minChars'))
ok('지급되지 않는다고 화면에 밝힘', client.includes('저장·지급되지 않습니다'))
ok('본문 미리보기를 보여 줌', client.includes('판정기가 읽은 본문'))
ok('관리자 목록에서 들어갈 링크가 있음',
  fs.readFileSync('src/app/admin/(protected)/promo-reviews/page.tsx', 'utf8').includes('/admin/promo-reviews/test'))

// 판정 자체 — 통과 글과, 조건별로 하나씩 어긋난 글
const body = (extra = '') =>
  `<html><head><title>실글패스로 실용글쓰기시험 준비한 후기</title></head><body>` +
  `<div class="se-module se-module-text"><p>${DISCLOSURE_SAMPLE}</p></div>` +
  Array.from({ length: 8 }, () => `<div class="se-module se-module-text"><p>${'실용글쓰기시험 준비하면서 실글패스를 썼습니다. 실용글쓰기CBT 모의고사가 특히 좋았고 공기업자격증 준비에 도움이 됐습니다. '.repeat(6)}</p></div>`).join('') +
  `<div class="se-module se-module-text"><p>실용글쓰기시험은 많이 어렵나요? 선택형은 평이한 편이지만 서술형이 배점의 대부분이라 여기서 등급이 갈립니다. 저도 첫 회차에 시간 배분이 무너져서 마지막 문항을 통째로 비웠습니다. 독학으로도 준비가 되나요? 서술형 채점만 해결되면 충분히 가능합니다. 저는 모의고사를 회차별로 풀면서 틀린 유형만 골라 반복하는 식으로 준비했습니다. </p></div>` +
  Array.from({ length: MIN_IMAGES }, (_, i) => `<div class="se-module se-module-image"><img src="https://postfiles.pstatic.net/p${i}.jpg"></div>`).join('') +
  `${extra}</body></html>`

const good = body()
const r = checkBlogHtml(good, countPhotos(good), countBodyChars(good))
ok('조건을 다 갖춘 글은 전부 통과', r.allPassed, r.checks.filter(c => !c.ok).map(c => c.rule).join(', '))
ok(`사진 ${MIN_IMAGES}장을 셈`, countPhotos(good) === MIN_IMAGES, `실제 ${countPhotos(good)}`)
ok(`본문이 ${MIN_CHARS}자를 넘음`, countBodyChars(good) >= MIN_CHARS, `실제 ${countBodyChars(good)}`)

const titleItems = r.checks.find(c => c.rule.includes('제목에'))?.items ?? []
const bodyItems = r.checks.find(c => c.rule.includes('본문에'))?.items ?? []
ok('제목 낱말을 낱개로 판정', titleItems.length === TITLE_KEYWORDS.length, `${titleItems.length}개`)
ok('본문 낱말을 낱개로 판정', bodyItems.length === BODY_KEYWORDS.length, `${bodyItems.length}개`)
ok('낱말이 다 있으면 낱개도 모두 통과', bodyItems.every(i => i.ok))

const dropped = BODY_KEYWORDS[BODY_KEYWORDS.length - 1]
const lacking = good.split(dropped).join('○○○')
const rl = checkBlogHtml(lacking, countPhotos(lacking), countBodyChars(lacking))
const lackItems = rl.checks.find(c => c.rule.includes('본문에'))?.items?.filter(i => !i.ok).map(i => i.label) ?? []
ok('빠진 낱말만 콕 집어 표시', lackItems.length === 1 && lackItems[0] === dropped, lackItems.join(', ') || '없음')
ok('낱말이 하나라도 빠지면 통과하지 못함', !rl.allPassed)

const noDisclosure = good.replace(DISCLOSURE_SAMPLE, '오늘은 후기를 써 봅니다')
const nd = checkBlogHtml(noDisclosure, MIN_IMAGES, countBodyChars(noDisclosure))
ok('광고 표시가 없으면 통과하지 못함', !nd.allPassed)

const fewPhotos = checkBlogHtml(good, MIN_IMAGES - 1, countBodyChars(good))
ok(`사진이 ${MIN_IMAGES}장보다 적으면 통과하지 못함`, !fewPhotos.allPassed)
ok('사진이 몇 장 모자란지 알려줌',
  /더 필요/.test(fewPhotos.checks.find(c => c.rule.includes('사진'))?.detail ?? ''),
  fewPhotos.checks.find(c => c.rule.includes('사진'))?.detail)

const shortBody = checkBlogHtml(good, MIN_IMAGES, MIN_CHARS - 1)
ok(`본문이 ${MIN_CHARS}자보다 짧으면 통과하지 못함`, !shortBody.allPassed)
ok('글자가 몇 자 모자란지 알려줌',
  /더 필요/.test(shortBody.checks.find(c => c.rule.includes('자 이상'))?.detail ?? ''),
  shortBody.checks.find(c => c.rule.includes('자 이상'))?.detail)

ok('본인 확인 코드는 쓰지 않음', !fs.existsSync('src/lib/blogOwnerCode.ts') && !client.includes('확인 코드'))

// ── 본문만 보고 판정하는가 ──────────────────────────────────────────────────
// 실측(2026-09-02): 사진 0장·본문 8자짜리 빈 글이 '사진 1장, 낱말 2/4개'로 통과했다.
// 네이버 PostView 문서에 옆 메뉴와 공지글 목록이 함께 들어 있어서다.
{
  const chrome =
    '<div class="blog-menu"><ul>' +
    '<li>공지 한국실용글쓰기 CBT 추천! 실전 모의고사로 독학 끝내기 공기업자격증</li>' +
    '<li><img src="https://postfiles.pstatic.net/MjAyNjA5MDJfMjAy/thumbnail.jpg"></li>' +
    '</ul></div>'
  const post = '<div class="se-main-container">' +
    '<div class="se-module se-module-text"><p>실글패스 테스트 !</p></div></div>'
  const doc = `<html><head><title>실글패스 테스트 !</title></head><body>${chrome}${post}</body></html>`

  const body = extractPostBody(doc)
  ok('본문 영역을 찾아낸다', body.found && !body.html.includes('공지'), body.found ? '옆 메뉴가 섞였다' : '못 찾음')
  ok('옆 메뉴 썸네일을 본문 사진으로 세지 않는다', countPhotos(doc) === 0, `${countPhotos(doc)}장으로 셌다`)

  const verdict = checkBlogHtml(doc, countPhotos(doc), countBodyChars(doc))
  const bodyItems = verdict.checks.find(c => c.rule.includes('본문에'))?.items ?? []
  const found = bodyItems.filter(i => i.ok).map(i => i.label)
  ok('옆 메뉴의 남의 글 제목으로는 낱말이 통과하지 않는다',
    found.length === 1 && found[0] === BODY_KEYWORDS[0], `통과한 낱말: ${found.join(', ')}`)
  ok('빈 글은 통과하지 못한다', !verdict.allPassed)
  ok('짧은 글을 못 읽었다고 하지 않는다',
    !verdict.checks.some(c => c.detail.includes('못 읽음')),
    verdict.checks.filter(c => c.detail.includes('못 읽음')).map(c => c.rule).join(', '))
}

// ── 광고 표시 그림 ─────────────────────────────────────────────────────────
// 그림만 주고 글자를 빼면 자동 판정이 통째로 무너진다 — 그림 속 글씨는 못 읽는다.
{
  const img = fs.readFileSync('src/components/subscribe/DisclosureImage.tsx', 'utf8')
  const box = fs.readFileSync('src/components/subscribe/DisclosureCopyBox.tsx', 'utf8')
  ok('광고 표시를 그림으로 만들어 준다', img.includes('canvas') && img.includes('toBlob'))
  ok('그림을 저장·복사할 수 있다', img.includes('download') && img.includes('ClipboardItem'))
  ok('글꼴은 보는 사람 브라우저 것을 쓴다(두부 방지)', img.includes('Malgun Gothic'))
  ok('그림 옆에 판정용 한 줄도 함께 준다', box.includes('DisclosureImage') && box.includes('{b.text}'))
  ok('그림만으로는 확인이 안 된다고 알린다', box.includes('기계가 읽지 못'))
}

// ── 못 보여주는 글 ─────────────────────────────────────────────────────────
// 비공개·삭제 글은 네이버가 200으로 답하면서 본문 자리에 알림창 스크립트를 넣는다.
// 이걸 못 알아채면 다음 후보를 읽다 결국 블로그 홈을 읽는다 — 실측에서 지워진 글이
// 홈의 사진 57장·2,660자로 조건을 통과했다.
{
  const closed = `<html><body><script>var msg = '비공개 글 입니다.'; if(msg!=''){alert(msg);} location.replace('/PostList.naver?blogId=abc&fromClosedPost=true');</script></body></html>`
  ok('비공개 글을 알아챈다', naverBlockedReason(closed)?.includes('비공개 글 입니다'), naverBlockedReason(closed) ?? '못 알아챔')
  ok('멀쩡한 글은 막지 않는다', naverBlockedReason(good) === null, naverBlockedReason(good))

  const naverCandidates = blogFetchCandidates('https://blog.naver.com/abc/224398488516')
  ok('껍데기 주소는 아예 읽지 않는다',
    !naverCandidates.some(u => /^https:\/\/blog\.naver\.com\/abc\/\d+$/.test(u)),
    naverCandidates.join(' / '))
}

// ── 자문자답 ───────────────────────────────────────────────────────────────
// 검색해서 들어온 사람이 궁금해할 것을 짚어 줘야 글이 홍보 구실을 한다.
{
  const qBody = '실용글쓰기시험은 많이 어렵나요? 선택형은 평이한 편이지만 서술형이 배점의 대부분이라 여기서 등급이 갈립니다. 저도 첫 회차에 시간 배분이 무너져서 마지막 문항을 통째로 비웠습니다. 독학으로도 준비가 되나요? 서술형 채점만 해결되면 충분히 가능합니다. 저는 모의고사를 회차별로 풀면서 틀린 유형만 골라 반복하는 식으로 준비했습니다.'
  ok('물음 뒤에 답이 이어지면 자문자답으로 센다', countSelfQa(qBody) === 2, `${countSelfQa(qBody)}번`)

  const rhetorical = '이 정도면 괜찮지 않나요? 그쵸? 아무튼 그렇습니다.'
  ok('수사의문문은 자문자답으로 세지 않는다', countSelfQa(rhetorical) === 0, `${countSelfQa(rhetorical)}번`)

  const noQa = good.replace(/[?？]/g, '.')
  const rq = checkBlogHtml(noQa, countPhotos(noQa), countBodyChars(noQa))
  const qaCheck = rq.checks.find(c => c.rule.includes('묻고 답한'))
  ok('자문자답이 없으면 통과하지 못한다', qaCheck && !qaCheck.ok && !rq.allPassed, qaCheck?.detail)
  ok('몇 번 더 필요한지 알려준다', /더 필요/.test(qaCheck?.detail ?? ''), qaCheck?.detail)
}

// ── 사진 세기 ──────────────────────────────────────────────────────────────
// 스마트에디터는 사진 한 장에 se-module-image 를 두 번 쓴다(모듈 div + 링크 a).
// 클래스 이름을 세면 5장짜리 글이 10장이 된다(실측).
{
  const shot = (n) =>
    `<div class="se-component se-image"><div class="se-module se-module-image">` +
    `<a href="#" class="se-module-image-link __se_image_link">` +
    `<img src="https://postfiles.pstatic.net/photo${n}.jpg?type=w773"></a></div></div>`
  const doc = `<html><body><div class="se-main-container">${[1,2,3,4,5].map(shot).join('')}</div></body></html>`
  ok('사진 한 장을 한 장으로 센다', countPhotos(doc) === 5, `${countPhotos(doc)}장으로 셌다`)

  const withIcon = doc.replace('</div></body>',
    '<img src="https://ssl.pstatic.net/static/blog/icon.png"></div></body>')
  ok('아이콘은 사진으로 세지 않는다', countPhotos(withIcon) === 5, `${countPhotos(withIcon)}장`)
}

// 못 읽는 주소는 오류로 돌아와야 한다(조용히 통과하면 안 된다)
const dead = await fetchBlogPost('https://blog.naver.com/__nope__/000000000000')
ok('없는 글은 읽기 실패로 돌아옴', dead.html === null, '읽혔다고 함')

console.log(`\n통과 ${pass} · 실패 ${fail}`)
process.exit(fail ? 1 : 0)
