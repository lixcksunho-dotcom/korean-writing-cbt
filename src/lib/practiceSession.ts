// 객관식 연습의 '풀이 설정'을 계산만 떼어 둔다 — 화면 없이 검사할 수 있게.
//
// 경쟁 CBT(cbtbank·comcbt·machuda)는 전부 문항 순서/보기 순서를 섞는 선택지와
// '바로 정답 확인 ↔ 다 풀고 채점'을 고르게 한다. 같은 회차를 두 번째 풀 때 답의
// 위치(③)를 외워 버리는 걸 막는 장치다. 우리는 늘 같은 순서, 늘 즉시 공개였다.
//
// 섞는 건 재현 가능해야 한다 — 새로고침하면 순서가 바뀌어 "아까 3번이 어디 갔지"가
// 되므로, 씨앗(seed) 하나로 같은 순서를 다시 만든다.

export type PracticePrefs = {
  /** 문항 순서 */
  order: 'sequential' | 'random'
  /** 보기(①~⑤) 섞기 */
  shuffleChoices: boolean
  /** 정답 공개 시점 — 고르자마자 / 다 풀고 채점 */
  reveal: 'instant' | 'deferred'
}

export const DEFAULT_PREFS: PracticePrefs = { order: 'sequential', shuffleChoices: false, reveal: 'instant' }

const PREFS_KEY = 'kptest_practice_prefs_v1'

export function readPrefsRaw(): string | null {
  try {
    return localStorage.getItem(PREFS_KEY)
  } catch {
    return null
  }
}

/** 모르는 값·깨진 값은 기본값으로 — 설정 하나 때문에 연습이 안 열리면 안 된다. */
export function parsePrefs(raw: string | null): PracticePrefs {
  if (!raw) return DEFAULT_PREFS
  try {
    const v = JSON.parse(raw) as Partial<PracticePrefs> | null
    if (!v || typeof v !== 'object') return DEFAULT_PREFS
    return {
      order: v.order === 'random' ? 'random' : 'sequential',
      shuffleChoices: v.shuffleChoices === true,
      reveal: v.reveal === 'deferred' ? 'deferred' : 'instant',
    }
  } catch {
    return DEFAULT_PREFS
  }
}

export function savePrefs(prefs: PracticePrefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    /* 사생활 보호 모드 — 이번 화면에서만 적용되고 다음에 다시 고르면 된다 */
  }
}

/** mulberry32 — 작고 결정적인 난수. 암호용이 아니라 순서를 재현하려는 용도다. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 문자열을 32비트 씨앗으로 — 문항 id마다 다른 보기 순서를 만들되 같은 세션에선 고정. */
export function hashSeed(seed: number, salt: string): number {
  let h = seed >>> 0
  for (let i = 0; i < salt.length; i++) {
    h = Math.imul(h ^ salt.charCodeAt(i), 0x01000193) >>> 0
  }
  return h
}

/** 0..n-1의 순열. Fisher–Yates, 씨앗 고정. */
export function permutation(n: number, seed: number): number[] {
  const rnd = seededRandom(seed)
  const p = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[p[i], p[j]] = [p[j], p[i]]
  }
  return p
}

export function shuffleWithSeed<T>(items: readonly T[], seed: number): T[] {
  return permutation(items.length, seed).map(i => items[i])
}

/**
 * 보기 순서를 섞을 때 '화면 i번째 보기'가 '원래 몇 번 보기'인지. 답은 원래 번호로
 * 저장·채점해야 한다 — 화면 번호로 저장하면 설정을 끄는 순간 정답이 틀린 답이 된다.
 * 같은 문항·같은 씨앗이면 항상 같은 순서다.
 */
export function choiceOrder(optionCount: number, questionId: string, seed: number, enabled: boolean): number[] {
  if (!enabled || optionCount < 2) return Array.from({ length: optionCount }, (_, i) => i)
  return permutation(optionCount, hashSeed(seed, questionId))
}

export function newSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0
}
