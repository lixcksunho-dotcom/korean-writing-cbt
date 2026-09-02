import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { recordOperatorAlert } from '@/lib/operatorAlerts'
import { BLOG_REVIEW_PATH, checkBlogHtml } from '@/lib/blogPromoRules'
import { fetchBlogPost, countPhotos, countBodyChars } from '@/lib/blogPromoFetch'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// 지급한 뒤에도 글이 그대로 있는지 다시 확인한다.
//
// 왜 필요한가: 지금은 신청하는 순간에만 본다. 코드를 받은 뒤 글을 지우거나 비공개로
// 돌리면 홍보는 사라지고 이용권만 남는다 — 체험단에서 가장 흔하게 새는 자리다.
// 막을 방법은 '나중에 다시 보는 것' 하나뿐이다.
//
// 다만 함부로 회수하지 않는다. 한 번 못 읽었다고 뺏으면 서버가 잠깐 막힌 것으로도
// 멀쩡한 사람이 이용권을 잃는다. 못 읽은 것은 알리기만 하고, 회수는 사람이 판단한다.

function unauthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false // 설정 전에는 막지 않는다(개통 전 확인용)
  return (req.headers.get('authorization') ?? '') !== `Bearer ${secret}`
}

export async function GET(req: Request) {
  if (unauthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // 지급이 끝난 신청만 본다 — 아직 심사 전인 것은 볼 이유가 없다.
  const { data: rows } = await admin
    .from('feedback')
    .select('id, user_id, contact, created_at')
    .eq('path', BLOG_REVIEW_PATH)
    .eq('resolved', true)
    .not('contact', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50)

  const results: { id: string; url: string; state: 'ok' | 'unreadable' | 'changed'; detail: string }[] = []

  for (const r of rows ?? []) {
    const url = String(r.contact)
    const fetched = await fetchBlogPost(url)

    if (fetched.html === null) {
      results.push({ id: r.id, url, state: 'unreadable', detail: fetched.reason })
      continue
    }

    const check = checkBlogHtml(fetched.html, countPhotos(fetched.html), countBodyChars(fetched.html))
    const failed = check.checks.filter(c => !c.ok)

    results.push({
      id: r.id,
      url,
      state: failed.length === 0 ? 'ok' : 'changed',
      detail: failed.length ? failed.map(c => `${c.rule}(${c.detail})`).join(' / ') : '조건 유지',
    })
  }

  const gone = results.filter(r => r.state === 'unreadable')
  const changed = results.filter(r => r.state === 'changed')

  if (gone.length || changed.length) {
    await recordOperatorAlert(
      'feedback',
      `블로그 홍보 사후 확인 — 사라짐 ${gone.length}건 · 조건 어긋남 ${changed.length}건\n` +
        [...gone, ...changed].slice(0, 10).map(r => `· ${r.url}\n  ${r.detail}`).join('\n'),
    ).catch(() => {})
  }

  return NextResponse.json({
    checked: results.length,
    ok: results.length - gone.length - changed.length,
    unreadable: gone.length,
    changed: changed.length,
    items: results,
  })
}
