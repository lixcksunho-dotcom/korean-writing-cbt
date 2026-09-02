// 판정 실험실이 (1) 실제 규칙을 그대로 쓰고 (2) 아무것도 저장·지급하지 않는지 확인한다.
import fs from 'node:fs'
import {
  checkBlogHtml,
  BODY_KEYWORDS,
  DISCLOSURE_SAMPLE,
  MIN_CHARS,
  MIN_IMAGES,
  TITLE_KEYWORDS,
} from '../src/lib/blogPromoRules.ts'
import { countPhotos, countBodyChars, fetchBlogPost } from '../src/lib/blogPromoFetch.ts'

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
  Array.from({ length: MIN_IMAGES }, () => `<div class="se-module se-module-image"><img src="x.jpg"></div>`).join('') +
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

// 못 읽는 주소는 오류로 돌아와야 한다(조용히 통과하면 안 된다)
const dead = await fetchBlogPost('https://blog.naver.com/__nope__/000000000000')
ok('없는 글은 읽기 실패로 돌아옴', dead.html === null, '읽혔다고 함')

console.log(`\n통과 ${pass} · 실패 ${fail}`)
process.exit(fail ? 1 : 0)
