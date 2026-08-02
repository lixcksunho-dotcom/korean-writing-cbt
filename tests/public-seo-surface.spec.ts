import { test, expect } from '@playwright/test'

// 검색 노출을 떠받치는 공개 표면이 배포로 깨지지 않는지 지킨다.
// 로그인이 필요 없는 것만 다뤄 자격증명 없이 어디서나 돌릴 수 있게 한다.
// 대상 지정: PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'https://kptest.cloud'

// 푸터·가이드 허브에서 링크되는 학습자료 페이지들(검색 유입의 주력).
const CONTENT_PAGES = [
  '/spelling', '/idioms', '/proverbs', '/expressions', '/refined-words',
  '/honorifics', '/standard-words', '/loanword-spelling',
  '/manuscript-guide', '/essay-guide', '/business-writing', '/word-counter',
  '/exam-info', '/kbs-korean', '/exam-compare', '/guides',
]

test('공개 페이지가 전부 200으로 뜬다', async ({ request }) => {
  for (const path of ['/', '/blog', '/subscribe', ...CONTENT_PAGES]) {
    const res = await request.get(`${BASE}${path}`)
    expect(res.status(), `${path} 응답 코드`).toBe(200)
  }
})

test('sitemap에 학습자료·블로그가 모두 들어 있다', async ({ request }) => {
  const xml = await (await request.get(`${BASE}/sitemap.xml`)).text()
  for (const path of CONTENT_PAGES) {
    expect(xml, `sitemap에 ${path}`).toContain(`<loc>https://kptest.cloud${path}</loc>`)
  }
  // 블로그 글은 파일이 늘면 자동으로 늘어난다 — 최소선만 확인한다.
  expect(xml.match(/<loc>[^<]*\/blog\/[^<]*<\/loc>/g)?.length ?? 0).toBeGreaterThanOrEqual(30)

  // 정적 페이지에 lastmod를 넣으면 빌드마다 '오늘 바뀜'이 되어 신호가 무시된다.
  // (반대로 /blog·카테고리·글은 실제 발행일이 있으므로 lastmod가 있어야 한다)
  const urlBlock = (loc: string) => {
    const at = xml.indexOf(`<loc>https://kptest.cloud${loc}</loc>`)
    expect(at, `sitemap에 ${loc} 항목`).toBeGreaterThan(-1)
    return xml.slice(xml.lastIndexOf('<url>', at), xml.indexOf('</url>', at))
  }
  for (const path of ['/spelling', '/terms', '/word-counter']) {
    expect(urlBlock(path), `${path}에 lastmod 없음`).not.toContain('<lastmod>')
  }
  expect(urlBlock('/blog'), '/blog에 lastmod 있음').toContain('<lastmod>')
})

test('RSS가 유효하고 글이 담겨 있다', async ({ request }) => {
  const res = await request.get(`${BASE}/rss.xml`)
  expect(res.headers()['content-type']).toContain('application/rss+xml')
  const xml = await res.text()
  expect(xml).toContain('<atom:link')
  expect(xml.match(/<item>/g)?.length ?? 0).toBeGreaterThanOrEqual(30)
  // 한글 슬러그가 인코딩돼야 리더가 링크를 깨뜨리지 않는다.
  expect(xml).not.toMatch(/<link>https:\/\/kptest\.cloud\/blog\/[^<]*[가-힣]/)
})

test('robots가 공개 안내는 열고 결제 이후 경로만 막는다', async ({ request }) => {
  const txt = await (await request.get(`${BASE}/robots.txt`)).text()
  expect(txt).toContain('Allow: /manuscript-guide')   // /manuscript 접두사에 걸리면 안 된다
  expect(txt).toContain('Disallow: /subscribe/success')
  expect(txt).not.toMatch(/Disallow: \/subscribe$/m)  // 가격 안내는 색인 대상
  expect(txt).toContain('Sitemap:')
})

test('학습자료 페이지에 구조화데이터와 블로그 연결이 붙어 있다', async ({ page }) => {
  for (const path of ['/spelling', '/manuscript-guide', '/exam-info']) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' })
    const html = await page.content()
    expect(html, `${path} BreadcrumbList`).toContain('"BreadcrumbList"')
    expect(html, `${path} FAQPage`).toContain('"FAQPage"')
    // 블로그가 크롤 섬이 되지 않게 주제별 글로 내려가는 링크를 유지한다.
    const blogLinks = await page.locator('a[href^="/blog/"]:not([href^="/blog/category"])').count()
    expect(blogLinks, `${path} → 블로그 글 링크`).toBeGreaterThan(0)
  }
})

test('블로그 글에서 학습자료로 돌아가는 길이 있다', async ({ page, request }) => {
  // 주제 클러스터는 양방향이어야 한다. 한쪽만 이어 두면 글이 크롤 막다른 길이 된다.
  const xml = await (await request.get(`${BASE}/sitemap.xml`)).text()
  const first = xml.match(/<loc>(https:\/\/kptest\.cloud\/blog\/[^<]+)<\/loc>/)?.[1]
  expect(first, '사이트맵에 블로그 글').toBeTruthy()

  await page.goto(first!, { waitUntil: 'domcontentloaded' })
  const selector = CONTENT_PAGES.map((p) => `a[href="${p}"]`).join(', ')
  expect(await page.locator(selector).count(), '글 → 학습자료 링크').toBeGreaterThan(0)
  // 글에도 맛보기 문제가 붙는다(글 페이지 한 곳이 39편 전부를 담당한다).
  await expect(page.getByText('읽었으면 풀어볼까요?')).toBeVisible()
})

test('없는 글·카테고리는 500이 아니라 404를 준다', async ({ request }) => {
  // 글 슬러그가 전부 한글이라, 오타·오래된 링크가 여기로 온다. 한때 한글만 500이 났다
  // (ASCII는 404) — 500은 검색엔진에 '서버 고장, 다시 오라'로 읽혀 색인에서 정리되지 않는다.
  for (const [path, label] of [
    [`/blog/${encodeURIComponent('없는글-slug')}`, '한글 글'],
    ['/blog/nonexistent-slug', 'ASCII 글'],
    [`/blog/category/${encodeURIComponent('없는카테고리')}`, '한글 카테고리'],
    ['/blog/category/nope', 'ASCII 카테고리'],
  ] as const) {
    expect((await request.get(`${BASE}${path}`)).status(), `${label} 없는 경로`).toBe(404)
  }
})

test('학습자료의 맛보기 문제가 풀리고 실전으로 이어진다', async ({ page }) => {
  // 읽고 떠나는 걸 붙잡는 유일한 장치라, 조용히 사라지면 안 된다.
  await page.goto(`${BASE}/spelling`, { waitUntil: 'domcontentloaded' })
  const quiz = page.locator('section').filter({ hasText: '읽었으면 풀어볼까요?' })
  await expect(quiz).toBeVisible()

  const options = quiz.locator('button:not([disabled])')
  const before = await options.count()
  expect(before, '선택지가 있어야 한다').toBeGreaterThan(0)

  // 한 문항을 고르면 그 문항 선택지는 잠기고 해설이 나온다.
  await options.first().click()
  await expect(quiz.locator('button:not([disabled])')).toHaveCount(before - 4)

  // 남은 문항까지 다 풀면 결과와 실전 유도가 뜬다.
  for (let i = 0; i < 6; i++) {
    const left = quiz.locator('button:not([disabled])')
    if (await left.count() === 0) break
    await left.first().click()
  }
  await expect(quiz.getByText(/문제 중 \d+문제 정답/)).toBeVisible()
  await expect(quiz.getByRole('link', { name: /무료 모의고사/ })).toBeVisible()

  // 어휘 면은 본문이 map으로 만든 12개 묶음이라, 위젯을 map 안에 넣었다.
  // 조건을 잃으면 묶음마다 하나씩 붙어 12개가 된다 — 눈에 잘 안 띄는 회귀다.
  await page.goto(`${BASE}/idioms`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('section').filter({ hasText: '읽었으면 풀어볼까요?' })).toHaveCount(1)
})

test('시험 중 화면에 정답이 실려 나가지 않는다', async ({ request }) => {
  // 로그인 없이도 확인 가능한 회귀 방지선 — 공개 HTML 어디에도 정답 필드가 없어야 한다.
  for (const path of ['/', '/blog', '/spelling']) {
    const html = await (await request.get(`${BASE}${path}`)).text()
    expect(html, `${path}에 correct_answer 노출`).not.toContain('correct_answer')
  }
})
