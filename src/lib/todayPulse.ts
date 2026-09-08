// 오늘 얼마나 들어왔는가 — 가입 수와 방문자 수.
//
// 왜 필요한가: 관리자 화면과 아침 보고에는 '최근 7일'과 '누적'만 있었다. 어제 뭘 했든
// 오늘 사람이 오고 있는지는 어디에도 없어서, 이벤트나 글을 올린 날 반응을 그날 볼 수 없었다
// (운영자 지시 2026-09-08). 계산은 여기 순수 함수에 두고, 조회는 부르는 쪽에서 한다.

/** page_views 한 줄. '#event/…'는 화면이 아니라 사건 기록이다. */
export type ViewRow = { path: string; visitor_id: string | null; created_at: string }

/** '지금 보고 있는 사람'으로 볼 시간 폭(분). 짧으면 늘 0명, 길면 이미 나간 사람까지 센다. */
export const LIVE_WINDOW_MIN = 15

/**
 * 오늘치를 셀 때 실제로 보는 기록의 폭.
 *
 * 부르는 쪽이 70일치를 주든 하루치를 주든 여기서 같은 폭으로 잘라서 센다. 폭이 다르면
 * 봇 판정에 쓰이는 앞뒤 기록이 달라져 같은 날인데 화면과 보고의 방문자 수가 어긋난다
 * (실제로 79명과 81명으로 갈렸다). 한국 자정은 UTC 기준 어제 15시라 36시간이면 넉넉히 덮는다.
 */
export const PULSE_WINDOW_MS = 36 * 3600_000

/** 한국 날짜(YYYY-MM-DD). 서버는 UTC라 그대로 자르면 아침 9시까지 어제로 나온다. */
export function kstDay(at: string | number | Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(at))
}

/**
 * 사람이 아닌 방문자 id.
 *
 * 검사 스크립트와 크롤러는 90초 안에 서로 다른 화면을 여덟 개씩 연다. 사람은 그렇게 안 읽는다.
 * 이걸 안 걸러 내면 우리가 검사를 돌린 날이 '방문자가 몰린 날'로 보인다.
 */
export function botVisitorIds(views: ViewRow[]): Set<string> {
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
  return bots
}

/**
 * 검사·실험이 만든 계정인가.
 *
 * 검사 스크립트는 우리 도메인(kptest.cloud·kbstest.cloud)이나 '…check+'/'…live+' 꼬리표로
 * 계정을 만든다. 이걸 안 빼면 검사를 돌린 날마다 가입자가 늘어난 것처럼 보인다.
 */
export function isTestAccountEmail(email: string | null | undefined): boolean {
  const e = (email ?? '').toLowerCase()
  if (/@(kptest|kbstest)\.cloud$/.test(e)) return true
  return /^[a-z]*(check|live|audit)\+/.test(e)
}

export type TodayPulse = {
  /** 오늘(한국 날짜) 가입한 사람 수 */
  signups: number
  /** 오늘 다녀간 사람 수(같은 사람은 한 번) */
  visitors: number
  /** 최근 LIVE_WINDOW_MIN 분 안에 화면을 연 사람 수 — '지금 몇 명' */
  now: number
}

/**
 * 오늘치를 센다.
 * @param views    page_views 행(오늘치가 들어 있으면 된다. 넓게 줘도 알아서 오늘만 센다)
 * @param signups  계정 생성 시각 목록(테스트 계정은 부르는 쪽에서 빼고 넘긴다)
 */
export function summarizeTodayPulse(views: ViewRow[], signups: string[], now = Date.now()): TodayPulse {
  views = views.filter(v => new Date(v.created_at).getTime() >= now - PULSE_WINDOW_MS)
  const bots = botVisitorIds(views)
  const today = kstDay(now)
  const pages = views.filter(v => !v.path.startsWith('#event/') && !bots.has(v.visitor_id ?? '?'))
  const liveFrom = now - LIVE_WINDOW_MIN * 60_000
  return {
    signups: signups.filter(s => kstDay(s) === today).length,
    visitors: new Set(pages.filter(v => kstDay(v.created_at) === today).map(v => v.visitor_id ?? '?')).size,
    now: new Set(pages.filter(v => new Date(v.created_at).getTime() >= liveFrom).map(v => v.visitor_id ?? '?')).size,
  }
}
