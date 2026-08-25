// AI 채점 키가 '배포된 서버에서' 살아 있는지 본다.
//
// 로컬 .env.local에 키가 있어도 Vercel 환경변수에 없으면 채점은 전부 실패한다.
// 그리고 그 실패는 사용자 화면에만 뜨고 어디에도 안 남는다 — 실제로 그렇게
// 한 달을 지나갔다. 그래서 관리자 첫 화면에서 바로 보이게 한다.
//
// GET /v1/models 는 토큰을 쓰지 않아 **요금이 발생하지 않는다**. 채점을 실제로
// 돌려 보는 게 아니므로 이 점검 자체는 공짜다.
//
// 다만 이걸로 알 수 없는 게 하나 있다: **잔액**. Anthropic은 잔액을 API로
// 노출하지 않고, 잔액이 0이면 /v1/models 는 여전히 200을 준다. 잔액은
// console.anthropic.com 에서 봐야 한다. 대신 잔액이 바닥나 채점이 실패하면
// aiGradingFailure 가 텔레그램으로 알린다.

import { describeKeyShape } from '@/lib/apiKeyShape'

const MODEL = 'claude-sonnet-4-6'

export type AiKeyStatus = {
  ok: boolean
  title: string
  detail: string
}

export async function checkAiKey(): Promise<AiKeyStatus> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) {
    return {
      ok: false,
      title: 'AI 채점 키가 이 서버에 없습니다',
      detail: 'ANTHROPIC_API_KEY 미설정 — 원고지·서술형 AI 채점이 전부 실패합니다. Vercel 환경변수에 추가하고 재배포하세요.',
    }
  }

  // 값의 모양은 참고로만 본다. 앞뒤 공백 정도로는 호출이 깨지지 않는다는 걸 실측으로
  // 확인했다(fetch·SDK 둘 다 200). 그래서 모양이 이상해도 **호출은 반드시 해 본다** —
  // 되는지 안 되는지는 눌러 봐야 알고, 모양만 보고 단정하면 엉뚱한 데를 고치게 된다.
  const shape = describeKeyShape(key, 'sk-ant-')
  const note = shape.ok ? '' : ` (참고: 환경변수 값 ${shape.problem} — 지금은 동작에 지장 없음)`

  // 한 번 실패했다고 '키가 문제'라고 말하면 안 된다. 관리자 화면을 열 때마다 도는 점검이라
  // 한 번의 지연이 그대로 빨간불이 된다(실제로 그렇게 뜬 것을 사장님이 보고 놀랐다).
  // 짧게 한 번 더 시도하고, 그래도 안 되면 '무엇이' 안 됐는지 구분해서 말한다.
  let lastError: 'timeout' | 'network' = 'network'
  let lastReason = ''
  for (let attempt = 0; attempt < 2; attempt++) {
    const outcome = await probe(key.trim())
    if (outcome.kind === 'status') return fromStatus(outcome.status, note)
    lastError = outcome.kind
    lastReason = outcome.reason ?? ''
  }
  return lastError === 'timeout'
    ? { ok: false, title: 'AI 채점 키 확인이 시간 안에 안 끝났습니다', detail: `Anthropic 응답이 ${TIMEOUT_MS / 1000}초 안에 오지 않았습니다(두 번 시도). 채점이 실제로 실패했는지는 사고 알림으로 확인하세요.` }
    : { ok: false, title: 'AI 채점 키를 확인하지 못했습니다', detail: `Anthropic에 연결하지 못했습니다(두 번 시도)${lastReason ? ` — ${lastReason}` : ''}${note}` }
}

const TIMEOUT_MS = 8000

/** 한 번 두드려 본다. 응답 코드를 받았으면 그걸, 못 받았으면 왜 못 받았는지를 돌려준다. */
async function probe(key: string): Promise<{ kind: 'status'; status: number } | { kind: 'timeout' | 'network'; reason?: string }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`https://api.anthropic.com/v1/models/${MODEL}`, {
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      signal: controller.signal,
      cache: 'no-store',
    })
    return { kind: 'status', status: res.status }
  } catch (e) {
    const err = e as Error
    // 사유에 키가 섞이면 화면·로그에 그대로 남는다. 키처럼 생긴 토막은 지운다.
    const reason = String(err?.message ?? '').replace(/sk-[A-Za-z0-9_-]+/g, '<키>').slice(0, 120)
    return { kind: err?.name === 'AbortError' ? 'timeout' : 'network', reason }
  } finally {
    clearTimeout(timer)
  }
}

function fromStatus(status: number, note = ''): AiKeyStatus {
  if (status === 200) {
    return {
      ok: true,
      title: 'AI 채점 키 정상',
      detail: `${MODEL} 사용 가능. 잔액은 API로 확인할 수 없으니 console.anthropic.com에서 보세요.${note}`,
    }
  }
  if (status === 401 || status === 403) {
    return { ok: false, title: 'AI 채점 키가 거부됐습니다', detail: `인증 실패(${status}) — 키가 폐기됐거나 권한이 없습니다.` }
  }
  if (status === 404) {
    return { ok: false, title: 'AI 채점 모델을 찾을 수 없습니다', detail: `${MODEL} 이(가) 폐기됐을 수 있습니다. 모델 ID를 갱신하세요.` }
  }
  return { ok: false, title: 'AI 채점 키 확인 실패', detail: `Anthropic 응답 ${status}` }
}
