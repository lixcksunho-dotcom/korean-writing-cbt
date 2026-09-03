// 날짜별 판매 집계.
//
// 포트원 화면이 따로 있지만 그건 PG가 본 것이고, 이건 **우리가 실제로 발급한 것**이다.
// 둘이 갈리면(결제는 됐는데 발급이 안 된 건) 포트원 대조 화면이 잡는다. 여기서는
// 발급 원장만 본다 — 키가 없어도 뜨고, 지금 얼마가 들어왔는지에 답하는 것이 목적이다.
//
// 주의 두 가지.
//   · 무료 발급(행사·블로그 답례)이 같은 표에 섞여 있다. amount로 갈라야 매출이 맞다.
//   · 날짜는 한국 시간으로 끊는다. UTC로 끊으면 밤 9시 이후 결제가 다음 날로 넘어간다.

export type SubscriptionRow = {
  created_at: string
  amount: number | string | null
  status: string | null
  payment_key: string | null
}

export type DayBucket = {
  /** YYYY-MM-DD (한국 시간) */
  date: string
  count: number
  amount: number
  /** 그날 취소된 건 */
  cancelled: number
  /** 그날 나간 무료 발급 */
  free: number
}

export type WeekBucket = {
  /** 그 주 월요일 (YYYY-MM-DD, 한국 시간) */
  start: string
  /** 그 주 일요일 */
  end: string
  count: number
  amount: number
}

export type SalesSummary = {
  days: DayBucket[]
  /** 최근 주간 묶음 — 오래된 주가 앞이다 */
  weeks: WeekBucket[]
  today: DayBucket
  last7: { count: number; amount: number }
  last30: { count: number; amount: number }
  all: { count: number; amount: number }
  freeTotal: number
  cancelledTotal: number
  /** 실제 결제로 보기 어려운 행(시드·데모). 조용히 빼지 않고 드러낸다. */
  suspicious: { date: string; amount: number; key: string }[]
}

const KST_OFFSET_MS = 9 * 60 * 60 * 1000

/** 한국 시간 기준 날짜(YYYY-MM-DD) */
export function kstDate(iso: string | number | Date): string {
  const t = iso instanceof Date ? iso.getTime() : new Date(iso).getTime()
  return new Date(t + KST_OFFSET_MS).toISOString().slice(0, 10)
}

/** 결제로 보기 어려운 키 — PG가 만든 키는 이런 모양이 아니다. */
function looksSeeded(key: string | null): boolean {
  if (!key) return true
  return /^(demo|test|seed|promo|manual|goodwill)/i.test(key)
}

const num = (v: number | string | null) => (v === null ? 0 : Number(v) || 0)

/**
 * @param rows 구독 발급 전체
 * @param now  '오늘'을 판정할 기준 시각 — 렌더 중 Date.now()를 부르면 순수하지 않다
 */
export function summarizeSales(rows: SubscriptionRow[], now: Date, dayCount = 30): SalesSummary {
  const byDate = new Map<string, DayBucket>()
  const suspicious: SalesSummary['suspicious'] = []
  let freeTotal = 0
  let cancelledTotal = 0
  const all = { count: 0, amount: 0 }

  // 최근 N일 칸을 미리 만들어 둔다 — 매출 0인 날이 빠지면 그래프가 거짓말을 한다.
  const todayKey = kstDate(now)
  for (let i = dayCount - 1; i >= 0; i -= 1) {
    const d = kstDate(now.getTime() - i * 86400000)
    byDate.set(d, { date: d, count: 0, amount: 0, cancelled: 0, free: 0 })
  }

  for (const r of rows) {
    const date = kstDate(r.created_at)
    const amount = num(r.amount)
    const bucket = byDate.get(date)

    if (amount === 0) {
      freeTotal += 1
      if (bucket) bucket.free += 1
      continue
    }
    if (r.status === 'cancelled') {
      cancelledTotal += 1
      if (bucket) bucket.cancelled += 1
      continue
    }

    all.count += 1
    all.amount += amount
    if (bucket) {
      bucket.count += 1
      bucket.amount += amount
    }
    if (looksSeeded(r.payment_key)) {
      suspicious.push({ date, amount, key: r.payment_key ?? '(없음)' })
    }
  }

  const days = [...byDate.values()]
  const sum = (n: number) => {
    const slice = days.slice(-n)
    return {
      count: slice.reduce((s, d) => s + d.count, 0),
      amount: slice.reduce((s, d) => s + d.amount, 0),
    }
  }

  // 주 단위로 다시 묶는다. 하루 단위는 들쭉날쭉해서 '늘고 있나'를 못 읽는다 —
  // 주말에 몰리는 서비스라 요일 편차가 큰 것이 정상이다.
  // 주는 월요일에 시작한다(한국에서 '이번 주'는 보통 월~일이다).
  const weeks: WeekBucket[] = []
  for (const d of days) {
    const dt = new Date(`${d.date}T00:00:00Z`)
    const dow = dt.getUTCDay()            // 0=일
    const back = dow === 0 ? 6 : dow - 1  // 월요일까지 며칠 되돌리나
    const monday = new Date(dt.getTime() - back * 86400000).toISOString().slice(0, 10)
    let w = weeks.find(x => x.start === monday)
    if (!w) {
      const sunday = new Date(new Date(`${monday}T00:00:00Z`).getTime() + 6 * 86400000)
        .toISOString().slice(0, 10)
      w = { start: monday, end: sunday, count: 0, amount: 0 }
      weeks.push(w)
    }
    w.count += d.count
    w.amount += d.amount
  }

  return {
    days,
    weeks,
    today: byDate.get(todayKey) ?? { date: todayKey, count: 0, amount: 0, cancelled: 0, free: 0 },
    last7: sum(7),
    last30: sum(30),
    all,
    freeTotal,
    cancelledTotal,
    suspicious,
  }
}
