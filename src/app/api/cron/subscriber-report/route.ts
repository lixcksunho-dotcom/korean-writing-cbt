import { buildSubscriberReport, deltaLabel, kstDay, EXPIRING_WINDOW_DAYS, EXPIRED_WINDOW_DAYS, TRACKING_CLEAN_FROM } from '@/lib/subscriberReport'
import { renderSubscriberReport } from '@/lib/subscriberReportChart'

// 매일 아침 9시(KST)에 신규 구독 유입을 텔레그램으로 보낸다.
// Vercel Cron이 부른다(vercel.json). 크론은 UTC라 0 0 * * * = KST 09:00.
//
// 아무나 부르면 안 되는 이유는 비밀이 새서가 아니라, 매일 한 번이어야 할 보고가
// 아무 때나 여러 번 오면 그때부터 아무도 안 보게 되기 때문이다.
// Vercel Cron은 Authorization: Bearer <CRON_SECRET>을 붙여 준다.
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false // 미설정이면 아예 안 연다 — 열어 두는 것보다 안 도는 게 낫다
  return req.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  // 미리보기: 텔레그램으로 보내지 않고 결과만 돌려준다. 매일 아침을 기다리지 않고
  // 숫자와 그림을 확인할 수 있어야 고칠 수 있다(npm run report:subs).
  const url = new URL(req.url)
  const preview = url.searchParams.get('preview')

  // 미리보기일 때만 '지금'을 지정할 수 있다. 주 경계·KST 날짜 계산은 오늘 날짜에 따라
  // 답이 달라져서, 고정된 시각 없이는 맞는지 확인할 방법이 없다(check:report).
  const at = preview ? Number(url.searchParams.get('now')) : NaN
  const now = Number.isFinite(at) && at > 0 ? at : Date.now()
  const r = await buildSubscriberReport(now)
  const asOf = kstDay(now)

  const image = renderSubscriberReport(r, asOf)
  if (preview === 'image') return image
  const png = await image.arrayBuffer()

  // 그림에는 숫자만 있다(한글 글꼴이 없다) — 읽는 말은 전부 여기 캡션에 싣는다.
  const lines = [
    `📊 ${asOf} 신규 구독 유입`,
    '',
    `어제 ${r.yesterdayCount}건 · 오늘 ${r.todayCount}건`,
    `최근 7일 ${r.last7}건 (직전 7일 ${r.prev7}건 · ${deltaLabel(r.last7, r.prev7)})`,
    `누적 ${r.total}건`,
    r.daysSinceLast === null
      ? '아직 결제가 없습니다.'
      : r.daysSinceLast === 0
        ? '오늘 결제가 있었습니다.'
        : `마지막 결제로부터 ${r.daysSinceLast}일`,
    '',
    '앞단 (최근 7일)',
    r.visitorsComparable
      ? `· 방문자 ${r.visitors7}명 (직전 7일 ${r.visitorsPrev7}명 · ${deltaLabel(r.visitors7, r.visitorsPrev7)})`
      : `· 방문자 ${r.visitors7}명 (최근 ${r.visitorDaysCounted}일치 · 비교는 아직)`,
    `· 구독페이지 ${r.subscribeView7}명 → 결제창 ${r.paymentStart7}명`,
    `· 가입 ${r.signup7}명`,
    '',
    '재결제로 붙잡을 사람',
    `· ${EXPIRING_WINDOW_DAYS}일 안에 끝남 ${r.expiringSoon}명`,
    `· 최근 ${EXPIRED_WINDOW_DAYS}일 안에 끝났는데 다시 안 삼 ${r.expiredNotBack}명`,
    ...(r.visitorsComparable
      ? []
      : [`
※ ${TRACKING_CLEAN_FROM} 이전 방문 기록은 검사 트래픽이 섞여 있어 뺐습니다.`]),
  ]

  if (preview) return Response.json({ preview: true, asOf, caption: lines.join('\n'), report: r })

  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    return Response.json({ error: 'TELEGRAM_BOT_TOKEN·TELEGRAM_CHAT_ID 미설정' }, { status: 503 })
  }

  const form = new FormData()
  form.append('chat_id', chatId)
  form.append('caption', lines.join('\n'))
  form.append('photo', new Blob([png], { type: 'image/png' }), `subs-${asOf}.png`)

  const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: 'POST', body: form })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    // 실패를 200으로 삼키면 '조용히 안 오는' 상태가 된다 — 크론 로그에 남게 한다.
    return Response.json({ error: 'telegram', status: res.status, body }, { status: 502 })
  }
  return Response.json({ sent: true, asOf, last7: r.last7, total: r.total })
}
