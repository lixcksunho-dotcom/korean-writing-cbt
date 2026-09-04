// 라이브에 올라가 있는 것이 지금 코드인지 본다.
//   npm run check:deployed
//   DEPLOY_CHECK_BASE=https://kbstest.cloud npm run check:deployed
//
// 왜 필요한가: 자매 서비스(KBS패스)에서 Git 자동 배포가 막혀 커밋 40여 개가 5일 동안
// 사이트에 안 올라갔다. **5일 동안 아무도 못 알아챘다.**
//
// 왜 못 알아챘나: 화면은 멀쩡했고, 프로덕션을 보는 검사들도 전부 '통과'라고 답했다.
// 옛 코드가 통과하고 있었던 것이다. 고친 것이 반영됐는지는 아무도 안 물어봤다.
//
// 그래서 딱 하나를 묻는다 — 라이브의 커밋이 origin/main과 같은가.

import { execSync } from 'node:child_process'

const BASE = process.env.DEPLOY_CHECK_BASE ?? 'https://kptest.cloud'

let pass = 0, fail = 0
const ok = (n, d = '') => { pass++; console.log(`  ○ ${n}${d ? ` — ${d}` : ''}`) }
const bad = (n, d = '') => { fail++; console.log(`  × ${n}${d ? ` — ${d}` : ''}`) }

console.log(`\n라이브가 지금 코드인가 — ${BASE}\n`)

const sh = (c) => execSync(c, { encoding: 'utf8' }).trim()

let head = ''
try {
  execSync('git fetch -q origin', { stdio: 'ignore' })
  head = sh('git rev-parse --short origin/main')
  ok('올라가 있어야 할 커밋', head)
} catch (e) {
  bad('origin/main을 못 읽었다', String(e.message).split('\n')[0].slice(0, 60))
}

let live = null
try {
  const res = await fetch(`${BASE}/api/version`, { cache: 'no-store' })
  if (!res.ok) {
    bad('버전 자리를 못 읽었다', `HTTP ${res.status} — 아직 배포되지 않은 코드일 수 있다`)
  } else {
    const j = await res.json()
    live = String(j.commit ?? 'unknown')
    ok('라이브에 올라가 있는 커밋', `${live}${j.builtAt && j.builtAt !== 'unknown' ? ` · ${j.builtAt.slice(0, 16).replace('T', ' ')}` : ''}`)
  }
} catch (e) {
  bad('라이브를 못 읽었다', String(e.message).slice(0, 60))
}

if (head && live) {
  if (live === 'unknown') {
    bad('라이브가 자기 커밋을 모른다', '빌드에 커밋이 안 박혔다')
  } else if (live === head) {
    ok('라이브가 최신이다')
  } else {
    // 몇 개나 밀렸는지 세어 준다 — '다르다'만 알면 급한지 아닌지를 모른다.
    let behind = '?'
    try { behind = sh(`git rev-list --count ${live}..origin/main`) } catch { /* 라이브 커밋이 로컬에 없을 수 있다 */ }
    bad('라이브가 뒤처져 있다', `${live} → ${head} (${behind}개 밀림)`)
    console.log('\n  Git 자동 배포가 막혀 있으면 이렇게 올립니다:')
    console.log('    npx vercel --prod --yes')
  }
}

console.log(`\n${fail ? '고친 것이 사이트에 없습니다.' : '고친 것이 사이트에 있습니다.'}`)
process.exitCode = fail ? 1 : 0
