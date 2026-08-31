// 시험을 처음부터 끝까지 실제로 풀고 제출해서, 결과 화면까지 제대로 나오는지 본다.
//   npm run check:exam-flow
//
// 이 서비스의 본체다. 그런데 여기가 조용히 망가진 적이 실제로 있다 — 답안 저장이
// 실패해도 세션만 '완료'로 바뀌어, 화면은 멀쩡한데 푼 답이 하나도 없었다.
// 화면만 훑는 검사로는 안 잡히고, 끝까지 풀어 봐야 잡힌다.
//
// AI 채점은 절대 누르지 않는다(유료 API). 결과 화면의 표시만 확인한다.
import fs from 'node:fs'
import { chromium, devices } from 'playwright'
import {
  browserAuditMobile, mobileProblemLines, dismissIntros,
  lum, ratio, contrastBar, browserCollectText, cheapContrast,
} from './ui_audit_rules.mjs'

const ENV = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8').split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const SB = ENV.NEXT_PUBLIC_SUPABASE_URL
const SVC = ENV.SUPABASE_SERVICE_ROLE_KEY
const BASE = process.env.EXAM_FLOW_BASE ?? 'https://kptest.cloud'

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
const ok = (n, d) => results.push({ ok: true, n, d })
const bad = (n, d) => results.push({ ok: false, n, d })

// 요소 자리의 배경 픽셀 중앙값 — 글자를 잠깐 지우고 찍는다(명암비 2단 확증).
let decoderPage = null
async function bgMedian(page, el) {
  if (!decoderPage) decoderPage = await page.context().browser().newPage()
  await el.evaluate((e) => { e.dataset.oc = e.style.color; e.style.color = 'transparent' }).catch(() => {})
  let px = null
  try {
    const buf = await el.screenshot({ timeout: 4000 })
    px = await decoderPage.evaluate(async (b64) => {
      const img = new Image()
      img.src = 'data:image/png;base64,' + b64
      await img.decode()
      const cv = document.createElement('canvas')
      cv.width = img.width; cv.height = img.height
      cv.getContext('2d').drawImage(img, 0, 0)
      const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data
      const out = []
      for (let i = 0; i < d.length; i += 4) out.push([d[i], d[i + 1], d[i + 2]])
      return out
    }, buf.toString('base64'))
  } catch { /* 화면 밖이거나 가려진 요소 */ }
  await el.evaluate((e) => { e.style.color = e.dataset.oc || '' }).catch(() => {})
  if (!px?.length) return null
  const mid = (k) => { const v = px.map((p) => p[k]).sort((a, b) => a - b); return v[Math.floor(v.length / 2)] }
  return [mid(0), mid(1), mid(2)]
}

const browser = await chromium.launch()
let sessionId = null
try {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] })
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
    if (!logged) await page.waitForTimeout(4000)
  }
  if (!logged) { bad('로그인', '들어가지 못함'); throw new Error('로그인 실패') }

  // ── 시험 시작 ────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/cbt`, { waitUntil: 'load' })
  await page.waitForTimeout(1200)
  await page.locator('a,button').filter({ hasText: /시작하기/ }).first().click().catch(() => {})
  await page.waitForTimeout(4000)
  if (!/\/cbt\/[^/]+$/.test(new URL(page.url()).pathname)) {
    bad('시험 시작', `시작 버튼을 눌렀는데 ${page.url()}`)
    throw new Error('시험 진입 실패')
  }
  ok('시험 시작', page.url().replace(BASE, ''))

  const total = await page.evaluate(() => Number(/\d+\s*\/\s*(\d+)\s*완료/.exec(document.body.innerText)?.[1] ?? 0))
  if (!total) { bad('문항 수 확인', '"n/m 완료" 표시를 찾지 못함'); throw new Error('문항 수 확인 실패') }

  // 시험 화면은 사람이 120분을 보내는 자리인데 세션이 있어야 열려서 다른 검사가 못 본다.
  // 여기서 열린 김에 휴대폰 사용성을 같이 잰다.
  {
    const r = await page.evaluate(browserAuditMobile)
    const lines = mobileProblemLines('시험 화면', r).filter((x) => x.hard)
    if (lines.length) for (const l of lines) bad('시험 화면 사용성', l.line.replace('시험 화면  ', ''))
    else ok('시험 화면 사용성', '휴대폰 기준 미달 0건')
  }

  // ── 끝까지 푼다 ──────────────────────────────────────────────────────────
  // 객관식은 첫 선택지를 고르고, 서술형은 짧게 채운다(채점 자체가 목적이 아니다).
  let guard = 0
  while (guard++ < total + 10) {
    const done = await page.evaluate(() => Number(/(\d+)\s*\/\s*\d+\s*완료/.exec(document.body.innerText)?.[1] ?? 0))
    if (done >= total) break
    const opt = page.locator('button').filter({ hasText: /^[①②③④⑤]/ }).first()
    if (await opt.count()) {
      await opt.click().catch(() => {})
    } else {
      const ta = page.locator('textarea, [contenteditable="true"]').first()
      if (await ta.count()) await ta.fill('연결이 끊긴 상황을 대비해 짧게 씁니다. 조건을 지켜 문어체로 작성했습니다.').catch(() => {})
    }
    await page.waitForTimeout(250)
    const next = page.locator('button').filter({ hasText: /^다음$/ }).first()
    if (await next.count()) await next.click().catch(() => {})
    await page.waitForTimeout(250)
  }
  const answered = await page.evaluate(() => Number(/(\d+)\s*\/\s*\d+\s*완료/.exec(document.body.innerText)?.[1] ?? 0))
  if (answered >= total) ok('문항 풀이', `${answered}/${total} 완료`)
  else bad('문항 풀이', `${answered}/${total}만 채워짐 — 이후 판정은 참고만`)

  sessionId = await page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && /draft|exam/i.test(k)) {
        const m = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i.exec(k)
        if (m) return m[1]
      }
    }
    return null
  })

  // ── 제출 ─────────────────────────────────────────────────────────────────
  // 실패하면 화면에는 "회선이 끊겼는지…"라는 일반 문구만 뜬다(비한국어 오류의 대체 문구).
  // 그것만 봐서는 서버가 500을 냈는지 정말 회선인지 알 수 없어서, 실제 응답을 받아 둔다.
  const submitFailures = []
  page.on('response', (r) => {
    if (r.status() < 400) return
    if (!r.url().includes('/cbt/')) return
    submitFailures.push(`${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`)
  })
  page.on('requestfailed', (r) => {
    if (r.url().includes('/cbt/')) submitFailures.push(`끊김 ${r.method()} ${new URL(r.url()).pathname} — ${r.failure()?.errorText ?? ''}`)
  })

  await page.locator('button').filter({ hasText: /^제출하기$/ }).first().click().catch(() => {})
  await page.waitForTimeout(1200)
  await page.locator('button').filter({ hasText: /^제출하기$/ }).last().click().catch(() => {})
  for (let i = 0; i < 30; i++) {
    if (/\/result/.test(page.url())) break
    await page.waitForTimeout(1000)
  }
  if (!/\/result/.test(page.url())) {
    const t = await page.evaluate(() => document.body.innerText.slice(0, 200).replace(/\s+/g, ' ')).catch(() => '')
    const why = submitFailures.length ? ` [서버 응답: ${[...new Set(submitFailures)].join(' / ')}]` : ' [실패한 요청 없음 — 화면 쪽 문제]'
    bad('제출', `결과 화면으로 못 넘어감${why} — ${t}`)
    throw new Error('제출 실패')
  }
  ok('제출', '결과 화면으로 넘어감')
  await page.waitForTimeout(2500)

  // ── 결과 화면 ────────────────────────────────────────────────────────────
  const view = await page.evaluate(() => {
    const t = document.body.innerText
    return {
      text: t.replace(/\s+/g, ' ').slice(0, 400),
      score: /(\d+)\s*점/.exec(t)?.[1] ?? null,
      hasWrong: /오답|해설|틀린/.test(t),
      hasAiPaid: /AI 채점|AI 첨삭/.test(t),
      essayPending: /채점 전/.test(t),
      verdict: /미달|합격권|예상/.test(t),
    }
  })
  console.log('  [결과 화면 본문] ' + view.text.slice(0, 300))
  if (view.score) ok('결과 화면 점수', `${view.score}점 표시`)
  else bad('결과 화면 점수', `점수를 찾지 못함 — ${view.text.slice(0, 120)}`)
  if (view.hasWrong) ok('오답 해설', '오답·해설 안내가 있다')
  else bad('오답 해설', '오답 관련 안내가 없다')

  // 서술형이 채점 전인데 등급을 말하면 안 된다 — 객관식만으로는 누구나 늘 '미달'이다
  {
    const r = await page.evaluate(browserAuditMobile)
    const lines = mobileProblemLines('결과 화면', r).filter((x) => x.hard)
    if (lines.length) for (const l of lines) bad('결과 화면 사용성', l.line.replace('결과 화면  ', ''))
    else ok('결과 화면 사용성', '휴대폰 기준 미달 0건')
  }

  // 결과 화면은 완료된 세션이 있어야 열려서 명암비 검사가 한 번도 못 봤다.
  // 실제로 여기서 'AI 분석' 버튼이 금색 위 흰 글자(2.15:1)로 남아 있었다 —
  // 정작 눌리게 하려는 버튼이 가장 안 읽혔다.
  {
    await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' }).catch(() => {})
    const items = await page.evaluate(browserCollectText).catch(() => [])
    const seen = new Set()
    const fails = []
    for (const it of items) {
      const key = it.text + it.color + it.bg.raw
      if (seen.has(key)) continue
      seen.add(key)
      const cheap = cheapContrast(it)
      if (!cheap) continue
      const barValue = contrastBar(it.fs, it.bold)
      if (cheap.worst >= barValue) continue
      const el = page.locator(`[data-cc="${it.id}"]`)
      await el.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {})
      await page.waitForTimeout(100)
      const px = await bgMedian(page, el)
      if (!px) continue
      const real = ratio(cheap.fl, lum(px))
      if (real >= barValue) continue
      fails.push(`${real.toFixed(2)} (필요 ${barValue}) ${it.fs}px "${it.text}" 글자 ${it.color} / 배경 rgb(${px.join(",")})`)
    }
    if (fails.length) for (const f of fails.slice(0, 5)) bad('결과 화면 명암비', f)
    else ok('결과 화면 명암비', '기준 미달 0건')
  }

  // 오답이 있어야만 그려지는 화면들. 갓 만든 계정으로 도는 check:ui-authed는
  // 여기가 늘 비어 있어서 '오답' 색을 한 번도 못 봤다 — 실제로 /insights의
  // '내 답'이 명암비 2.89로 남아 있었다. 방금 푼 세션이 있는 지금이 볼 기회다.
  for (const route of ['/insights', '/practice/wrong']) {
    const res = await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 40000 }).catch(() => null)
    if (!res || res.status() >= 400) { bad(`${route} 명암비`, `열지 못함(${res?.status() ?? '이동 실패'})`); continue }
    await page.waitForTimeout(1200)
    await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' }).catch(() => {})
    const items = await page.evaluate(browserCollectText).catch(() => [])
    const seen = new Set()
    const fails = []
    for (const it of items) {
      const key = it.text + it.color + it.bg.raw
      if (seen.has(key)) continue
      seen.add(key)
      const cheap = cheapContrast(it)
      if (!cheap) continue
      const barValue = contrastBar(it.fs, it.bold)
      if (cheap.worst >= barValue) continue
      const el = page.locator(`[data-cc="${it.id}"]`)
      await el.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {})
      await page.waitForTimeout(100)
      const px = await bgMedian(page, el)
      if (!px) continue
      const real = ratio(cheap.fl, lum(px))
      if (real >= barValue) continue
      fails.push(`${real.toFixed(2)} (필요 ${barValue}) ${it.fs}px "${it.text}" 글자 ${it.color} / 배경 rgb(${px.join(",")})`)
    }
    if (fails.length) for (const f of fails.slice(0, 5)) bad(`${route} 명암비`, f)
    else ok(`${route} 명암비`, `글자 ${items.length}개 · 기준 미달 0건`)
  }

  if (!view.essayPending) bad('등급 판정', '서술형 채점 전인데 "채점 전" 안내가 없다')
  else if (view.verdict) bad('등급 판정', '채점 전인데도 등급(미달/합격권)을 말한다')
  else ok('등급 판정', '채점 전에는 등급을 말하지 않는다')

  // ── DB에 실제로 답안이 저장됐는가 (화면이 멀쩡해도 여기서 갈린다) ──────────
  // 완료 표시는 status가 아니라 completed_at이다(컬럼 이름을 잘못 짚어 한 번 헛다리 짚었다)
  const sess = await (await admin(`/rest/v1/quiz_sessions?user_id=eq.${uid}&select=id,completed_at,score,total`)).json().catch(() => [])
  const sid = Array.isArray(sess) && sess.length ? sess[0].id : sessionId
  if (!sid) {
    bad('답안 저장', 'quiz_sessions에 세션이 없다')
  } else {
    const rows = await (await admin(`/rest/v1/quiz_answers?session_id=eq.${sid}&select=question_id`)).json().catch(() => [])
    const n = Array.isArray(rows) ? rows.length : 0
    if (n >= total) ok('답안 저장', `quiz_answers ${n}행 (문항 ${total}개)`)
    else bad('답안 저장', `quiz_answers ${n}행뿐 — 문항 ${total}개인데 저장이 빠졌다`)
    const row = Array.isArray(sess) && sess.length ? sess[0] : null
    if (!row) bad('세션 기록', 'quiz_sessions에서 세션을 찾지 못함')
    else if (!row.completed_at) bad('세션 기록', 'completed_at이 비어 있다 — 완료로 기록되지 않았다')
    else if (row.score === null || row.total === null) bad('세션 기록', `완료는 됐지만 점수가 비어 있다(score ${row.score}, total ${row.total})`)
    else ok('세션 기록', `완료 기록 + ${row.score}/${row.total}점`)
  }
} finally {
  // 검사용 계정과 그 계정이 만든 것만 지운다
  for (const who of [uid]) {
    for (const t of ['quiz_answers', 'quiz_sessions', 'device_usage', 'manuscript_submissions']) {
      await admin(`/rest/v1/${t}?user_id=eq.${who}`, { method: 'DELETE' }).catch(() => {})
    }
    await admin(`/auth/v1/admin/users/${who}`, { method: 'DELETE' }).catch(() => {})
  }
}

console.log('\n시험 한 회차 끝까지 풀기\n')
for (const r of results) console.log(`  ${r.ok ? '○' : '×'} ${r.n} — ${r.d}`)
const fails = results.filter((r) => !r.ok)
console.log(`\n통과 ${results.length - fails.length} / ${results.length}`)
if (fails.length) process.exitCode = 1
