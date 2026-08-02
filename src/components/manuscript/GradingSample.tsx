import { CheckCircle2, ChevronDown } from 'lucide-react'

// 원고지 첨삭 페이지에 32명이 도달했는데 실제로 채점을 받은 건 3명이었다.
// 발견성 문제가 아니라 요구가 큰 것이다 — 논술형 대주제에 빈 400칸 원고지를,
// 그것도 대부분 휴대폰에서. 게다가 '무엇을 받는지'를 안 보여주니 그 수고를 들일지
// 판단할 근거가 없었다. 그래서 쓰기 전에 결과물을 먼저 보여준다.
//
// 정적 데이터다(API 호출 없음). 실제 채점 결과가 아니라 예시임을 화면에 명시한다.
const SAMPLE_TOPIC = '디지털 기기 과의존 현상의 문제점과 해결 방안을 쓰시오.'

const SAMPLE_ANSWER =
  '요즘 사람들은 스마트폰을 너무 많이 사용한다. 지하철에서도 대부분에 사람들이 ' +
  '화면만 보고있다. 이런 현상은 여러가지 문제를 일으킨다. 첫째, 집중력이 떨어진다. ' +
  '둘째, 가족간 대화가 줄어든다. 따라서 우리는 사용 시간을 정해 놓고 지켜야한다. ' +
  '학교와 회사에서도 캠페인을 벌리면 좋을것 같다.'

const BREAKDOWN = [
  {
    label: '원고지 사용법',
    score: 22,
    max: 30,
    color: 'bg-purple-500',
    feedback: '첫 칸 들여쓰기는 지켰지만 단락을 나누지 않아 문제점과 해결 방안이 한 덩어리로 붙었습니다.',
  },
  {
    label: '실용글쓰기 답안 기준 부합',
    score: 32,
    max: 40,
    color: 'bg-emerald-500',
    feedback: '문제점과 해결 방안을 모두 제시해 조건은 충족했습니다. 다만 해결 방안이 누가 무엇을 하는지 구체적이지 않습니다.',
  },
  {
    label: '맞춤법·어법',
    score: 22,
    max: 30,
    color: 'bg-blue-500',
    feedback: '조사와 띄어쓰기에서 감점이 있었습니다. 특히 보조 용언과 의존 명사 띄어쓰기를 확인하세요.',
  },
]

const CORRECTIONS = [
  { original: '대부분에 사람들', correction: '대부분의 사람들', reason: "'대부분'에 붙는 관형격 조사는 '의'입니다." },
  { original: '보고있다', correction: '보고 있다', reason: '보조 용언 「있다」는 앞말과 띄어 쓰는 것이 원칙입니다.' },
  { original: '여러가지', correction: '여러 가지', reason: "'여러'는 관형사, '가지'는 의존 명사라 띄어 씁니다." },
  { original: '가족간', correction: '가족 간', reason: "'간'이 '사이'를 뜻할 때는 의존 명사라 띄어 씁니다." },
  { original: '지켜야한다', correction: '지켜야 한다', reason: '보조 용언 「하다」도 앞말과 띄어 씁니다.' },
  { original: '캠페인을 벌리면', correction: '캠페인을 벌이면', reason: "일을 시작한다는 뜻은 '벌이다'입니다('벌리다'는 사이를 넓히는 것)." },
]

const TOTAL = BREAKDOWN.reduce((sum, b) => sum + b.score, 0)

export default function GradingSample() {
  return (
    <details className="group mb-5 rounded-2xl border border-[#e2e8f0] bg-white overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 hover:bg-[#f8fafc] transition-colors">
        <div>
          <p className="text-sm font-bold text-[#0f172a]">어떤 첨삭을 받게 되나요?</p>
          <p className="mt-0.5 text-xs text-[#64748b]">쓰기 전에 채점 결과 예시를 먼저 확인해 보세요</p>
        </div>
        <ChevronDown className="h-5 w-5 shrink-0 text-[#64748b] transition-transform group-open:rotate-180" />
      </summary>

      <div className="border-t border-[#e2e8f0] px-5 py-5">
        <p className="mb-4 rounded-lg bg-[#f1f5f9] px-3 py-2 text-xs text-[#64748b]">
          아래는 이해를 돕기 위한 <b className="text-[#334155]">예시</b>입니다. 실제 채점은 직접 쓴 글로 이뤄집니다.
        </p>

        <p className="text-xs font-semibold text-[#64748b]">주제</p>
        <p className="mb-3 text-sm text-[#334155]">{SAMPLE_TOPIC}</p>

        <p className="text-xs font-semibold text-[#64748b]">제출한 글</p>
        <p className="mb-5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-sm leading-relaxed text-[#475569]">
          {SAMPLE_ANSWER}
        </p>

        <div className="mb-4 rounded-xl bg-gradient-to-br from-[#1e3a5f] to-[#2d5488] px-5 py-4 text-center text-white">
          <div className="text-3xl font-black">{TOTAL}점</div>
          <div className="text-xs text-white/70">/ 100점</div>
        </div>

        <div className="mb-5 space-y-3">
          {BREAKDOWN.map((b) => (
            <div key={b.label}>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="text-sm font-bold text-[#0f172a]">{b.label}</span>
                <span className="shrink-0 text-sm text-[#64748b]">{b.score}/{b.max}</span>
              </div>
              <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-[#e2e8f0]">
                <div className={`h-full rounded-full ${b.color}`} style={{ width: `${(b.score / b.max) * 100}%` }} />
              </div>
              <p className="text-xs leading-relaxed text-[#64748b]">{b.feedback}</p>
            </div>
          ))}
        </div>

        <p className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-relaxed text-blue-800">
          조건은 모두 건드렸고 문장도 짧고 명확합니다. 점수를 올리려면 두 가지입니다.
          문제점과 해결 방안을 단락으로 나누고, 해결 방안을 &lsquo;누가 무엇을 언제&rsquo;까지 적어 보세요.
        </p>

        <p className="mb-2 text-sm font-bold text-[#0f172a]">교정 사항 ({CORRECTIONS.length}건)</p>
        <div className="space-y-2">
          {CORRECTIONS.map((c) => (
            <div key={c.original} className="rounded-xl border border-[#e2e8f0] px-4 py-2.5">
              <p className="text-sm">
                <span className="text-[#ef4444] line-through">{c.original}</span>
                <span className="mx-1.5 text-[#64748b]">→</span>
                <span className="font-bold text-emerald-600">{c.correction}</span>
              </p>
              <p className="mt-0.5 text-xs text-[#64748b]">{c.reason}</p>
            </div>
          ))}
        </div>

        <p className="mt-4 flex items-center gap-1.5 text-xs text-[#64748b]">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
          실제 채점은 50자만 써도 받을 수 있습니다. 400자를 다 채우지 않아도 됩니다.
        </p>
      </div>
    </details>
  )
}
