# 결제창 진입 후 이탈 계측 설계

작성: 2026-08-28. **설계 문서만** — 코드·추적 스크립트 변경 없음(백로그 범위 제한).
결제 버튼·호출부(`src/components/subscribe/PaymentButton.tsx`)는 결제 코드라서,
아래 후보 중 그 파일을 고치는 것은 전부 **사람 승인(NEED_HUMAN) 뒤에만** 구현한다.

## 요약

- "진입 N건 → 시도 0건"인 날을 이해하려면 두 가지가 필요하다:
  **(1) 원장(포트원)과 비콘(page_views)을 건별로 잇는 조인 키**,
  **(2) 결제창이 뜬 뒤 소리 없이 사라지는 경로(탭 닫기·리다이렉트 미귀환)의 이벤트.**
- 그런데 실측해 보니 **8/23의 진입 2건은 실사용자 이탈이 아닐 가능성이 높다**
  (아래 "8/23 실측"). 계측을 늘리기 전에, 일일 퍼널이 검증 계정을 걸러 세게
  만드는 것이 가장 싸고 급하다 — 이것만은 결제 코드가 아니라 스크립트 수정이다.

## ① 현재 어느 지점까지 로그가 남는지 (실물 확인, 2026-08-28 기준)

결제 퍼널에 걸린 기록 지점을 코드에서 전수 확인했다. 저장소는 두 곳이다:
클라이언트 비콘 → Supabase `page_views`(`#event/<이름>`, 익명 vid/sid),
그리고 **포트원 원장**(서버 진실, `requestPayment` 가 불리면 READY 건이 생긴다).

| 단계 | 기록 | 위치 | 저장소 |
|---|---|---|---|
| 구독 페이지 도착 | `/subscribe` 페이지뷰 + `subscribe_view` | `src/app/(main)/subscribe/page.tsx:100` | page_views |
| 준비중 수단 클릭 | `method_unavailable` meta=수단 | `PaymentButton.tsx:93` | page_views |
| 가드에서 막힘 | `payment_blocked` meta=no_agree·no_phone·bad_phone·no_portone_key | `PaymentButton.tsx:102,110,120` | page_views |
| 결제창 호출 직전 | `payment_started` meta=수단(card/kakaopay) | `PaymentButton.tsx:126` | page_views |
| 결제창 열림 | READY 건 생성 (자동) | 포트원 | **원장** |
| PC에서 창 닫음/실패 | Promise가 code로 resolve → `payment_fail` meta=code | `PaymentButton.tsx:156` | page_views |
| SDK 예외 | `payment_fail` meta=`ex:<수단>:<사유(숫자 제거·80자)>` | `PaymentButton.tsx:170` | page_views |
| 인증 진행 | status가 READY를 넘어감 (FAILED 포함) | 포트원 | **원장** |
| 리다이렉트 실패 귀환 | `/subscribe/fail` 도착 시 `payment_fail` meta=code/reason | `src/app/(main)/subscribe/fail/page.tsx:60` | page_views |
| 결제 완결 | PAID/CANCELLED + `purchase_success`, GA4 `purchase` | 포트원 + `success/page.tsx:66` | 원장 + page_views |

두 저장소의 **모집단이 다르다**는 것이 핵심 제약이다:

- 비콘은 `navigator.webdriver`·`kpt_no_track` 브라우저를 **버리고**(`src/lib/analytics/trackEvent.ts:9`),
  애드블록·sendBeacon 실패로도 샌다.
- 원장은 아무도 안 거른다 — 검증 스크립트가 결제창을 열어도 READY가 남는다.
- 일일 퍼널(`scripts/payment_funnel_daily.mjs`)은 **원장만** 보고 회원 필터가 없다
  (누적 리포트 `payment_attempt_report.mjs:40-45`는 Supabase 회원 목록으로 거른다).

## 8/23 실측 — 지시문의 사례는 실사용자 이탈이 아닐 가능성이 높다

`npm run report:funnel-daily -- --date 2026-08-23` 재실행: 진입 2건(2명)→시도 0→완결 0 (전제 재현됨). 그 두 건을 원장·DB에서 직접 대조한 결과:

- 원장: `sub-1b418620`(customer `8767424a`), `sub-71a64397`(customer `3c6a1ef1`) —
  **KST 22:51:13과 22:52:19, 1분 간격의 서로 다른 두 계정**, 둘 다 INICIS_V2 카드창.
- 같은 날 KST 하루 전체의 `page_views`: `#event/*` 16행 중 결제 관련 0행,
  **`/subscribe` 페이지뷰조차 0건.** 결제창이 열렸다면 반드시 먼저 찍혔어야 할
  `payment_started`가 없다.
- 두 customer id 모두 **현재 Supabase 회원 89명에 없다** — 탈퇴했거나 검증 계정
  정리(`cleanup_test_accounts.mjs`) 대상이었다는 뜻.

종합하면(단정 아님): 서로 다른 두 계정이 1분 간격으로 결제창만 열고, 비콘은 0건이고, 둘 다 지금 회원이 아니다 — **webdriver 기반 검증 실행이 원장에만 발자국을 남긴 그림**과 정확히 일치한다. 실사용자 두 명이 우연히 1분 간격으로 애드블록을 켠 채 창만 열고 나갔을 가능성도 배제는 못 하지만, 정황은 전자가 훨씬 강하다.

**따라서 "진입→시도 0" 문제의 1순위는 새 계측이 아니라 집계 오염 제거다.** 다만 오염을 걷어낸 뒤에도 실사용자의 창-열고-침묵 구간은 원리적으로 안 보이므로(아래 ②), 계측 설계는 그대로 필요하다.

## ② 비어 있는 구간

결제창이 열린 뒤(READY 생성) 종결 이벤트까지, 지금 안 보이는 경로:

- **(A) 창 열림 → 무반응 이탈.** PC에서 창을 X로 닫으면 Promise가 code로 resolve되어
  `payment_fail`이 남지만, **탭 닫기·뒤로가기·브라우저 종료**는 아무 기록 없이 끝난다
  (원장에 READY만 남는다).
- **(B) 모바일 리다이렉트 미귀환.** REDIRECTION 플로우로 PG 페이지에 나갔다가
  돌아오지 않으면 무기록. 게다가 그 건이 **어느 플로우(IFRAME/REDIRECTION,
  PC/모바일)였는지 자체가 어디에도 안 남는다.**
- **(C) 원장 ↔ 비콘 조인 불가.** `payment_started`의 meta는 수단뿐이고 paymentId가
  없어서, 원장의 특정 READY 건에 대해 "클라이언트에서 무슨 일이 있었나"를 물을 수
  없다. 8/23 조사에서도 시각 대조라는 간접 추정밖에 못 했다. 조인이 안 되니
  **비콘 유실률(애드블록 등)도 정량화할 수 없다.**
- **(D) 집계 모집단 오염.** 일일 퍼널이 검증·탈퇴 계정을 원장에서 안 걸러,
  8/23처럼 자동화 발자국이 "실사용자 이탈"로 읽힌다.
- **(E) 창을 띄우기 전 침묵.** `subscribe_view`와 버튼 클릭 사이 — 페이지만 보고
  폼을 만지지도 않았는지, 폼을 만지다 포기했는지 구분이 없다(가드 이벤트는
  버튼을 눌러야 찍힌다).

## ③ 추가할 이벤트 후보 — 난이도·개인정보 영향

우선순위 순. ①은 결제 코드가 아니라서 바로 가능, ②~⑤는 `PaymentButton.tsx` 수정 = **결제 코드 변경 → NEED_HUMAN 승인 후 구현**.

| # | 후보 | 무엇이 보이게 되나 | 구현 난이도 | 개인정보 영향 |
|---|---|---|---|---|
| ① | **일일 퍼널에 회원 필터** — `payment_funnel_daily.mjs`가 `payment_attempt_report.mjs:40-45`와 같은 규칙으로 비회원 건을 "비회원(검증 의심) N건"으로 분리 표기 | 8/23류 오탐이 사라지고, "진입→시도 0"이 뜨면 그때는 진짜 신호다 | **하** — 스크립트 20줄 안팎, 결제 코드 무관, 기존 조회 API 재사용 | 없음 (id 앞 8자 관례 유지) |
| ② | **`payment_started` meta에 paymentId 앞 8자 동봉** (`m=card,p=sub-1b41` 형식). paymentId 생성을 이벤트 앞으로 한 줄 옮기면 된다 | 원장 건별로 클라이언트 이벤트를 조인 — READY로 끝난 건이 "비콘도 있었나(실사용자) / 비콘이 없었나(자동화·유실)"로 갈라진다. 유실률 정량화도 가능 | **하** — 2줄. 단, 결제 파일이라 승인 필요 | 없음 — paymentId는 클라이언트가 만드는 랜덤 UUID로 사람과 무관. 전화번호·이메일은 계속 미전송 |
| ③ | **`payment_flow` 정보를 `payment_started` meta에 추가** — mobile/desktop 1비트(UA 전체는 싣지 않음) | READY-침묵 건이 리다이렉트 미귀환(모바일)인지 창 방치(PC)인지 갈라진다 | **하** — matchMedia/UA 판별 1줄 | UA 원문은 저장하지 않으므로 없음 |
| ④ | **`payment_window_exit`** — 결제창이 열린 상태(`loading !== null`)에서 `pagehide` 가 오면 sendBeacon 1발 | (A)의 탭 닫기·뒤로가기 이탈이 처음으로 보인다. ②와 합치면 READY-침묵 건의 사인(死因)이 대부분 분류된다 | **중** — 리스너 등록·해제와 상태 관리. pagehide 시 sendBeacon은 이 용도로 설계된 API라 신뢰도는 있으나 100%는 아님(iOS 일부 유실) — 하한선 지표로만 쓴다 | 없음 — 이벤트명+paymentId 앞 8자만 |
| ⑤ | **`subscribe_form_touch`** — 전화번호 입력·동의 체크 첫 상호작용에서 1회 | (E) 구간이 "페이지만 봄 / 폼까지 만짐 / 버튼까지 감"으로 3분할 | **하** — onFocus/onChange 1회 가드 | **입력 값은 절대 싣지 않는다**(터치 여부만). 전화번호가 meta에 실리는 순간 개인정보가 되므로 값 전송은 후보에서 제외 |

### 후보에서 뺀 것과 이유

- **외부 분석 도구(GA4 확장·Hotjar·세션 리플레이)**: 비용 발생 금지(백로그 범위) +
  리플레이는 입력 화면 녹화라 개인정보 위험이 커서 제외.
- **전화번호·이메일을 meta로**: 익명 비콘 원칙 위반 — 어떤 후보에도 싣지 않는다.
- **포트원 웹훅 기반 상태 전이 수집**: 원장 폴링(기존 무료 조회)으로 같은 정보를
  이미 얻는다. 새 수신 엔드포인트는 결제 경로 코드만 늘린다.
- **결제창 체류시간 신규 이벤트**: 원장 `requestedAt`과 종결 이벤트 시각차로
  이미 계산 가능 — 분석 스크립트 쪽 일이지 새 계측이 아니다.

## 구현 순서 제안 (전부 이 문서 승인 뒤의 일)

1. ①(회원 필터)만 먼저 — 결제 코드 아님, 다음 워커 사이클에서 가능. 이것만으로
   "진입→시도 0" 날의 대부분이 설명될 수 있다.
2. 그 뒤에도 실사용자 READY-침묵이 남으면 ②+③(조인 키·플로우 1비트)을 한 번의
   승인으로 묶어 적용 — 합쳐서 4줄 안팎의 결제 파일 수정.
3. ④·⑤는 ②의 데이터로 실사용자 침묵 건이 실제로 관측된 뒤에 판단 — 관측도 안 된
   문제에 리스너부터 다는 것은 순서가 거꾸로다.
