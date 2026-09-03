import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { recordOperatorAlert } from '@/lib/operatorAlerts'
import { BLOG_REVIEW_PATH, DISCLOSURE_RULE, checkBlogHtml } from '@/lib/blogPromoRules'
import { fetchBlogPost, countPhotos, countBodyChars } from '@/lib/blogPromoFetch'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// 지급한 뒤에도 글이 그대로 있는지 다시 확인한다.
//
// 왜 필요한가: 신청하는 순간에만 보면, 이용권을 받은 뒤 글을 비공개로 돌리거나 지워도
// 아무 일이 없다. 홍보는 사라지고 이용권만 남는다 — 체험단에서 가장 흔하게 새는 자리다.
//
// 회수는 두 가지를 구분해서 한다.
//   · 네이버가 "비공개 글 입니다" 라고 **명시**한 경우 → 사람이 일부러 내린 것이다. 회수한다.
//   · 그냥 못 읽은 경우(응답 지연·일시 오류) → 알리기만 한다. 서버가 잠깐 막힌 것으로
//     멀쩡한 사람의 이용권을 뺏으면 안 된다.
// 명시된 경우에도 한 번 더 확인하고 회수한다 — 한 번의 이상 응답으로 뺏지 않기 위해서다.

function unauthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false // 설정 전에는 막지 않는다(개통 전 확인용)
  return (req.headers.get('authorization') ?? '') !== `Bearer ${secret}`
}

type AuditState = 'ok' | 'revoked' | 'restored' | 'unreadable' | 'changed'
type AuditRow = { id: string; url: string; state: AuditState; detail: string }

/**
 * 그 신청으로 나간 이용권의 효력을 끊는다.
 *
 * 행을 지우지 않고 status만 바꾼다 — 지우면 '왜 없어졌는지'가 사라져 항의가 왔을 때
 * 아무것도 못 밝힌다. status는 DB CHECK가 'active'|'cancelled'만 허용하므로 값은
 * 'cancelled'를 쓰고, 회수라는 사실은 payment_key에 남긴다(결제 취소와 구분).
 */
async function revokeGrants(
  admin: ReturnType<typeof createAdminClient>,
  feedbackId: string,
  userId: string | null,
): Promise<number> {
  // 심사 승인분과 자동 지급분은 order_id 규칙이 다르다 — 둘 다 본다.
  const orderIds = [`review-${feedbackId}`, ...(userId ? [`review-auto-${userId}`] : [])]
  const { data } = await admin
    .from('subscriptions')
    .update({ status: 'cancelled', payment_key: 'promo:blog-review:revoked' })
    .in('order_id', orderIds)
    .eq('status', 'active')
    .select('id')
  return data?.length ?? 0
}

/**
 * 글을 다시 공개했으면 이용권을 되살린다.
 *
 * 회수만 하고 되살리지 않으면, 실수로 잠깐 비공개했던 사람은 영영 못 돌려받고
 * 우리에게 항의해야 한다. 남은 기간(expires_at)은 늘리지 않는다 — 글이 내려가 있던
 * 동안의 날짜는 이미 지나갔고, 그걸 채워 주면 내려도 손해가 없어진다.
 */
async function restoreGrants(
  admin: ReturnType<typeof createAdminClient>,
  feedbackId: string,
  userId: string | null,
): Promise<number> {
  const orderIds = [`review-${feedbackId}`, ...(userId ? [`review-auto-${userId}`] : [])]
  const { data } = await admin
    .from('subscriptions')
    .update({ status: 'active', payment_key: 'promo:blog-review' })
    .in('order_id', orderIds)
    .eq('status', 'cancelled')
    .eq('payment_key', 'promo:blog-review:revoked')
    .gt('expires_at', new Date().toISOString())
    .select('id')
  return data?.length ?? 0
}

export async function GET(req: Request) {
  if (unauthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // **이용권이 실제로 나간 신청**만 본다. 아직 아무것도 안 준 신청은 볼 이유가 없다.
  //
  // 예전에는 resolved=true 로 골랐는데, 그건 '사람이 승인한 것'만 뜻한다. 조건을 모두
  // 갖춰 그 자리에서 자동 지급된 신청은 resolved=false 로 남아서 **한 번도 재확인되지
  // 않았다** — 자동 지급이 주된 경로인데 그쪽이 통째로 사각지대였다. 받고 바로 글을
  // 지워도 아무 일이 없었다는 뜻이다.
  //
  // 그래서 승인 여부가 아니라 '준 것이 있는가'로 고른다. 회수된 건도 함께 본다 —
  // 다시 공개했을 때 되살리려면 계속 지켜봐야 한다.
  const { data: candidates } = await admin
    .from('feedback')
    .select('id, user_id, contact, created_at')
    .eq('path', BLOG_REVIEW_PATH)
    .not('contact', 'is', null)
    .order('created_at', { ascending: false })
    .limit(200)

  const orderIds = [...new Set(
    (candidates ?? []).flatMap(r => [`review-${r.id}`, ...(r.user_id ? [`review-auto-${r.user_id}`] : [])]),
  )]
  const granted = new Set<string>()
  if (orderIds.length) {
    const { data: subs } = await admin
      .from('subscriptions')
      .select('order_id')
      .in('order_id', orderIds)
    for (const s of subs ?? []) granted.add(String(s.order_id))
  }

  const rows = (candidates ?? [])
    .filter(r => granted.has(`review-${r.id}`) || (r.user_id && granted.has(`review-auto-${r.user_id}`)))
    .slice(0, 50)

  const results: AuditRow[] = []

  for (const r of rows ?? []) {
    const url = String(r.contact)
    const fetched = await fetchBlogPost(url)

    if (fetched.html === null) {
      if (!fetched.blocked) {
        results.push({ id: r.id, url, state: 'unreadable', detail: fetched.reason })
        continue
      }

      // 내린 글이라고 답했다 — 한 번 더 물어보고 같은 답이면 회수한다.
      const again = await fetchBlogPost(url)
      if (!(again.html === null && again.blocked)) {
        results.push({ id: r.id, url, state: 'unreadable', detail: `${fetched.reason} (다시 읽으니 달랐음)` })
        continue
      }

      const revoked = await revokeGrants(admin, r.id, r.user_id)
      results.push({
        id: r.id,
        url,
        state: revoked > 0 ? 'revoked' : 'unreadable',
        detail: revoked > 0 ? `${fetched.reason} — 이용권을 회수했습니다` : `${fetched.reason} (회수할 이용권 없음)`,
      })
      continue
    }

    const check = checkBlogHtml(fetched.html, countPhotos(fetched.html), countBodyChars(fetched.html))
    const failed = check.checks.filter(c => !c.ok)

    if (failed.length > 0) {
      const detail = failed.map(c => `${c.rule}(${c.detail})`).join(' / ')

      // 광고 표시가 사라진 것은 다른 조건과 다르다. 사진이 한 장 줄어든 것은 알리고
      // 말면 되지만, 이건 없는 채로 두면 광고주인 우리가 제재를 받는다.
      // 비공개와 같은 절차로 다룬다 — 한 번 더 읽어 같은 답이면 회수한다.
      if (failed.some(c => c.rule === DISCLOSURE_RULE)) {
        const again = await fetchBlogPost(url)
        const stillGone = again.html !== null
          && checkBlogHtml(again.html, countPhotos(again.html), countBodyChars(again.html))
            .checks.some(c => c.rule === DISCLOSURE_RULE && !c.ok)
        if (stillGone) {
          const revoked = await revokeGrants(admin, r.id, r.user_id)
          results.push({
            id: r.id,
            url,
            state: revoked > 0 ? 'revoked' : 'changed',
            detail: revoked > 0 ? `광고 표시가 사라졌습니다 — 이용권을 회수했습니다` : detail,
          })
          continue
        }
      }

      results.push({ id: r.id, url, state: 'changed', detail })
      continue
    }

    // 조건을 그대로 지키고 있다 — 앞서 회수했던 것이면 되살린다.
    const back = await restoreGrants(admin, r.id, r.user_id)
    results.push({
      id: r.id,
      url,
      state: back > 0 ? 'restored' : 'ok',
      detail: back > 0 ? '다시 공개돼 이용권을 되살렸습니다' : '조건 유지',
    })
  }

  const restored = results.filter(r => r.state === 'restored')
  const revoked = results.filter(r => r.state === 'revoked')
  const gone = results.filter(r => r.state === 'unreadable')
  const changed = results.filter(r => r.state === 'changed')

  if (revoked.length || restored.length || gone.length || changed.length) {
    await recordOperatorAlert(
      'feedback',
      `블로그 홍보 사후 확인 — 회수 ${revoked.length}건 · 되살림 ${restored.length}건 · ` +
        `못 읽음 ${gone.length}건 · 조건 어긋남 ${changed.length}건\n` +
        [...revoked, ...restored, ...gone, ...changed].slice(0, 10)
          .map(r => `· ${r.url}\n  ${r.detail}`).join('\n'),
    ).catch(() => {})
  }

  return NextResponse.json({
    checked: results.length,
    ok: results.length - revoked.length - restored.length - gone.length - changed.length,
    revoked: revoked.length,
    restored: restored.length,
    unreadable: gone.length,
    changed: changed.length,
    items: results,
  })
}
