// 가입 폼을 실제로 채워서 계정이 만들어지는지 확인한다.
//   npm run check:signup
//
// 퍼널의 맨 앞이라 여기가 조용히 깨지면 그날 유입이 통째로 사라진다. 그런데 다른 검사는
// 전부 service_role 관리자 API로 계정을 만들어 로그인하므로, 정작 사람이 쓰는 폼은
// 아무도 지나가지 않는다. 폼을 건드릴 때마다(칸을 빼거나 검증을 바꿀 때) 이걸 돌린다.
import fs from 'node:fs'
import { chromium, devices } from 'playwright'

const ENV = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf-8').split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const admin = (p, init) => fetch(`${ENV.NEXT_PUBLIC_SUPABASE_URL}${p}`, {
  ...init,
  headers: { apikey: ENV.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${ENV.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
})

const BASE = process.env.SIGNUP_CHECK_BASE ?? 'https://kptest.cloud'

const stamp = Date.now()
const email = `uicheck+${stamp}@kptest.cloud`
const password = `Chk-${stamp}-aA1!`

const browser = await chromium.launch()
let uid = null
try {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/signup?from=quiz`, { waitUntil: 'load' })
  await page.waitForTimeout(1500)
  await page.fill('input[placeholder="홍길동"]', '검사계정')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForTimeout(9000)
  console.log('가입 후 URL:', page.url())
  console.log('화면:', (await page.evaluate(() => document.body.innerText.slice(0, 180).replace(/\s+/g, ' '))))

  // ── 구글로 시작하기 ──────────────────────────────────────────────────────
  // 이메일 폼만 확인하면, 소셜 로그인이 꺼져 있거나 리디렉션 주소가 어긋나도 모른다.
  // 구글 로그인 화면이 뜨고 거기에 우리 Supabase 프로젝트 이름이 찍히면, 구글이 이
  // 앱을 알고 있다는 뜻이다 — 설정이 어긋나면 거기서 오류 화면이 나온다.
  //
  // 여기까지만 한다. 자격증명은 어디에도 넣지 않는다.
  const SB_HOST = new URL(ENV.NEXT_PUBLIC_SUPABASE_URL).hostname
  for (const path of ['/login', '/signup']) {
    const octx = await browser.newContext()
    const op = await octx.newPage()
    await op.goto(`${BASE}${path}`, { waitUntil: 'load' })
    await op.locator('button', { hasText: /Google/ }).first().click().catch(() => {})
    let landed = ''
    for (let i = 0; i < 30; i++) {
      landed = op.url()
      if (/accounts\.google\.com/.test(landed)) break
      await op.waitForTimeout(500)
    }
    // 주소가 바뀌자마자 읽으면 본문이 아직 비어 있다 — 글이 찍힐 때까지 기다린다.
    let shown = ''
    for (let i = 0; i < 20; i++) {
      shown = await op.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 160)).catch(() => '')
      if (shown.length > 20) break
      await op.waitForTimeout(500)
    }
    if (!/accounts\.google\.com/.test(landed)) {
      console.log(`× ${path} 구글로 시작하기 — 구글로 넘어가지 않았다: ${shown}`)
      process.exitCode = 1
    } else if (!shown.includes(SB_HOST)) {
      console.log(`× ${path} 구글로 시작하기 — 구글까지 갔지만 우리 앱을 못 알아본다: ${shown}`)
      process.exitCode = 1
    } else {
      console.log(`○ ${path} 구글로 시작하기 — 구글 로그인 화면까지 정상 도달`)
    }
    await octx.close()
  }

  const list = await (await admin('/auth/v1/admin/users?page=1&per_page=200')).json()
  const u = (list.users ?? []).find((x) => x.email === email)
  uid = u?.id ?? null
  console.log(u ? '○ 계정이 실제로 만들어졌다' : '× 계정이 만들어지지 않았다')
  if (!u) process.exitCode = 1
} finally {
  await browser.close()
  if (uid) {
    await admin(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' }).catch(() => {})
    console.log('검증 계정 삭제')
  }
}
