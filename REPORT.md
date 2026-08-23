# REPORT

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
