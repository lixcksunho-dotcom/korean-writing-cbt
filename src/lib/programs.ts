// 다중 시험(프로그램) 설정의 단일 소스.
//
// 이 앱은 원래 한국실용글쓰기(silyong) 단일 시험 전제로 만들어졌는데,
// KBS한국어능력시험(kbs)을 같은 플랫폼에 얹기 위해 시험별로 달라지는 값
// (만점·등급컷·시험시간·영역·채점가중치·무료회차 등)을 여기 한 곳에 모은다.
//
// 원칙: 기존 silyong 값은 하드코딩돼 있던 것을 "그대로" 옮긴 것이라,
// silyong 동작은 100% 동일하게 유지된다. 신규 시험은 설정만 추가하면 된다.

export type ProgramId = 'silyong' | 'kbs'

/** 등급컷 한 줄 (min 이상이면 해당 등급). 내림차순 정렬 가정. */
export type GradeCut = { min: number; name: string; color: string }

/** 결과 영역별 약점 분석용 문항번호 구간 (객관식 기준) */
export type AreaBand = { name: string; from: number; to: number; href?: string }

export type ProgramConfig = {
  id: ProgramId
  /** 이 시험의 서비스/브랜드명 */
  serviceName: string
  /** 시험 정식 명칭 */
  examName: string
  /** 짧은 라벨 (스위처/뱃지용) */
  shortLabel: string
  /** 네비 로고 그라데이션 (tailwind bg-gradient 클래스) — 모드별 브랜드 색 */
  logoGradient: string
  /** 환산 만점 (실용글쓰기 1000, KBS 990) */
  maxScore: number
  /** 시험 시간(분) */
  examMinutes: number
  /** 무료로 열리는 회차 수 (이 회차 이하는 비구독자도 이용) */
  freeRounds: number
  /** 원고지 서술형 칸수 (실용글쓰기 20칸) */
  essayColumns: number
  /** 이 배점 이상 서술형은 원고지(보고서)로 처리 */
  manuscriptMinPoints: number
  /** 등급컷 (내림차순) */
  cuts: GradeCut[]
  /** 미달(등급 없음) 라벨 */
  belowLabel: string
  /** 대시보드 예상점수 가중치 (객관식/서술형 비중, 합=maxScore 권장) */
  weight: { objective: number; essay: number }
  /** 결과 영역별 약점 분석 밴드 */
  areas: AreaBand[]
  /** 이 시험이 오디오(듣기) 문항을 쓰는지 */
  hasListening: boolean
  /** 원고지(작문) 채점 기능이 있는지 (실용글쓰기만 true) */
  hasManuscript: boolean
}

// ── 한국실용글쓰기 (기존 하드코딩 값 그대로) ─────────────────────────
// 출처: src/lib/grade.ts(등급컷·1000점), ExamPlayer.tsx(120분·20칸·200점),
//       cbt/[examId]/result/page.tsx(영역 BANDS), dashboard(300/700), examAccess(무료2회)
const SILYONG: ProgramConfig = {
  id: 'silyong',
  serviceName: '실글패스',
  examName: '한국실용글쓰기',
  shortLabel: '실용글쓰기',
  logoGradient: 'from-[#f59e0b] to-[#d97706]',
  maxScore: 1000,
  examMinutes: 120,
  freeRounds: 2,
  essayColumns: 20,
  manuscriptMinPoints: 200,
  cuts: [
    { min: 870, name: '1급', color: 'emerald' },
    { min: 790, name: '2급', color: 'emerald' },
    { min: 710, name: '준2급', color: 'blue' },
    { min: 630, name: '3급', color: 'blue' },
    { min: 550, name: '준3급', color: 'amber' },
  ],
  belowLabel: '미달',
  weight: { objective: 300, essay: 700 },
  areas: [
    { name: '어휘·어법·어문 규정', from: 1, to: 10, href: '/practice/types' },
    { name: '글쓰기 계획·조직·고쳐쓰기', from: 11, to: 20, href: '/practice/multiple' },
    { name: '독해·자료 해석', from: 21, to: 30, href: '/practice/multiple' },
  ],
  hasListening: false,
  hasManuscript: true,
}

// ── KBS한국어능력시험 (국가공인, 990점·8단계) ────────────────────────
// ⚠️ 주관처가 절대 등급컷을 공개하지 않는다(누적 응시 데이터 기반 산정). 아래 cuts는
//    "연습용 근사치"이며, 실제 등급과 다를 수 있음을 UI에서 명시할 것.
//    영역·문항수·가중치는 공개 시험구조 기반 초기값 — 콘텐츠 확정 시 조정.
const KBS: ProgramConfig = {
  id: 'kbs',
  serviceName: '한국어패스',
  examName: 'KBS한국어능력시험',
  shortLabel: 'KBS한국어',
  logoGradient: 'from-emerald-500 to-teal-600',
  maxScore: 990,
  // 실제 시행 시간 120분(듣기 25분 + 나머지 95분). 출처: KBS한국어진흥원 시행 안내.
  examMinutes: 120,
  freeRounds: 1,
  essayColumns: 20,
  manuscriptMinPoints: 100,
  // 연습용 근사 등급컷(990점 환산). 실제 상대평가와 다름 → "예상 등급"으로 표기.
  cuts: [
    { min: 830, name: '1급', color: 'emerald' },
    { min: 780, name: '2⁺급', color: 'emerald' },
    { min: 730, name: '2⁻급', color: 'blue' },
    { min: 680, name: '3⁺급', color: 'blue' },
    { min: 630, name: '3⁻급', color: 'amber' },
    { min: 580, name: '4⁺급', color: 'amber' },
    { min: 530, name: '4⁻급', color: 'slate' },
  ],
  belowLabel: '무급',
  weight: { objective: 900, essay: 90 },
  // 실제 교재(2026 김영북스) 구조 반영 — 100문항 7영역.
  // 듣기·말하기는 시험에선 오디오지만 교재/CBT에선 지문(대본)으로 출제 가능 → 오디오 플레이어 불필요.
  areas: [
    { name: '듣기·말하기', from: 1, to: 15 },
    { name: '어휘', from: 16, to: 30 },
    { name: '어법', from: 31, to: 45 },
    { name: '쓰기', from: 46, to: 50 },
    { name: '창안', from: 51, to: 60 },
    { name: '읽기', from: 61, to: 90 },
    { name: '국어문화', from: 91, to: 100 },
  ],
  hasListening: false,
  hasManuscript: false,
}

export const PROGRAMS: Record<ProgramId, ProgramConfig> = {
  silyong: SILYONG,
  kbs: KBS,
}

/** 기본(레거시) 프로그램 — 시험 구분 없이 호출되던 기존 코드용 */
export const DEFAULT_PROGRAM: ProgramId = 'silyong'

export function isProgramId(v: string): v is ProgramId {
  return v === 'silyong' || v === 'kbs'
}

/** 프로그램 설정 조회 (미지정/미상 시 기본 프로그램) */
export function getProgram(id?: string | null): ProgramConfig {
  if (id && isProgramId(id)) return PROGRAMS[id]
  return PROGRAMS[DEFAULT_PROGRAM]
}
