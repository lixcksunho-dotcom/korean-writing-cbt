// 시험 중 '이 속도면 어디까지 푸는가'를 계산한다.
//
// 왜 필요한가: 이 시험의 최대 난관은 지식이 아니라 시간이다. 읽기 지문이 길어 앞에서
// 시간을 흘리면 뒤를 통째로 못 푼다. 그런데 화면에는 '남은 시간'만 있어서, 사람은
// 시계를 봐도 자기가 늦은 건지 아닌지를 모른다 — 다 풀고 나서야 안다.
// 남은 시간과 지금까지의 속도를 합쳐 '끝까지 갈 수 있는지'를 한 줄로 알려 준다.
//
// 순수 함수로 둔 이유: 브라우저 없이 숫자로 검증할 수 있어야 한다(check:pace).

export type Pace =
  | { kind: 'warmup' }                                        // 아직 판단할 만큼 안 풀었다
  | { kind: 'ontrack'; sparePercent: number }                  // 남는다
  | { kind: 'tight'; sparePercent: number }                    // 딱 맞는다
  | { kind: 'behind'; reachable: number; shortfall: number }   // 이 속도면 못 끝낸다

/**
 * @param answered  지금까지 답한 문항 수
 * @param total     전체 문항 수
 * @param elapsedSec 시작부터 지금까지 흐른 초
 * @param leftSec   남은 초
 */
export function computePace(answered: number, total: number, elapsedSec: number, leftSec: number): Pace {
  // 3문항 미만은 표본이 너무 적다. 1번에서 30초 걸렸다고 '못 끝낸다'고 겁주면
  // 도움이 아니라 방해다.
  if (answered < 3 || total <= 0 || elapsedSec <= 0) return { kind: 'warmup' }
  if (answered >= total) return { kind: 'ontrack', sparePercent: 100 }

  const secPerQ = elapsedSec / answered
  const remainingQ = total - answered
  const needSec = remainingQ * secPerQ

  if (needSec <= leftSec) {
    // 남는 시간을 '필요한 시간 대비 몇 %'로 본다 — 분으로 말하면 회차마다 감이 다르다.
    const sparePercent = Math.round(((leftSec - needSec) / Math.max(1, needSec)) * 100)
    return sparePercent < 10 ? { kind: 'tight', sparePercent } : { kind: 'ontrack', sparePercent }
  }

  // 이 속도로 남은 시간 동안 더 풀 수 있는 문항 수
  const canDoMore = Math.floor(leftSec / secPerQ)
  const reachable = Math.min(total, answered + canDoMore)
  return { kind: 'behind', reachable, shortfall: total - reachable }
}

/** 화면에 그대로 쓰는 문구. 숫자만 주고 판단은 사람에게 맡긴다 — 겁주지 않는다. */
export function paceMessage(p: Pace): string {
  switch (p.kind) {
    case 'warmup':
      return ''
    case 'ontrack':
      // %로 말하면 초반에 '여유 4182%' 같은 무의미한 수가 나온다(실측). 사람이 쓰는 말로 바꾼다.
      return p.sparePercent >= 100
        ? '지금 속도면 시간이 넉넉해요'
        : `지금 속도면 시간이 남아요 (여유 ${p.sparePercent}%)`
    case 'tight':
      return '지금 속도면 시간이 빠듯해요'
    case 'behind':
      return `지금 속도면 ${p.reachable}번까지 — ${p.shortfall}문항이 남아요`
  }
}
