// 유료회원 통계 계산 — 순수 함수만(조회는 화면에서). 검사 스크립트가 서버 없이 부를 수 있다.
//
// 왜 필요한가: 관리자 화면에 회원 목록과 결제 원장은 있었지만 "돈 낸 사람들이 실제로 얼마나 쓰고
// 몇 점을 받는지"는 아무 데도 없었다(운영자 지시 2026-09-08). 이용권을 늘릴지, AI 한도를 올릴지,
// 문제 난이도를 어떻게 할지가 전부 이 숫자에 달려 있다.

import { predictScore } from './predictedScore'

/** 모의고사 한 회 결과 — 객관식 맞은 수/전체 */
export type ExamRow = { userId: string; score: number | null; total: number | null; completedAt: string | null }
/** 서술형 AI 채점 — 받은 점수/배점 */
export type EssayRow = { userId: string; aiScore: number | null; points: number | null }
/** 하루치 AI 첨삭 사용량 */
export type UsageRow = { userId: string; day: string; count: number }

export type PaidMember = {
  userId: string
  email: string
  passLabel: string
  amount: number
  startedAt: string
  expiresAt: string
  daysLeft: number
  /** AI 첨삭 — 누적·최근 7일·하루 최대 */
  aiTotal: number
  ai7d: number
  aiMaxDay: number
  /** 모의고사 — 응시 수·평균 점수(만점 환산)·최고 */
  exams: number
  avgScore: number | null
  bestScore: number | null
}

// 예상 점수 계산은 predictedScore 한 곳에만 둔다 — 예전에는 여기와 대시보드가 각자 계산했고,
// 둘 다 서술형을 안 받은 사람의 서술형 득점률을 객관식 정답률로 대신했다(실측 오차 22.2%p).

const dayKey = (iso: string) => iso.slice(0, 10)

/**
 * 회원별 줄을 만든다. 조회 결과(전량)를 넘기면 사람 단위로 접는다.
 *
 * 점수는 '회차별 예상 점수의 평균'이다 — 전체를 한 번에 합치면 문항을 많이 푼 사람이 평균을 끌고 간다.
 */
export function buildPaidMembers(input: {
  passes: { userId: string; email: string; passLabel: string; amount: number; startedAt: string; expiresAt: string }[]
  exams: ExamRow[]
  essays: EssayRow[]
  usage: UsageRow[]
  weight: { objective: number; essay: number }
  now?: Date
}): PaidMember[] {
  const now = input.now ?? new Date()
  const since7 = new Date(now.getTime() - 7 * 86400_000).toISOString().slice(0, 10)

  // 서술형 채점은 사람 단위로 모은다(회차 정보가 없다). 축소·평균 처리는 predictScore 가 한다.
  const essayByUser = new Map<string, { aiScore: number | null; points: number | null }[]>()
  for (const e of input.essays) {
    if (e.aiScore == null || !e.points) continue
    essayByUser.set(e.userId, [...(essayByUser.get(e.userId) ?? []), { aiScore: e.aiScore, points: e.points }])
  }

  const examByUser = new Map<string, ExamRow[]>()
  for (const x of input.exams) {
    if (!x.total) continue
    examByUser.set(x.userId, [...(examByUser.get(x.userId) ?? []), x])
  }

  const usageByUser = new Map<string, UsageRow[]>()
  for (const u of input.usage) usageByUser.set(u.userId, [...(usageByUser.get(u.userId) ?? []), u])

  return input.passes.map(p => {
    const ex = examByUser.get(p.userId) ?? []
    const userEssays = essayByUser.get(p.userId) ?? []
    const perExam = ex
      .map(x => predictScore({
        objectiveCorrect: x.score ?? 0,
        objectiveAnswered: x.total ?? 0,
        essays: userEssays,
        weight: input.weight,
      })?.score)
      .filter((v): v is number => v != null)
    const use = usageByUser.get(p.userId) ?? []
    return {
      userId: p.userId,
      email: p.email,
      passLabel: p.passLabel,
      amount: p.amount,
      startedAt: p.startedAt,
      expiresAt: p.expiresAt,
      daysLeft: Math.ceil((new Date(p.expiresAt).getTime() - now.getTime()) / 86400_000),
      aiTotal: use.reduce((s, u) => s + u.count, 0),
      ai7d: use.filter(u => dayKey(u.day) >= since7).reduce((s, u) => s + u.count, 0),
      aiMaxDay: use.reduce((m, u) => Math.max(m, u.count), 0),
      exams: ex.length,
      avgScore: perExam.length ? Math.round(perExam.reduce((a, b) => a + b, 0) / perExam.length) : null,
      bestScore: perExam.length ? Math.max(...perExam) : null,
    }
  })
}

export type PaidSummary = {
  members: number
  paidMembers: number
  freeMembers: number
  aiTotal: number
  aiPerMember: number
  ai7d: number
  usedAi: number
  hitCapEver: number
  examTakers: number
  avgScore: number | null
}

/** 전체 요약. 평균은 '해당되는 사람'만으로 낸다 — 안 쓴 사람까지 0으로 넣으면 실제보다 낮게 보인다. */
export function summarizePaidMembers(rows: PaidMember[], dailyCap: number): PaidSummary {
  const scored = rows.filter(r => r.avgScore != null).map(r => r.avgScore as number)
  return {
    members: rows.length,
    paidMembers: rows.filter(r => r.amount > 0).length,
    freeMembers: rows.filter(r => r.amount <= 0).length,
    aiTotal: rows.reduce((s, r) => s + r.aiTotal, 0),
    aiPerMember: rows.length ? Math.round((rows.reduce((s, r) => s + r.aiTotal, 0) / rows.length) * 10) / 10 : 0,
    ai7d: rows.reduce((s, r) => s + r.ai7d, 0),
    usedAi: rows.filter(r => r.aiTotal > 0).length,
    hitCapEver: rows.filter(r => r.aiMaxDay >= dailyCap).length,
    examTakers: rows.filter(r => r.exams > 0).length,
    avgScore: scored.length ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : null,
  }
}
