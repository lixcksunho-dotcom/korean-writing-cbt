// 검사가 **자기 사이트**를 보고 있는지 확인한다.
//
// 왜 필요한가: 실글패스와 KBS패스 두 저장소가 검사 기본 주소로 같은 포트
// (http://localhost:3399)를 쓰고 있었다. 그래서 한쪽 서버를 띄워 둔 채 다른 쪽 검사를
// 돌리면, 검사는 **다른 제품을 보고** 결과를 냈다.
//
// 실제로 그랬다. kptest에서 check:trial을 돌렸는데 "맞춤법 맛보기 — 문항이 없다",
// "제목 — KBS한국어능력시험…"이 나왔다. kptest는 멀쩡했고 켜져 있던 것이 KBS패스였다.
//
// 이 방향의 실수가 위험한 이유는 반대쪽이다 — 다른 사이트가 통과하면 **내 사이트가
// 통과했다고 믿게 된다.** 주소만 보고는 알 수 없으니 사이트에 직접 물어본다.

/**
 * @param base 검사가 볼 주소
 * @param expect 여기여야 하는 사이트 이름(/api/version 의 site)
 * @returns 확인 결과. 문제가 있으면 reason에 이유가 담긴다.
 */
export async function assertSite(base, expect) {
  let res
  try {
    res = await fetch(`${base}/api/version`, { cache: 'no-store' })
  } catch (e) {
    return { ok: false, reason: `${base} 에 닿지 못했다 — ${String(e.message).slice(0, 50)}` }
  }
  if (res.status === 404) {
    // 아직 이 자리가 없는 옛 배포일 수 있다. 막지 않되 모른다는 것은 밝힌다.
    return { ok: true, unknown: true, reason: '이 배포에는 /api/version 이 없어 사이트를 확인하지 못했다' }
  }
  if (!res.ok) return { ok: false, reason: `/api/version 이 HTTP ${res.status}` }

  let site
  try { site = (await res.json()).site } catch { return { ok: false, reason: '/api/version 을 읽지 못했다' } }
  if (!site) return { ok: true, unknown: true, reason: '사이트 이름이 비어 있다' }
  if (site !== expect) {
    return { ok: false, reason: `${base} 는 '${site}' 다 — '${expect}' 를 봐야 한다` }
  }
  return { ok: true, site }
}

/** 검사 첫머리에서 부른다. 다른 사이트면 거기서 멈춘다 — 남의 결과로 내 사이트를 판단하면 안 된다. */
export async function requireSite(base, expect) {
  const r = await assertSite(base, expect)
  if (!r.ok) {
    console.log(`\n  × 엉뚱한 곳을 보고 있다 — ${r.reason}`)
    console.log('    다른 제품의 서버가 같은 포트에 떠 있을 수 있다. 주소를 확인하고 다시 돌린다.\n')
    process.exitCode = 1
    return false
  }
  if (r.unknown) console.log(`  · ${r.reason}`)
  return true
}
