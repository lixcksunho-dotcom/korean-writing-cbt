# REPORT

## 8/27 결제 1건이 순매출 0원인 경위 조사 (work/same-day-refund-trace)

### 검수 통과 (리뷰어)

- diff 재확인: `REPORT.md`·`package.json`(스크립트 1줄)·`scripts/same_day_refund_trace.mjs`(신규) 3건뿐. `src/`·DB·배포 변경 없음.
- 스크립트 실물 확인: 호출은 `client.payment.getPayments` 조회 1건뿐 — 취소·환불·쓰기 계열 호출 없음(grep 확인).
- `npm run trace:refund` 재실행 → 출력이 REPORT 인용 블록과 완전히 일치(결제 4분 만에 전액 취소, 사유 "관리자페이지취소", 미완결 3건).
- 고객 식별자가 앞 8자(`5d5196b0`)만 출력됨을 확인, `.env.local` 값 미노출.
- BACKLOG 요구사항(판정 근거 나열, 애매한 배경은 단정 대신 근거 병기) 충족.
- main에 fast-forward 병합, BACKLOG 항목 `[x]` 처리, work 브랜치 삭제 완료.

- 날짜: 2026-08-27
- 백로그: "8/27 결제 1건이 순매출 0원인 경위 조사 `scripts/same_day_refund_trace.mjs`"
- 범위: **조회 전용.** 포트원 `getPayments` 조회만 호출 — 취소·환불 실행 없음. 고객 식별자는 id 앞 8자만 출력.

### 판정 — ① 당일 결제 → 당일 전액 취소 (즉시 환불). 집계 버그 아님.

```
2026-08-27 (KST) 순매출 0원 경위 추적 — 포트원 원장 기준
  매출 5,500원 − 취소 5,500원 = 순매출 0원  (daily_revenue 와 같은 기준)

결제 sub-87f5fe56-387e-482d-9617-e4f1a618bc05  고객 5d5196b0  5,500원  status=CANCELLED
  결제창 열림 2026-08-27 21:23:23 KST  →  결제 승인 2026-08-27 21:23:42 KST
  취소 2026-08-27 21:27:49 KST  5,500원  사유: 관리자페이지취소
  판정: 당일 결제 → 당일 전액 취소 (결제 후 4분 만에 취소)

참고: 대상일에 완결 못 간 건 3건 (READY/FAILED — 매출 집계 미포함이 정상)
  sub-e9e79a0a-…  status=FAILED  사유: 사용자가 결제를 취소하였습니다
  sub-2c209a53-…  status=READY
  sub-2676b753-…  status=READY
```

- **경위**: 21:23:42 결제 승인 → 4분 뒤 21:27:49 전액 취소. 취소 사유가 포트원 기록상 **"관리자페이지취소"** — 고객 요청 환불이 아니라 **운영자가 포트원 콘솔에서 직접 취소**한 건이다. 부분취소 아님(전액 5,500원), 결제 실패의 오집계 아님(그날 FAILED 1·READY 2건은 집계에 안 들어갔고, 들어간 1건은 실제 승인 건).
- **집계 버그 배제 근거**: `daily_revenue.mjs` 는 paidAt 기준 매출 5,500원 − cancelledAt 기준 취소 5,500원 = 0원, 결제 1건으로 셌다 — 원장 실물과 정확히 일치하므로 집계는 정상이다.
- **배경(단정 아님, 근거 병기)**: 취소된 결제의 고객 id 앞 8자(`5d5196b0`)가, 앞선 무결성 검증에서 나온 **6/1부터 active인 구 형식 구독(order=sub_a336, 5,000원)의 사용자와 동일**하다. 이미 구독 중인 사용자가 8/27에 다시 결제해 운영자가 중복 결제로 보고 환불했을 가능성이 있다. 다만 앞 8자 일치는 동일인의 강한 정황이지 증명은 아니며, 실제 취소 사유는 콘솔에서 취소한 운영자(사람)만 안다.

### 지시문과 달랐던 점

- 없음 — 전제("daily_revenue 가 8/27을 0원 1건으로 냄")를 실행으로 대조해 정확함을 확인했다(`{"date":"2026-08-27","gross":5500,"cancelled":5500,"net":0,"count":1}`).

### 변경 파일

- `scripts/same_day_refund_trace.mjs` (신규)
- `package.json` (`trace:refund` 1줄 추가)
- `REPORT.md` (본 절)

### 테스트 방법과 실제 실행 결과

- 방법: `npm run trace:refund` (기본 2026-08-27), `npm run trace:refund -- --date YYYY-MM-DD`, `--json`
- 8/27 실행: 위 인용 블록 그대로 출력.
- 다른 날짜 경로 검증(실제 실행):
  - `--date 2026-06-12` (과거의 당일환불 건): "당일 결제 → 당일 전액 취소 (305분 만에 취소), 사유: 관리자페이지취소" — 기존 무결성 리포트의 `sub-44e3…` 건과 일치.
  - `--date 2026-08-25` (정상 결제일): "정상 결제(취소 없음)", 순매출 5,500원.
  - `--json`: 파싱 검증 통과 (`json ok: 2026-08-27 0 당일 결제 → 당일 전액 취소`).
- `.env.local` 값 미노출, 고객 식별자는 앞 8자만 출력됨을 위 출력에서 확인.

## 무료 발급과 유료 결제 분리 검증 (work/revenue-integrity-check)

**검수 통과.**

- diff는 `REPORT.md`·`package.json`(스크립트 1줄)·`scripts/revenue_integrity_check.mjs`(신규) 3건뿐. `src/`·DB·배포 변경 없음.
- `getPayments`는 SDK 상 조회 전용 메서드(`node_modules/@portone/server-sdk/dist/generated/payment/client.d.ts`)이며, 스크립트에 쓰기·삭제·환불 호출 없음을 확인.
- `npm run check:revenue` 재실행 결과가 REPORT 인용 블록과 정확히 일치(불일치 4건, exit 1). 재실행 후 `git status`로 추가 변경 없음 확인, `.env.local` 값 미노출.
- BACKLOG 요구사항(무료/유료 카운트, 원장 대조, 불일치 목록/일치 시 "일치"만 출력, id 앞 8자만) 충족.
- main에 fast-forward 병합, BACKLOG 3번 항목 `[x]` 처리, work 브랜치 삭제 완료.

- 날짜: 2026-08-24
- 백로그: "무료 발급과 유료 결제 분리 검증 `scripts/revenue_integrity_check.mjs`"
- 범위: **읽기 전용.** DB 쓰기·삭제 없음, 포트원은 조회 API만. 이메일 등 개인정보 미출력, id는 앞 8자만.

### 작업 요약

`scripts/revenue_integrity_check.mjs` 를 새로 만들었다. `subscriptions` 를 무료(amount=0)/유료(amount>0)로 나눠 세고, 같은 기간(기본 2026-01-01~오늘, `--from` 으로 변경 가능) 포트원 원장 결제건(READY·FAILED 제외)과 `order_id ↔ 결제 id` 로 전건 대조한다. 어긋남은 ①유료 구독인데 원장에 결제 없음 ②원장 결제인데 구독 행 없음 ③무료로 기록됐는데 원장에 결제 있음 — 세 방향 모두 본다. 불일치 0건이면 "일치 ✓"만 출력하고, 있으면 목록 출력 후 exit 1. `package.json` 에 `check:revenue` 추가.

### 검증 결과 — 불일치 4건 발견 (실제 실행 출력)

```
subscriptions: 15행 = 무료 발급 1건 + 유료 14건
포트원 원장:   결제 14건 (전체 48건 중 READY·FAILED 제외)

× 유료 구독인데 원장에 결제가 없음 2건
    sub=b6fce93d user=5d5196b0 order=sub_a336 5000원 active 2026-06-01
    sub=1f1fe679 user=845543fc order=demo-pro 5500원 active 2026-06-21
× 원장에 결제가 있는데 구독 행이 없음 2건 — 발급 누락 가능성
    payment=sub-44e3 5500원 CANCELLED 2026-06-12
    payment=sub-c0ba 5500원 CANCELLED 2026-06-11
```

스크립트 출력을 수동 대조로 검산했다: 유료 구독 14건 중 12건은 원장과 정확히 대응(환불건 `sub-7eaf` 포함), 위 4건만 남는다 — 스크립트 오류가 아니라 실제 데이터 어긋남이다.

각 건의 배경(추가 조사, 읽기 전용):

- `order=sub_a336…` (5000원, 6/1): order_id가 옛 `sub_` 형식이고 금액도 현 정가(5,500원)와 다른 5,000원. 포트원 원장 전체 48건 어디에도 없다 — 현 포트원 V2 연동 이전의 행으로 보인다. **이 행이 남아 있는 한 subscriptions 기준 매출 집계는 5,000원 과대 계상된다**(원장 기준 집계는 무관).
- `order=demo-pro…`(`demo-promo`, 5500원, 6/21): 데모용 행인데 amount가 0이 아닌 5,500원이라 유료로 분류된다. 무료 발급 취지라면 amount=0이어야 맞다.
- `payment=sub-44e3` (6/12 결제→당일 환불): 이 고객의 유료 구독 행은 없고, 대신 6/16에 `goodwill-…` 무료 발급(amount=0)이 있다 — 환불 후 보상 발급으로 이어진 흐름. 돈은 환불로 순액 0이라 매출 영향은 없지만, 원장↔DB 대응은 끊겨 있다.
- `payment=sub-c0ba` (6/11 00:30 결제→00:31 환불): 1분 만에 환불된 건. 구독 행이 아예 없다(발급 전에 환불됐거나 이후 정리됨). 매출 영향 없음.

정리: **매출에 실제로 영향을 주는 건 `sub_a336`(+5,000원 과대) 하나**이고, 나머지는 원장↔DB 대응 끊김(매출 영향 없음)이다. 데이터 수정은 사용자 데이터 일괄 수정에 해당하므로 하지 않았다 — 사람이 판단할 일.

### 지시문과 달랐던 점

- 무료 발급의 order_id 형식이 `admin-grant-…` 외에 `goodwill-…` 도 실존한다. 분류는 지시문대로 amount=0 기준이라 결과에는 영향 없다.
- 지시문의 대조 단위인 "결제 건수"만 비교하면 12↔12로 우연히 맞아 보일 수 있어, 건수 비교 대신 `order_id ↔ 결제 id` 전건 대응으로 대조했다(건수는 참고로 함께 출력).

### 변경 파일

- `scripts/revenue_integrity_check.mjs` (신규)
- `package.json` (`check:revenue` 1줄 추가)
- `REPORT.md` (본 절)

### 테스트 방법과 실제 실행 결과

- 방법: `npm run check:revenue` (기간 변경: `npm run check:revenue -- --from 2026-06-01`)
- 실제 실행 결과: 위 인용 블록 그대로 출력, 불일치 4건이므로 exit 1. `.env.local` 값 미노출 확인.
- 검산: subscriptions 15행(무료 1·유료 14)과 원장 14건을 각각 원본 조회로 나열해 수동 대조 — 스크립트의 대응/불일치 판정과 완전 일치.
- `git status` 확인: 변경은 위 3개 파일뿐, `src/`·DB 무변경.

## 간편결제 경로 진단 리포트 (work/payment-method-diagnose)

- 날짜: 2026-08-24
- 백로그: "간편결제 경로 진단 리포트 `scripts/payment_method_diagnose.mjs`"
- 범위: **읽기와 문서화만.** 결제 코드는 한 줄도 수정하지 않았고, 포트원 API 호출·실제 결제 테스트 없음.

### 작업 요약

`scripts/payment_method_diagnose.mjs` 를 새로 만들었다. `src/` 에서 PortOne `requestPayment` 호출부를 찾아 payMethod·easyPayProvider·화면 버튼 상태를 추출하고, 설치된 `@portone/browser-sdk` 타입 파일에서 easyPay 규격을 실물 대조해 표로 출력한다. 읽기 전용이며 네트워크 호출이 없다.

### 지시문과 달랐던 점

지시문은 간편결제가 **"눌리는데 안 되는" 형태로 조용히 실패 중**이라고 전제했지만, 실물은 이미 커밋 `927b498`("열리지 않는 간편결제 버튼을 내린다")에서 간편결제·카카오페이 버튼을 '준비중' 표시로 바꿔 결제창을 아예 열지 않는 상태다. 지금은 누르면 "준비 중입니다. 카드 결제로 이용해 주세요" 안내가 뜨고 `method_unavailable` 이벤트로 수요만 집계한다. 즉 **조용한 실패는 해소됐고, 남은 문제는 "간편결제를 실제로 여는 것"**이다. 진단은 그 기준으로 진행했다.

### 진단 결과 (스크립트 실제 출력)

#### ① requestPayment 호출부 — 현재 열려 있는 payMethod

| 파일 | payMethod | easyPayProvider | easyPay 객체 |
|---|---|---|---|
| src/components/subscribe/PaymentButton.tsx:102 | CARD | 지정 안 함 | 없음 |

호출부는 이 한 곳뿐이다. `portoneMethodParams()`(같은 파일 36행)가 `{ payMethod: 'CARD' }` 를 고정 반환한다.

#### ② 화면에 보이는 결제수단 버튼

| key | 라벨 | 상태 |
|---|---|---|
| card | 카드 결제 | 결제창 엶 |
| easypay | 간편결제 | 준비중(결제창 안 엶) |
| kakaopay | 카카오페이 | 준비중(결제창 안 엶) |

#### ③ 이니시스 V2에서 카카오페이·네이버페이가 뜨려면

| 조건 | 현재 상태 | 필요한 것 |
|---|---|---|
| `payMethod: 'EASY_PAY'` 로 호출 | CARD만 호출 | 간편결제 버튼이 payMethod를 EASY_PAY로 바꿔 호출 |
| `easyPay.easyPayProvider` 지정 | 지정 없음 | 이니시스 V2는 간편결제사 필수 — 미지정 시 400 ("간편 결제 수단은 필수 입력입니다", 8/16·8/18 실패 7건의 원인) |
| 이니시스 계약에 해당 간편결제사 개통 | 코드로 확인 불가 | KG이니시스 상점 계약에 카카오페이/네이버페이가 열려 있는지 **사람이 포트원 콘솔·이니시스 계약에서 확인** |

SDK 실물 대조: 설치된 `@portone/browser-sdk` v2에 `PaymentRequestUnionEasyPay.easyPayProvider` 파라미터가 존재하고, provider enum에 `KAKAOPAY`·`NAVERPAY`·`TOSSPAY` 모두 있다. 즉 SDK는 준비돼 있고, 막힌 곳은 ①호출 파라미터 ②계약 개통 확인 두 가지다.

### 수정안 (diff 예시 — 적용하지 않음, NEED_HUMAN 대상)

계약 개통이 확인된 간편결제사부터 버튼별로 하나씩 여는 방식. `PaymentButton.tsx` 기준:

```diff
-type Method = 'card'
+type Method = 'card' | 'kakaopay'
 type MethodKey = Method | 'easypay' | 'kakaopay'

-function portoneMethodParams() {
-  return { payMethod: 'CARD' } as const
-}
+function portoneMethodParams(method: Method) {
+  if (method === 'kakaopay') {
+    return { payMethod: 'EASY_PAY', easyPay: { easyPayProvider: 'KAKAOPAY' } } as const
+  }
+  return { payMethod: 'CARD' } as const
+}
```

- 호출부는 `...portoneMethodParams(method)` 로 바꾸고, METHODS의 kakaopay 항목에서 `soon: true` 를 제거한다.
- 네이버페이는 같은 패턴으로 `easyPayProvider: 'NAVERPAY'` 버튼을 추가.
- **선행 조건(사람)**: KG이니시스 계약에 해당 간편결제사가 개통돼 있는지 확인. 미개통 상태로 열면 8월의 "7번 눌러 7번 튕김"이 재현된다.
- 적용·실결제 테스트는 결제 코드 변경이므로 CLAUDE.md 규칙상 사람 판단 대상.

### 변경 파일

- `scripts/payment_method_diagnose.mjs` (신규)
- `REPORT.md` (신규)

### 테스트 방법과 실제 실행 결과

- 방법: `node scripts/payment_method_diagnose.mjs` (옵션 `--json`)
- 실제 실행 결과: 위 ①②③ 표가 그대로 출력됨. 초기 버전은 주석 속 과거 사고 기록의 `'EASY_PAY'`·`'KAKAOPAY'` 문자열을 실제 코드 값으로 오인해 표가 틀리게 나왔고, 주석 제거 후 분석하도록 고쳐 재실행해 실물(코드 102행 호출부는 CARD만)과 일치함을 확인했다. `--json` 출력도 동일 내용으로 정상 동작.
- 결제 코드(`src/`) diff 없음: `git status` 로 확인 — 변경은 `scripts/`와 `REPORT.md`뿐.

### 검수 통과 (리뷰어)

- 커밋 `e32d666` diff 재확인: `REPORT.md`·`scripts/payment_method_diagnose.mjs` 신규 2건뿐, `src/` diff 0줄, `package.json`·포트원 API 호출 없음.
- `node scripts/payment_method_diagnose.mjs` 재실행 → REPORT의 세 표와 출력 동일 확인.
- `src/components/subscribe/PaymentButton.tsx` 실물 대조: 102행 `requestPayment` 호출 1곳뿐, 36행 `portoneMethodParams()`가 `{ payMethod: 'CARD' }` 고정 반환 — 리포트 기술과 일치.
- 수정안은 diff 예시로만 제시되고 미적용 — NEED_HUMAN 대상 유지 확인.
- main에 fast-forward 병합. (local main이 origin/main보다 뒤처져 있었을 뿐 분기는 아님 — `origin/main` 이 옛 local main의 ancestor였고, 이번 병합으로 origin 대비 3커밋(지원 창구, 자율 루프, 본 진단 리포트) 앞섬. origin push는 아직 안 함.)

## 결제 퍼널 일일 요약 (work/payment-funnel-daily)

- 날짜: 2026-08-24
- 백로그: "결제 퍼널 일일 요약 `scripts/payment_funnel_daily.mjs`"
- 범위: 포트원 조회 API(무료)만 사용. 새 테이블·스케줄 등록·알림 전송 없음. 기존 리포트 스크립트 무수정.

### 작업 요약

`scripts/payment_funnel_daily.mjs` 를 새로 만들었다. 어제 하루(KST 00:00~24:00)의 포트원 결제건을 조회해 **진입(결제창 열림, READY 포함) → 시도(READY 를 넘어간 건) → 완결**을 건/사람 단위로 세고 마지막에 한 줄 요약을 stdout 에 낸다. 완결 판정과 사람 묶음 규칙은 기존 `summarizeAttempts`(`src/lib/paymentAttemptFunnel.ts`)를 import 해 그대로 재사용했고, '시도' 단계만 이 스크립트에서 READY 필터로 추가했다. 검증 편의를 위해 `--date YYYY-MM-DD` 옵션으로 특정 날짜 하루를 볼 수 있다. `package.json` 에 `report:funnel-daily` 스크립트 추가(기존 `report:payments` 와 같은 실행 방식).

### 지시문과 달랐던 점

- 지시문은 `summarizeAttempts` 가 `payment_attempt_report.mjs` 에 있다고 전제했지만, 실물은 `src/lib/paymentAttemptFunnel.ts` 에 정의돼 있고 리포트 스크립트가 import 하는 구조다. 같은 모듈을 import 해 재사용했으므로 결과는 동일하다.
- 기존 `report:payments` 는 Supabase 회원 목록으로 탈퇴·검증 계정을 걸러내지만, 이 스크립트는 범위 제한("포트원 조회 API만 사용")에 따라 포트원만 호출한다. 하루 단위 숫자에 검증 계정이 섞이면 누적 리포트와 미세하게 다를 수 있다.

### 변경 파일

- `scripts/payment_funnel_daily.mjs` (신규)
- `package.json` (`report:funnel-daily` 스크립트 1줄 추가)
- `REPORT.md` (본 절)

### 테스트 방법과 실제 실행 결과

- 방법: `npm run report:funnel-daily` (어제), `npm run report:funnel-daily -- --date 2026-08-18` (특정일)
- 어제(2026-08-23) 실제 실행 결과:
  `요약: 2026-08-23 진입 2건(2명) → 시도 0건(0명) → 완결 0건(0명), 사람 완결률 0%`
- 결제가 있던 날(2026-08-18) 실제 실행 결과 — 실패 사유까지 정상 출력:
  진입 11건/1명, 시도 2건/1명, 완결 1건/1명(100%), 실패 사유 "[01] 인증이 실패하였습니다." 1건
- 결제 0건인 날(2026-08-19, 08-21) 실제 실행 결과 — 명시 출력 후 정상 종료(exit 0):
  `2026-08-19 결제 퍼널: 결제창 진입 0건 — 결제 활동 없음`
- 08-18~08-22 닷새 연속 실행으로 결제일·0건일·진입만 있던 날 세 경로 모두 확인. `git status` 로 변경이 위 3개 파일뿐임을 확인.

### 검수 통과 (리뷰어)

- 커밋 `587896b` diff 재확인: `REPORT.md`·`package.json`(스크립트 1줄)·`scripts/payment_funnel_daily.mjs`(신규) 3건뿐. `src/`·DB·배포 관련 변경 없음.
- 스크립트 실물 확인: `summarizeAttempts` 를 `src/lib/paymentAttemptFunnel.ts` 에서 그대로 import — 재사용 주장과 일치. 호출은 `client.payment.getPayments` 조회 1건뿐, 쓰기·삭제·취소 계열 호출 없음(grep 확인).
- `npm run report:funnel-daily -- --date 2026-08-18` 재실행 → REPORT의 진입 11/시도 2/완결 1(100%), 실패 사유 "[01] 인증이 실패하였습니다." 1건과 정확히 일치.
- `npm run report:funnel-daily -- --date 2026-08-19`(0건일) 재실행 → "결제 활동 없음" 출력, exit 0 확인.
- `npm run report:funnel-daily`(어제=2026-08-23, 기본값) 재실행 → 진입 2건(2명)/시도 0/완결 0과 REPORT 기재 내용 일치.
- `.env.local` 값이 stdout에 노출되지 않음을 위 실행 출력에서 확인.
- main에 fast-forward 병합.
