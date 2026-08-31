// 무료로 다 푼 회차를, 결제한 뒤에 다시 열어 서술형 채점을 이어 받을 수 있는지 본다.
//   npm run check:paid-essay-resume
//
// 왜 필요한가: 2026-08-28 문의 그대로다. 무료로 모의고사 1회를 끝까지 풀고, 서술형
// 무료 채점 3회를 다 쓴 뒤 그 화면에서 결제한 분이, 정작 방금 푼 회차에 다시 들어갈
// 수 없다고 알려 왔다. 결제 직후에 막히는 자리라 가장 나쁜 종류다.
//
// 그 길을 처음부터 끝까지 그대로 따라간다.
//   1) 서술형 9문항 중 3문항만 채점된 '완료 세션'을 만든다 — 무료 체험을 다 쓴 상태
//   2) 무료인 채로 결과를 열어, 남은 6문항이 막혀 있는지 본다
//   3) 이용권을 붙인다(결제는 하지 않는다)
//   4) 다시 열어, 남은 6문항을 채점할 수 있게 열렸는지 본다
//
// ⚠ AI 채점 버튼은 **절대 누르지 않는다** — 유료 API다. 누르기 직전까지가 이 검사의 범위다.
// 검사가 만든 계정·세션만 지운다.

import fs from 'node:fs'
import { chromium } from 'playwright'

const ENV = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8').split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] }),
)
const BASE = process.env.PAID_ESSAY_BASE ?? 'https://kptest.cloud'
const api = (p, init) => fetch(`${ENV.NEXT_PUBLIC_SUPABASE_URL}${p}`, {
  ...init,
  headers: {
    apikey: ENV.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${ENV.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json', Prefer: 'return=representation', ...(init?.headers ?? {}),
  },
})

const stamp = String(Date.now())
const SEEDED_FEEDBACK = '검사용 채점 총평입니다.'
const email = `paidessay+${stamp}@kptest.cloud`
const password = `Chk-${stamp}-aA1!`
let uid = null
let sessionId = null
let failed = false
const ok = (n, d = '') => console.log(`  ○ ${n}${d ? ` — ${d}` : ''}`)
const bad = (n, d = '') => { console.error(`  × ${n}${d ? ` — ${d}` : ''}`); failed = true }

async function dismissModals(page) {
  for (let i = 0; i < 3; i++) {
    const dialog = page.locator('[role="dialog"]')
    if (await dialog.count() === 0) break
    const close = dialog.locator('button').filter({ hasText: /닫기|시작|확인|나중에/ }).first()
    if (await close.count()) await close.click().catch(() => {})
    else await page.keyboard.press('Escape')
    await page.waitForTimeout(600)
  }
}

// 화면에 채점 버튼이 어떤 상태로 있는지 읽는다. 누르지는 않는다.
async function readGraders(page) {
  return page.evaluate(() => {
    const btns = [...document.querySelectorAll('button, a')]
      .map(e => (e.textContent ?? '').replace(/\s+/g, ' ').trim())
      .filter(t => /AI 분석|구독하고 AI/.test(t))
    return {
      total: btns.length,
      paidReady: btns.filter(t => /^AI 분석/.test(t)).length,
      trial: btns.filter(t => /무료 체험 \d+회 · AI 분석/.test(t)).length,
      locked: btns.filter(t => /구독 전용 · AI 분석|구독하고 AI/.test(t)).length,
      sample: btns.slice(0, 3),
    }
  })
}

const browser = await chromium.launch()
try {
  console.log(`\n무료로 다 푼 회차를 결제 뒤 이어서 채점할 수 있는가 — ${BASE}\n`)

  const essays = await (await api('/rest/v1/questions?year=eq.2025&round=eq.1&type=eq.essay&select=id,number&order=number')).json()
  const objs = await (await api('/rest/v1/questions?year=eq.2025&round=eq.1&type=eq.multiple&select=id,correct_answer&order=number&limit=5')).json()
  if (essays.length < 9) throw new Error(`서술형이 ${essays.length}문항뿐이다`)

  uid = (await (await api('/auth/v1/admin/users', {
    method: 'POST', body: JSON.stringify({ email, password, email_confirm: true }),
  })).json()).id
  if (!uid) throw new Error('검사용 계정을 만들지 못했다')

  // 무료 체험 3회를 이미 다 쓴 상태로 둔다
  await api(`/auth/v1/admin/users/${uid}`, {
    method: 'PUT', body: JSON.stringify({ app_metadata: { ai_trial_used: 3 } }),
  })

  // 다 푼 세션 하나
  const now = Date.now()
  sessionId = (await (await api('/rest/v1/quiz_sessions', {
    method: 'POST',
    body: JSON.stringify({
      user_id: uid, year: 2025, round: 1,
      started_at: new Date(now - 7200_000).toISOString(),
      completed_at: new Date(now - 3600_000).toISOString(),
      score: 24, total: 39,
    }),
  })).json())[0].id

  // 객관식 몇 개 + 서술형 9개(앞 3개만 채점됨)
  // PostgREST는 한 번에 넣는 행들의 키가 모두 같아야 한다 — 채점된 것만 키를 더하면
  // "All object keys must match"로 통째로 거절된다. 모든 행에 같은 칸을 두고 값만 다르게 준다.
  const rows = [
    ...objs.map((q, i) => ({
      session_id: sessionId, question_id: q.id, user_answer: q.correct_answer,
      is_correct: i % 2 === 0, ai_score: null, ai_feedback: null,
    })),
    ...essays.map((q, i) => ({
      session_id: sessionId, question_id: q.id,
      user_answer: '검사용으로 넣은 답안입니다. 조건에 맞추어 문단을 구성하였습니다.',
      is_correct: null,
      ai_score: i < 3 ? 7 : null,
      // ai_feedback은 문자열이 아니라 EssayGrade JSON이다 — 문자열로 넣으면 화면이
      // 조용히 아무것도 안 그린다. 실제 저장 모양 그대로 넣어야 검사가 뜻을 갖는다.
      ai_feedback: i < 3
        ? { score: 7, maxScore: 10, feedback: SEEDED_FEEDBACK, strengths: ['조건 충족'], improvements: ['분량 보완'] }
        : null,
    })),
  ]
  const ins = await api('/rest/v1/quiz_answers', { method: 'POST', body: JSON.stringify(rows) })
  if (!ins.ok) throw new Error(`답안을 넣지 못했다: ${(await ins.text()).slice(0, 160)}`)

  const ctx = await browser.newContext()
  await ctx.addInitScript(() => { try { localStorage.setItem('silyong_mode_intro_v1', '1') } catch { /* 막혀도 진행 */ } })
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

  const resultUrl = `${BASE}/cbt/2025-1/result?session=${sessionId}`

  // ── 무료 상태 ────────────────────────────────────────────────────────────
  await page.goto(resultUrl, { waitUntil: 'networkidle', timeout: 60000 })
  await dismissModals(page)
  await page.waitForTimeout(1500)
  const free = await readGraders(page)
  if (free.total === 0) bad('무료 · 결과 화면', '서술형 채점 자리를 못 찾았다')
  else if (free.locked > 0 && free.paidReady === 0) ok('무료 · 체험 소진 상태에서는 잠겨 있다', `잠김 ${free.locked}개`)
  else bad('무료 · 체험을 다 썼는데 채점이 열려 있다', JSON.stringify(free))

  // ── 목록에서 그 회차로 돌아갈 길이 있는가 (이번 문의의 핵심) ─────────────
  await page.goto(`${BASE}/cbt`, { waitUntil: 'networkidle' })
  await dismissModals(page)
  await page.waitForTimeout(1200)
  const backLink = await page.evaluate(sid =>
    [...document.querySelectorAll('a[href*="/result?session="]')].some(a => (a.getAttribute('href') ?? '').includes(sid)), sessionId)
  if (backLink) ok('목록에서 방금 푼 회차로 돌아갈 수 있다')
  else bad('목록에서 방금 푼 회차로 돌아갈 길이 없다', '이번 문의의 원인이던 자리다')

  // ── 결제한 셈 친다 ───────────────────────────────────────────────────────
  const sub = await api('/rest/v1/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      user_id: uid, payment_key: `chk-${stamp}`, order_id: `chk-${stamp}`,
      amount: 0, status: 'active',
      started_at: new Date(now - 60_000).toISOString(),
      expires_at: new Date(now + 30 * 86400_000).toISOString(),
    }),
  })
  if (!sub.ok) throw new Error(`이용권을 넣지 못했다: ${await sub.text()}`)

  // ── 결제 뒤 ──────────────────────────────────────────────────────────────
  await page.goto(resultUrl, { waitUntil: 'networkidle', timeout: 60000 })
  await dismissModals(page)
  await page.waitForTimeout(1800)
  const paid = await readGraders(page)

  // 이미 채점된 3문항은 버튼이 없다. 남은 6문항이 열려 있어야 한다.
  if (paid.paidReady >= 6) ok('결제 뒤 남은 서술형을 이어서 채점할 수 있다', `열린 채점 ${paid.paidReady}개`)
  else if (paid.locked > 0) bad('결제했는데도 잠겨 있다', `잠김 ${paid.locked}개 · 열림 ${paid.paidReady}개`)
  else bad('결제 뒤 채점 자리를 찾지 못했다', JSON.stringify(paid))

  // 이미 채점된 것이 지워지지 않았는지도 본다
  const kept = await page.evaluate(t => (document.body.innerText.match(new RegExp(t, 'g')) ?? []).length, SEEDED_FEEDBACK)
  if (kept >= 1) ok('무료로 받았던 채점 결과가 그대로 남아 있다', `${kept}건`)
  else bad('무료로 받았던 채점 결과가 사라졌다')

  await ctx.close()
} catch (e) {
  bad('실행', String(e?.message ?? e).slice(0, 300))
} finally {
  await browser.close()
  if (sessionId) await api(`/rest/v1/quiz_answers?session_id=eq.${sessionId}`, { method: 'DELETE' }).catch(() => {})
  if (uid) {
    await api(`/rest/v1/subscriptions?user_id=eq.${uid}`, { method: 'DELETE' }).catch(() => {})
    await api(`/rest/v1/quiz_sessions?user_id=eq.${uid}`, { method: 'DELETE' }).catch(() => {})
    await api(`/rest/v1/ai_trial_usage?user_id=eq.${uid}`, { method: 'DELETE' }).catch(() => {})
    await api(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' }).catch(() => {})
  }
}
console.log(failed ? '\n결제 뒤에도 막히는 데가 있다.' : '\n결제하면 방금 푼 회차의 서술형을 이어서 채점할 수 있다.')
process.exit(failed ? 1 : 0)
