// 시험(프로그램) 설정의 단일 소스.
//
// 한때 KBS한국어능력시험을 같은 플랫폼에 얹었다가, 별도 서비스(kbstest.cloud)로
// 완전히 이전했다(2026-08-31). 이 구조는 남겨 둔다 — 시험별로 달라지는 값
// (만점·등급컷·시험시간·영역·가중치·무료회차)이 한 곳에 모여 있어야
// 화면 코드가 시험을 하드코딩하지 않는다.

export type ProgramId = 'silyong'

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

export const PROGRAMS: Record<ProgramId, ProgramConfig> = {
  silyong: SILYONG,
}

/** 기본(레거시) 프로그램 — 시험 구분 없이 호출되던 기존 코드용 */
export const DEFAULT_PROGRAM: ProgramId = 'silyong'

export function isProgramId(v: string): v is ProgramId {
  return v === 'silyong'
}

/** 프로그램 설정 조회 (미지정/미상 시 기본 프로그램) */
export function getProgram(id?: string | null): ProgramConfig {
  if (id && isProgramId(id)) return PROGRAMS[id]
  return PROGRAMS[DEFAULT_PROGRAM]
}
