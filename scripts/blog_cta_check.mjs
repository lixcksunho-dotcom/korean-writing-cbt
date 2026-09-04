// 블로그 글이 그 글에 맞는 것을 파는지 본다.
//   npm run check:blog-cta
//
// 왜 필요한가: KBS한국어능력시험은 전 문항 객관식이다. 그 글 아래에 '700점짜리 서술형을
// AI가 채점해 준다'를 붙이면 읽은 사람에게 아무 뜻이 없다. 실제로 KBS 글 16편이 전부
// 그 문구를 달고 있었고, KBS CBT를 옮겨 간 자매 서비스로는 한 편도 잇지 않았다 —
// 그 글을 읽은 사람에게 줄 것이 없었던 셈이다.
//
// 이런 어긋남은 화면이 안 깨지므로 눈으로는 안 보인다. 그래서 검사로 고정한다.

import fs from 'node:fs'
import { requireSite } from './assertSite.mjs'
import { blogPostService } from '../src/lib/blogPostService.ts'

const BASE = process.env.BLOG_CTA_BASE ?? 'https://kptest.cloud'
const SAMPLE = Number(process.env.BLOG_CTA_SAMPLE ?? 3)

let pass = 0, fail = 0
const ok = (n, d = '') => { pass++; console.log(`  ○ ${n}${d ? ` — ${d}` : ''}`) }
const bad = (n, d = '') => { fail++; console.log(`  × ${n}${d ? ` — ${d}` : ''}`) }

console.log(`\n블로그 글이 파는 것 — ${BASE}\n`)

// 다른 제품의 서버가 같은 포트에 떠 있으면 남의 결과로 내 사이트를 판단하게 된다.
if (!(await requireSite(BASE, '실글패스'))) process.exit(1)

const posts = fs.readdirSync('src/content/blog')
  .filter(f => f.endsWith('.json'))
  .map(f => JSON.parse(fs.readFileSync(`src/content/blog/${f}`, 'utf8')))

const kbsPosts = posts.filter(p => blogPostService(p.title) === 'kbs')
const ownPosts = posts.filter(p => blogPostService(p.title) === 'silyong')

if (kbsPosts.length > 0) ok('KBS 글을 가려낸다', `${kbsPosts.length}편 / 전체 ${posts.length}편`)
else bad('글 분류', 'KBS 글을 하나도 못 찾았다')

// 비교글은 이 사이트 것으로 둔다 — 여기가 그 글의 집이다.
const compare = posts.find(p => /vs/i.test(p.title) && /KBS/.test(p.title))
if (!compare || blogPostService(compare.title) === 'silyong') ok('비교글은 이 사이트 것으로 둔다')
else bad('비교글 분류', `${compare.title} 이 KBS 쪽으로 넘어갔다`)

const fetchPost = async slug => {
  const res = await fetch(`${BASE}/blog/${encodeURIComponent(slug)}`, { signal: AbortSignal.timeout(30000) })
  return res.ok ? res.text() : null
}

for (const post of kbsPosts.slice(0, SAMPLE)) {
  const html = await fetchPost(post.slug)
  const name = post.title.slice(0, 22)
  if (!html) { bad('KBS 글 열기', name); continue }

  if (html.includes('kbstest.cloud/try')) ok('KBS 글이 자매 서비스로 잇는다', name)
  else bad('KBS 글 연결', `${name} — kbspass 링크가 없다`)

  if (!html.includes('700점짜리 서술형')) ok('객관식 시험 글에 서술형을 안 판다', name)
  else bad('안 맞는 제안', `${name} — 전 문항 객관식인데 서술형을 판다`)

  // 로그인부터 시키면 거기서 끝난다 — 가입 없이 되는 자리로 보내야 한다.
  if (!/kbstest\.cloud\/(cbt|login|signup)"/.test(html)) ok('로그인 화면으로 보내지 않는다', name)
  else bad('진입 장벽', `${name} — 로그인이 필요한 곳으로 보낸다`)
}

for (const post of ownPosts.slice(0, 2)) {
  const html = await fetchPost(post.slug)
  const name = post.title.slice(0, 22)
  if (!html) { bad('글 열기', name); continue }
  if (html.includes('700점짜리 서술형')) ok('우리 글은 그대로 서술형을 판다', name)
  else bad('제안 사라짐', `${name} — 서술형 제안이 없어졌다`)
}

console.log(`\n${fail ? '글과 제안이 어긋난다.' : '글마다 맞는 것을 판다.'}`)
process.exit(fail ? 1 : 0)
