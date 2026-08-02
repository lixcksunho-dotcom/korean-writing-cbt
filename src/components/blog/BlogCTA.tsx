import Link from 'next/link'

// 블로그 글 하단 CTA. 같은 도메인이라 실제 기능(모의고사·연습)으로 바로 보낸다.
export default function BlogCTA({
  path = '/cbt',
  label = '실전 CBT 모의고사',
}: {
  path?: string
  label?: string
}) {
  return (
    <div className="rounded-2xl border border-[#e2e8f0] bg-gradient-to-br from-[#0f1f3d] to-[#1e3a5f] p-6 text-center text-white">
      <p className="text-lg font-black mb-1">혼자 공부하면 서술형에서 막힙니다</p>
      <p className="text-white/70 text-sm mb-5 leading-relaxed">
        선택형은 답을 맞춰 보면 되지만, <strong className="text-white">700점짜리 서술형은 채점해 줄 사람이 없어요.</strong>
        <br />
        실글패스에서 실제 시험과 같은 1,000점 구성 모의고사를 <strong className="text-white">2회분 무료</strong>로 풀어보세요.
        제출하면 즉시 채점·해설, 서술형은 AI가 첨삭해 줍니다.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/cbt"
          className="btn-gold inline-flex items-center justify-center gap-1.5 font-bold py-3 px-6 rounded-xl text-sm"
        >
          무료 CBT 모의고사
        </Link>
        <Link
          href={path}
          className="inline-flex items-center justify-center gap-1.5 font-bold py-3 px-6 rounded-xl text-sm bg-white/10 text-white border border-white/20 hover:bg-white/15 transition-colors"
        >
          {label} →
        </Link>
      </div>
    </div>
  )
}
