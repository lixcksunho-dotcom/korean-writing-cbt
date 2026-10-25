// ============================================================================
// 사업자 정보 (PG 계약 심사 + 전자상거래법 표시의무)
//
// ⚠️ 아래 빈 값/대괄호 자리는 실제 사업자등록증·통신판매업 신고증의 값으로 채우세요.
//    이 정보가 사이트(푸터/약관)에 표시되어야 포트원 PG 계약 심사를 통과합니다.
//    값을 채우면 푸터와 이용약관/개인정보처리방침/환불정책에 자동 반영됩니다.
// ============================================================================

export const BUSINESS = {
  /** 서비스(사이트) 이름(브랜드) */
  serviceName: '실글패스',
  /** 상호(사업자등록증상 상호명) */
  companyName: '만물엄마',
  /** 대표자명 */
  ceoName: '김기정',
  /** 사업자등록번호 (예: 123-45-67890) */
  businessNumber: '749-33-01719',
  /** 통신판매업 신고번호 */
  mailOrderNumber: '2025-울산중구-0132',
  /** 사업장 주소 */
  address: '울산광역시 중구 약사로 25, 301동 503호(약사동, 래미안2차)',
  /** 고객센터 이메일 */
  email: 'lyw2216@naver.com',
  /** 고객센터 전화번호 (나중에 050 안심번호로 교체 가능) */
  phone: '010-6469-4245',
  /** 개인정보 보호책임자 (미입력 시 대표자명 사용) */
  privacyOfficer: '김기정',
  /** 사이트 도메인 */
  domain: 'https://kptest.cloud',
} as const

/** 아직 채워지지 않은 필드가 있으면 true (개발 중 콘솔 경고용) */
export const isBusinessInfoIncomplete =
  !BUSINESS.companyName ||
  !BUSINESS.ceoName ||
  !BUSINESS.businessNumber ||
  !BUSINESS.address

/** 미입력 값은 화면에 '(등록 예정)'으로 보여 깨지지 않게 한다 */
export function biz(value: string): string {
  return value && value.trim() ? value : '(등록 예정)'
}

// 만물엄마(749-33-01719) 운영 전환 중에는 신규 결제를 닫는다.
// 749 계약 승인, KPTEST 사이트 등록, 신규 채널의 사업자 일치와 기존 거래 조회/환불 경로를
// 확인한 뒤에만 paused를 해제한다. 기존 상점 ID와 서버 API/웹훅 비밀키는 유지한다.
export const CHECKOUT_MIGRATION: { paused: boolean; notice: string } = {
  paused: true,
  notice: '운영사업자 전환 및 결제 심사로 신규 결제를 잠시 중지했습니다. 기존 계정과 이용권은 그대로 이용할 수 있습니다.',
}
