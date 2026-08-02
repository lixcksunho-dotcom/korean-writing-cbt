import Link from 'next/link'

// 블로그 글 → 같은 주제의 학습자료 페이지로 잇는 블록.
// 학습자료에서 글로 내려가는 길은 RelatedBlogPosts로 뚫었는데 반대 방향이 비어 있었다
// (글 36편 중 본문에서 학습자료로 링크하는 글 0편, 하단 CTA 버튼 하나가 전부였다).
// 검색으로 글에 들어온 사람을 무료 도구까지 데려가는 경로이기도 하다.
type StudyPage = { href: string; title: string; desc: string }

const BY_CATEGORY: Record<string, StudyPage[]> = {
  grammar: [
    { href: '/spelling', title: '자주 틀리는 맞춤법', desc: '되/돼·띄어쓰기 총정리' },
    { href: '/honorifics', title: '높임법 바로 쓰기', desc: '사물 존대·간접 높임 오류' },
    { href: '/standard-words', title: '표준어 바로 알기', desc: '비표준어 → 표준어' },
    { href: '/loanword-spelling', title: '외래어 표기법', desc: '초콜릿·리모컨 표기' },
  ],
  writing: [
    { href: '/manuscript-guide', title: '원고지 작성법', desc: '칸·문장부호·띄어쓰기 규정' },
    { href: '/essay-guide', title: '서술형 공략', desc: '유형별 쓰는 법과 감점 포인트' },
    { href: '/business-writing', title: '공문서·이메일 예시', desc: '실무 문서 구조와 정중 표현' },
    { href: '/word-counter', title: '글자수 세기', desc: '원고지 칸수까지 계산' },
  ],
  'exam-info': [
    { href: '/exam-info', title: '한국실용글쓰기 시험정보', desc: '일정·등급·점수 구성' },
    { href: '/kbs-korean', title: 'KBS한국어능력시험 정보', desc: '영역·등급·시험 구성' },
    { href: '/exam-compare', title: '실용글쓰기·KBS 비교', desc: '형식·배점을 비교하고 선택' },
  ],
  // 공부법·기출·사용법 글은 특정 자료로 좁히기 어려워 시험 정보와 어휘를 함께 안내한다.
  study: [
    { href: '/exam-info', title: '한국실용글쓰기 시험정보', desc: '일정·등급·점수 구성' },
    { href: '/essay-guide', title: '서술형 공략', desc: '배점이 가장 큰 구간부터' },
    { href: '/spelling', title: '자주 틀리는 맞춤법', desc: '감점 줄이는 기본기' },
    { href: '/idioms', title: '사자성어 모음', desc: '주제별 뜻 정리' },
  ],
}
BY_CATEGORY['mock-exam'] = BY_CATEGORY.study
BY_CATEGORY.guide = BY_CATEGORY['exam-info']

export default function RelatedStudyPages({ category }: { category: string }) {
  const pages = BY_CATEGORY[category] ?? BY_CATEGORY.study
  return (
    <section className="mt-12">
      <h2 className="text-xl font-black text-[#0f172a] mb-4">📚 함께 보면 좋은 자료</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        {pages.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className="block rounded-xl border border-[#e2e8f0] bg-white px-4 py-3 hover:border-[#cbd5e1] transition-colors"
          >
            <span className="block text-sm font-bold text-[#1e3a5f] leading-snug">{p.title}</span>
            <span className="block mt-1 text-xs text-[#64748b]">{p.desc}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
