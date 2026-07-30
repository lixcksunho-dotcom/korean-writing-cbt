// 블로그 글 로더. 글 데이터는 빌드 시점에 src/content/blog/*.json 에서 읽는다.
// (kptest 홍보 블로그를 워드프레스에서 자체 도메인 kptest.cloud/blog 로 옮김 — 2026-07-27)
//
// 발행 파이프라인(C:\stock-blog-bot)이 새 글 JSON을 이 폴더에 떨어뜨리고 배포하면 글이 늘어난다.
import fs from 'node:fs'
import path from 'node:path'

export type BlogPost = {
  slug: string
  title: string
  excerpt: string
  category: string
  categoryLabel: string
  date: string
  tags: string[]
  ctaPath: string
  ctaLabel: string
  body: string
}

export type Category = {
  slug: string
  label: string
  blurb: string
  icon: string       // 이모지 — 카드·헤더 시각 요소
  from: string       // 그라디언트 시작(hex)
  to: string         // 그라디언트 끝(hex)
  tint: string       // 옅은 배경(뱃지·칩)
  ink: string        // 뱃지 글자색
}

// 카테고리 정의(순서 = 블로그 인덱스 노출 순서). slug 는 export 스크립트의 CAT_SLUG 와 일치해야 한다.
// 각 카테고리에 색·아이콘을 줘서 글마다 색깔 있는 헤더·카드로 시각적 생기를 준다.
export const CATEGORIES: Category[] = [
  { slug: 'exam-info', label: '시험 정보', blurb: '일정·등급·점수 구성 등 시험 자체 정보',
    icon: '📋', from: '#1e3a5f', to: '#3d6aa0', tint: '#e8eef6', ink: '#1e3a5f' },
  { slug: 'study', label: '공부법·로드맵', blurb: '기간별 공부 순서와 전략',
    icon: '🎯', from: '#0f766e', to: '#14b8a6', tint: '#d7f2ee', ink: '#0f766e' },
  { slug: 'grammar', label: '맞춤법·어법', blurb: '자주 틀리는 맞춤법·띄어쓰기·외래어·높임법',
    icon: '✏️', from: '#b45309', to: '#f59e0b', tint: '#fdf0d9', ink: '#b45309' },
  { slug: 'writing', label: '서술형·원고지', blurb: '서술형 700점·원고지·공문서 작성법',
    icon: '📝', from: '#6d28d9', to: '#a78bfa', tint: '#eee7fb', ink: '#6d28d9' },
  { slug: 'mock-exam', label: '기출·모의고사', blurb: '출제 유형 분석과 문제 풀이',
    icon: '📊', from: '#be123c', to: '#fb7185', tint: '#fde3e8', ink: '#be123c' },
  { slug: 'guide', label: '실글패스 사용법', blurb: '실글패스 기능과 활용법',
    icon: '💡', from: '#334155', to: '#64748b', tint: '#e9edf2', ink: '#334155' },
]

const FALLBACK_CAT: Category = CATEGORIES[0]

export function catTheme(slug: string): Category {
  return CATEGORIES.find((c) => c.slug === slug) ?? FALLBACK_CAT
}

const BLOG_DIR = path.join(process.cwd(), 'src', 'content', 'blog')

// 한글 슬러그는 파일시스템·URL·라우트 파라미터를 오가며 유니코드 정규화형(NFC/NFD)이
// 어긋나면 문자열 비교가 실패한다(빌드는 통과하는데 렌더 시 getPost가 못 찾아 notFound).
// 저장·조회 양쪽을 NFC로 통일해 이 함정을 없앤다.
function norm(s: string): string {
  let v = s
  if (v.includes('%')) {
    try {
      v = decodeURIComponent(v)
    } catch {
      /* 이미 디코드된 값 */
    }
  }
  return v.normalize('NFC')
}

function readAll(): BlogPost[] {
  let files: string[] = []
  try {
    files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.json'))
  } catch {
    return []
  }
  const posts = files.map((f) => {
    const raw = fs.readFileSync(path.join(BLOG_DIR, f), 'utf-8')
    const p = JSON.parse(raw) as BlogPost
    p.slug = norm(p.slug)
    return p
  })
  // 최신순(날짜 내림차순, 동일 날짜는 제목 안정 정렬)
  posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.title.localeCompare(b.title)))
  return posts
}

export function getAllPosts(): BlogPost[] {
  return readAll()
}

export function getPost(slug: string): BlogPost | null {
  const target = norm(slug)
  return readAll().find((p) => p.slug === target) ?? null
}

export function getPostsByCategory(category: string): BlogPost[] {
  return readAll().filter((p) => p.category === category)
}

export function getCategory(slug: string): Category | null {
  return CATEGORIES.find((c) => c.slug === slug) ?? null
}

/** 같은 카테고리 우선, 부족하면 최신글로 채워 관련글 N개 */
export function getRelated(post: BlogPost, n = 4): BlogPost[] {
  const all = readAll().filter((p) => p.slug !== post.slug)
  const same = all.filter((p) => p.category === post.category)
  const rest = all.filter((p) => p.category !== post.category)
  return [...same, ...rest].slice(0, n)
}

/** 'YYYY-MM-DD' → '2026년 7월 24일' */
export function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return iso
  return `${m[1]}년 ${Number(m[2])}월 ${Number(m[3])}일`
}
