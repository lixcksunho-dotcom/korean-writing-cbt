import Link from 'next/link'

// 블로그 글 하단 CTA.
//
// 글이 무슨 시험을 다루는지에 따라 파는 것이 달라야 한다. KBS한국어능력시험은
// **전 문항 객관식**이라 '서술형 700점을 채점해 준다'는 말이 아무 뜻이 없다.
// 그런데 KBS 글 16편이 전부 그 문구를 달고 있었고, KBS CBT를 옮겨 간 kbspass로는
// 한 편도 잇지 않았다 — 그 글을 읽은 사람에게 줄 것이 없었던 셈이다.
const KBSPASS_TRY = 'https://kbstest.cloud/try'

export type BlogCtaService = 'silyong' | 'kbs'

export default function BlogCTA({
  path = '/cbt',
  label = '실전 CBT 모의고사',
  service = 'silyong',
}: {
  path?: string
  label?: string
  service?: BlogCtaService
}) {
  const kbs = service === 'kbs'

  return (
    <div className="rounded-2xl border border-[#e2e8f0] bg-gradient-to-br from-[#0f1f3d] to-[#1e3a5f] p-6 text-center text-white">
      <p className="text-lg font-black mb-1">
        {kbs ? '넓어서 무너지는 시험입니다' : '혼자 공부하면 서술형에서 막힙니다'}
      </p>
      <p className="text-white/70 text-sm mb-5 leading-relaxed">
        {kbs ? (
          <>
            100문항을 120분에 풀어야 하고 영역이 일곱 개예요.{' '}
            <strong className="text-white">어디서 새는지 모르면 문제집을 처음부터 다시 풀게 됩니다.</strong>
            <br />
            KBS패스에서 실제 시험과 같은 구성으로 풀고 채점 즉시 영역별 약점을 확인해 보세요.
            <strong className="text-white"> 듣기 15문항은 음성이 그대로 나옵니다.</strong>
          </>
        ) : (
          <>
            선택형은 답을 맞춰 보면 되지만, <strong className="text-white">700점짜리 서술형은 채점해 줄 사람이 없어요.</strong>
            <br />
            실글패스에서 실제 시험과 같은 1,000점 구성 모의고사를 <strong className="text-white">2회분 무료</strong>로 풀어보세요.
            제출하면 즉시 채점·해설, 서술형은 AI가 첨삭해 줍니다.
          </>
        )}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {kbs ? (
          // 가입 없이 바로 풀 수 있는 자리로 보낸다 — 로그인부터 시키면 거기서 끝난다.
          <a
            href={KBSPASS_TRY}
            className="btn-gold inline-flex items-center justify-center gap-1.5 font-bold py-3 px-6 rounded-xl text-sm"
          >
            가입 없이 KBS 문제 풀어보기
          </a>
        ) : (
          <Link
            href="/cbt"
            className="btn-gold inline-flex items-center justify-center gap-1.5 font-bold py-3 px-6 rounded-xl text-sm"
          >
            무료 CBT 모의고사
          </Link>
        )}
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
