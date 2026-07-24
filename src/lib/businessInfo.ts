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
  companyName: '만물아들',
  /** 대표자명 */
  ceoName: '이선호',
  /** 사업자등록번호 (예: 123-45-67890) */
  businessNumber: '743-38-01680',
  /** 통신판매업 신고번호 */
  mailOrderNumber: '2025-울산동구-259',
  /** 사업장 주소 */
  address: '울산광역시 동구 등대5길 30, 1층 101호(방어동, 진주정)',
  /** 고객센터 이메일 */
  email: 'lyw2216@naver.com',
  /** 고객센터 전화번호 (나중에 050 안심번호로 교체 가능) */
  phone: '010-6469-4245',
  /** 개인정보 보호책임자 (미입력 시 대표자명 사용) */
  privacyOfficer: '이선호',
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
