# REPORT

## 카카오페이 7일 대 7일 비교 실행 (work/method-impact-7d)

- **검수 통과 (2026-09-05):** `npm run report:method-impact`·`node scripts/daily_revenue.mjs --days 17` 재실행해 대조 — 진입 9/8→15/12, 시도 6/5→12/10, 완결 5/5→10/10, 순매출 27,500원(5건)→49,500원(10건) 전부 일치. 변경은 REPORT.md뿐, 코드·DB·배포 무변경. main에 merge.
- 날짜: 2026-09-05
- 백로그: "카카오페이 7일 대 7일 비교 실행 `npm run report:method-impact` 재실행 후 결론 기록"
- 범위: **스크립트 무수정·조회 전용.** 포트원 `getPayments` 조회만 호출, 새 스케줄·알림 없음. 고객 식별자는 앞 8자만.

### 작업 요약

8/28에는 "후" 구간이 1일치뿐이라 비교가 불가능했던 것을, 후 7일(8/27~9/2)이 채워진 지금 다시 돌렸다. 퍼널(진입·시도·완결)은 `report:method-impact`, 매출 맥락은 `daily_revenue.mjs --days 17`로 뽑았다. 두 스크립트 모두 수정하지 않았다.

### 결과 (실제 실행 출력, 기준일 8/27)

```
            전: 2026-08-20 ~ 2026-08-26 (7일)   후: 2026-08-27 ~ 2026-09-02 (7일)
  진입  전  9건/8명   후 15건/12명
  시도  전  6건/5명   후 12건/10명
  완결  전  5건/5명   후 10건/10명

  후 구간에 카카오페이 채널 건 11건:
    PAID 6건 (aee264ff, fd49d437, b4c08295, bd05152b, 1d7fd181, 1d3f372f)
    CANCELLED 1건 (5d5196b0, 8/27 — 앞서 조사한 당일 관리자 취소 건)
    FAILED 1건 (5d5196b0, 8/31 — 같은 고객의 재시도 실패)
    READY 3건 (bd05152b 8/31 결제 1분 전 진입, 4f8c486a·d08448c3 8/27 08:29 배포 직후 확인 시도로 추정)
```

순매출(포트원 원장, `daily_revenue.mjs`):

| 구간 | 순매출 | 결제 건수 |
|---|---|---|
| 전 7일 (8/20~8/26) | 27,500원 | 5건 |
| 후 7일 (8/27~9/2) | 49,500원 | 10건 |

후 구간 완결 10건 중 카카오페이 7건(PAID 6 + 당일취소 1), 카드 3건. 전 구간 완결 5건은 전부 카드(카카오 채널 건 0).

### 결론 (단정 아님 — 숫자와 한계를 같이 적는다)

- **방향은 양(+)이다.** 진입·시도·완결이 모두 늘었고(9→15, 6→12, 5→10), 완결은 사람 수로도 5→10명. 순매출은 27,500원→49,500원.
- **늘어난 완결은 거의 카카오페이 쪽에서 나왔다.** 카드 완결은 5→3으로 오히려 줄었고 카카오페이 완결 7건이 새로 붙었다. 즉 "카드 결제자가 카카오로 갈아탄 것"만으로는 총량 증가(5→10)가 설명되지 않는다 — 카카오페이가 없었으면 안 냈을 사람이 있었을 가능성이 있다.
- **그러나 표본이 한 자릿수~십몇 건이라 "효과 있음"으로 단정할 수 없다.** 전 구간 5건 안에서도 8/24 하루에 3건이 몰렸고, 주간 결제가 5건 안팎이면 며칠 우연으로 두 배 차이가 난다. 후 구간 15건 진입 중 2건(4f8c486a·d08448c3)은 배포 직후 확인 시도로 보여 실사용자 진입은 13건에 가깝다.
- **혼입 변수:** 같은 기간에 유입 쪽 변화(8/28 이후 콘텐츠·프로모 커밋들)가 함께 있었으므로 증가분 전부를 결제수단 효과로 돌릴 수 없다. 이걸 가르려면 다음 백로그 항목(유입 경로별 전환)이 필요하다.
- **다음 개선을 어디에 걸지에 대한 함의:** 결제창 완결률은 전 5/9, 후 10/15로 이미 높다. 병목은 결제수단이 아니라 **결제창에 오는 사람 수(하루 1~2명)** 쪽이라는 그림이 강화됐다. 결제수단을 더 늘리는 것보다 유입에 거는 편이 우선순위상 맞아 보인다.

### 지시문과 달랐던 점

- 지시문의 구간 정의(전 8/20~8/26, 후 8/27~9/2)는 실물과 일치했다.
- 스크립트의 고정 경고 문구 "후 구간은 7일치뿐이라 7일 대 7일 비교가 아니다"는 후 구간이 7일을 다 채운 지금은 틀린 문장이다. 범위가 무수정이라 고치지 않았고, 다음에 손댈 때 `afterDays < 7`일 때만 찍도록 바꾸면 된다.

### 변경 파일

- `REPORT.md` (본 절)

### 테스트 방법과 실제 실행 결과

- `npm run report:method-impact` 실행 → 위 표 그대로 출력(후 구간 7일 확인).
- `node scripts/daily_revenue.mjs --days 17` 실행 → 8/20~9/5 일별 순매출 출력, 위 합계는 그 출력을 구간별로 더한 것.
- `git status`: 변경은 `REPORT.md` 뿐. `src/`·`scripts/`·DB·배포 무변경. 작업 트리에 있던 미추적 블로그 json 2개는 내 작업이 아니라 손대지 않았다.

## 결제창 진입 후 이탈 계측 설계 (work/checkout-dropoff-plan)

- 날짜: 2026-08-28
- 백로그: "결제창 진입 후 이탈 계측 설계 `docs/checkout_dropoff_plan.md`"
- 범위: **설계 문서만** — 코드·추적 스크립트 변경 없음, 외부 도구 제안 없음, 개인정보를 남기는 방식은 후보에서 제외.

### 작업 요약

`docs/checkout_dropoff_plan.md` 를 새로 작성했다. ①현재 로그 지점을 코드 실물(file:line)로 전수 표기 — 클라이언트 비콘(page_views `#event/*`) 9개 지점 + 포트원 원장(READY 생성/상태 전이) ②비어 있는 구간 5개(탭 닫기 무기록, 리다이렉트 미귀환, 원장↔비콘 조인 키 부재, 집계 모집단 오염, 창 띄우기 전 침묵) ③추가 이벤트 후보 5건을 난이도·개인정보 영향과 함께 표로 정리. 결제 파일(`PaymentButton.tsx`)을 고치는 후보는 전부 NEED_HUMAN 승인 뒤 구현으로 명시했다.

### 지시문과 달랐던 점 (중요)

- 지시문 사례인 **8/23 "진입 2건 → 시도 0건"은 실사용자 이탈이 아닐 가능성이 높다.** 실측: 원장의 두 READY 건은 KST 22:51:13·22:52:19 — 1분 간격의 서로 다른 두 계정(`8767424a`, `3c6a1ef1`)인데, 같은 날 page_views 에는 결제 이벤트는커녕 `/subscribe` 페이지뷰가 0건이고, 두 계정 모두 현재 회원 89명 목록에 없다. 비콘은 webdriver 를 거르고 원장은 안 거르므로, 검증 스크립트 발자국이 원장에만 남은 그림과 일치한다(문서에 단정 아님으로 근거 병기).
- 그래서 문서의 1순위 제안은 새 계측이 아니라 **일일 퍼널의 회원 필터**(스크립트만 수정, 결제 코드 무관)다.

### 변경 파일

- `docs/checkout_dropoff_plan.md` (신규)
- `REPORT.md` (본 절)

### 테스트 방법과 실제 실행 결과 (설계 문서라 실행 대상은 없고, 근거 데이터를 실측)

- `npm run report:funnel-daily -- --date 2026-08-23` 재실행 → "진입 2건(2명) → 시도 0건 → 완결 0건" — 지시문 전제 재현 확인.
- 포트원 원장 조회(읽기 전용, 임시 스크립트 실행 후 삭제): 8/23 건은 `sub-1b418620`·`sub-71a64397`, 둘 다 READY·INICIS_V2, 위 시각·계정 확인.
- Supabase `page_views` 조회(읽기 전용): 8/23 KST 하루 `#event/*` 16행 전부 quiz/signup/exam 계열, 결제 이벤트 0행, `/subscribe` 페이지뷰 0건.
- Supabase 회원 목록 대조: 두 customer id 모두 현재 회원에 없음(이메일 등 개인정보 미출력, id 앞 8자만).
- `git status` 확인: 변경은 위 2개 파일뿐 — `src/`·`scripts/`·DB·배포 무변경.

### 검수 통과 (리뷰어)

- diff는 REPORT.md·docs/checkout_dropoff_plan.md 두 파일뿐, 코드·DB·배포 무변경 확인.
- 문서 내 file:line 인용 전수 대조: `PaymentButton.tsx` 이벤트 라인(93/102/110/120/126/156/170), `subscribe/page.tsx:100`, `trackEvent.ts`의 webdriver/kpt_no_track 필터 — 모두 실물과 일치.
- `payment_funnel_daily.mjs`에 회원 필터 없음(grep으로 확인), `payment_attempt_report.mjs:40-45`의 회원 필터 로직 존재 — 문서 주장과 일치.
- 백로그 항목(9행) 범위와 문서 범위 표기 일치. NEED_HUMAN 대상(결제 파일 수정) 후보들은 모두 승인 전제로 명시됨.
- main에 merge, BACKLOG.md 체크 완료.

## 카카오페이 도입 전후 전환 비교 (work/payment-method-impact)

### 검수 통과 (리뷰어)

- 날짜: 2026-08-28
- 확인: 커밋 날짜(e32d666=2026-08-24 진단 문서, 846d49a=2026-08-27 08:15 실연동) git log로 대조 일치. `npm run report:method-impact` 기본 실행·`--pivot 2026-08-24`·`--pivot notadate` 세 경로 모두 재실행해 REPORT 기재 출력과 정확히 일치 확인. 포트원 호출은 `getPayments`(조회) 뿐, 쓰기·취소 없음. `.env.local` 값 미노출, 고객 식별자 8자 절단 확인. 표본 경고 항상 출력, "효과 있음" 단정 없음.
- 판정: 통과 → main 병합

- 날짜: 2026-08-28
- 백로그: "카카오페이 도입 전후 전환 비교 `scripts/payment_method_impact.mjs`"
- 범위: 포트원 조회 API(무료)만 사용, `summarizeAttempts` 재사용. 새 스케줄·알림 없음. 고객 식별자는 앞 8자만 출력.

### 작업 요약

`scripts/payment_method_impact.mjs` 를 새로 만들었다. 기준일 전 7일과 후 7일(못 채웠으면 있는 만큼)의 결제 퍼널 — 진입(READY 포함)·시도(READY 제외)·완결 — 을 건/사람 단위로 나란히 출력한다. 단계 정의와 완결 판정은 `payment_funnel_daily.mjs` 와 동일하게 `summarizeAttempts`(`src/lib/paymentAttemptFunnel.ts`)를 재사용했다. 후 구간에 **카카오페이 채널(pg=KAKAOPAY) 건이 실제로 있는지**를 따로 세는데, 이게 0건이면 퍼널 변화가 있어도 카카오페이 효과로 볼 수 없기 때문이다. `--pivot YYYY-MM-DD` 로 기준일을 바꿀 수 있고, 표본 크기·후 구간 일수 경고를 항상 출력한다. `package.json` 에 `report:method-impact` 추가.

### 지시문과 달랐던 점 (중요 — 전제 자체가 틀렸다)

- **카카오페이 연동 커밋은 2026-08-24가 아니라 2026-08-27이다.** 8/24 커밋(`e32d666`)은 간편결제 경로 **진단 문서**이고, 카카오페이를 실제로 붙인 커밋은 `846d49a`(2026-08-27 08:15 KST)다. 그마저 `NEXT_PUBLIC_PORTONE_CHANNEL_KEY_KAKAOPAY` 가 배포에 들어가야 버튼이 열리는 구조라, 프로덕션에서 켜진 정확한 시각은 저장소만으로 확정할 수 없다(키는 `.env.local` 에 존재 — 값은 확인만 하고 출력하지 않음).
- 따라서 지시문의 근거였던 **"8/24 직후 3건 16,500원"은 카카오페이 도입 전의 결제** — 카카오페이 효과일 수 없다. 원장으로도 확인: 8/24~8/26에는 카카오페이 채널 건이 하나도 없다(카카오 건은 8/27부터).
- 기본 기준일을 실물(8/27)로 잡고, 지시문의 8/24도 `--pivot 2026-08-24` 로 볼 수 있게 했다.
- 오늘이 8/28이라 "후 7일"은 아직 **1일치**뿐이다. 7일 대 7일 비교는 9/3 이후에나 가능하다.

### 결과 (실제 실행 출력, 기준일 8/27)

```
            전: 2026-08-20 ~ 2026-08-26 (7일)   후: 2026-08-27 ~ 2026-08-28 (1일)
  진입  전  9건/8명   후  4건/3명
  시도  전  6건/5명   후  2건/1명
  완결  전  5건/5명   후  1건/1명

  후 구간에 카카오페이 채널 건 3건:
    5d5196b0  CANCELLED  pg=KAKAOPAY  2026-08-27T12:23:23.088316136Z
    4f8c486a  READY  pg=KAKAOPAY  2026-08-26T23:29:33.064086407Z
    d08448c3  READY  pg=KAKAOPAY  2026-08-26T23:29:07.626916727Z
```

읽는 법(단정 아님, 근거 병기):

- **카카오페이는 프로덕션에서 실제로 켜졌다** — 원장에 pg=KAKAOPAY 건이 8/27부터 존재한다. READY 2건은 KST 8/27 08:29(연동 커밋 08:15의 14분 뒤)로, 배포 직후 확인 시도로 보인다.
- CANCELLED 1건(고객 `5d5196b0`, KST 8/27 21:23)은 **앞선 조사(8/27 순매출 0원 건)와 동일한 건**이다. 즉 첫 카카오페이 실결제가 있었으나 4분 뒤 관리자 취소됐다 — 카카오페이 경로 자체는 결제까지 통과한다는 증거이기도 하다.
- 전후 비교로 "효과 있음/없음"은 말할 수 없다. 후 구간이 1일치이고 양쪽 다 한 자릿수 표본이다. 스크립트가 이 경고를 항상 병기한다.

### 변경 파일

- `scripts/payment_method_impact.mjs` (신규)
- `package.json` (`report:method-impact` 1줄 추가)
- `REPORT.md` (본 절)

### 테스트 방법과 실제 실행 결과

- 방법: `npm run report:method-impact` (기본 8/27), `-- --pivot 2026-08-24` (지시문 기준일), 잘못된 날짜로 오류 경로 확인
- 기본 실행: 위 인용 블록 그대로 출력, exit 0.
- `--pivot 2026-08-24` 실행: 전(8/17~8/23) 진입 15건/5명·완결 2건/2명, 후(8/24~8/28, 4일치) 진입 9건/7명·완결 5건/5명 — 지시문이 말한 "8/24 이후 증가"는 재현되나, 그 구간의 카카오페이 건은 위 3건(8/27)뿐이므로 8/24~26 증가분은 카카오페이와 무관하다.
- `--pivot notadate`: "날짜 형식이 아니다" 출력 후 exit 1 확인.
- 포트원 호출은 `getPayments` 조회뿐(쓰기·취소 계열 없음), `.env.local` 값 미노출, 고객 식별자 앞 8자만 출력됨을 위 출력에서 확인.

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
