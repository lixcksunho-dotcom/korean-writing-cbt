// 같은 회차에 미완료 세션이 둘 이상 있을 때, 답안이 든 쪽으로 이어지는지 본다.
//   npm run check:resume
//
// 왜 필요한가: 세션은 '있으면 쓰고 없으면 만든다'인데 읽고 나서 넣는 방식이라, 요청이
// 겹치면 같은 회차에 미완료 세션이 둘 생긴다. 실데이터에 0~3초 간격으로 생긴 것이 있다.
// 그때 '가장 최근'만 보고 고르면 답안이 든 쪽을 두고 빈 쪽을 집는다 — 사람 눈에는
// **풀던 게 통째로 사라진 것**으로 보이고, 자동 저장도 엉뚱한 세션에 대고 돈다.
//
// 화면으로는 재현이 어렵다(둘이 동시에 들어와야 한다). 상황을 DB에 직접 만들어 두고,
// 실제 시험 화면을 열어서 어느 쪽으로 이어지는지 확인한다.
import fs from 'node:fs'
import { chromium } from 'playwright'
import { dismissIntros } from './ui_audit_rules.mjs'
import { assertFreshLocalServer } from './stale_server_guard.mjs'

const BASE = process.env.RESUME_BASE ?? 'http://127.0.0.1:3210'
const YEAR = 2025
const ROUND = 1

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8').split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
)
const admin = (p, init = {}) =>
  fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}${p}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(init.headers ?? {}),
    },
  })

const stamp = String(Date.now())
const results = []
const ok = (n, d = '') => results.push({ ok: true, n, d })
const bad = (n, d = '') => results.push({ ok: false, n, d })

// 낡은 서버를 때리며 초록불을 내는 일이 실제로 있었다 — 먼저 확인한다.
const fresh = await assertFreshLocalServer(BASE)
// 서버가 안 떠 있으면 건너뛴다 — 이건 지역 빌드를 보는 검사다. 실패로 세면
// 묶음 검사에서 늘 빨간불이 되고, 그러면 아무도 안 돌려서 아무것도 못 지킨다.
if (fresh.running === false) {
  console.log(`  · ${fresh.reason}`)
  console.log(`    이 검사는 지역 빌드를 봅니다: npm run build && npx next start -p ${new URL(BASE).port} 뒤에 다시 돌리세요.`)
  process.exitCode = 0
  process.exit(0)
}
console.log(fresh.checked ? `  서버 빌드 확인됨 (${fresh.buildId})` : `  서버 빌드 비교 안 함 — ${fresh.reason}`)

const browser = await chromium.launch()
let uid = null
try {
  const email = `uicheck+resume${stamp}@kptest.cloud`
  const password = `Chk-${stamp}-aA1!`
  const mk = await admin('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email, password, email_confirm: true }) })
  if (!mk.ok) throw new Error(`계정 생성 실패: ${await mk.text()}`)
  uid = (await mk.json()).id

  // 답안이 든 문항 하나를 심는다 — 실제 문항 id여야 화면이 되살릴 수 있다
  // 화면에 처음 뜨는 문항이어야 한다 — 뒤쪽 문항에 심으면 되살아나도 눈에 안 보인다
  const qRes = await admin(`/rest/v1/questions?program=eq.silyong&year=eq.${YEAR}&round=eq.${ROUND}&type=eq.multiple&select=id,number&order=number.asc&limit=1`)
  const qid = (await qRes.json())?.[0]?.id
  if (!qid) throw new Error('문항을 찾지 못했다')

  // 겹쳐 들어온 요청이 만든 상황: 답안이 든 옛 세션 + 그 뒤에 생긴 빈 세션
  const older = new Date(Date.now() - 20 * 60_000).toISOString()
  const newer = new Date(Date.now() - 19 * 60_000).toISOString()
  const withData = await admin('/rest/v1/quiz_sessions', {
    method: 'POST',
    body: JSON.stringify({
      user_id: uid, year: YEAR, round: ROUND, program: 'silyong',
      started_at: older, saved_at: older, time_left: 3600,
      saved_answers: { [qid]: '3' },
    }),
  })
  if (!withData.ok) throw new Error(`세션 A 생성 실패: ${await withData.text()}`)
  const idA = (await withData.json())[0].id

  const empty = await admin('/rest/v1/quiz_sessions', {
    method: 'POST',
    body: JSON.stringify({ user_id: uid, year: YEAR, round: ROUND, program: 'silyong', started_at: newer }),
  })
  if (!empty.ok) throw new Error(`세션 B 생성 실패: ${await empty.text()}`)
  const idB = (await empty.json())[0].id

  // 화면을 열기 전에, 서버가 쓰는 것과 같은 정렬로 어느 쪽이 뽑히는지 찍어 둔다.
  // 검사가 통과했을 때 '고쳐서 통과한 것'인지 '원래부터 그랬던 것'인지 구분이 된다.
  const probe = await (await admin(
    `/rest/v1/quiz_sessions?user_id=eq.${uid}&program=eq.silyong&year=eq.${YEAR}&round=eq.${ROUND}&completed_at=is.null` +
    `&order=started_at.desc&limit=1&select=id`
  )).json()
  console.log(`  (참고) started_at만으로 뽑으면 → ${probe?.[0]?.id === idA ? '답안 있는 세션' : '빈 세션'}`)

  const ctx = await browser.newContext()
  await ctx.addInitScript(dismissIntros)
  const page = await ctx.newPage()
  let logged = false
  for (let a = 0; a < 3 && !logged; a++) {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', password)
    await page.click('button[type="submit"]')
    for (let i = 0; i < 30; i++) {
      if (!new URL(page.url()).pathname.includes('/login')) { logged = true; break }
      await page.waitForTimeout(1000)
    }
  }
  if (!logged) throw new Error('로그인 실패')

  await page.goto(`${BASE}/cbt/${YEAR}-${ROUND}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.locator('button').filter({ hasText: /^[①②③④⑤]/ }).first().waitFor({ timeout: 30000 })
  await page.waitForTimeout(1200)

  // 되살아났으면 고른 보기가 눌린 상태로 보인다(선택 표시가 붙는다)
  // 고른 보기에만 붙는 테두리 색으로 센다. '하나라도 있나'가 아니라 '몇 개인가'를
  // 보는 이유: 클래스 이름이 바뀌면 0이 나와 검사가 조용히 무력해지는데, 개수를 함께
  // 찍어 두면 그게 보인다.
  const picked = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter((b) => /^[①②③④⑤]/.test(b.textContent ?? ''))
    return {
      total: btns.length,
      selected: btns.filter((b) => b.className.includes('border-[#1e3a5f]')).length,
      at: btns.findIndex((b) => b.className.includes('border-[#1e3a5f]')),
    }
  })
  if (picked.total === 0) throw new Error('보기 버튼을 못 찾았다 — 화면이 안 열렸다')
  const restored = picked.selected === 1

  // 화면이 실제로 어느 세션을 쓰는지는 제출 없이 알기 어렵다 — 저장이 어디로 가는지로 본다
  const after = await admin(`/rest/v1/quiz_sessions?user_id=eq.${uid}&select=id,saved_at,saved_answers`)
  const rows = await after.json()
  const a = rows.find((r) => r.id === idA)
  const b = rows.find((r) => r.id === idB)

  if (restored) ok('답안이 든 세션으로 이어짐', `보기 ${picked.total}개 중 ${picked.at + 1}번째 선택됨(심은 값 3)`)
  else bad('빈 세션으로 이어짐', `보기 ${picked.total}개 중 ${picked.selected}개 선택됨 — 풀던 답안이 화면에 없다`)

  if (Object.keys(a?.saved_answers ?? {}).length > 0) ok('원래 세션의 답안이 그대로 있음')
  else bad('원래 세션의 답안이 사라짐')
  if (!b?.saved_at) ok('빈 세션은 건드리지 않음')
  else bad('빈 세션에 저장이 들어감', '자동 저장이 엉뚱한 곳으로 간다')

  // 기능이 있어도 시작을 정하는 자리에서 말하지 않으면 없는 것과 같다.
  // 목록에는 '120분'만 적혀 있어서 2시간을 통째로 내야 하는 것처럼 보였다.
  {
    await page.goto(`${BASE}/cbt`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(1200)
    const t = await page.evaluate(() => document.body.innerText)
    if (/이어서 풀 수 있어요/.test(t)) ok('목록에서 이어서 풀 수 있다는 것을 미리 알린다')
    else bad('사전 안내', '120분만 보이고 중간저장 이야기가 없다')
  }

  await ctx.close()
} catch (e) {
  bad('실행', e instanceof Error ? e.message : String(e))
} finally {
  await browser.close()
  if (uid) {
    await admin(`/rest/v1/quiz_sessions?user_id=eq.${uid}`, { method: 'DELETE' }).catch(() => {})
    await admin(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' }).catch(() => {})
  }
}

console.log(`\n미완료 세션이 둘일 때 어느 쪽으로 이어지는가 — ${BASE}`)
for (const r of results) console.log(`  ${r.ok ? '○' : '×'} ${r.n}${r.d ? `  ${r.d}` : ''}`)
const failed = results.filter((r) => !r.ok).length
console.log(failed ? `\n${failed}건 실패` : '\n모두 통과')
if (failed) process.exitCode = 1
