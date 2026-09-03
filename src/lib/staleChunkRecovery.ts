// 배포 직후 열려 있던 화면이 '사라진 조각'을 부를 때 스스로 복구한다.
//
// 무슨 일인가: 새로 배포하면 자바스크립트 조각(chunk) 파일 이름이 바뀐다. 그 전에 열어 둔
// 탭은 옛 이름을 부르는데 그 파일은 더 이상 없다 — "Failed to load chunk … from module"
// 실제로 2026-08-20 /subscribe(결제 화면)에서 났다. 결제하려던 사람이 오류 화면을 봤다.
//
// 고칠 수 없는 종류가 아니다. 새로고침하면 새 파일 목록을 받아 그냥 열린다.
// 다만 **한 번만** 해야 한다 — 조각이 진짜로 없으면 새로고침을 무한히 반복하게 된다.

const FLAG = 'kpt_chunk_reloaded'

/** 조각을 못 불러온 오류인가. 메시지 문구는 브라우저·번들러마다 달라서 넓게 본다. */
export function isStaleChunkError(message?: string | null): boolean {
  if (!message) return false
  const m = message.toLowerCase()
  return (
    m.includes('chunkloaderror') ||
    (m.includes('chunk') && (m.includes('failed') || m.includes('loading'))) ||
    m.includes('failed to fetch dynamically imported module') ||
    m.includes('importing a module script failed') ||
    // 사파리는 조각을 못 받으면 그냥 'Load failed'라고만 한다. 'chunk'라는 말이
    // 어디에도 없어서 위 조건에 하나도 안 걸렸다 — 2026-09-02 16:14 결과 화면에서
    // 실제로 신고가 들어왔다(/cbt/2025-1/result — Load failed).
    m === 'load failed' ||
    m.includes('load failed') ||
    // 파이어폭스·엣지가 쓰는 문구
    m.includes('error loading dynamically imported module') ||
    m.includes('networkerror when attempting to fetch resource')
  )
}

/**
 * 조각 오류면 한 번 새로고침한다. 실제로 새로고침했으면 true.
 * 같은 탭에서 두 번째부터는 하지 않는다(무한 새로고침 방지).
 */
export function recoverFromStaleChunk(message?: string | null): boolean {
  if (typeof window === 'undefined') return false
  if (!isStaleChunkError(message)) return false
  try {
    if (sessionStorage.getItem(FLAG)) return false
    sessionStorage.setItem(FLAG, '1')
  } catch {
    return false // 저장소를 못 쓰면 되풀이를 막을 수 없다 — 아예 하지 않는다
  }
  window.location.reload()
  return true
}
