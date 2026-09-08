// 관리자 화면과 아침 보고가 '오늘'을 같은 수로 말하는지 본다.
//   npm run check:pulse
//
// 왜 필요한가: 오늘 가입·방문자는 화면에서 눈으로 맞춰 볼 방법이 없다. 한국 자정 경계,
// 검사 계정 제외, 봇 제외 중 한 군데만 틀려도 숫자가 조용히 어긋난다(운영자 지시 2026-09-08).
// 그래서 DB에서 직접 센 값과 화면·보고에 뜬 값을 견준다.
//
// 검사가 만든 관리자 계정만 만들고 지운다(그 계정은 검사 계정 규칙에 걸려 '오늘 가입'에서 빠진다).
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { summarizeTodayPulse, botVisitorIds, isTestAccountEmail, kstDay, LIVE_WINDOW_MIN } from '../src/lib/todayPulse.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { chromium } = await import(pathToFileURL(path.join(ROOT, 'node_modules', 'playwright', 'index.mjs')).href)
const ENV = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, '.env.local'), 'utf-8').split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] }),
)
const SB = ENV.NEXT_PUBLIC_SUPABASE_URL
const SVC = ENV.SUPABASE_SERVICE_ROLE_KEY
const PORT = Number(process.env.PULSE_PORT ?? 3118)
const BASE = `http://127.0.0.1:${PORT}`
const api = (p, init) => fetch(`${SB}${p}`, {
  ...init, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
})

const results = []
const ok = (n, d = '') => results.push({ ok: true, n, d })
const bad = (n, d = '') => results.push({ ok: false, n, d })

// 1) 계산 규칙 — 날짜 경계·봇·검사 계정
{
  const now = Date.parse('2026-09-08T00:30:00+09:00')   // 한국 0시 30분 — UTC 로는 아직 어제다
  const t = (min) => new Date(now - min * 60_000).toISOString()
  const views = [
    { path: '/', visitor_id: 'a', created_at: t(5) },              // 오늘 · 지금
    { path: '/cbt', visitor_id: 'a', created_at: t(10) },          // 같은 사람
    { path: '/', visitor_id: 'b', created_at: t(25) },             // 오늘 · 지금은 아님(15분 밖)
    { path: '/', visitor_id: 'c', created_at: t(60 * 5) },         // 어제(한국 날짜로 9/7 19:30)
    { path: '#event/signup', visitor_id: 'd', created_at: t(5) },  // 사건 기록은 화면이 아니다
  ]
  const p = summarizeTodayPulse(views, [], now)
  if (p.visitors === 2) ok('오늘 방문자는 한국 날짜로 센다', `${p.visitors}명(어제 1명 제외)`)
  else bad('오늘 방문자', `${p.visitors}명 — 2명이어야 한다`)
  if (p.now === 1) ok(`지금 보는 사람은 최근 ${LIVE_WINDOW_MIN}분만 센다`, `${p.now}명`)
  else bad('지금 보는 사람', `${p.now}명 — 1명이어야 한다`)

  const bot = []
  for (let i = 0; i < 9; i++) bot.push({ path: `/p${i}`, visitor_id: 'bot', created_at: new Date(now - 60_000 + i * 1000).toISOString() })
  if (botVisitorIds(bot).has('bot')) ok('90초에 화면 8개를 여는 방문자는 사람으로 안 센다')
  else bad('봇 판정', '검사 트래픽이 방문자로 잡힌다')
  if (summarizeTodayPulse([...views, ...bot], [], now).visitors === 2) ok('봇을 빼도 사람 수는 그대로다')
  else bad('봇 제외', '사람까지 같이 빠진다')

  if (summarizeTodayPulse([], [t(5), t(60 * 5), t(2)], now).signups === 2) ok('오늘 가입도 한국 날짜로 센다', '2명')
  else bad('오늘 가입', '날짜 경계가 어긋난다')
}
{
  const fake = ['predcheck+1@kptest.cloud', 'audit+9@example.com', 'eventlive+3@kptest.cloud', 'someone@kbstest.cloud']
  if (fake.every(isTestAccountEmail)) ok('검사 계정은 가입 수에서 뺀다', `${fake.length}가지`)
  else bad('검사 계정 판정', fake.filter(e => !isTestAccountEmail(e)).join(', '))
  const real = ['hong@naver.com', 'a.b+news@gmail.com', 'checkmate@daum.net']
  if (!real.some(isTestAccountEmail)) ok('진짜 회원은 안 뺀다', `${real.length}가지`)
  else bad('과잉 제외', real.filter(isTestAccountEmail).join(', '))
}

// 2) DB 에서 직접 센 값
const since = new Date(Date.now() - 36 * 3600_000).toISOString()
const views = []
for (let from = 0; ; from += 1000) {
  const r = await api(`/rest/v1/page_views?select=path,visitor_id,created_at&created_at=gte.${since}&order=created_at.asc`, {
    headers: { Range: `${from}-${from + 999}` },
  })
  const batch = await r.json()
  if (!Array.isArray(batch)) break
  views.push(...batch)
  if (batch.length < 1000) break
}
const users = []
for (let page = 1; page <= 10; page++) {
  const r = await (await api(`/auth/v1/admin/users?page=${page}&per_page=1000`)).json()
  const batch = r?.users ?? []
  users.push(...batch)
  if (batch.length < 1000) break
}
const expected = summarizeTodayPulse(views, users.filter(u => !isTestAccountEmail(u.email)).map(u => u.created_at))
ok('오늘치를 DB 에서 셌다', `가입 ${expected.signups} · 방문 ${expected.visitors} · 지금 ${expected.now} (${kstDay(Date.now())})`)

// 3) 화면과 보고가 같은 수를 말하는가
const stamp = `${Date.now()}`
const acc = { email: `admincheck+${stamp}@kptest.cloud`, password: `Chk-${stamp}-aA1x` }
const mk = await api('/auth/v1/admin/users', {
  method: 'POST', body: JSON.stringify({ email: acc.email, password: acc.password, email_confirm: true }),
})
acc.uid = mk.ok ? (await mk.json()).id : null
if (!acc.uid) bad('검사용 관리자 계정', (await mk.text()).slice(0, 120))

// 아침 보고는 CRON_SECRET 이 있어야 열린다. 운영 값은 여기 없고 알 필요도 없다 —
// 이 서버에만 통하는 값을 만들어 넣고 그 값으로 미리보기를 부른다.
const cronSecret = `pulse-check-${stamp}`
const nextBin = path.join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next')
const server = spawn(process.execPath, [nextBin, 'start', '-p', String(PORT)], {
  stdio: 'ignore', env: { ...process.env, ADMIN_EMAILS: acc.email, CRON_SECRET: cronSecret },
})
let browser
try {
  let up = false
  for (let i = 0; i < 60 && !up; i++) {
    try { up = (await fetch(`${BASE}/admin/login`)).ok } catch { /* 아직 안 뜸 */ }
    if (!up) await new Promise(r => setTimeout(r, 1000))
  }
  if (!up) throw new Error(`로컬 서버가 ${PORT}포트에 뜨지 않았다`)

  browser = await chromium.launch()
  const page = await (await browser.newContext()).newPage()
  let landed = false
  for (let attempt = 0; attempt < 3 && !landed; attempt++) {
    await page.goto(`${BASE}/admin/login`, { waitUntil: 'domcontentloaded' })
    await page.fill('input[type="email"]', acc.email)
    await page.fill('input[type="password"]', acc.password)
    await page.click('button[type="submit"]')
    for (let i = 0; i < 20; i++) {
      if (new URL(page.url()).pathname === '/admin') { landed = true; break }
      await page.waitForTimeout(1000)
    }
  }
  if (!landed) throw new Error(`관리자 화면에 못 들어갔다 — ${page.url()}`)

  await page.waitForTimeout(1500)
  const text = await page.evaluate(() => document.body.innerText)
  const pick = (label) => {
    const i = text.indexOf(label)
    if (i < 0) return null
    const m = text.slice(i, i + 60).match(/(\d[\d,]*)\s*명/)
    return m ? Number(m[1].replace(/,/g, '')) : null
  }
  const shown = { signups: pick('오늘 가입'), visitors: pick('오늘 방문자'), now: pick('지금 보는 중') }
  for (const [key, label] of [['signups', '오늘 가입'], ['visitors', '오늘 방문자'], ['now', '지금 보는 중']]) {
    // '지금 몇 명'은 검사가 도는 몇 초 사이에도 달라진다 — 하나까지는 어긋나도 맞다고 본다.
    const slack = key === 'now' ? 1 : 0
    if (shown[key] === null) bad(`${label} — 화면에 없다`)
    else if (Math.abs(shown[key] - expected[key]) <= slack) ok(`${label} — 화면이 DB 와 같다`, `${shown[key]}명`)
    else bad(label, `화면 ${shown[key]} vs DB ${expected[key]}`)
  }

  {
    const r = await (await fetch(`${BASE}/api/cron/subscriber-report?preview=1`, {
      headers: { authorization: `Bearer ${cronSecret}` },
    })).json()
    const line = String(r.caption ?? '').split('\n').find(l => l.startsWith('오늘 가입'))
    if (!line) bad('아침 보고', '오늘치 줄이 없다')
    else if (line.includes(`오늘 가입 ${expected.signups}명`) && line.includes(`방문자 ${expected.visitors}명`))
      ok('아침 보고도 같은 수를 싣는다', line)
    else bad('아침 보고 숫자', `${line} vs DB 가입 ${expected.signups}·방문 ${expected.visitors}`)
  }
} catch (e) {
  bad('실행', String(e?.message ?? e).slice(0, 200))
} finally {
  if (browser) await browser.close()
  server.kill()
  if (acc.uid) await api(`/auth/v1/admin/users/${acc.uid}`, { method: 'DELETE' }).catch(() => {})
}

console.log(`\n오늘 가입·방문자 — ${BASE}\n`)
for (const r of results) console.log(`${r.ok ? '  o' : '  x'} ${r.n}${r.d ? ` — ${r.d}` : ''}`)
const failed = results.filter(r => !r.ok).length
console.log(failed ? `\n${failed}건 어긋난다.` : '\n화면과 보고가 같은 수를 말한다.')
process.exit(failed ? 1 : 0)
