import { recordOperatorAlert } from '@/lib/operatorAlerts'

// AI 채점 호출이 실패했을 때 '누구 탓인지'를 가려 준다.
//
// 왜 필요한가: 2026-07-09·07-10에 실제 사용자 두 명이 서술형 AI 채점을 시도해
// 무료 체험을 1회씩 썼는데, quiz_answers.ai_score 는 둘 다 null이고 체험도
// 환불되지 않았다. 즉 채점이 끝까지 간 적이 없다. 그런데 **왜 실패했는지는
// 아무 데도 남아 있지 않다** — catch가 오류를 통째로 버리고 "연결하지 못했어요"
// 한 문장으로 덮었기 때문이다. 한 달 뒤에도 원인을 못 찾는 상태가 그 결과다.
//
// 그래서 여기서 오류를 종류별로 갈라, 사용자에게는 알맞은 안내를, 운영자에게는
// 상태코드와 오류 유형을 남긴다. 설정·잔액 문제처럼 사용자가 재시도해도 소용없는
// 것은 텔레그램으로 즉시 알린다(모르고 지나가는 게 제일 나쁘다).

export type GradingFailure = {
  /** 사용자에게 보일 문장 */
  userMessage: string
  /** 콘솔에 남길 한 줄 */
  operator: string
  /** 무료 체험 차감을 되돌려야 하는가 */
  refund: boolean
  /** 사용자가 다시 눌러도 소용없는, 운영자가 손봐야 하는 문제인가 */
  needsOperator: boolean
}

type MaybeApiError = {
  status?: number
  error?: { error?: { type?: string; message?: string } }
  message?: string
  name?: string
}

/** 잔액 부족은 400 invalid_request_error 로 오고, 본문 메시지로만 구분된다. */
function isCreditExhausted(status: number | undefined, message: string): boolean {
  return status === 400 && /credit balance|insufficient/i.test(message)
}

export function describeGradingFailure(err: unknown): GradingFailure {
  const e = (err ?? {}) as MaybeApiError
  const status = typeof e.status === 'number' ? e.status : undefined
  const message = e.error?.error?.message ?? e.message ?? String(err)
  const kind = e.error?.error?.type ?? e.name ?? 'unknown'

  const base = `status=${status ?? '-'} type=${kind} ${message.slice(0, 200)}`

  // 키가 아예 없으면 SDK 생성자가 던진다. 상태코드가 없고 문구로만 알 수 있는데,
  // SDK가 내는 실제 문구는 'Could not resolve authentication method…'다(로컬 운영빌드로 확인).
  // ANTHROPIC_API_KEY라는 말은 나오지 않아서, 그것만 찾다가 '통신 실패'로 잘못 분류했다.
  if (!status && /ANTHROPIC_API_KEY|Could not resolve authentication method/i.test(message)) {
    return {
      userMessage: 'AI 채점을 지금 이용할 수 없어요. 체험 횟수는 차감되지 않았으니 잠시 후 다시 시도해 주세요.',
      operator: `[AI채점] API 키가 설정되지 않았다 — ${base}`,
      refund: true,
      needsOperator: true,
    }
  }

  if (isCreditExhausted(status, message)) {
    return {
      userMessage: 'AI 채점을 지금 이용할 수 없어요. 체험 횟수는 차감되지 않았으니 잠시 후 다시 시도해 주세요.',
      operator: `[AI채점] Anthropic 잔액 소진 — 충전 전까지 모든 채점이 실패한다. ${base}`,
      refund: true,
      needsOperator: true,
    }
  }

  if (status === 401 || status === 403) {
    return {
      userMessage: 'AI 채점을 지금 이용할 수 없어요. 체험 횟수는 차감되지 않았으니 잠시 후 다시 시도해 주세요.',
      operator: `[AI채점] 인증 거부 — 키가 폐기됐거나 권한이 없다. ${base}`,
      refund: true,
      needsOperator: true,
    }
  }

  if (status === 404) {
    return {
      userMessage: 'AI 채점을 지금 이용할 수 없어요. 체험 횟수는 차감되지 않았으니 잠시 후 다시 시도해 주세요.',
      operator: `[AI채점] 모델을 찾을 수 없다 — 모델 ID가 폐기됐을 수 있다. ${base}`,
      refund: true,
      needsOperator: true,
    }
  }

  if (status === 429) {
    return {
      userMessage: '지금 채점 요청이 몰려 있어요. 1분 뒤에 다시 시도해 주세요.',
      operator: `[AI채점] 요청 한도 초과 ${base}`,
      refund: true,
      needsOperator: false,
    }
  }

  // 나머지(통신 끊김·타임아웃·5xx)는 잠깐 뒤 다시 하면 되는 것들이다.
  return {
    userMessage: 'AI 채점 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.',
    operator: `[AI채점] 응답을 받지 못함 ${base}`,
    refund: true,
    needsOperator: false,
  }
}

/** 응답이 길이 제한에 걸려 잘린 경우. JSON이 중간에서 끊겨 파싱이 반드시 실패한다. */
export function truncatedFailure(maxTokens: number): GradingFailure {
  return {
    userMessage: '채점 결과가 너무 길어 완성되지 못했어요. 체험 횟수는 차감되지 않았으니 다시 시도해 주세요.',
    operator: `[AI채점] 응답이 max_tokens(${maxTokens})에서 잘렸다 — 한도를 올려야 한다`,
    refund: true,
    needsOperator: true,
  }
}

/**
 * 운영자가 손봐야 하는 실패를 알린다(기록 + 설정돼 있으면 텔레그램).
 * 잔액·키 문제는 모든 사용자에게 동시에 터지므로 조용히 넘기면 안 된다.
 */
export async function alertGradingFailure(where: string, f: GradingFailure): Promise<void> {
  if (!f.needsOperator) return
  await recordOperatorAlert(
    'ai_grading',
    `${where} — ${f.operator}`,
    where,
    `🛑 AI 채점 실패 (${where})

${f.operator}

사용자는 채점을 받지 못했습니다.`,
  )
}
