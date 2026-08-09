// 원고지에 쓰던 글을 브라우저에 임시 보관한다.
//
// 시험(ExamPlayer)과 서술형 연습(PracticeEssay)에는 사고 복구가 들어갔는데 원고지만
// 빠져 있었다. 정작 여기가 한 번에 가장 오래 쓰는 화면이다 — 400자를 손으로 채우는
// 동안 탭이 닫히거나 새로고침되면 전부 사라졌다.
//
// 세션 같은 게 없는 화면이라 열쇠는 하나다. 주제도 같이 담아 둔다 — 글만 살아나고
// 주제가 첫 번째로 돌아가 있으면 무엇에 대해 쓰던 글인지 알 수 없다.

const KEY = 'kptest_manuscript_draft'

export type ManuscriptDraft = { text: string; topicIdx: number; customTopic: string; at: number }

/** 오래된 초안은 되살리지 않는다 — 2주 전에 쓰다 만 글이 갑자기 떠 있으면 그게 더 놀랍다. */
const MAX_AGE = 14 * 24 * 3600 * 1000

/** getSnapshot에 그대로 쓸 수 있게 원문 문자열을 돌려준다(매번 새 객체를 만들면 무한 렌더). */
export function readManuscriptDraftRaw(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function parseManuscriptDraft(raw: string | null): ManuscriptDraft | null {
  if (!raw) return null
  try {
    const d = JSON.parse(raw) as ManuscriptDraft
    if (!d || typeof d.text !== 'string' || !d.text.trim()) return null
    if (typeof d.at === 'number' && Date.now() - d.at > MAX_AGE) return null
    return d
  } catch {
    return null
  }
}

export function saveManuscriptDraft(d: Omit<ManuscriptDraft, 'at'>): void {
  try {
    if (!d.text.trim()) return localStorage.removeItem(KEY)
    localStorage.setItem(KEY, JSON.stringify({ ...d, at: Date.now() }))
  } catch {
    // 용량 초과·사생활 보호 모드 — 저장 못 해도 글쓰기 자체는 계속돼야 한다
  }
}

export function clearManuscriptDraft(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* noop */
  }
}
