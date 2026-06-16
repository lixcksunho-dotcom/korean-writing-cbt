# 결제 견고화 (Payment Hardening) 설계

작성일: 2026-06-16
대상: 한국실용글쓰기 CBT (kptest.cloud, Next.js 16 + Supabase + PortOne V2)

## 문제

현재 결제→구독 발급은 **`/subscribe/success` 서버 컴포넌트 1회 렌더에만 의존**한다.
포트원 단건조회로 결제를 검증한 뒤 Service Role로 `subscriptions`에 insert한다.

약점: 사용자가 success 페이지에 **도달·렌더 완료해야만** 구독이 발급된다.
팝업이 닫히거나, 네트워크가 끊기거나, 리다이렉트 전에 브라우저를 닫거나, 서버 렌더가
예외로 죽으면 — **결제는 PAID인데 구독은 발급되지 않고, 이를 자동 복구하는 경로가 없다.**
(실제 사고: 2026-06-12 `97leeminji@naver.com` 카드 5,500원 PAID인데 구독 미발급.)

## 목표

1. **자동 복구**: success 페이지와 무관하게, 포트원 웹훅으로 서버 간 구독 발급(실시간).
2. **수동 복구**: 이미 결제됐는데 미발급인 건을 관리자가 조회·재발급(과거 사고 + 엣지 누락).
3. **단일 진실 소스**: 검증·발급 로직을 한 함수로 모아 success/웹훅/관리자가 공유(불일치 차단).

비목표(YAGNI): 크론 폴링 reconciliation, 자동결제(구독 갱신), 이메일 영수증.

## 아키텍처

```
[브라우저 결제] ──requestPayment(customer.customerId=userId)──> 포트원
      │                                                          │
      │ 성공 리다이렉트                                           │ 결제완료 웹훅(POST, 서명)
      ▼                                                          ▼
/subscribe/success (서버컴포넌트)              /api/portone/webhook (route handler)
      │                                                          │
      └──────────────► grantSubscriptionForPayment(paymentId) ◄──┘
                                   │                      ▲
                                   ▼                      │ reconcilePayment(paymentId)
                       포트원 단건조회 검증 →             │ (서버액션, ADMIN 게이팅)
                       Service Role 멱등 insert    /admin/(protected)/payments
                       (order_id UNIQUE)
```

paymentId→user 매핑: 결제 시 `customer.customerId = userId`를 이미 전송하므로(PaymentButton),
웹훅·관리자 경로는 단건조회 응답의 `payment.customer.customerId`로 user를 해석한다. **스키마 변경 없음.**

## 컴포넌트

### 1. `src/lib/payment.ts` — 공용 검증·발급
- `PLAN_PRICE = 5500` 상수 일원화(현재 success 페이지/ PaymentButton에 산재).
- `async function fetchPortonePayment(paymentId): Payment | null` — `GET api.portone.io/payments/{id}` (PORTONE_API_SECRET).
- `async function grantSubscriptionForPayment(paymentId, opts?: { expectedUserId?: string }): GrantResult`
  - 단건조회 → 없으면 `{ ok:false, reason:'not_found' }`
  - `status !== 'PAID'` → `{ ok:false, reason:'status' }`
  - `amount.total !== PLAN_PRICE` → `{ ok:false, reason:'amount' }`
  - user_id = `payment.customer.customerId`; 비면 `{ ok:false, reason:'no_user' }`
  - `expectedUserId`가 주어졌고 user_id와 다르면 `{ ok:false, reason:'user_mismatch' }` (success 페이지 교차검증용)
  - Service Role insert(user_id, payment_key=`pgTxId??paymentId`, order_id=paymentId, amount, status:'active', expires_at=+30d)
  - `23505`(unique_violation) → `{ ok:true, alreadyGranted:true, userId }`
  - 기타 insert 에러 → `{ ok:false, reason:'save' }`
  - 성공 → `{ ok:true, alreadyGranted:false, userId, expiresAt }`
- `GrantResult` 타입 export.

### 2. `src/app/api/portone/webhook/route.ts` — POST
- `const body = await req.text()` (raw), 헤더 수집.
- `@portone/server-sdk`의 `Webhook.verify(PORTONE_WEBHOOK_SECRET, body, headers)` — 실패 시 **401**(위조/오설정 차단).
- 검증된 이벤트 `type`이 결제완료(`Transaction.Paid`)면 `data.paymentId` 추출 → `grantSubscriptionForPayment(paymentId)`.
- 결과와 무관하게(중복·이미발급 포함) **200** 반환(포트원 재시도 폭주 방지). 단 서명검증 실패만 4xx.
- 처리 로그(console)로 운영 추적. 라우트는 캐시 비활성(POST 기본).
- `PORTONE_WEBHOOK_SECRET` 미설정 시 503 + 로그(설정 누락 가시화).

### 3. `src/app/(main)/subscribe/success/page.tsx` — 리팩터
- 인증 user 확인 후 `grantSubscriptionForPayment(paymentId, { expectedUserId: user.id })` 호출.
- `ok` 면 완료 화면, 아니면 reason별 `/subscribe/fail?reason=...` 리다이렉트(기존 동작 보존).
- 사용자 경험·화면 변화 없음. 검증/발급 중복 코드 제거.

### 4. `src/app/admin/(protected)/payments/` — 관리자 복구
- 기존 admin protected 레이아웃(ADMIN_EMAILS 게이팅) 하위에 추가.
- `page.tsx`: 최근 포트원 결제목록 조회(`GET api.portone.io/payments?...` 또는 목록 API, storeId/기간 필터) →
  각 건의 발급여부(`subscriptions.order_id` 대조)와 status 표시. **미발급 PAID 건에 "재발급" 버튼.**
- paymentId 직접 입력 → "재발급" 폼(과거 건 핀포인트 복구).
- `actions.ts`: `reconcilePayment(paymentId)` 서버액션 — ADMIN 재확인 후 `grantSubscriptionForPayment` 호출, 결과 메시지 반환.

### 5. 설정(사용자 몫 — 포트원 콘솔 + 환경변수)
- 포트원 콘솔: 웹훅 URL `https://kptest.cloud/api/portone/webhook` 등록, 결제완료 이벤트 구독.
- 웹훅 시크릿 발급 → `PORTONE_WEBHOOK_SECRET`를 `.env.local` + Vercel(production)에 추가.
- 의존성 추가: `@portone/server-sdk`.

## 데이터/스키마
변경 없음. `subscriptions(user_id, payment_key, order_id UNIQUE, amount, status, started_at, expires_at)` 그대로.
멱등성은 `order_id` UNIQUE + 23505 처리로 보장(웹훅·success·관리자 어디서 와도 1건만).

## 에러 처리
- 웹훅 서명 실패 → 401. 시크릿 미설정 → 503. 발급 내부오류 → 200(재시도 무의미한 경우) + 로그.
- success 페이지 → 기존 `/subscribe/fail?reason=` 흐름 유지.
- 관리자 재발급 실패 → reason 메시지 노출.

## 테스트
- `grantSubscriptionForPayment` 단위 테스트(fetch 목): PAID 정상 / 금액불일치 / 미PAID / customerId 없음 / 중복(23505=성공) / expectedUserId 불일치.
- 웹훅 서명검증: 유효 서명 200, 위조 401, 시크릿 미설정 503.
- 수동: 포트원 콘솔 "테스트 웹훅 발송" → `subscriptions` 행 생성 확인. 관리자 페이지에서 과거 paymentId 재발급 확인.
- `next build` 통과.

## 롤아웃
1. 코드 배포(웹훅/관리자/리팩터) — 웹훅 시크릿 없으면 503이라 기존 success 경로엔 무영향.
2. 포트원 콘솔 웹훅 등록 + 시크릿 환경변수 추가 후 재배포 → 자동복구 활성.
3. 과거 미발급 건(97leeminji 등)은 관리자 페이지에서 재발급(또는 굿윌 발급, 오너 판단).
