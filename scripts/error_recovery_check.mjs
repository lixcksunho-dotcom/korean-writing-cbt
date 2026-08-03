// 잘못될 때 사용자가 빠져나올 수 있는지 확인한다.
//   npm run check:recovery
//
// 잘 되는 경로는 개발하면서 수없이 지나가지만, 끊겼을 때의 화면은 아무도 안 본다.
// 여기서 막히면 그 사람은 그냥 떠난다 — 특히 시험 제출은 푼 답이 통째로 날아간다.
//
// 결제는 건드리지 않는다. 결과·실패 화면이 주소만으로 어떻게 렌더되는지만 본다.
import fs from 'node:fs'
import { chromium, devices } from 'playwright'
import { dismissIntros } from './ui_audit_rules.mjs'

const ENV = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8').split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const SB = ENV.NEXT_PUBLIC_SUPABASE_URL
const SVC = ENV.SUPABASE_SERVICE_ROLE_KEY
const BASE = process.env.RECOVERY_BASE ?? 'https://kptest.cloud'

const admin = (p, init) => fetch(`${SB}${p}`, {
  ...init,
  headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
})

const stamp = String(Date.now())
const email = `uicheck+${stamp}@kptest.cloud`
const password = `Chk-${stamp}-aA1!`
const mk = await admin('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email, password, email_confirm: true }) })
if (!mk.ok) { console.error('검증용 계정을 만들지 못했습니다:', await mk.text()); process.exit(1) }
const uid = (await mk.json()).id

const results = []
const ok = (name, detail) => results.push({ ok: true, name, detail })
const bad = (name, detail) => results.push({ ok: false, name, detail })

const browser = await chromium.launch()
try {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] })
  await ctx.addInitScript(dismissIntros)
  const page = await ctx.newPage()

  // ── 로그인 ──────────────────────────────────────────────────────────────
  let logged = false
  for (let attempt = 0; attempt < 3 && !logged; attempt++) {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', password)
    await page.click('button[type="submit"]')
    for (let i = 0; i < 30; i++) {
      if (!new URL(page.url()).pathname.includes('/login')) { logged = true; break }
      await page.waitForTimeout(1000)
    }
    if (!logged) await page.waitForTimeout(4000)
  }
  if (!logged) { bad('로그인', '3번 시도했지만 들어가지 못함'); throw new Error('로그인 실패') }

  // ── 1) 시험을 풀다가 회선이 끊기면 ────────────────────────────────────────
  await page.goto(`${BASE}/cbt`, { waitUntil: 'load' })
  await page.waitForTimeout(1200)
  const startBtn = page.locator('a,button').filter({ hasText: /시작하기|풀어보기/ }).first()
  if (await startBtn.count()) {
    await startBtn.click().catch(() => {})
    await page.waitForTimeout(3500)
  }
  const inExam = /\/cbt\//.test(page.url())
  if (!inExam) {
    bad('시험 진입', `시작 버튼을 눌렀는데 ${page.url()}`)
  } else {
    // 한 문항 고르고 회선을 끊은 뒤 제출해 본다.
    // 실제로 골라졌는지는 '완료' 개수로 확인한다 — 못 골랐으면 이어지는 판정이 무의미하다.
    const done = async () => {
      const t = await page.evaluate(() => document.body.innerText).catch(() => '')
      return Number(/(\d+)\s*\/\s*\d+\s*완료/.exec(t)?.[1] ?? -1)
    }
    const before = await done()
    const opt = page.locator('button').filter({ hasText: /^[①②③④⑤]/ }).first()
    if (await opt.count()) await opt.click().catch(() => {})
    await page.waitForTimeout(900)
    const picked = (await done()) > before
    if (!picked) bad('선택지 고르기', `검사가 선택지를 누르지 못했다(완료 ${before}개 그대로) — 아래 판정은 믿을 수 없다`)

    await ctx.setOffline(true)
    const submit = page.locator('button').filter({ hasText: /제출|채점/ }).first()
    let msg = ''
    if (await submit.count()) {
      await submit.click().catch(() => {})
      await page.waitForTimeout(1500)
      // 확인 팝업이 있으면 한 번 더
      const confirm = page.locator('button').filter({ hasText: /제출|확인/ }).last()
      if (await confirm.count()) await confirm.click().catch(() => {})
      await page.waitForTimeout(6000)
      msg = await page.evaluate(() => document.body.innerText).catch(() => '')
    }
    await ctx.setOffline(false)

    const stillHere = /\/cbt\//.test(page.url())
    const told = /못했|실패|다시|오류|잠시 후|끊/.test(msg)
    const rawEnglish = /Failed to fetch|NetworkError|TypeError|fetch failed/i.test(msg)
    if (rawEnglish) bad('제출 실패 안내 문구', '브라우저가 던진 영문 오류가 그대로 보인다')
    if (stillHere && told) ok('시험 제출 실패', '화면에 남아 있고 다시 시도하라고 알려 준다')
    else if (!stillHere) bad('시험 제출 실패', `답이 저장되지 않았는데 화면을 떠났다 → ${page.url()}`)
    else bad('시험 제출 실패', '화면에는 남았지만 안내가 없다 — 본 글: ' + msg.replace(/\s+/g, ' ').slice(0, 160))

    // 새로고침했을 때 풀던 답이 남아 있는가
    await page.reload({ waitUntil: 'load' }).catch(() => {})
    await page.waitForTimeout(2500)
    const draft = await page.evaluate(() => document.body.innerText).catch(() => '')
    if (!picked) results.push({ ok: true, name: '풀던 답 복구', detail: '고른 답이 없어 확인 생략' })
    else if (/이어서|복구|저장된|불러/.test(draft)) ok('풀던 답 복구', '새로고침 후 이어서 풀 수 있다고 안내한다')
    else bad('풀던 답 복구', '새로고침 후 안내 없음 — 본 글: ' + draft.replace(/\s+/g, ' ').slice(0, 160))
  }

  // ── 2) 로그인이 풀린 상태로 로그인 전용 화면에 가면 ────────────────────────
  await ctx.clearCookies()
  const r2 = await page.goto(`${BASE}/dashboard`, { waitUntil: 'load' })
  await page.waitForTimeout(1500)
  const toLogin = /\/login/.test(page.url())
  if (toLogin) ok('세션 만료', '로그인 화면으로 보낸다')
  else bad('세션 만료', `${r2?.status()} ${page.url()} — 로그인으로 보내지 않는다`)

  // ── 3) 결제 관련 화면(결제는 하지 않는다) ─────────────────────────────────
  for (const [path, label] of [
    ['/subscribe/success', '결제 완료 화면에 주문번호 없이 들어갔을 때'],
    ['/subscribe/success?paymentId=없는주문', '결제 완료 화면에 없는 주문번호로 들어갔을 때'],
  ]) {
    const r = await page.goto(`${BASE}${path}`, { waitUntil: 'load' }).catch(() => null)
    await page.waitForTimeout(1800)
    const txt = await page.evaluate(() => document.body.innerText.slice(0, 200).replace(/\s+/g, ' ')).catch(() => '')
    const status = r?.status() ?? 0
    const crashed = status >= 500 || /Application error|Unhandled|디지털 오류/i.test(txt)
    const guided = /확인|문의|돌아|다시|로그인|이용권/.test(txt)
    if (crashed) bad(label, `${status} — 오류 화면이 그대로 노출된다: ${txt.slice(0, 80)}`)
    else if (guided) ok(label, `${status} — 다음에 뭘 하면 되는지 알려 준다`)
    else bad(label, `${status} — 안내가 없다: ${txt.slice(0, 80)}`)
  }

  // ── 4) 없는 주소 ─────────────────────────────────────────────────────────
  for (const [path, label] of [
    ['/이런페이지없음', '없는 한글 주소'],
    ['/no-such-page', '없는 영문 주소'],
  ]) {
    const r = await page.goto(`${BASE}${path}`, { waitUntil: 'load' }).catch(() => null)
    await page.waitForTimeout(800)
    const status = r?.status() ?? 0
    const txt = await page.evaluate(() => document.body.innerText.slice(0, 200)).catch(() => '')
    const hasWayBack = await page.evaluate(() => [...document.querySelectorAll('a[href]')].some((a) => /홈|처음|돌아|메인/.test(a.textContent ?? ''))).catch(() => false)
    if (status !== 404) bad(label, `${status}가 나왔다(404여야 한다)`)
    else if (!hasWayBack) bad(label, '404는 맞지만 돌아갈 링크가 없다: ' + txt.slice(0, 60).replace(/\s+/g, ' '))
    else ok(label, '404 + 돌아갈 링크 있음')
  }
} catch (e) {
  bad('검사 진행', String(e).slice(0, 120))
} finally {
  await browser.close()
  for (const t of ['quiz_answers', 'quiz_sessions', 'device_usage', 'manuscript_submissions']) {
    await admin(`/rest/v1/${t}?user_id=eq.${uid}`, { method: 'DELETE' }).catch(() => {})
  }
  await admin(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' }).catch(() => {})
}

console.log('\n오류 복구 경로 점검\n')
for (const r of results) console.log(`  ${r.ok ? '○' : '×'} ${r.name} — ${r.detail}`)
const fails = results.filter((r) => !r.ok)
console.log(`\n통과 ${results.length - fails.length} / ${results.length}`)
if (fails.length) process.exitCode = 1
