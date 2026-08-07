// 후기 남기기(인증 없이) 한 번 실제로 해 보고 곧바로 지운다.
import fs from 'node:fs'
import { chromium } from 'playwright'
import { dismissIntros } from './ui_audit_rules.mjs'
const ENV = Object.fromEntries(fs.readFileSync('.env.local', 'utf-8').split('\n')
  .filter(l => l.includes('=') && !l.trim().startsWith('#'))
  .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const SB = ENV.NEXT_PUBLIC_SUPABASE_URL, SVC = ENV.SUPABASE_SERVICE_ROLE_KEY
const api = (p, init) => fetch(`${SB}${p}`, { ...init, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) } })
const stamp = `${Date.now()}`
const email = `uicheck+${stamp}@kptest.cloud`, password = `Chk-${stamp}-aA1!`
const mk = await api('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email, password, email_confirm: true }) })
if (!mk.ok) { console.error(await mk.text()); process.exit(1) }
const uid = (await mk.json()).id
const b = await chromium.launch()
try {
  const ctx = await b.newContext()
  await ctx.addInitScript(dismissIntros)
  const p = await ctx.newPage()
  for (let attempt = 0; attempt < 3; attempt++) {
    await p.goto('https://kptest.cloud/login', { waitUntil: 'domcontentloaded' })
    await p.fill('input[type="email"]', email); await p.fill('input[type="password"]', password)
    await p.click('button[type="submit"]')
    for (let i = 0; i < 30 && new URL(p.url()).pathname.includes('/login'); i++) await p.waitForTimeout(1000)
    if (!new URL(p.url()).pathname.includes('/login')) break
    console.log(`  로그인 재시도 ${attempt + 1}/3`)
    await p.waitForTimeout(5000)
  }
  console.log('로그인 후', new URL(p.url()).pathname)
  await p.goto('https://kptest.cloud/dashboard', { waitUntil: 'load' })
  await p.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' }).catch(() => {})
  await p.waitForTimeout(800)
  await p.locator('button', { hasText: '후기 남기기' }).first().click()
  await p.waitForTimeout(600)
  const before = await p.evaluate(() => document.body.innerText.includes('점수 인증 사진'))
  console.log('열자마자 인증 사진칸이 보이는가(안 보여야 정상):', before)
  await p.locator('textarea').first().fill('맞춤법 연습을 매일 조금씩 하니 확실히 늘었어요. 원고지 채점이 특히 도움됐습니다.')
  const invalid = await p.evaluate(() => [...document.querySelectorAll('form input, form textarea')]
    .filter(el => !el.checkValidity())
    .map(el => `${el.tagName}[${el.type ?? ''}] value=${JSON.stringify(el.value).slice(0, 30)} → ${el.validationMessage}`))
  console.log('제출 전 유효하지 않은 칸:', invalid.length ? invalid.join(' | ') : '없음')
  await p.locator('button[type="submit"]').first().click()
  for (let i = 0; i < 20; i++) { if (await p.locator('text=후기가 등록됐어요').count()) break; await p.waitForTimeout(700) }
  const msg = await p.evaluate(() => {
    const dlg = document.querySelector('form')?.closest('div.bg-white')
    return (dlg?.innerText ?? document.body.innerText).replace(/\s+/g, ' ').slice(0, 400)
  })
  console.log('모달 안 글:', msg)
  console.log('완료 화면:', /후기가 등록됐어요/.test(msg) ? '등록됨' : '실패')
  console.log('환급 문구가 섞였는가(섞이면 안 됨):', /환급이 진행/.test(msg))
  const rows = await (await api(`/rest/v1/reviews?user_id=eq.${uid}&select=id,content,exam_score,proof_path,is_visible`)).json()
  console.log('DB 행:', JSON.stringify(rows))
} finally {
  await b.close()
  await api(`/rest/v1/reviews?user_id=eq.${uid}`, { method: 'DELETE' })
  await api(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' })
  console.log('정리 완료')
}
