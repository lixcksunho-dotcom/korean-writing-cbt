// 탈퇴 관련 상수만 — import 가 없어 브라우저 번들·node 검사 스크립트 어디서나 읽을 수 있다.
// (accountDeletion.ts 는 서비스 키 클라이언트를 물고 있어 화면 컴포넌트가 직접 import 하면 안 된다.)

/** 탈퇴 사유 보기 — 고르는 것이 필수다. 무엇이 사람을 떠나게 하는지 보기 위해서다. */
export const DELETE_REASONS = [
  '시험이 끝났어요',
  '쓸 일이 별로 없어요',
  '이용권·가격이 부담돼요',
  '문제·채점 품질이 아쉬워요',
  '다른 서비스를 써요',
  '기타',
] as const

/** 탈퇴 사유가 남는 자리(feedback.path) — 관리자 불편사항 목록에서 함께 본다. */
export const DELETE_REASON_PATH = '#account/delete-reason'

/** 탈퇴한 회원의 결제 기록을 받아 두는 시스템 계정. 로그인은 하지 않는다(무작위 비밀번호). */
export const WITHDRAWN_HOLDER_EMAIL = 'withdrawn-ledger@kptest.cloud'
