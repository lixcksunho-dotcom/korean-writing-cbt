// 이미 푼 회차의 결과로 돌아갈 길이 있는지 본다.
//   npm run check:past-result
//
// 왜 필요한가: 무료로 1회차를 풀고 서술형 AI 채점 3회를 다 쓴 뒤 그 화면에서 결제한
// 분이, 정작 방금 푼 그 회차에 다시 들어갈 수 없다고 알려 왔다(2026-08-28).
// 결과 페이지는 멀쩡히 있었고 구독 상태도 읽어 채점까지 붙었는데, 거기로 가는 링크가
// 어디에도 없었다. 목록이 지난 기록을 읽으면서 select에 id를 빼먹은 탓이다.
//
// 돈을 낸 직후에 막히는 자리라, 화면을 열어 링크가 실제로 있는지 눈으로 확인한다.
// 완료된 세션을 하나 심어 두고 CBT 목록을 연다. 검사가 만든 것만 지운다.

import fs from 'node:fs'
import { chromium } from 'playwright'

const ENV = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8').split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] }),
)
const BASE = process.env.PAST_RESULT_BASE ?? 'https://kptest.cloud'
const SB = ENV.NEXT_PUBLIC_SUPABASE_URL
const SVC = ENV.SUPABASE_SERVICE_ROLE_KEY

const api = (p, init) => fetch(`${SB}${p}`, {
  ...init,
  headers: {
    apikey: SVC, Authorization: `Bearer ${SVC}`,
    'Content-Type': 'application/json', Prefer: 'return=representation', ...(init?.headers ?? {}),
  },
})

const stamp = String(Date.now())
const email = `pastlink+${stamp}@kptest.cloud`
const password = `Chk-${stamp}-aA1!`
let uid = null
let sessionId = null
let failed = false

try {
  // 문항이 있는 회차 하나를 고른다
  const q = (await (await api('/rest/v1/questions?select=year,round&order=year.asc,round.asc&limit=1')).json())?.[0]
  if (!q) throw new Error('문항을 찾지 못했다')

  uid = (await (await api('/auth/v1/admin/users', {
    method: 'POST', body: JSON.stringify({ email, password, email_confirm: true }),
  })).json()).id
  if (!uid) throw new Error('검사용 계정을 만들지 못했다')

  // '이미 푼' 세션을 하나 심는다
  const now = Date.now()
  sessionId = (await (await api('/rest/v1/quiz_sessions', {
    method: 'POST',
    body: JSON.stringify({
      user_id: uid, year: q.year, round: q.round,
      started_at: new Date(now - 7200_000).toISOString(),
      completed_at: new Date(now - 3600_000).toISOString(),
      score: 72, total: 100,
    }),
  })).json())[0].id

  const browser = await chromium.launch()
  const ctx = await browser.newContext()
  await ctx.addInitScript(() => { try { localStorage.setItem('silyong_mode_intro_v1', '1') } catch { /* 막혀 있어도 진행 */ } })
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
  if (!logged) throw new Error('로그인이 되지 않음')

  await page.goto(`${BASE}/cbt`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)

  const found = await page.evaluate(sid => {
    const links = [...document.querySelectorAll('a[href*="/result?session="]')]
    return {
      total: links.length,
      mine: links.some(a => (a.getAttribute('href') ?? '').includes(sid)),
      label: links[0]?.innerText.replace(/\s+/g, ' ').trim().slice(0, 50) ?? '',
    }
  }, sessionId)

  console.log(`\n이미 푼 회차의 결과로 돌아갈 길 — ${BASE}\n`)
  if (!found.total) {
    console.error('  × 결과로 가는 링크가 하나도 없다 — 이미 푼 회차를 다시 볼 수 없다')
    failed = true
  } else if (!found.mine) {
    console.error(`  × 링크는 ${found.total}개 있는데 방금 푼 세션으로 가는 것이 없다`)
    failed = true
  } else {
    console.log(`  ○ 결과 다시 보기 링크가 있다 — "${found.label}"`)

    // 실제로 열리는지까지 본다. 링크만 있고 열리지 않으면 같은 일이다.
    // 결과 페이지는 답안·문항·구독·즐겨찾기를 한꺼번에 읽어 느리다. 주소가 바뀔 때까지
    // 넉넉히 기다린다 — 2.5초만 기다렸다가 '안 열린다'고 잘못 판정한 적이 있다.
    await page.click(`a[href*="${sessionId}"]`)
    await page.waitForURL(u => u.toString().includes(sessionId), { timeout: 30000 }).catch(() => {})
    const path = new URL(page.url()).pathname + new URL(page.url()).search
    if (!path.includes(sessionId)) {
      console.error(`  × 눌렀는데 결과로 가지 않는다 — 도착 ${path}`)
      failed = true
    } else {
      // 주소만 바뀌고 내용이 없으면 같은 일이다. 채점 결과가 실제로 그려지는지 본다.
      await page.waitForTimeout(2000)
      const body = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '))
      if (/72|점|결과/.test(body)) console.log(`  ○ 결과 화면이 열리고 내용이 그려진다 (${path.slice(0, 52)})`)
      else { console.error(`  × 결과 화면이 열렸는데 비어 있다 — "${body.slice(0, 60)}"`); failed = true }
    }
  }
  await browser.close()
} catch (e) {
  failed = true
  console.error(String(e?.message ?? e).slice(0, 200))
} finally {
  if (sessionId) await api(`/rest/v1/quiz_answers?session_id=eq.${sessionId}`, { method: 'DELETE' }).catch(() => {})
  if (uid) {
    await api(`/rest/v1/quiz_sessions?user_id=eq.${uid}`, { method: 'DELETE' }).catch(() => {})
    await api(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' }).catch(() => {})
  }
}
process.exit(failed ? 1 : 0)
