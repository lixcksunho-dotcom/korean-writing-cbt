// 블로그 홍보 신청 → 심사 → 유료 전환이 끝까지 도는지 본다.
//   npm run check:blog-promo
//
// 왜 필요한가: 홍보해 준 사람에게 답례가 안 가면 그 사람은 다시는 안 써 준다.
// 반대로 한 신청으로 두 번 지급되면 새어 나간다. 둘 다 조용히 일어난다.
//
//   1) 규칙 판정(순수 함수)이 맞는가 — 제목·본문 낱말·사진 장수
//   2) 신청 화면에서 조건을 '쓰기 전에' 볼 수 있는가
//   3) 신청이 접수되는가(자동 확인을 못 해도 접수는 돼야 한다)
//   4) 같은 글을 두 번 내면 막히는가
//   5) 승인하면 그 자리에서 이용권이 나가는가 — 그리고 두 번은 안 나가는가
//
// 검사가 만든 계정·신청·발급만 지운다.

import fs from 'node:fs'
import { chromium } from 'playwright'
import {
  checkBlogHtml,
  isLikelyBlogPostUrl,
  MIN_IMAGES,
  MIN_CHARS,
  TITLE_KEYWORDS,
  BODY_KEYWORDS,
  DISCLOSURE_SAMPLE,
} from '../src/lib/blogPromoRules.ts'
import { blogFetchCandidates, countPhotos, countBodyChars } from '../src/lib/blogPromoFetch.ts'

const ENV = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8').split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] }),
)
// 무료 경로는 접힌 상자 안에 있다 — 사람이 누르는 것과 같은 순서로 연다.
// 화면을 다시 불러오면 도로 접히므로 채우기 전마다 부른다.
async function openPromoBox(page) {
  await page.evaluate(() => {
    const box = document.querySelector('#blog-url')?.closest('details')
    if (box) box.open = true
  })
  await page.waitForTimeout(400)
}

const BASE = process.env.BLOG_PROMO_BASE ?? 'https://kptest.cloud'
const REVIEW_PATH = '#promo/blog-review'
const api = (p, init) => fetch(`${ENV.NEXT_PUBLIC_SUPABASE_URL}${p}`, {
  ...init,
  headers: {
    apikey: ENV.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${ENV.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json', Prefer: 'return=representation', ...(init?.headers ?? {}),
  },
})

const stamp = String(Date.now())
const email = `blogpromo+${stamp}@kptest.cloud`
const password = `Chk-${stamp}-aA1!`
let uid = null
let failed = false
const ok = (n, d = '') => console.log(`  ○ ${n}${d ? ` — ${d}` : ''}`)
const bad = (n, d = '') => { console.error(`  × ${n}${d ? ` — ${d}` : ''}`); failed = true }

// ── 1) 규칙 판정 (브라우저 없이) ────────────────────────────────────────────
console.log(`\n블로그 홍보 심사 — ${BASE}\n`)

const good = `<html><head><title>실글패스로 실용글쓰기시험 준비한 후기</title></head><body>
<p>${DISCLOSURE_SAMPLE}</p>
${'가나다라마바사아자차카타파하 '.repeat(140)}
실글패스 정말 좋았습니다. 실용글쓰기시험 준비에 실용글쓰기CBT가 큰 도움이 됐어요.
공기업자격증 준비하시는 분께 추천합니다.
${Array.from({ length: MIN_IMAGES }, (_, i) => `<img src="/s${i}.png">`).join('')}
</body></html>`
const r1 = checkBlogHtml(good, countPhotos(good), countBodyChars(good))
if (r1.allPassed) ok('조건을 갖춘 글은 통과한다')
else bad('정상 글 판정', r1.checks.filter(c => !c.ok).map(c => `${c.rule}(${c.detail})`).join(' / '))

// 사진이 모자란 글
const fewImages = good.replace(/(<img[^>]*>)+/g, '<img src="/only.png">')  // 여러 장을 한 장으로
const r2 = checkBlogHtml(fewImages, countPhotos(fewImages), countBodyChars(fewImages))
if (!r2.allPassed && r2.checks.find(c => c.rule.includes('사진'))?.ok === false) ok(`사진이 ${MIN_IMAGES}장 미만이면 걸린다`)
else bad('사진 장수 판정', '사진이 1장인데 통과했다')

// 낱말이 빠진 글
const missing = good.replace('공기업자격증 준비하시는 분께 추천합니다.', '')
const r3 = checkBlogHtml(missing, countPhotos(missing), countBodyChars(missing))
const bodyCheck = r3.checks.find(c => c.rule.includes('본문'))
const r3Missing = bodyCheck?.items?.filter(i => !i.ok).map(i => i.label) ?? []
if (!r3.allPassed && bodyCheck?.ok === false && r3Missing.includes('공기업자격증')) ok('빠진 낱말을 집어 준다', r3Missing.join(', '))
else bad('본문 낱말 판정', `${bodyCheck?.detail} / ${r3Missing.join(', ')}`)

// 띄어 쓴 낱말도 인정한다 — 사람은 '실용글쓰기 CBT'라고 쓴다
const spaced = good.replace('실용글쓰기CBT', '실용글쓰기 CBT')
if (checkBlogHtml(spaced, countPhotos(spaced), countBodyChars(spaced)).allPassed) ok('낱말을 띄어 써도 인정한다', '실용글쓰기 CBT')
else bad('띄어쓰기 허용', '띄어 쓰면 못 찾는다')

// 스크립트로 그리는 블로그는 '위반'이 아니라 '못 읽음'이어야 한다
const empty = '<html><head><title>실글패스 후기</title></head><body><div id="root"></div></body></html>'
const r4 = checkBlogHtml(empty, countPhotos(empty), countBodyChars(empty))
if (!r4.readable && !r4.allPassed) ok('본문을 못 읽으면 위반이 아니라 못 읽음으로 둔다')
else bad('읽기 실패 처리', '빈 문서를 판정해 버린다')

// 네이버 주소는 본문이 든 주소로 바꿔 읽어야 한다(원본은 껍데기 — 실측 13자)
const cand = blogFetchCandidates('https://blog.naver.com/lyw2216/224392844838')
if (cand[0].includes('PostView.naver') && cand[0].includes('logNo=224392844838')) {
  ok('네이버는 본문이 든 주소로 바꿔 읽는다', 'PostView')
} else bad('네이버 주소 변환', cand[0])
if (blogFetchCandidates('https://example.com/post/1')[0] === 'https://example.com/post/1') ok('다른 블로그는 주소를 그대로 쓴다')
else bad('주소 변환 범위', '남의 주소까지 바꾼다')

// 사진 수: 네이버는 에디터 이미지 모듈로 센다(img 태그엔 UI 아이콘이 섞인다 — 실측 72 vs 22)
if (countPhotos('<div class="se-module-image"></div>'.repeat(7) + '<img>'.repeat(40)) === 7) {
  ok('네이버 사진은 에디터 모듈로 센다', 'UI 아이콘에 안 속는다')
} else bad('사진 세기', String(countPhotos('<div class="se-module-image"></div>'.repeat(7))))
if (countPhotos('<img><img><img>') === 3) ok('일반 블로그는 img 태그로 센다')
else bad('사진 세기(일반)', String(countPhotos('<img><img><img>')))

// 제목·본문 낱말 — 어느 낱말이 되고 안 됐는지 낱개로 돌려줘야 한다
{
  const r = checkBlogHtml(good, countPhotos(good), countBodyChars(good))
  const titleCheck = r.checks.find(c => c.rule.includes('제목에'))
  const bodyCheck = r.checks.find(c => c.rule.includes('본문에'))

  if (titleCheck?.items?.length === TITLE_KEYWORDS.length) ok('제목 낱말을 낱개로 돌려준다', TITLE_KEYWORDS.join(', '))
  else bad('제목 낱개 판정', '낱말별 결과가 없다')
  if (bodyCheck?.items?.length === BODY_KEYWORDS.length) ok('본문 낱말을 낱개로 돌려준다', BODY_KEYWORDS.join(', '))
  else bad('본문 낱개 판정', '낱말별 결과가 없다')
  if (bodyCheck?.items?.every(i => i.ok)) ok('낱말이 다 있으면 낱개도 모두 통과')
  else bad('낱개 판정(통과)', bodyCheck?.items?.filter(i => !i.ok).map(i => i.label).join(', '))
}

// 낱말 하나만 빼면 그 낱말만 실패로 표시돼야 한다
{
  const missing = BODY_KEYWORDS[BODY_KEYWORDS.length - 1]
  const html = good.split(missing).join('○○○')
  const r = checkBlogHtml(html, countPhotos(html), countBodyChars(html))
  const bodyCheck = r.checks.find(c => c.rule.includes('본문에'))
  const failed = bodyCheck?.items?.filter(i => !i.ok).map(i => i.label) ?? []
  if (failed.length === 1 && failed[0] === missing) ok('빠진 낱말만 콕 집어 표시한다', missing)
  else bad('낱개 판정(누락)', `빠졌다고 한 낱말: ${failed.join(', ') || '없음'}`)
  if (!r.allPassed) ok('낱말이 하나라도 빠지면 통과시키지 않는다')
  else bad('낱말 누락 통과', '하나 빠졌는데 통과한다')
}

// 사진·글자수는 얼마나 모자란지 말해 줘야 다시 낼 수 있다
{
  const short = checkBlogHtml(good, 2, 900)
  const photo = short.checks.find(c => c.rule.includes('사진'))
  const chars = short.checks.find(c => c.rule.includes('자 이상'))
  if (photo && !photo.ok && /더 필요/.test(photo.detail)) ok('사진이 몇 장 모자란지 알려준다', photo.detail)
  else bad('사진 부족 안내', photo?.detail ?? '없음')
  if (chars && !chars.ok && /더 필요/.test(chars.detail)) ok('글자가 몇 자 모자란지 알려준다', chars.detail)
  else bad('글자수 부족 안내', chars?.detail ?? '없음')
}

// 본인 확인 코드는 없앴다 — 되살아나면 잡는다
if (!fs.existsSync('src/lib/blogOwnerCode.ts')) ok('본인 확인 코드는 쓰지 않는다')
else bad('본인 확인 코드', 'blogOwnerCode.ts가 남아 있다')

// ── 공정위 표시 의무 ────────────────────────────────────────────────────────
// 대가를 받고 쓴 글에 광고임을 안 밝히면 광고주(우리)가 제재를 받는다.
// '있으면 좋은 것'이 아니라 '없으면 못 주는 것'이어야 한다.
const noAd = good.replace(`<p>${DISCLOSURE_SAMPLE}</p>`, '')
const rNoAd = checkBlogHtml(noAd, countPhotos(noAd), countBodyChars(noAd))
const adCheck = rNoAd.checks.find(c => c.rule.includes('광고임을'))
if (adCheck && !adCheck.ok && !rNoAd.allPassed) ok('광고 표시가 없으면 통과시키지 않는다', '공정위 표시 의무')
else bad('광고 표시 강제', '문구 없이 통과한다 — 광고주가 제재를 받는다')

// '체험단'·'AD' 같은 말로는 인정되지 않는다(지침이 명시적으로 배제)
const weak = noAd.replace('<body>', '<body><p>체험단 후기입니다 #AD</p>')
const rWeak = checkBlogHtml(weak, countPhotos(weak), countBodyChars(weak))
const weakCheck = rWeak.checks.find(c => c.rule.includes('광고임을'))
if (weakCheck && !weakCheck.ok) ok("'체험단'·'AD'만으로는 인정하지 않는다", weakCheck.detail.slice(0, 40))
else bad('약한 표현 판정', '체험단·AD로 통과한다')

// 위치도 본다 — 맨 뒤에 적으면 소비자가 못 본다(지침: 제목 또는 첫 부분)
const tail = noAd.replace('</body>', `<p>${DISCLOSURE_SAMPLE}</p></body>`)
const rTail = checkBlogHtml(tail, countPhotos(tail), countBodyChars(tail))
const tailCheck = rTail.checks.find(c => c.rule.includes('광고임을'))
if (tailCheck && !tailCheck.ok) ok('글 뒤쪽에 적으면 안 된다고 알려 준다', tailCheck.detail.slice(0, 40))
else bad('위치 판정', '맨 뒤에 있어도 통과한다')

// 짧은 글은 통과시키지 않는다 — 한두 줄 쓰고 사진만 붙이면 홍보가 안 된다
const shortPost = good.replace(/가나다라마바사아자차카타파하 /g, '')  // 본문을 비워 짧은 글로 만든다
const rShort = checkBlogHtml(shortPost, countPhotos(shortPost), countBodyChars(shortPost))
const charCheck = rShort.checks.find(c => c.rule.includes('자 이상'))
if (charCheck && !charCheck.ok) ok(`본문이 ${MIN_CHARS}자 미만이면 걸린다`, charCheck.detail)
else bad('글자수 기준', charCheck ? charCheck.detail : '기준 자체가 없다')

// 글 주소가 아닌 것
if (!isLikelyBlogPostUrl('https://blog.naver.com') && isLikelyBlogPostUrl('https://blog.naver.com/me/123')) {
  ok('블로그 첫 화면은 글 주소로 안 본다')
} else bad('주소 판정', '첫 화면과 글 주소를 구분 못 한다')

// ── 2~5) 실제 화면 ──────────────────────────────────────────────────────────
const browser = await chromium.launch()
try {
  uid = (await (await api('/auth/v1/admin/users', {
    method: 'POST', body: JSON.stringify({ email, password, email_confirm: true }),
  })).json()).id
  if (!uid) throw new Error('검사용 계정을 만들지 못했다')

  const ctx = await browser.newContext()
  await ctx.addInitScript(() => { try { localStorage.setItem('silyong_mode_intro_v1', '1') } catch { /* 막혀도 진행 */ } })
  const page = await ctx.newPage()

  let logged = false
  for (let a = 0; a < 3 && !logged; a++) {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', password)
    await page.click('button[type="submit"]')
    for (let i = 0; i < 30; i++) {
      if (!new URL(page.url()).pathname.includes('/login')) { logged = true; break }
      await page.waitForTimeout(1000)
    }
  }
  if (!logged) throw new Error('로그인이 되지 않음')

  await page.goto(`${BASE}/subscribe`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(1200)

  await openPromoBox(page)

  // 조건을 '쓰기 전에' 볼 수 있어야 한다
  const guide = await page.evaluate(ws => {
    const t = document.body.innerText
    return { hasForm: !!document.querySelector('#blog-url'), missing: ws.filter(w => !t.includes(w)) }
  }, [...BODY_KEYWORDS])
  if (!guide.hasForm) throw new Error('신청 폼이 화면에 없다')
  if (guide.missing.length === 0) ok('필수 낱말을 신청 화면에 미리 알려 준다')
  else bad('사전 안내', `안내에 빠진 낱말: ${guide.missing.join(', ')}`)

  // 접수 — 자동 확인이 안 되는 주소여도 접수는 돼야 한다
  const testUrl = `https://example.com/promo-check-${stamp}`
  await openPromoBox(page)
  await page.fill('#blog-url', testUrl)
  await page.locator('form:has(#blog-url) button[type="submit"]').click()
  await page.waitForTimeout(6000)
  const accepted = await page.evaluate(() => /신청이 접수/.test(document.body.innerText))
  if (accepted) ok('신청이 접수된다', '자동 확인을 못 해도 접수는 된다')
  else bad('신청 접수', '접수 안내가 뜨지 않는다')

  const subs = await (await api(`/rest/v1/feedback?user_id=eq.${uid}&path=eq.${encodeURIComponent(REVIEW_PATH)}&select=id,contact,resolved`)).json()
  const row = Array.isArray(subs) ? subs[0] : null
  if (!row) { bad('접수 기록', 'feedback에 신청이 없다'); throw new Error('이후 단계 진행 불가') }
  ok('접수가 기록된다', `${subs.length}건`)

  // 같은 글 재신청 차단
  await page.goto(`${BASE}/subscribe`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await openPromoBox(page)
  await page.fill('#blog-url', testUrl)
  await page.locator('form:has(#blog-url) button[type="submit"]').click()
  await page.waitForTimeout(5000)
  const dupMsg = await page.evaluate(() => /이미 신청한 글/.test(document.body.innerText))
  const cnt = await (await api(`/rest/v1/feedback?user_id=eq.${uid}&path=eq.${encodeURIComponent(REVIEW_PATH)}&select=id`)).json()
  if (dupMsg && cnt.length === 1) ok('같은 글은 다시 못 낸다')
  else bad('중복 신청 차단', `안내 ${dupMsg} · 접수 ${cnt.length}건`)

  // ── 승인 → 유료 전환 ────────────────────────────────────────────────────
  // 관리자 화면은 권한이 필요해 여기서는 지급 규칙 자체를 확인한다:
  // order_id가 review-<신청id>라 같은 신청으로 두 번 지급될 수 없어야 한다.
  const orderId = `review-${row.id}`
  const grant = () => api('/rest/v1/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      user_id: uid, payment_key: 'promo:blog-review', order_id: orderId,
      amount: 0, status: 'active',
      expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    }),
  })
  const first = await grant()
  if (!first.ok) bad('승인 지급', `첫 지급이 실패한다: ${(await first.text()).slice(0, 100)}`)
  else ok('승인하면 이용권이 나간다', '무료 발급 0원 · 30일')

  const second = await grant()
  if (second.ok) bad('중복 지급 차단', '같은 신청으로 두 번 지급됐다')
  else if ((await second.text()).includes('23505')) ok('같은 신청으로 두 번은 못 준다', 'order_id unique 제약')
  else bad('중복 지급 차단', '막히긴 했는데 이유가 다르다')

  const mine = await (await api(`/rest/v1/subscriptions?user_id=eq.${uid}&select=amount,status`)).json()
  if (mine.length === 1 && mine[0].amount === 0) ok('발급은 한 건, 매출에 안 섞인다')
  else bad('발급 상태', JSON.stringify(mine).slice(0, 90))

  // ── 회수: 글을 지운 사람에게서 되돌릴 수 있어야 한다 ──────────────────────
  // 체험단에서 가장 흔히 새는 자리다 — 코드만 받고 글을 내린다.
  const rev = await api(`/rest/v1/subscriptions?order_id=eq.${orderId}&status=eq.active`, {
    method: 'PATCH', body: JSON.stringify({ status: 'cancelled', payment_key: 'promo:blog-review:revoked' }),
  })
  if (!rev.ok) bad('회수', `되돌리지 못한다: ${(await rev.text()).slice(0, 90)}`)
  else {
    const after = await (await api(`/rest/v1/subscriptions?user_id=eq.${uid}&select=status,payment_key`)).json()
    // 기록은 남기고 효력만 끊는다 — 지우면 나중에 항의가 와도 아무것도 못 밝힌다.
    // status는 DB가 active|cancelled만 허용한다. 회수라는 사실은 payment_key로 구분한다.
    if (after.length === 1 && after[0].status === 'cancelled') ok('회수하면 기록은 남고 효력만 끊긴다', 'status=cancelled')
    else bad('회수 결과', JSON.stringify(after).slice(0, 90))

    // 활성 구독 조회(status=active)에 안 걸려야 진짜 회수다
    const active = await (await api(`/rest/v1/subscriptions?user_id=eq.${uid}&status=eq.active&select=id`)).json()
    if (Array.isArray(active) && active.length === 0) ok('회수 뒤에는 이용권이 잡히지 않는다')
    else bad('회수 실효', `아직 활성 ${active.length}건`)
  }

  await ctx.close()
} catch (e) {
  bad('실행', String(e?.message ?? e).slice(0, 300))
} finally {
  await browser.close()
  if (uid) {
    await api(`/rest/v1/subscriptions?user_id=eq.${uid}`, { method: 'DELETE' }).catch(() => {})
    await api(`/rest/v1/feedback?user_id=eq.${uid}`, { method: 'DELETE' }).catch(() => {})
    await api(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' }).catch(() => {})
  }
}
console.log(failed ? '\n홍보 심사에 구멍이 있다.' : '\n신청·심사·지급이 끝까지 돈다.')
process.exit(failed ? 1 : 0)
