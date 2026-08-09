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

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch(`https://api.anthropic.com/v1/models/${MODEL}`, {
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      signal: controller.signal,
      cache: 'no-store',
    })
    if (res.status === 200) {
      return {
        ok: true,
        title: 'AI 채점 키 정상',
        detail: `${MODEL} 사용 가능. 잔액은 API로 확인할 수 없으니 console.anthropic.com에서 보세요.`,
      }
    }
    if (res.status === 401 || res.status === 403) {
      return { ok: false, title: 'AI 채점 키가 거부됐습니다', detail: `인증 실패(${res.status}) — 키가 폐기됐거나 권한이 없습니다.` }
    }
    if (res.status === 404) {
      return { ok: false, title: 'AI 채점 모델을 찾을 수 없습니다', detail: `${MODEL} 이(가) 폐기됐을 수 있습니다. 모델 ID를 갱신하세요.` }
    }
    return { ok: false, title: 'AI 채점 키 확인 실패', detail: `Anthropic 응답 ${res.status}` }
  } catch {
    return { ok: false, title: 'AI 채점 키를 확인하지 못했습니다', detail: 'Anthropic에 연결하지 못했습니다(일시적일 수 있음).' }
  } finally {
    clearTimeout(timer)
  }
}
