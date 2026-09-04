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
// 그래서 딱 하나를 묻는다 — 라이브의 커밋이 **지금 이 작업본**과 같은가.
//
// 처음엔 origin/main 과 견줬는데 그게 이 검사를 반쯤 멀게 했다. 올리지 않은 커밋은
// origin/main 에 없으므로, 고친 것이 사이트에 없는데도 '최신이다'라고 답한다.
// 2026-09-05에 실제로 그랬다 — 안 올린 커밋 5개(관리자 통계 수정 포함)를 안고 통과했다.
// 이 검사가 막으려던 상황이 바로 그것이다.

import { execSync } from 'node:child_process'

const BASE = process.env.DEPLOY_CHECK_BASE ?? 'https://kptest.cloud'

let pass = 0, fail = 0
const ok = (n, d = '') => { pass++; console.log(`  ○ ${n}${d ? ` — ${d}` : ''}`) }
const bad = (n, d = '') => { fail++; console.log(`  × ${n}${d ? ` — ${d}` : ''}`) }

console.log(`\n라이브가 지금 코드인가 — ${BASE}\n`)

const sh = (c) => execSync(c, { encoding: 'utf8' }).trim()

let head = '', mainRef = ''
try {
  head = sh('git rev-parse --short HEAD')
  ok('올라가 있어야 할 커밋', `${head} (${sh('git rev-parse --abbrev-ref HEAD')})`)
} catch (e) {
  bad('HEAD를 못 읽었다', String(e.message).split('\n')[0].slice(0, 60))
}
try {
  execSync('git fetch -q origin', { stdio: 'ignore' })
  mainRef = sh('git rev-parse --short origin/main')
} catch { /* 원격을 못 읽어도 라이브 대조는 할 수 있다 */ }

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
    ok('라이브가 지금 코드다')
  } else {
    // '다르다'만으로는 급한지 알 수 없다. 어느 쪽으로 어긋났는지까지 가른다.
    const ancestor = (a, b) => { try { execSync(`git merge-base --is-ancestor ${a} ${b}`, { stdio: 'ignore' }); return true } catch { return false } }
    // stdio 를 막지 않으면 git 이 'fatal: Not a valid object name' 을 그대로 뱉는다.
    const known = (() => { try { execSync(`git cat-file -t ${live}`, { stdio: 'ignore' }); return true } catch { return false } })()

    if (!known) {
      bad('라이브 커밋이 이 저장소에 없다', `${live} — 다른 곳에서 올렸거나 이 작업본이 오래됐다`)
    } else if (ancestor(live, head)) {
      const behind = sh(`git rev-list --count ${live}..HEAD`)
      bad('라이브가 뒤처져 있다', `${live} → ${head} (${behind}개 밀림)`)
      const unpushed = mainRef ? sh('git rev-list --count origin/main..HEAD') : '?'
      if (unpushed !== '0') console.log(`\n  그중 ${unpushed}개는 아직 origin/main 에도 없습니다 — 올려야 배포됩니다.`)
      console.log('\n  Git 자동 배포가 막혀 있으면 이렇게 올립니다:')
      console.log('    npx vercel --prod --yes')
    } else if (ancestor(head, live)) {
      ok('라이브가 이 작업본보다 앞서 있다', `${head} → ${live} · 이 작업본이 옛것이다`)
    } else {
      bad('라이브와 이 작업본이 갈라졌다', `${live} ↮ ${head}`)
    }
  }
}

console.log(`\n${fail ? '고친 것이 사이트에 없습니다.' : '고친 것이 사이트에 있습니다.'}`)
process.exitCode = fail ? 1 : 0
