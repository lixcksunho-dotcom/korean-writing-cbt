// 글을 내리면 이용권이 꺼지고, 다시 올리면 켜지는지 본다.
//   npm run check:audit-revoke
//
// 왜 필요한가: 이용권을 받고 글을 비공개로 돌리면 홍보는 사라지고 이용권만 남는다.
// 반대로 실수로 잠깐 내렸다가 되돌린 사람의 이용권을 영영 안 돌려주면 그것도 사고다.
// 둘 다 조용히 일어나므로 사람이 눈치채지 못한다.
//
// 검사가 만든 계정·신청·발급만 지운다.

import fs from 'node:fs'
import { naverBlockedReason } from '../src/lib/blogPromoFetch.ts'
import { BLOG_REVIEW_PATH, REWARD_DAYS, DISCLOSURE_RULE, normalizeBlogUrl, checkBlogHtml } from '../src/lib/blogPromoRules.ts'

const ENV = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8').split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] }),
)
const SB = ENV.NEXT_PUBLIC_SUPABASE_URL
const KEY = ENV.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }
const BASE = process.env.BLOG_PROMO_BASE ?? 'http://localhost:3399'

let pass = 0, fail = 0
const ok = (n, d = '') => { pass++; console.log(`  ○ ${n}${d ? ` — ${d}` : ''}`) }
const bad = (n, d = '') => { fail++; console.log(`  × ${n}${d ? ` — ${d}` : ''}`) }

const api = (p, init) => fetch(`${SB}${p}`, { ...init, headers: { ...H, ...(init?.headers ?? {}) } })

console.log(`\n블로그 홍보 사후 확인 — ${BASE}\n`)

// ── 순수 판정: 무엇을 회수 신호로 볼 것인가 ────────────────────────────────
const closed = `<html><body><script>var msg = '비공개 글 입니다.'; alert(msg); location.replace('/PostList.naver?blogId=x&fromClosedPost=true');</script></body></html>`
const deleted = `<html><body><script>var msg = '삭제되었거나 존재하지 않는 게시물입니다.'; alert(msg); location.replace('/PostList.naver?blogId=x');</script></body></html>`
if (naverBlockedReason(closed)) ok('비공개는 회수 신호로 본다', naverBlockedReason(closed))
else bad('비공개 신호', '못 알아챈다')
if (naverBlockedReason(deleted)) ok('삭제도 회수 신호로 본다', naverBlockedReason(deleted))
else bad('삭제 신호', '못 알아챈다')
if (naverBlockedReason('<html><body>평범한 글입니다</body></html>') === null) ok('멀쩡한 글은 회수 신호가 아니다')
else bad('오탐', '멀쩡한 글을 회수 대상으로 본다')

// 응답 지연·서버 오류는 회수 신호가 아니어야 한다 — 남의 서버 사정으로 이용권을 뺏으면 안 된다
const route = fs.readFileSync('src/app/api/cron/blog-review-audit/route.ts', 'utf8')
if (route.includes('if (!fetched.blocked)')) ok('그냥 못 읽은 것은 회수하지 않는다')
else bad('일시 오류 처리', '못 읽으면 바로 회수한다')
if ((route.match(/await fetchBlogPost\(url\)/g) ?? []).length >= 2) ok('회수 전에 한 번 더 확인한다')
else bad('재확인', '한 번 보고 회수한다')
if (route.includes('restoreGrants')) ok('다시 공개하면 되살린다')
else bad('되살리기', '회수만 하고 안 되살린다')
if (route.includes("gt('expires_at'")) ok('이미 끝난 이용권은 되살리지 않는다')
else bad('되살리기 범위', '지난 이용권도 되살린다')

// 어떤 주기로든 돌기는 하는가.
// Vercel 무료 플랜은 하루 1회만 허용하므로, 여기 등록된 것은 '바닥선'이다
// (PC가 꺼져 있어도 하루 안에는 정리된다). 3시간 주기는 PC 스케줄러가 맡는다.
const cron = JSON.parse(fs.readFileSync('vercel.json', 'utf8'))
const entry = cron.crons?.find(c => c.path === '/api/cron/blog-review-audit')
if (entry) ok('하루 1회 바닥선이 등록돼 있다', entry.schedule)
else bad('일정 등록', '없음')
if (entry && /^0 \d+ \* \* \*$/.test(entry.schedule)) ok('무료 플랜이 받아 주는 주기다', '하루 1회')
else bad('일정 주기', entry ? `${entry.schedule} — 무료 플랜은 하루 1회만 허용한다` : '없음')

// ── 실제로 껐다 켜지는가 ───────────────────────────────────────────────────
const stamp = Date.now()
const email = `audit+${stamp}@example.com`
let uid = null
const madeFeedback = []

try {
  uid = (await (await api('/auth/v1/admin/users', {
    method: 'POST', body: JSON.stringify({ email, password: `Aud-${stamp}-aA1!`, email_confirm: true }),
  })).json()).id
  if (!uid) throw new Error('검사용 계정을 만들지 못했다')

  // 내려간 글로 접수 + 지급된 상태를 만든다
  const url = `https://blog.naver.com/audit${stamp}/224398488516`
  const fb = (await (await api('/rest/v1/feedback', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ user_id: uid, path: BLOG_REVIEW_PATH, contact: url, message: '검사용', resolved: true }),
  })).json())[0]
  madeFeedback.push(fb.id)

  const expiresAt = new Date(Date.now() + REWARD_DAYS * 24 * 60 * 60 * 1000).toISOString()
  await api('/rest/v1/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      user_id: uid, payment_key: 'promo:blog-review', order_id: `review-${fb.id}`,
      amount: 0, status: 'active', expires_at: expiresAt,
    }),
  })

  const readStatus = async () => {
    const rows = await (await api(`/rest/v1/subscriptions?select=status,payment_key&order_id=eq.review-${fb.id}`)).json()
    return rows[0] ?? null
  }
  const before = await readStatus()
  if (before?.status === 'active') ok('지급된 이용권이 켜져 있다')
  else bad('사전 상태', JSON.stringify(before))

  // 사후 확인을 돌린다 — 그 주소는 실제로 읽히지 않는 주소다
  const res = await fetch(`${BASE}/api/cron/blog-review-audit`, { headers: { 'x-audit-check': '1' } })
  const body = await res.json()
  if (res.ok) ok('사후 확인이 돈다', `확인 ${body.checked}건`)
  else bad('사후 확인 실행', JSON.stringify(body).slice(0, 120))

  const mine = (body.items ?? []).find(i => i.id === fb.id)
  if (mine) ok('내가 만든 신청도 확인 대상에 든다', `${mine.state} — ${mine.detail}`)
  else bad('확인 대상', '목록에 없다')

  // 없는 블로그는 '못 읽음'이지 '내린 글'이 아니다 — 회수되면 안 된다
  const after = await readStatus()
  if (after?.status === 'active') ok('못 읽었다는 이유만으로는 회수하지 않는다', after.status)
  else bad('과잉 회수', `${after?.status} / ${after?.payment_key}`)
} catch (e) {
  bad('실행', e.message)
} finally {
  for (const id of madeFeedback) {
    await api(`/rest/v1/subscriptions?order_id=eq.review-${id}`, { method: 'DELETE' })
    await api(`/rest/v1/feedback?id=eq.${id}`, { method: 'DELETE' })
  }
  if (uid) await api(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' })
}


// ── 새는 자리 세 곳 ────────────────────────────────────────────────────────
// 이벤트를 실제로 열기 전에, 값을 주고 홍보는 못 받는 경우를 막았는지 본다.

// 1) 자동 지급분도 재확인 대상인가.
//    조건을 다 갖춘 신청은 그 자리에서 이용권이 나가고 resolved=false 로 남는다.
//    예전 사후 확인은 resolved=true 만 봐서 **주된 경로가 통째로 사각지대**였다.
{
  const src = fs.readFileSync('src/app/api/cron/blog-review-audit/route.ts', 'utf8')
  if (!/\.eq\('resolved', true\)/.test(src)) ok('승인 여부로 고르지 않는다')
  else bad('확인 범위', 'resolved=true 만 본다 — 자동 지급분이 빠진다')
  if (src.includes('review-auto-')) ok('자동 지급분도 확인 대상에 넣는다')
  else bad('확인 범위', '자동 지급분을 안 본다')
}

// 2) 한 글로 여러 사람이 받을 수 있는가.
//    같은 글이 여러 주소로 온다 — 다듬지 않고 견주면 못 알아챈다.
{
  const base = 'https://blog.naver.com/abc/224398488516'
  const variants = [
    'https://m.blog.naver.com/abc/224398488516',
    'https://blog.naver.com/abc/224398488516/',
    'https://blog.naver.com/abc/224398488516?fromRss=true',
    'https://BLOG.naver.com/abc/224398488516#comment',
  ]
  const key = normalizeBlogUrl(base)
  const missed = variants.filter(v => normalizeBlogUrl(v) !== key)
  if (!missed.length) ok('같은 글의 다른 주소를 같은 글로 본다', `${variants.length}가지`)
  else bad('주소 다듬기', `${missed.length}가지를 다른 글로 본다`)
  if (normalizeBlogUrl('https://blog.naver.com/abc/999999') !== key) ok('다른 글은 다른 글로 본다')
  else bad('주소 다듬기', '서로 다른 글을 같다고 한다')

  const src = fs.readFileSync('src/app/(main)/subscribe/blog-review-actions.ts', 'utf8')
  if (src.includes('normalizeBlogUrl') && src.includes('이미 다른 분이 신청한 글')) ok('남이 낸 글은 접수하지 않는다')
  else bad('중복 차단', '같은 글을 여럿이 내도 각자 받는다')
}

// 3) 광고 표시를 지우면 회수하는가.
//    다른 조건이 어긋난 것은 알리고 말면 되지만, 이건 없으면 광고주인 우리가 제재를 받는다.
{
  const filler = '실용글쓰기시험 실글패스 실용글쓰기CBT 공기업자격증 후기입니다. '.repeat(80)
  const withAd = `<div class="se-main-container"><p>광고 · 실글패스에서 이용권을 제공받아 작성했습니다.</p><p>${filler}</p></div>`
  const noAd = withAd.replace('광고 · 실글패스에서 이용권을 제공받아 작성했습니다.', '오늘은 시험 후기를 써 봅니다.')
  const gone = checkBlogHtml(noAd, 9, 2000).checks.find(c => c.rule === DISCLOSURE_RULE)
  if (gone && !gone.ok) ok('광고 표시가 없으면 판정이 잡아낸다')
  else bad('광고 표시 판정', '없는데도 통과시킨다')
  const kept = checkBlogHtml(withAd, 9, 2000).checks.find(c => c.rule === DISCLOSURE_RULE)
  if (kept && kept.ok) ok('제대로 밝힌 글은 통과시킨다')
  else bad('광고 표시 판정', `밝혔는데 막는다 — ${kept?.detail}`)

  const src = fs.readFileSync('src/app/api/cron/blog-review-audit/route.ts', 'utf8')
  if (src.includes('DISCLOSURE_RULE') && /failed\.some\(/.test(src)) ok('사라지면 회수까지 간다')
  else bad('회수 연결', '알리기만 하고 이용권은 그대로 둔다')
}

console.log(`\n${fail ? '사후 확인에 구멍이 있다.' : '내리면 꺼지고 올리면 켜진다.'}`)
process.exit(fail ? 1 : 0)
