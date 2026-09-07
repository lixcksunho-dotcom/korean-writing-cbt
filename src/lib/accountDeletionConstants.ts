// 탈퇴 관련 상수만 — import 가 없어 브라우저 번들·node 검사 스크립트 어디서나 읽을 수 있다.
// (accountDeletion.ts 는 서비스 키 클라이언트를 물고 있어 화면 컴포넌트가 직접 import 하면 안 된다.)

/** 본인 탈퇴 확인 낱말 — 화면과 서버가 같은 값을 본다. */
export const DELETE_CONFIRM_WORD = '탈퇴'

/** 탈퇴한 회원의 결제 기록을 받아 두는 시스템 계정. 로그인은 하지 않는다(무작위 비밀번호). */
export const WITHDRAWN_HOLDER_EMAIL = 'withdrawn-ledger@kptest.cloud'
