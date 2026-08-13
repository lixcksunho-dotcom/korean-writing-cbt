import { createAdminClient } from '@/lib/supabase/admin'
import { REVOKED } from '@/lib/subscriptionRevocationPolicy'

// 매일 아침 보내는 '신규 구독 유입' 보고의 계산부. 전송·그림과 분리해 둔다 —
// 숫자가 맞는지는 화면 없이도 확인할 수 있어야 한다(npm run report:subs).

const DAY = 24 * 3600 * 1000
const KST = 9 * 3600 * 1000

/** KST 기준 날짜 문자열(YYYY-MM-DD). 서버는 UTC로 돌아서 그냥 자르면 하루가 밀린다. */
export function kstDay(iso: string | number | Date): string {
  return new Date(new Date(iso).getTime() + KST).toISOString().slice(0, 10)
}

/** 검사 스크립트가 만든 계정 — 지표에서 뺀다. */
const TEST_EMAIL = /^(uicheck|kbscheck|admincheck)\+/

/**
 * 이 날부터 방문 기록이 깨끗하다. 트래커가 navigator.webdriver를 보고 검사 트래픽을
 * 아예 안 남기게 된 날이다(커밋 8fc11be, 2026-08-04).
 *
 * 그 전 기록은 못 쓴다. 8/3 하루만 봐도 페이지뷰 3020·방문자 492인데, 한 방문자가
 * 40~53쪽씩 보고 238명은 딱 1쪽만 봤다 — 브라우저 컨텍스트마다 새 visitor_id가
 * 생기는 검사 트래픽이다. '90초에 8쪽' 규칙은 1쪽짜리를 못 걸러서, 사람 것과
 * 섞인 채로는 어떤 기준으로도 깨끗하게 갈라낼 수 없다.
 *
 * 그래서 걸러 내려 애쓰는 대신 **그 구간을 방문자 지표에서 뺀다**. 날이 지나면
 * 저절로 해소된다(2026-08-11부터 7일 비교가 온전해진다).
 */
export const TRACKING_CLEAN_FROM = '2026-08-04'

export type SubscriberReport = {
  /** 최근 10주, 오래된 주부터. label은 그 주 월요일(MM-DD) */
  weeks: { label: string; count: number }[]
  /** 방문 기록이 깨끗한 날만, 오래된 날부터(최대 14일) */
  days: { label: string; visitors: number }[]
  /** 방문자 비교가 온전한가 — 비교 두 구간이 전부 깨끗한 날일 때만 true */
  visitorsComparable: boolean
  /** 최근 7일 중 실제로 센 날 수(오염 구간을 뺀 나머지) */
  visitorDaysCounted: number
  todayCount: number
  yesterdayCount: number
  last7: number
  prev7: number
  total: number
  /** 마지막 결제일로부터 며칠 지났는가 (결제가 없으면 null) */
  daysSinceLast: number | null
  visitors7: number
  visitorsPrev7: number
  subscribeView7: number
  paymentStart7: number
  signup7: number
}

type Row = { created_at: string; amount: number | null; user_id: string; status: string }

/**
 * 주 단위로 묶는다. 유료 구독은 지금까지 10주에 9건뿐이라 일별로 그리면
 * 빈 칸만 60개가 남는다 — 주간이 이 밀도에서 읽히는 최소 단위다.
 */
export function bucketWeeks(dates: string[], now: number, weeks = 10) {
  const startOfWeekKST = (ms: number) => {
    const k = new Date(ms + KST)
    const dow = (k.getUTCDay() + 6) % 7 // 월요일=0
    k.setUTCHours(0, 0, 0, 0)
    return k.getTime() - dow * DAY - KST
  }
  const thisWeek = startOfWeekKST(now)
  const out: { label: string; count: number }[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const from = thisWeek - i * 7 * DAY
    const to = from + 7 * DAY
    const count = dates.filter((d) => {
      const t = new Date(d).getTime()
      return t >= from && t < to
    }).length
    out.push({ label: kstDay(from).slice(5), count })
  }
  return out
}

export async function buildSubscriberReport(now = Date.now()): Promise<SubscriberReport> {
  const admin = createAdminClient()

  // 테스트 계정을 빼려면 이메일이 필요한데 subscriptions에는 없다 → 계정 목록에서 걸러 낸다.
  const { data: userList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const testIds = new Set(
    (userList?.users ?? []).filter((u) => TEST_EMAIL.test(u.email ?? '')).map((u) => u.id),
  )

  const { data: subsRaw } = await admin
    .from('subscriptions')
    .select('created_at, amount, user_id, status')
    .order('created_at')
  // 환불(회수)된 건은 결제 추이에서 뺀다 — 안 빼면 취소된 주가 계속 매출로 보인다.
  const subs = ((subsRaw ?? []) as Row[])
    .filter((s) => (s.amount ?? 0) > 0 && s.status !== REVOKED && !testIds.has(s.user_id))
  const dates = subs.map((s) => s.created_at)

  // PostgREST는 한 번에 1000행까지만 준다. limit을 크게 줘도 조용히 잘리고, 정렬을 안 주면
  // 어느 1000행인지도 정해지지 않는다 — 실제로 오래된 쪽 1000행만 와서 최근 2주가
  // 통째로 '방문자 0명'으로 나왔다. 넘길 때까지 받아 온다.
  const since = new Date(now - 70 * DAY).toISOString()
  type View = { path: string; visitor_id: string | null; created_at: string }
  const views: View[] = []
  for (let from = 0; ; from += 1000) {
    const { data } = await admin
      .from('page_views')
      .select('path, visitor_id, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: true })
      .range(from, from + 999)
    const batch = (data ?? []) as View[]
    views.push(...batch)
    if (batch.length < 1000) break
  }

  // 검사 스크립트가 남긴 방문자는 뺀다 — 기준은 npm run funnel과 같다(90초에 화면 8개).
  const byVisitor = new Map<string, { t: number; path: string }[]>()
  for (const v of views) {
    if (v.path.startsWith('#event/')) continue
    const id = v.visitor_id ?? '?'
    if (!byVisitor.has(id)) byVisitor.set(id, [])
    byVisitor.get(id)!.push({ t: new Date(v.created_at).getTime(), path: v.path })
  }
  const bots = new Set<string>()
  for (const [id, items] of byVisitor) {
    items.sort((a, b) => a.t - b.t)
    for (let i = 0; i < items.length; i++) {
      const paths = new Set<string>()
      for (let j = i; j < items.length && items[j].t - items[i].t <= 90_000; j++) paths.add(items[j].path)
      if (paths.size >= 8) { bots.add(id); break }
    }
  }
  const human = views.filter((v) => !bots.has(v.visitor_id ?? '?'))
  const pageViews = human.filter((v) => !v.path.startsWith('#event/'))

  const todayKey = kstDay(now)
  const yesterdayKey = kstDay(now - DAY)
  const inRange = (from: number, to: number) => (iso: string) => {
    const t = new Date(iso).getTime()
    return t >= from && t < to
  }
  const d7 = now - 7 * DAY
  const d14 = now - 14 * DAY

  // 오염된 날은 아예 안 그린다. 회색으로라도 그리면 '그날 사람이 몰렸다'로 읽힌다.
  const days: { label: string; visitors: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const key = kstDay(now - i * DAY)
    if (key < TRACKING_CLEAN_FROM) continue
    const ids = new Set(pageViews.filter((v) => kstDay(v.created_at) === key).map((v) => v.visitor_id ?? '?'))
    days.push({ label: key.slice(5), visitors: ids.size })
  }
  const visitorsComparable = kstDay(d14) >= TRACKING_CLEAN_FROM

  const evUv = (name: string, from: number) =>
    new Set(human.filter((v) => v.path === `#event/${name}` && new Date(v.created_at).getTime() >= from)
      .map((v) => v.visitor_id ?? '?')).size

  const lastDate = dates.length ? new Date(dates[dates.length - 1]).getTime() : null

  return {
    weeks: bucketWeeks(dates, now),
    days,
    visitorsComparable,
    todayCount: dates.filter((d) => kstDay(d) === todayKey).length,
    yesterdayCount: dates.filter((d) => kstDay(d) === yesterdayKey).length,
    last7: dates.filter(inRange(d7, now)).length,
    prev7: dates.filter(inRange(d14, d7)).length,
    total: dates.length,
    daysSinceLast: lastDate === null ? null : Math.floor((now - lastDate) / DAY),
    visitorDaysCounted: cleanDaysIn(d7, now),
    visitors7: uniqueVisitors(d7, now),
    visitorsPrev7: uniqueVisitors(d14, d7),
    subscribeView7: evUv('subscribe_view', d7),
    paymentStart7: evUv('payment_started', d7),
    signup7: evUv('signup', d7),
  }

  // 방문자 수는 '깨끗한 날'만 센다. 오염 구간을 섞으면 검사 트래픽이 사람으로 잡힌다.
  function uniqueVisitors(from: number, to: number) {
    return new Set(
      pageViews
        .filter((v) => {
          const t = new Date(v.created_at).getTime()
          return t >= from && t < to && kstDay(v.created_at) >= TRACKING_CLEAN_FROM
        })
        .map((v) => v.visitor_id ?? '?'),
    ).size
  }
  function cleanDaysIn(from: number, to: number) {
    let n = 0
    for (let t = from; t < to; t += DAY) if (kstDay(t) >= TRACKING_CLEAN_FROM) n++
    return n
  }
}

/** 증감 표시 — 0에서 0으로 가는 건 '변화 없음'이지 '0%'가 아니다. */
export function deltaLabel(now: number, before: number): string {
  if (now === before) return '변화 없음'
  const diff = now - before
  const sign = diff > 0 ? '▲' : '▼'
  if (before === 0) return `${sign} ${Math.abs(diff)} (이전 0)`
  return `${sign} ${Math.abs(diff)} (${Math.round((diff / before) * 100)}%)`
}
