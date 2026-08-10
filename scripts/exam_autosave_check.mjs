// 시험 도중 답안이 서버에 자동으로 남는지 본다.
//   npm run check:autosave
//
// 왜 필요한가: 서버 저장은 '저장하고 나가기'를 눌러야만 됐다. 사람은 그 단추를 누르고
// 나가지 않는다 — 전화가 오고, 배터리가 죽고, 그냥 탭을 닫는다. 실제 데이터에서
// 미완료 세션 73건 중 서버에 기록이 있는 건 5건뿐이었다. 나머지는 브라우저를 바꾸는
// 순간 통째로 사라진다.
//
// 자동 저장은 조용히 돈다 — 화면에 아무 표시도 없다. 그래서 눈으로는 됐는지 알 수 없고,
// 조용히 멈춰도 아무도 모른다. DB를 직접 확인하는 수밖에 없다.
//
// 유료 전용이라는 문도 같이 본다. 무료 계정에서 저장이 되면 유료 기능이 새는 것이다.
import fs from 'node:fs'
import { chromium } from 'playwright'
import { dismissIntros } from './ui_audit_rules.mjs'
import { assertFreshLocalServer } from './stale_server_guard.mjs'

const BASE = process.env.AUTOSAVE_BASE ?? 'http://127.0.0.1:3000'
// 자동 저장 주기는 60초. 한 번은 확실히 지나가도록 여유를 둔다.
const WAIT_MS = Number(process.env.AUTOSAVE_WAIT ?? 75_000)

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8').split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
)
const SB = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
const admin = (p, init = {}) =>
  fetch(`${SB}${p}`, {
    ...init,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(init.headers ?? {}) },
  })

const stamp = String(Date.now())
const results = []
const ok = (n, d = '') => results.push({ ok: true, n, d })
const bad = (n, d = '') => results.push({ ok: false, n, d })

async function makeUser(tag) {
  const email = `uicheck+${tag}${stamp}@kptest.cloud`
  const password = `Chk-${stamp}-aA1!`
  const res = await admin('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email, password, email_confirm: true }) })
  if (!res.ok) throw new Error(`계정 생성 실패: ${await res.text()}`)
  return { email, password, uid: (await res.json()).id }
}

const DAY = 86400_000
async function givePass(uid) {
  const now = Date.now()
  const res = await admin('/rest/v1/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      user_id: uid,
      payment_key: `autosave-${stamp}`,
      order_id: `autosave-${stamp}`,
      amount: 0, // 매출 집계에 섞이지 않게
      status: 'active',
      started_at: new Date(now - DAY).toISOString(),
      expires_at: new Date(now + 29 * DAY).toISOString(),
    }),
  })
  if (!res.ok) throw new Error(`이용권 부여 실패: ${await res.text()}`)
}

async function login(page, user) {
  for (let a = 0; a < 3; a++) {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
    await page.fill('input[type="email"]', user.email)
    await page.fill('input[type="password"]', user.password)
    await page.click('button[type="submit"]')
    for (let i = 0; i < 30; i++) {
      if (!new URL(page.url()).pathname.includes('/login')) return true
      await page.waitForTimeout(1000)
    }
  }
  return false
}

/** 무료로 열리는 회차를 열어 객관식 하나를 고른다. 고른 게 없으면 저장할 것도 없다. */
async function startAndAnswer(page) {
  await page.goto(`${BASE}/cbt/2025-1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  const choice = page.locator('button').filter({ hasText: /^[①②③④⑤]/ }).first()
  await choice.waitFor({ timeout: 30000 })
  await choice.click()
  await page.waitForTimeout(1500)
  return true
}

async function sessionRow(uid) {
  const res = await admin(`/rest/v1/quiz_sessions?user_id=eq.${uid}&order=started_at.desc&limit=1&select=id,saved_at,saved_answers,completed_at`)
  const rows = await res.json()
  return rows?.[0] ?? null
}

async function cleanup(uid) {
  await admin(`/rest/v1/subscriptions?user_id=eq.${uid}`, { method: 'DELETE' }).catch(() => {})
  await admin(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' }).catch(() => {})
}

// 낡은 서버를 때리며 초록불을 내는 일이 실제로 있었다 — 먼저 확인한다.
const fresh = await assertFreshLocalServer(BASE)
console.log(fresh.checked ? `  서버 빌드 확인됨 (${fresh.buildId})` : `  서버 빌드 비교 안 함 — ${fresh.reason}`)

const browser = await chromium.launch()
const made = []
try {
  // ── 유료: 단추를 누르지 않아도 서버에 남아야 한다 ────────────────────────
  const paid = await makeUser('paid')
  made.push(paid.uid)
  await givePass(paid.uid)

  const ctx = await browser.newContext()
  await ctx.addInitScript(dismissIntros)
  const page = await ctx.newPage()
  if (!(await login(page, paid))) throw new Error('유료 계정 로그인 실패')
  await startAndAnswer(page)

  const before = await sessionRow(paid.uid)
  if (!before) throw new Error('세션이 만들어지지 않았다')
  if (before.saved_at) bad('시작 직후엔 저장 기록이 없어야 함', `saved_at=${before.saved_at}`)
  else ok('시작 직후엔 저장 기록 없음')

  console.log(`  … 자동 저장 주기를 기다리는 중 (${Math.round(WAIT_MS / 1000)}초)`)
  await page.waitForTimeout(WAIT_MS)

  const after = await sessionRow(paid.uid)
  const answered = Object.keys(after?.saved_answers ?? {}).length
  if (after?.saved_at && answered > 0) ok('유료 — 누르지 않아도 서버에 저장됨', `${answered}문항`)
  else bad('유료 — 자동 저장이 안 됨', `saved_at=${after?.saved_at ?? '없음'} · ${answered}문항`)

  await ctx.close()

  // ── 무료: 저장되면 안 된다(유료 기능이 새는 것) ──────────────────────────
  const free = await makeUser('free')
  made.push(free.uid)
  const ctx2 = await browser.newContext()
  await ctx2.addInitScript(dismissIntros)
  const page2 = await ctx2.newPage()
  if (!(await login(page2, free))) throw new Error('무료 계정 로그인 실패')
  await startAndAnswer(page2)
  await page2.waitForTimeout(WAIT_MS)

  const freeRow = await sessionRow(free.uid)
  if (freeRow?.saved_at) bad('무료 — 서버 저장이 새고 있음', `saved_at=${freeRow.saved_at}`)
  else ok('무료 — 서버 저장 안 됨(유료 문 유지)')
  await ctx2.close()
} catch (e) {
  bad('실행', e instanceof Error ? e.message : String(e))
} finally {
  await browser.close()
  for (const uid of made) await cleanup(uid)
}

console.log(`\n시험 중 자동 저장 — ${BASE}`)
for (const r of results) console.log(`  ${r.ok ? '○' : '×'} ${r.n}${r.d ? `  ${r.d}` : ''}`)
const failed = results.filter((r) => !r.ok).length
console.log(failed ? `\n${failed}건 실패` : '\n모두 통과')
if (failed) process.exitCode = 1
