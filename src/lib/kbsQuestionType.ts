// KBS 객관식 문항의 '기출유형'을 발문 텍스트로 분류한다.
//
// 왜 발문 기반인가: KBS 모의고사는 회차마다 같은 번호가 다른 유형을 내기도 해(예: r1 22번=다의어,
// r2 22번=속담) 번호 위치로는 유형을 알 수 없다. 반면 발문은 유형을 명시("표준 발음이 옳지 않은",
// "속담의 사용이", "고유어와 …")하므로, 발문 키워드로 분류하는 편이 견고하다.
//
// 어휘·어법 영역에서만 유형 세분이 학습에 의미가 있어 그 구간을 대상으로 한다(듣기·읽기·창안·
// 국어문화는 영역별 연습으로 충분).

export type KbsType = {
  key: string
  label: string
  /** 상위 영역(어휘/어법) */
  area: '어휘' | '어법'
}

// 세부 유형 정의 (학습 메뉴 노출 순서 = 이 순서)
export const KBS_TYPES: KbsType[] = [
  { key: 'native', label: '고유어', area: '어휘' },
  { key: 'hanja', label: '한자어', area: '어휘' },
  { key: 'idiom4', label: '한자성어', area: '어휘' },
  { key: 'proverb', label: '속담', area: '어휘' },
  { key: 'phrase', label: '관용구', area: '어휘' },
  { key: 'polyseme', label: '다의어·문맥 의미', area: '어휘' },
  { key: 'relation', label: '어휘 의미 관계', area: '어휘' },
  { key: 'refine', label: '순화어', area: '어휘' },
  { key: 'pronounce', label: '표준 발음', area: '어법' },
  { key: 'spelling', label: '맞춤법', area: '어법' },
  { key: 'sait', label: '사이시옷', area: '어법' },
  { key: 'spacing', label: '띄어쓰기', area: '어법' },
  { key: 'punct', label: '문장 부호', area: '어법' },
  { key: 'standard', label: '표준어', area: '어법' },
  { key: 'loanword', label: '외래어 표기', area: '어법' },
  { key: 'roman', label: '로마자 표기', area: '어법' },
  { key: 'honorific', label: '높임법', area: '어법' },
  { key: 'agreement', label: '문장 성분 호응', area: '어법' },
  { key: 'ambiguous', label: '중의적 표현', area: '어법' },
  { key: 'translationese', label: '번역 투', area: '어법' },
  { key: 'passive', label: '피동 표현', area: '어법' },
]

const BY_KEY = new Map(KBS_TYPES.map(t => [t.key, t]))

// 발문 키워드 → 유형 key. 위에서부터 먼저 매칭되는 규칙을 적용하므로 구체적인 것을 앞에 둔다.
const RULES: [string, string][] = [
  ['표준 발음', 'pronounce'],
  ['로마자', 'roman'],
  ['사이시옷', 'sait'],
  // '순화'를 '외래어'보다 먼저 — '외래어 순화어' 문항은 표기법이 아니라 순화 유형으로 묶어야 버킷 의미가 분명하다.
  ['순화', 'refine'],
  ['외래어', 'loanword'],
  ['띄어쓰기', 'spacing'],
  ['문장 부호', 'punct'],
  ['표준어', 'standard'],
  ['높임', 'honorific'],
  ['중의', 'ambiguous'],
  ['번역 투', 'translationese'],
  ['호응', 'agreement'],
  ['피동', 'passive'],
  ['한자성어', 'idiom4'],
  ['속담', 'proverb'],
  ['관용', 'phrase'],
  ['순화', 'refine'],
  ['의미 관계', 'relation'],
  ['상의어', 'relation'],
  ['하의어', 'relation'],
  ['바꾸어 쓸', 'polyseme'],
  ['같은 의미로 쓰인', 'polyseme'],
  ['문맥적 의미', 'polyseme'],
  ['문맥상 의미', 'polyseme'],
  ['고유어', 'native'],
  ['한자어', 'hanja'],
  ['맞춤법', 'spelling'],
  ['어법에 맞는', 'passive'], // '어법에 맞는 문장'류는 대개 이중피동을 물어 피동으로 귀속
]

/** 발문에서 세부 유형을 판정. 판정 불가면 null. */
export function classifyKbsType(question: string): KbsType | null {
  const head = (question || '').split('\n')[0]
  for (const [kw, key] of RULES) {
    if (head.includes(kw)) return BY_KEY.get(key) ?? null
  }
  return null
}

export function getKbsType(key: string): KbsType | undefined {
  return BY_KEY.get(key)
}
