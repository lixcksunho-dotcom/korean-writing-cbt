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
import { BLOG_REVIEW_PATH, REWARD_DAYS } from '../src/lib/blogPromoRules.ts'

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

// 3시간마다 도는 일정이 등록돼 있는가 — 코드만 있고 안 돌면 없는 것과 같다
const cron = JSON.parse(fs.readFileSync('vercel.json', 'utf8'))
const entry = cron.crons?.find(c => c.path === '/api/cron/blog-review-audit')
if (entry?.schedule === '0 */3 * * *') ok('3시간마다 도는 일정이 등록돼 있다', entry.schedule)
else bad('일정 등록', entry ? entry.schedule : '없음')

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

console.log(`\n${fail ? '사후 확인에 구멍이 있다.' : '내리면 꺼지고 올리면 켜진다.'}`)
process.exit(fail ? 1 : 0)
