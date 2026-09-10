// 시험을 처음 열었을 때 무엇이 보이고, 언제 기록이 생기는가 — 첫 30초 관찰.
//   npm run check:entry
//   PAGE_SWEEP_BASE=http://localhost:3111 npm run check:entry
//   ENTRY_HOLD_SEC=5 npm run check:entry        (빨리 돌릴 때)
//
// 왜 필요한가: 모의고사를 열고 한 문제도 안 푼 회차가 112건이었다(2026-09-08 check:dropoff).
// 풀다 그만둔 것은 6건뿐이라 사람이 돌아선 자리는 첫 화면이었고, 그때마다 세션 행이
// 만들어져 '시작'과 '열어봄'이 구분되지 않았다.
//
// 그래서 시작 안내를 두고, **시작을 누른 사람에게만** 기록이 생기게 바꿨다. 이 검사는
// 그 두 가지를 함께 본다 — 안내가 제대로 보이는가, 그리고 누르기 전에는 정말 아무것도
// 안 남는가. 여기에 첫 화면에서 사람을 돌려세울 만한 것 세 가지를 잰다:
//   ① 시작하면 무엇이 먼저 보이는가(문항인지, 안내·타이머인지) — 위에서부터 순서와 자리
//   ② '저장하고 나가기'가 좁은 화면에서도 눈에 띄는 자리에, 글자로 있는가
//   ③ 390px 에서 첫 문항과 첫 보기가 스크롤 없이 보이는가(접히지 않는가)
// 그리고 30초를 그대로 두고 타이머 말고는 아무것도 바뀌지 않는지 본다.
//
// 답안은 제출하지 않고, 만든 계정·세션은 끝에 지운다.
// 캡처는 docs/captures/exam-entry/ 에 남긴다 — REPORT 가 가리키는 실물이라 저장소에 둔다.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { chromium } = await import(pathToFileURL(path.join(ROOT, 'node_modules', 'playwright', 'index.mjs')).href)
const ENV = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, '.env.local'), 'utf-8').split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] }),
)
const SB = ENV.NEXT_PUBLIC_SUPABASE_URL
const SVC = ENV.SUPABASE_SERVICE_ROLE_KEY
const BASE = (process.env.PAGE_SWEEP_BASE || 'https://kptest.cloud').replace(/\/+$/, '')
const HOLD_SEC = Number(process.env.ENTRY_HOLD_SEC ?? 30)
const CAP_DIR = path.join(ROOT, 'docs', 'captures', 'exam-entry')
fs.mkdirSync(CAP_DIR, { recursive: true })
const cap = (page, name) => page.screenshot({ path: path.join(CAP_DIR, `${name}.png`) })
const api = (p, init) => fetch(`${SB}${p}`, {
  ...init, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
})

const results = []
const ok = (n, d = '') => results.push({ ok: true, n, d })
const bad = (n, d = '') => results.push({ ok: false, n, d })
const note = (n, d = '') => results.push({ ok: null, n, d })   // 판정 없이 잰 값만 남긴다

const stamp = `${Date.now()}`
const acc = { email: `entrycheck+${stamp}@kptest.cloud`, password: `Chk-${stamp}-aA1x` }
let uid = null
let browser

const sessionCount = async () =>
  (await (await api(`/rest/v1/quiz_sessions?user_id=eq.${uid}&select=id`)).json()).length
const answerCount = async () => {
  const ss = await (await api(`/rest/v1/quiz_sessions?user_id=eq.${uid}&select=id`)).json()
  let n = 0
  for (const s of ss) n += (await (await api(`/rest/v1/quiz_answers?session_id=eq.${s.id}&select=id`)).json()).length
  return n
}
const timerOf = text => (text.match(/\d{1,3}:\d{2}/) ?? [''])[0]
const toSec = t => { const [m, s] = t.split(':').map(Number); return m * 60 + s }

// 시험 화면에서 자리를 잰다 — 헤더·저장 단추·지문·첫 문항·첫 보기가 화면(뷰포트) 어디에 있는가.
// 브라우저 안에서 도는 함수라 바깥 변수를 쓰면 안 된다.
const measure = () => {
  const vh = window.innerHeight
  const r = el => {
    if (!el) return null
    const b = el.getBoundingClientRect()
    return { top: Math.round(b.top), bottom: Math.round(b.bottom), w: Math.round(b.width), h: Math.round(b.height) }
  }
  // 사이트 상단 바도 sticky 라 타이머가 든 시험 헤더로 집는다
  const sticky = document.querySelector('[role="timer"]')?.closest('.sticky') ?? null
  const save = document.querySelector('button[title^="답안을 저장하고"]')
  const badge = [...document.querySelectorAll('span')].find(s => /^(\d+번|서술형 \d+번)$/.test((s.innerText || '').trim()))
  const card = badge?.closest('.rounded-2xl')
  const qText = card?.querySelector('p')
  const firstOpt = [...document.querySelectorAll('button')].find(b => /^①/.test((b.innerText || '').trim()))
  const passageLabel = [...document.querySelectorAll('span')].find(s => /\[지문 · 자료\]/.test(s.innerText || ''))
  const passage = passageLabel?.closest('.rounded-xl')
  const dialogs = [...document.querySelectorAll('[role="dialog"], [role="alertdialog"]')].filter(d => d.getBoundingClientRect().height > 0).length
  return {
    vh,
    scrollY: Math.round(window.scrollY),
    header: r(sticky),
    save: save && { ...r(save), label: (save.innerText || '').trim(), aria: save.getAttribute('aria-label') || '', title: save.getAttribute('title') || '' },
    badge: badge && { ...r(badge), text: badge.innerText.trim() },
    qText: r(qText),
    firstOpt: r(firstOpt),
    passage: r(passage),
    dialogs,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }
}
const inView = (rect, vh) => !!rect && rect.top >= 0 && rect.bottom <= vh
const fmt = rect => (rect ? `${rect.top}~${rect.bottom}px` : '없음')

try {
  const mk = await api('/auth/v1/admin/users', {
    method: 'POST', body: JSON.stringify({ email: acc.email, password: acc.password, email_confirm: true }),
  })
  uid = mk.ok ? (await mk.json()).id : null
  if (!uid) throw new Error(`검사용 계정 실패: ${(await mk.text()).slice(0, 120)}`)

  browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await ctx.addInitScript(() => { try { localStorage.setItem('silyong_mode_intro_v1', '1') } catch { /* 막혀도 진행 */ } })
  const page = await ctx.newPage()
  const errs = []
  page.on('pageerror', e => errs.push(String(e).slice(0, 120)))

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  await page.fill('input[type="email"]', acc.email)
  await page.fill('input[type="password"]', acc.password)
  await page.click('button[type="submit"]')
  for (let i = 0; i < 40 && page.url().includes('/login'); i++) await page.waitForTimeout(1000)
  if (page.url().includes('/login')) throw new Error('로그인이 안 됐다')

  // 회차 목록에서 처음 온 사람이 밟는 길 그대로 들어간다
  await page.goto(`${BASE}/cbt`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  const href = await page.evaluate(() =>
    [...document.querySelectorAll('a[href*="/cbt/"]')].map(a => a.getAttribute('href'))
      .find(h => h && /\/cbt\/[^/?]+$/.test(h)) ?? null)
  if (!href) throw new Error('회차 목록에서 들어갈 링크를 못 찾았다')
  ok('회차 목록에서 시험으로 가는 길이 있다', href)

  // 1) 안내 화면
  await page.goto(`${BASE}${href}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)
  const intro = await page.evaluate(() => document.body.innerText)
  await cap(page, 'intro-390')
  if (/시작하기/.test(intro)) ok('열면 시작 안내가 먼저 뜬다')
  else bad('시작 안내', intro.replace(/\n+/g, ' | ').slice(0, 140))
  if (/시험 시간/.test(intro) && /\d+분/.test(intro)) ok('몇 분짜리인지 먼저 알려 준다', (intro.match(/\d+분/) ?? [''])[0])
  else bad('시험 시간 안내', '없다')
  if (/저장하고 나갈 수 있어요/.test(intro)) ok('중간에 나갈 수 있다고 미리 알려 준다')
  else bad('나갈 길 안내', '없다')
  if (/자동으로 제출/.test(intro)) ok('시간이 다 되면 자동 제출된다고 밝힌다', '실제 동작과 같은 말')
  else bad('자동 제출 고지', '없다 — 실제로는 자동 제출된다')
  const introStart = await page.evaluate(() => {
    const a = [...document.querySelectorAll('a')].find(x => /시작하기/.test(x.innerText || ''))
    if (!a) return null
    const b = a.getBoundingClientRect()
    return { top: Math.round(b.top), bottom: Math.round(b.bottom), vh: window.innerHeight }
  })
  if (introStart && introStart.bottom <= introStart.vh) ok('안내 화면에서 시작 단추가 스크롤 없이 보인다', `${introStart.top}~${introStart.bottom}px / 화면 ${introStart.vh}px`)
  else bad('시작 단추 위치', introStart ? `${introStart.top}~${introStart.bottom}px, 화면 ${introStart.vh}px — 스크롤해야 보인다` : '없음')

  // 2) 누르기 전에는 기록이 없어야 한다 (이 검사의 핵심)
  const before = await sessionCount()
  if (before === 0) ok('시작을 누르기 전에는 기록이 안 생긴다', '세션 0건')
  else bad('빈 세션', `열기만 했는데 ${before}건이 생겼다`)

  // 3) 시작하기 — ① 무엇이 먼저 보이는가
  await page.locator('a', { hasText: '시작하기' }).first().click()
  await page.waitForTimeout(3000)
  // 마우스가 시작 단추 자리에 남아 있으면 그 자리의 보기가 hover 로 칠해져 캡처가 헷갈린다
  await page.mouse.move(1, 1)
  await page.waitForTimeout(200)
  const playing = await page.evaluate(() => ({
    text: document.body.innerText,
    options: [...document.querySelectorAll('button, label, li')]
      .filter(el => /^[①②③④⑤]/.test((el.innerText || '').trim())).length,
  }))
  const m0 = await page.evaluate(measure)
  await cap(page, 'playing-390')
  if (playing.options >= 4) ok('시작하면 첫 문항 보기가 바로 보인다', `${playing.options}개`)
  else bad('첫 문항', playing.text.replace(/\n+/g, ' | ').slice(0, 140))
  const t0 = timerOf(playing.text)
  if (t0) ok('남은 시간이 보인다', t0)
  else bad('타이머', '남은 시간이 안 보인다')
  if (/제출하기/.test(playing.text)) ok('제출 버튼이 있다')
  else bad('제출 버튼', '없다')
  if (m0.dialogs === 0) ok('시작 직후 가리는 창(dialog)이 없다')
  else bad('시작 직후 가리는 창', `${m0.dialogs}개`)
  note('① 첫 화면 순서(390px, 위→아래)',
    `헤더 ${fmt(m0.header)} → ${m0.passage ? `지문 ${fmt(m0.passage)} → ` : '지문 없음 → '}`
    + `문항 번호 ${m0.badge ? `"${m0.badge.text}" ` : ''}${fmt(m0.badge)} → 문항 글 ${fmt(m0.qText)} → 첫 보기 ${fmt(m0.firstOpt)} (화면 ${m0.vh}px)`)

  const after = await sessionCount()
  if (after === 1) ok('시작을 눌러야 기록이 하나 생긴다', '세션 1건')
  else bad('세션 수', `${after}건`)

  // ② '저장하고 나가기' — 좁은 화면에서 자리·글자
  if (!m0.save) bad('② 저장하고 나가기 단추', '시험 화면에 없다')
  else {
    if (inView(m0.save, m0.vh)) ok('② 저장하고 나가기 단추가 스크롤 없이 보인다', `${fmt(m0.save)}, ${m0.save.w}×${m0.save.h}px`)
    else bad('② 저장하고 나가기 단추 위치', `${fmt(m0.save)} — 화면 밖`)
    if (m0.save.label) ok('② 좁은 화면에서도 단추에 글자가 있다', m0.save.label)
    else if (m0.save.aria) note('② 좁은 화면에서는 아이콘만 — 낭독기 이름은 있다', m0.save.aria)
    else bad('② 좁은 화면에서 단추가 아이콘뿐', `글자·aria-label 없음, title="${m0.save.title.slice(0, 24)}…"(터치에서는 안 보인다)`)
  }

  // ③ 390px 에서 첫 문항이 접히지 않는가
  if (m0.overflow) bad('③ 가로 넘침', '390px에서 화면이 밀린다')
  else ok('③ 좁은 화면에서 가로로 밀리지 않는다')
  if (inView(m0.qText, m0.vh)) ok('③ 첫 문항 글이 스크롤 없이 보인다', fmt(m0.qText))
  else bad('③ 첫 문항 글', `${fmt(m0.qText)} — 화면 ${m0.vh}px 밖`)
  if (inView(m0.firstOpt, m0.vh)) ok('③ 첫 보기가 스크롤 없이 보인다', fmt(m0.firstOpt))
  else bad('③ 첫 보기', `${fmt(m0.firstOpt)} — 스크롤해야 보인다`)

  // 30초 그대로 둔다 — 타이머만 흘러야 한다
  await page.waitForTimeout(HOLD_SEC * 1000)
  const m30 = await page.evaluate(measure)
  const t30 = timerOf(await page.evaluate(() => document.body.innerText))
  await cap(page, `playing-390-${HOLD_SEC}s`)
  const drift = t0 && t30 ? toSec(t0) - toSec(t30) : NaN
  if (Math.abs(drift - HOLD_SEC) <= 3) ok(`${HOLD_SEC}초 뒤 타이머가 그만큼 줄었다`, `${t0} → ${t30}`)
  else bad('타이머 흐름', `${t0} → ${t30} (${drift}초)`)
  if (m30.dialogs === 0 && m30.scrollY === 0) ok(`${HOLD_SEC}초 동안 저절로 뜨거나 움직인 것이 없다`)
  else bad(`${HOLD_SEC}초 뒤 화면`, `dialog ${m30.dialogs}개, scrollY ${m30.scrollY}`)
  const sAfter = await sessionCount()
  const aAfter = await answerCount()
  if (sAfter === 1 && aAfter === 0) ok(`${HOLD_SEC}초 동안 안 풀면 서버에 답안이 안 생긴다`, '세션 1·답안 0')
  else bad('가만히 있었는데 기록', `세션 ${sAfter}·답안 ${aAfter}`)

  if (errs.length) bad('콘솔 오류', errs.join(' / '))
  else ok('콘솔 오류 없음')

  // 넓은 화면(1280px)은 ② 대조용 — 같은 로그인으로 다시 연다(세션은 그대로 1건이어야 한다).
  // 저장 없이 나간 사람이 돌아오면 어떤 화면을 만나는지도 여기서 본다.
  const wide = await browser.newContext({ viewport: { width: 1280, height: 800 }, storageState: await ctx.storageState() })
  const wp = await wide.newPage()
  await wp.goto(`${BASE}${href}`, { waitUntil: 'domcontentloaded' })
  await wp.waitForTimeout(2500)
  const backText = await wp.evaluate(() => document.body.innerText)
  await cap(wp, 'return-1280')
  note('저장 없이 나갔다 돌아오면', /시작하기/.test(backText) ? '시작 안내가 다시 뜬다(서버 저장이 없으면 이어풀기로 안 친다)' : '시험 화면으로 바로 간다')
  await wp.goto(`${BASE}${href}?start=1`, { waitUntil: 'domcontentloaded' })
  await wp.waitForTimeout(3000)
  await wp.mouse.move(1, 1)
  const mw = await wp.evaluate(measure)
  const tw = timerOf(await wp.evaluate(() => document.body.innerText))
  await cap(wp, 'playing-1280')
  note('② 넓은 화면(1280px) 저장 단추', mw.save ? `${fmt(mw.save)}, 글자 "${mw.save.label || '(없음)'}"` : '없음')
  note('다시 시작을 누르면 타이머', tw || '없음')
  const sWide = await sessionCount()
  if (sWide === 1) ok('다시 시작을 눌러도 세션은 1건(있던 것을 다시 쓴다)')
  else bad('다시 시작 뒤 세션', `${sWide}건`)
  await wide.close()
  await ctx.close()
} catch (e) {
  bad('실행', String(e?.message ?? e).slice(0, 200))
} finally {
  if (browser) await browser.close()
  if (uid) {
    const ids = await (await api(`/rest/v1/quiz_sessions?user_id=eq.${uid}&select=id`)).json().catch(() => [])
    for (const s of Array.isArray(ids) ? ids : []) {
      await api(`/rest/v1/quiz_answers?session_id=eq.${s.id}`, { method: 'DELETE' }).catch(() => {})
    }
    await api(`/rest/v1/quiz_sessions?user_id=eq.${uid}`, { method: 'DELETE' }).catch(() => {})
    await api(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' }).catch(() => {})
  }
}

console.log(`\n시험 첫 화면 — ${BASE} (캡처: docs/captures/exam-entry/)\n`)
for (const r of results) console.log(`${r.ok === null ? '  ·' : r.ok ? '  o' : '  x'} ${r.n}${r.d ? ` — ${r.d}` : ''}`)
const failed = results.filter(r => r.ok === false).length
console.log(failed ? `\n${failed}건 손볼 것이 있습니다.` : '\n열어 보는 것과 시작하는 것이 구분된다.')
process.exit(failed ? 1 : 0)
