import fs from 'node:fs'
import path from 'node:path'

// 로컬 서버가 방금 만든 빌드인지 확인한다.
//
// 왜 있나: 검사를 고치고 다시 돌렸는데 계속 통과해서 '고쳐졌다'고 두 번 보고했다.
// 실제로는 옛 서버가 안 죽어서 새 서버가 EADDRINUSE로 못 뜨고 있었고, 검사는 죽지
// 않은 옛 서버를 때리며 초록불을 내고 있었다. 포트가 응답한다는 것과 그게 내가 방금
// 만든 코드라는 것은 다른 말이다.
//
// Next는 빌드마다 새 buildId를 만들고, 그 id 아래에만 _buildManifest.js를 둔다.
// 그래서 디스크의 .next/BUILD_ID로 그 파일을 요청해 보면 답이 나온다 — 200이면 서버가
// 이 빌드를 들고 있고, 404면 다른(낡은) 빌드를 들고 있다.
// (HTML 본문에는 buildId가 안 나온다 — Next 16에서 확인했다.)
//
// 배포 주소를 볼 때는 아무 일도 하지 않는다 — 거기 도는 빌드는 로컬과 다른 게 정상이다.

const LOCAL = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:|\/|$)/

/**
 * 낡은 서버면 던진다. 검사 맨 앞에서 부른다.
 * @param base 검사가 볼 주소
 */
export async function assertFreshLocalServer(base) {
  if (!LOCAL.test(base)) return { checked: false, reason: '배포 주소라 건너뜀' }

  const idPath = path.join(process.cwd(), '.next', 'BUILD_ID')
  if (!fs.existsSync(idPath)) return { checked: false, reason: '.next/BUILD_ID가 없어 비교 못 함' }
  const onDisk = fs.readFileSync(idPath, 'utf-8').trim()

  let status
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/_next/static/${onDisk}/_buildManifest.js`, {
      signal: AbortSignal.timeout(15000),
    })
    status = res.status
  } catch (e) {
    throw new Error(`${base}에 연결하지 못했습니다 — 서버가 떠 있는지 확인하세요. (${e instanceof Error ? e.message : e})`)
  }

  if (status !== 200) {
    throw new Error(
      `${base}에 떠 있는 서버가 낡았습니다.\n` +
      `  방금 만든 빌드: ${onDisk}\n` +
      `  그 빌드의 파일을 서버가 모릅니다(${status}) — 다른 빌드를 들고 있다는 뜻입니다.\n` +
      `옛 서버가 안 죽어서 새 서버가 못 떴을 수 있습니다(EADDRINUSE). 그 상태로 검사하면 ` +
      `고치지 않은 코드를 보고 '통과'가 나옵니다.`
    )
  }
  return { checked: true, buildId: onDisk }
}
