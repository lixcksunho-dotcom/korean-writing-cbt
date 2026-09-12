# REPORT

보관: [2026년 8월](docs/reports/REPORT-2026-08.md) · [원래 절 순서·날짜·해시·참조 조사](docs/reports/REPORT-section-index.md)
규칙: 달이 바뀌면 지난 달 절을 docs/reports/ 로 옮긴다

## 간편결제 잔여 경로 점검 (work/easypay-remaining-check, 2026-09-10)

- 백로그: "`scripts/payment_method_diagnose.mjs` 재실행 후 표 갱신 — ①현재 열려 있는 payMethod ②easyPayProvider 지정 ③각 수단을 열려면 무엇이 더 필요한지(채널 추가 심사 여부 포함)를 REPORT 에 표로".
- 범위: **읽기와 문서화만.** 결제 코드(`PaymentButton.tsx`) 무변경, 포트원은 `getPayments` 조회만, 실결제·취소 없음. 개인정보는 id 앞 8자만.
- 바꾼 것: `scripts/payment_method_diagnose.mjs` 한 파일. 8/24에 만든 ③ 표가 그때 상태("CARD만 호출 / 지정 없음")를 **글자로 박아 둔 것**이라 카카오페이가 열린 지금 재실행해도 옛 표가 그대로 나왔다. 호출부에서 읽은 값(easyPayProvider·전용 채널키 env·화면 버튼)으로 수단별 행을 채우게 고쳤다. 코드 밖 조건(계약·심사)은 포트원 연동 문서 기준 문구로만 적는다.

### ①② 현재 열려 있는 payMethod와 easyPayProvider (`node scripts/payment_method_diagnose.mjs` 실제 출력)

| 파일 | payMethod | easyPayProvider | easyPay 객체 |
|---|---|---|---|
| src/components/subscribe/PaymentButton.tsx:148 | EASY_PAY, CARD | KAKAOPAY | 있음 |

| key | 라벨 | 상태 |
|---|---|---|
| kakaopay | 카카오페이 | 결제창 엶 |
| card | 카드 결제 | 결제창 엶 |

호출부는 이 한 곳뿐. `portoneMethodParams()` 가 카카오페이면 `{ channelKey: 카카오 전용키, payMethod: 'EASY_PAY', easyPay: { easyPayProvider: 'KAKAOPAY' } }`, 아니면 `{ payMethod: 'CARD' }`(이니시스 채널). 네이버페이·토스페이는 호출부·환경변수·화면 버튼 어디에도 **자리가 없다** — 8/22 커밋 927b498 에서 '간편결제' 준비중 버튼을 내린 뒤 그대로다.

### 원장 실물 — 지금 열려 있는 채널 (포트원 `getPayments`, 최근 30일 8/11~9/10 UTC, 55건)

| 채널(pgProvider) | 건수 | PAID | READY | FAILED | CANCELLED |
|---|---|---|---|---|---|
| INICIS_V2 (카드) | 30 | 13 (전부 `PaymentMethodCard`) | 14 | 3 | 0 |
| KAKAOPAY (전용 채널) | 25 | 18 (`PaymentMethodEasyPay KAKAOPAY`) | 4 | 2 | 1 |
| 그 외(NAVERPAY·TOSSPAY 등) | **0** | | | | |

채널이 둘뿐임을 원장으로 확인했다(채널키가 배포에 들어갔는지는 저장소로 알 수 없어 원장으로 본다).

주 단위 흐름(`npm run report:method-impact` 기준일 8/27·9/3 두 번 실행, 사람 단위):

| 구간 | 진입 | 시도 | 완결 | 카카오 PAID | 카드 PAID(=완결−카카오) | 비콘 payment_started 카드:카카오 |
|---|---|---|---|---|---|---|
| 8/20~8/26 (카카오 전) | 9건/8명 | 6/5 | 5/5 | — | 5 | 12 : (easypay 준비중 8) |
| 8/27~9/2 | 15/12 | 12/10 | 10/10 | 6 | 4 | 4 : 9 |
| 9/3~9/9 | 15/14 | 14/13 | 13/13 | 11 | 2 | 3 : 14 |

카카오페이가 열린 지 2주 만에 완결의 85%(11/13)를 가져갔고, 카드 완결은 주 5→4→2건으로 줄었다. 진입 건수 자체는 15건으로 같다 — 수단 추가로 늘어난 건 **완결률**(5/9 → 13/15)이지 방문이 아니다.

### ③ 각 수단을 열려면 (포트원 연동 문서 developers.portone.io, 2026-09-10 확인)

| 수단 | 지금 | 채널·계약(코드 밖, 사람) | 심사 | 코드 쪽(NEED_HUMAN 대상, 적용 안 함) | 문서상 주의 |
|---|---|---|---|---|---|
| 카카오페이 | **열림** (8/27~, 전용 채널) | 완료 (CID 계약 8/27, 채널·`CHANNEL_KEY_KAKAOPAY`) | 완료 | 없음 | windowType 비움(PC IFRAME·모바일 REDIRECTION 자동), KRW·KO_KR만 |
| 네이버페이(결제형) | 없음 | **별도 PG 채널** — 네이버페이 가맹 신청·계약 → 포트원 콘솔 채널 추가 → `NEXT_PUBLIC_PORTONE_CHANNEL_KEY_NAVERPAY` 환경변수 | **있음** — 검수 시작 전엔 "API 호출 권한이 없습니다" 에러, 검수 기간은 문서에 없음 | 카카오페이 패턴 복제: env 1개 + `portoneMethodParams` 분기(`payMethod: 'EASY_PAY'`, easyPayProvider 는 PG 자체가 간편결제사라 생략 가능) + METHODS 항목 | windowType PC **POPUP**·모바일 REDIRECTION만(카카오는 IFRAME — 비워 두면 각자 맞게 잡힘), KRW만, `easyPay.installment`·`availableCards` 미지원, 고위험 업종이면 customer.name·birth 필수(해당 여부는 사람 판단) |
| 토스페이 | 없음 | **별도 PG 채널** — 토스페이 계약(문서는 "전자결제 신청"으로만 안내) → 채널 추가 → `..._TOSSPAY` 환경변수 | 문서에 심사 언급 없음 — 계약 단계에서 확인 | 카카오페이 패턴 복제, `payMethod: 'EASY_PAY'`(easyPayProvider 언급 없음) | 문서에 windowType 제약 없음 |
| 이니시스 경유 간편결제 (네이버·토스·페이코·삼성페이 등을 `easyPayProvider` 로 지정) | 없음 | **채널 추가 없음** — 대신 KG이니시스 상점 계약에 그 간편결제사가 열려 있어야 함. 포트원 문서엔 지원 목록·계약 조건이 없어 **이니시스에 직접 확인** | 이니시스 쪽 부가서비스 신청 여부에 달림(문서 미기재) | 이니시스 채널키 그대로 + `easyPay: { easyPayProvider: 'NAVERPAY' }` 식 분기 + 버튼 | 미지정 호출은 400 ("간편 결제 수단은 필수 입력입니다") — 8/16·18 실패 7건의 원인. 이니시스 PC 결제는 phoneNumber 필수(지금 받고 있음) |

읽는 법: 네이버페이·토스페이는 **계약 → 채널 → 환경변수** 세 단계가 코드 밖에 있고, 코드는 카카오페이와 같은 모양이라 작다(단, 결제창 호출부라 사람 판단). 이니시스 경유는 채널 추가가 없어 코드만으로 열리는 것처럼 보이지만, 계약에 열려 있지 않으면 8월처럼 조용히 실패한다 — 열기 전에 이니시스 확인이 먼저다.

### 비용 대비 효과를 가를 때 볼 것 (판단은 하지 않음)

- **수요 측정이 안 되고 있다.** `method_unavailable` 비콘은 8/22~8/26 에 easypay 2·kakaopay 1 이 전부이고, 네이버페이·토스 버튼은 자리조차 없어 "눌러 본 사람"을 셀 수 없다. 카드로 결제한 사람이 다른 수단이 있었으면 더 빨리 냈을지, 결제수단 때문에 포기한 사람이 있는지 어느 쪽도 지금 자료엔 없다.
- **남은 카드 이용자는 주 2건.** 다음 수단이 뺏어 올 수 있는 최대치가 이 규모다. 카카오페이 때는 "카드 외 수단이 없어서 안 내던 사람"이 있었고(진입 대비 완결 5/9), 지금은 그 여지가 13/15 로 줄어 같은 크기의 효과를 기대하긴 어렵다.
- **가장 싼 다음 걸음**은 수단을 여는 게 아니라 준비중 버튼(naverpay·tosspay)을 두고 `method_unavailable` 로 수요를 세는 것이다 — 단, 이것도 `PaymentButton.tsx` 변경이라 사람 판단 대상. 무엇을 열지는 그 숫자를 본 뒤가 순서다.

### 지시문과 달랐던 점

- "후 구간 결제 6건"은 8/27~9/2 카카오 PAID 6건과 일치. 그 다음 주(9/3~9/9)는 11건으로 더 늘었다.
- 스크립트 ③ 표가 정적이라 "재실행 후 표 갱신"이 스크립트만 돌려서는 안 됐다 — 위처럼 고쳤다.
- 8/24 리포트의 호출부 `:102` 는 지금 `:148` (그 사이 전화번호·동의 안내 코드가 앞에 들어감).

### 실행 결과

- `node scripts/payment_method_diagnose.mjs` — 위 ①② 표와 수단별 표 출력, exit 0. `--json` 도 정상(`channelKeyEnvs: ["KAKAOPAY"]`).
- `npm run check:methods` — 6/6 통과.
- `npx eslint scripts/payment_method_diagnose.mjs` — 통과.
- `npm run report:method-impact`(기준일 8/27) — REPORT 9/5 절과 동일(진입 9/8→15/12, 완결 5→10). `-- --pivot 2026-09-03` — 위 표.
- 원장 30일 채널 집계는 일회성 조회(임시 스크립트, 저장소에 남기지 않음).

**검수 통과** — 리뷰어가 `node scripts/payment_method_diagnose.mjs` 재실행해 ①② 표(출력)가 위 기록과 일치함을 확인. `npm run check:methods` 6/6, eslint 통과 재확인. diff는 REPORT.md·scripts/payment_method_diagnose.mjs 두 파일뿐(결제 코드 무변경), 시크릿 노출 없음 확인. main 병합, BACKLOG 체크.

## 시험 화면 첫 30초 관찰 (work/exam-entry-observe, 2026-09-10) — 검수 통과

리뷰어가 `ENTRY_HOLD_SEC=3 npm run check:entry` 로 재실행해 REPORT 수치(타이머 흐름, ② 아이콘뿐, 세션 1건 유지 등)와 일치함을 확인. `entrycheck+` 계정 재조회 0건으로 정리도 확인. main 병합, BACKLOG 체크.

- 백로그: "`scripts/exam_entry_check.mjs` — 로그인한 검사 계정으로 무료 회차를 열어 ①첫 화면에 무엇이 보이는지 ②'저장하고 나가기'가 눈에 띄는 자리에 있는지 ③390px 에서 첫 문항이 접히지 않는지 를 캡처와 함께 REPORT 에". 범위대로 **읽기·캡처만** — 답안 제출 없음, 화면 코드 무변경, 만든 계정·세션은 검사 끝에 지운다.
- 바꾼 것: `scripts/exam_entry_check.mjs`(9/9 커밋 b5c1934 의 것)에 ①②③ 측정과 30초 대기, 넓은 화면(1280px) 대조를 더했다. 캡처는 `docs/captures/exam-entry/` 에 남긴다(REPORT 가 가리키는 실물이라 저장소에 둔다, 5장 200KB). `ENTRY_HOLD_SEC` 로 대기 시간을 줄일 수 있다.

### 관찰 결과 (`npm run check:entry`, 라이브 kptest.cloud, 2026-09-10 12:27 KST, 무료 회차 `/cbt/2025-1`)

| 물음 | 본 것 | 캡처 |
|---|---|---|
| ① 첫 화면에 무엇이 보이나 | 열면 **시작 안내**가 먼저(120분·객관식 30·서술형 9, 저장하고 나갈 수 있음, 자동 제출 고지). 시작 단추는 390px 에서 604~652px 라 스크롤 없이 보인다. 시작을 누르면 3초 안에 헤더(96~244px: 타이머 119:58·저장·제출·진행 막대) → 접힌 문제 목록 → **1번 문항 글 411~437px → 첫 보기 469~521px**. 가리는 창(dialog)·안내 없음 | `intro-390.png` `playing-390.png` |
| ② '저장하고 나가기' 자리 | 헤더 안 타이머 옆 153~197px, 44×44px — 자리는 스크롤 없이 손에 닿는다. **그러나 390px 에서는 아이콘(💾)뿐이다** — 글자는 `hidden sm:inline` 으로 숨고 `aria-label` 도 없어 낭독기 이름이 비며, 설명은 `title` 이라 터치에서는 안 뜬다. 1280px 에서는 "저장하고 나가기" 글자가 붙어 있다(113~157px) | `playing-390.png` `playing-1280.png` |
| ③ 390px 에서 첫 문항 | 가로 넘침 없음. 문항 글·첫 보기가 844px 안에 들고, 캡처상 보기 ⑤까지 화면 안이다(잰 것은 첫 보기까지). 지문 없는 회차라 지문이 있는 문항은 별도(아래 한계) | `playing-390.png` |
| 30초 그대로 두면 | 타이머 119:58 → 119:28. 저절로 뜨거나 움직인 것 없음(dialog 0·scrollY 0). 서버는 세션 1·답안 0 그대로. 콘솔 오류 0 | `playing-390-30s.png` |
| 저장 없이 나갔다 돌아오면 | **시작 안내가 다시 뜬다** — `findResumableExamSession` 은 `saved_at` 이 있는 세션만 이어풀기로 친다. 다시 '시작하기'를 누르면 `getOrCreateExamSession` 이 있던 세션을 다시 쓰고(세션 1건 유지) **타이머는 120:00 부터 다시** 간다(`time_left` 가 null) | `return-1280.png` |

- 검사 출력(요지): 통과 21 · **손볼 것 1**(② 좁은 화면 아이콘뿐) · 측정만 4. exit 1 — ②가 고쳐질 때까지 빨간 채로 둔다.
- 검사 계정 정리: 끝에 세션·답안·계정 삭제, `auth admin users` 5쪽 재조회로 `entrycheck+` 계정 **0건** 확인.
- `node --check`·`eslint scripts/exam_entry_check.mjs` 통과.

### 사람을 돌려세울 만한 것(수정하지 않음 — 다음 항목 후보)
1. **② 좁은 화면 저장 단추가 이름 없는 아이콘**: `ExamPlayer.tsx:348` `<span className="hidden sm:inline">` — 휴대폰에서 '나갈 길'이 안 보이는 셈이라, 안내 화면에서 "저장하고 나갈 수 있어요"라고 해 놓고 정작 시험 화면에서는 찾기 어렵다. 고치면: 단추에 `aria-label="저장하고 나가기"` 를 두고, 좁은 화면에도 짧은 글자("저장")를 남기는 쪽. 한 줄 변경이라 별도 항목으로.
2. **저장 없이 나간 사람이 돌아오면 처음부터**: 안내가 다시 뜨고 타이머가 120분으로 되돌아간다. 실제 시험 규칙(시계가 계속 간다)과 다르고, 브라우저 임시본(`readDraftRaw`)은 그 기기에서만 살아난다. 이게 의도인지(무료는 저장 안 하면 처음부터) 사람이 정할 일 — `docs/empty_session_plan.md` 의 "배포 후 빈 행 = 시작 후 이탈" 기준과 함께 볼 것.

### 한계
- 무료 첫 회차(2025-1) 1번은 지문이 없다. 지문이 있는 문항은 `max-h-[30rem]`(480px) 박스가 문항 글을 844px 아래로 밀 수 있는데 이번 검사에는 안 걸렸다 — 지문 있는 문항으로 이동해 재는 것은 이 항목 범위(첫 화면) 밖이라 안 했다.
- 검사는 Playwright 헤드리스 Chromium 이라 실제 휴대폰 주소창·하단 바만큼의 높이(대개 100px 안팎)는 빠져 있다. 첫 보기 하한이 521px 이라 그만큼을 빼도 안 접힌다.

### 지시문과 달랐던 점
- 스크립트는 이미 있었다(9/9 b5c1934). 그때는 ①과 세션 생성 시점만 봤고 ②③·30초·캡처 보관은 없었다 — 그 부분만 더했다. 캡처가 `scripts/_*.png` 로 가던 것은 `.gitignore` 에 걸려 REPORT 가 가리킬 수 없어 `docs/captures/` 로 옮겼다.
- "열고 한 문제도 안 푼 회차 112건"은 9/10 `check:dropoff` 기준 118건(앞 항목 REPORT 와 같다).

## 빈 시험 세션 정리 방안 문서 (work/empty-session-plan, 2026-09-10)

- 백로그: "`docs/empty_session_plan.md` — ①세션을 '시작' 시점에 만들려면 어디를 고칠지 ②같은 회차 미완료 중복을 막을 부분 유니크 인덱스 초안 ③쌓인 빈 행을 어떻게 다룰지(지우지 말고 기준만)". 범위대로 **문서 한 파일만** — 코드·마이그레이션·행 삭제 없음.
- 문서 요지: ①은 이미 돼 있어 남은 구멍(읽고-넣기 경합, `?start=1` GET)과 그 처리 코드 스케치만 적었다. ②는 `(user_id, program, year, round) WHERE completed_at IS NULL` 부분 유니크 인덱스 + 선행 조건(중복 9묶음의 여분 18행이 전부 빈 행임을 보는 SELECT, 사람이 결정할 DELETE, 지우지 않는 날짜 조건 대안) + 적용 순서(코드 먼저 → 인덱스). ③은 빈 행이 새는 곳을 표로(`/account` "시험 세션 N개" 한 곳만 전체 행을 센다), 배포 전 빈 행은 '열어봄'·배포 후는 '시작 후 이탈'로 나누는 기준, 지우지 않는 이유.

### 실행 결과(2026-09-10, 전부 읽기 전용)
- `npm run check:dropoff` → exit 0. 실전 255건(끝냄 133·중단 122), 중단 중 빈 행 118·풀다 만 것 4, 완주율 52%/97%, 시작 안내 배포 뒤 14건(끝냄 9·안 푼 것 5).
- `quiz_sessions` 283행·`quiz_answers` 전량 대조(임시 스크립트, 저장소에 넣지 않음): 빈 행 132(실전 123·연습 9; 배포 전 118·후 5) · 미완료 중복 9묶음 27행 · **두 행 이상에 답안·저장이 있는 묶음 0** · 중복 27행 중 17행은 관리자 목록에 있는 운영자 계정 것.
- 초안 SQL 은 직접 돌릴 수단이 없어(psql·pg·DB 접속 문자열 없음) 실행하지 못했다. 대신 SELECT 의 `ROW_NUMBER … ORDER BY saved_at DESC NULLS LAST, started_at DESC` 를 JS 로 똑같이 재현해 **rn>1 = 18행, has_saved/has_answers/saved_at 전부 0** 을 확인했다 — 문서에 적은 "기대: 18행·전부 false"가 이 결과다.

### 지시문과 달랐던 점
- "여는 순간 `getOrCreateExamSession` 이 행을 만든다"는 **9/9 커밋 b5c1934 로 이미 고쳐졌다**(안내 화면 → '시작하기'를 눌러야 만든다). 그래서 ①은 "어디를 고칠지"가 아니라 "무엇이 남았는지"로 썼다.
- 숫자: 233건/112건/49%/95% → 실물 255/118/52%/97%(이틀치 추가). 구조는 같다.
- 다음 백로그 항목의 산출물 `scripts/exam_entry_check.mjs`(`npm run check:entry`)도 같은 커밋에 이미 들어 있다 — 그 항목을 집을 때 "캡처를 REPORT 에 남기는 부분"만 남았는지 실물로 대조할 것.

### 검수 통과 (리뷰어, 2026-09-10)
- diff(`main..work/empty-session-plan`) 재확인: `REPORT.md`·`docs/empty_session_plan.md` 2건뿐 — 코드·마이그레이션·행 삭제 없음.
- 지시문 대조 검증: 커밋 `b5c1934` 실존, `src/app/(main)/cbt/[examId]/page.tsx:44-60`·`actions.ts:219`의 `getOrCreateExamSession` 배치가 문서 서술과 일치.
- `npm run check:dropoff` 재실행 → 완주율 52%/97% 정확히 재현. 절대 건수(빈 행 118→119, 배포 후 14→15)는 이틀 새 데이터 누적에 따른 자연 변동으로, 구조가 같다는 REPORT 서술과 부합.
- `git status` clean — 검증용 임시 스크립트·계정 잔여 없음.
- main에 병합(`--no-ff`), BACKLOG 체크, work/empty-session-plan 삭제.


## 관리자 '유료회원' 탭 — AI 사용량·평균 점수 (관리자 직접, 2026-09-08 운영자 지시)

- 왜: 회원 목록·결제 원장은 '누가 냈는가'만 말했다. 이용권을 늘릴지, AI 하루 한도를 올릴지, 문제 난이도를 어떻게 할지는 "쓰고 있는가·점수가 오르는가"를 봐야 정할 수 있다.
- `/admin/paid-members` — 이용권이 살아 있는 회원만. 요약 4장(보유 인원·AI 누적/1인 평균/최근 7일·평균 예상 점수·하루 한도 도달 인원)과 회원별 표(AI 누적·최근 7일·하루 최대·응시 수·평균/최고 점수·등급).
- 계산은 `src/lib/paidMemberStats.ts`(순수 함수, 검사에서 서버 없이 부를 수 있다). 점수는 대시보드와 같은 방식(객관식 정답률×300 + 서술형 AI 득점률×700)이고 **회차별 예상 점수의 평균** — 전체를 한 번에 합치면 많이 푼 사람이 평균을 끌고 간다. 조회는 전량을 페이지 단위로(1000행 상한 회피), `quiz_answers` 는 회원 칼럼이 없어 세션으로 사람에 붙인다.
- 실측(2026-09-08): 이용권 보유 **24명**(전원 결제) · AI 첨삭 누적 **601회**, 1인 평균 25회, 최근 7일 327회, 쓴 사람 22명 · **하루 30회 한도를 다 쓴 적 있는 사람 5명** · 평균 예상 점수 **695점**(응시자 19명).
- 한도 결정에 쓸 근거가 이걸로 생겼다 — 24명 중 5명이 한도에 닿았고, 최근 7일에만 327회가 나갔다.

## 블로그 후기 이벤트 실전 돌리기 (관리자 직접, 2026-09-08 — 운영자 지시 "직접 돌려봐")

- 지금까지 이벤트는 검사용 가짜 주소로만 돌았다(참여 0건). 조건을 갖춘 **진짜 후기 글**로 신청→자동 심사→지급→감사→회수까지 한 바퀴 돌린다.
- **글 준비 완료**: `C:\Users\선호\naver-blog-uploader\posts\silgeul-review-0908\` — 실글패스 라이브 화면 5장(첫 화면·체험·시험정보·이용권·블로그)을 직접 캡처해 넣고, 블로그 문체 규칙(1인칭·줄바꿈 리듬·표 없음·단점 한 단락)에 맞춰 작성. 네이버 저품질 채점 **최저 98/100 통과**(본문 충실도 98·원본성 100·안전 100·스타일 100).
- **자동 심사 예행**: 발행 결과를 흉내 낸 HTML(se-main-container + 서로 다른 사진 5장)을 실제 판정기(`checkBlogHtml`+`countPhotos`+`countBodyChars`)에 넣어 **6/6 통과** 확인 — 제목 낱말·본문 낱말 4개·자문자답 3회·사진 5장·본문 1,940자·광고 표시(첫 31자).
- **에디터 dry-run 통과**: 로그인 세션 유효, 이미지 5장 업로드·서식 12건 적용까지 확인(`_compose_check.png`).
- **발행 완료**: https://blog.naver.com/lyw2216/224404736518 (전체공개, 카테고리 '지원금 레이더').
- **한 바퀴 전부 실물로 확인** (`scripts/blog_event_live_run.mjs`):

| 단계 | 결과 |
|---|---|
| 이벤트 신청(새 계정) | 자동 심사 6/6 통과 → "이용권이 지급됐어요" |
| 지급 | `review-auto-…` · 0원 · **9/8 04:40 ~ 9/15 04:40 = 정확히 7일** |
| 선착순 자리 | 20 → **19** |
| 효력 | 전 회차 열림(잠금 0), 대시보드 "7일 남음" |
| 글을 비공개로 | 감사가 `revoked` — "비공개 글 입니다 — 이용권을 회수했습니다", 상태 `cancelled` |
| 다시 공개로 | 감사가 `restored` — 상태 `active` 복귀 |

- **찾아 고친 결함 3개**(모두 화면이 사실과 달랐다): ①결제 내역이 7일권을 "AI 채점 30일 이용권"이라 불렀다 ②대시보드가 "프리미엄 플랜 구독 중"이라 했다 ③받는 순간 "7일 뒤 만료 · 연장하세요"가 떴다. → `passLabel`/`isExpiringSoon`(`subscriptionDisplay.ts`)로 고치고 `check:blog-promo` 에 회귀 검사 6건. 판매 문구(5,500원·30일 무제한)는 운영자 지시대로 그대로 뒀다 — **무료로 들어가는 이용권만** 실제 이름·기간으로 부른다.
- **새 도구**: `naver-blog-uploader/set_visibility.py` — 발행한 글의 공개 설정만 바꾼다(지우지 않고 껐다 켤 수 있어야 회수·복구를 모두 볼 수 있다). 공개 범위를 바꾸면 "발행하시겠습니까?" 확인 창이 한 번 더 뜨는데, 이걸 안 누르면 화면만 바뀌고 저장되지 않는다(실측).
- 검사 계정(`eventlive+…@kptest.cloud`)과 지급 행은 남겨 두었다 — `blog_event_live_run.mjs cleanup` 으로 정리한다.

## 관리자 회원·결제 화면 페이지네이션 (work/admin-paging, 2026-09-08)

- 백로그: "관리자 회원·결제 화면 페이지네이션 — `listUsers({ perPage: 1000 })`·`subscriptions .limit(1000)` 을 100건 단위 이전/다음으로, 집계는 전체 기준 유지, `current_members.mjs` 도 같은 방식".
- 범위: 두 화면과 하위 컴포넌트 + 공용 헬퍼 2파일 + 스크립트. 결제 코드·DB·배포 무변경.

### 바꾼 것
- `src/lib/adminPaging.ts`(신설): `listUsersPage`(100명 한 쪽, 총원은 GoTrue X-Total-Count) · `listAllUsers`(100명씩 끝까지) · `fetchAllRows`(`.range()` 1000행씩 끝까지) · `parsePage`. auth-js 의 `lastPage`/`nextPage` 는 Link 헤더 page 값의 **첫 글자만** 읽어(`substring(0, 1)`) 10쪽부터 틀리므로 총원으로 직접 계산한다.
- `src/app/admin/(protected)/AdminPager.tsx`(신설): 서버 컴포넌트 이전/다음(주소 `?page=`), "1–100명 / 전체 147명 · 1/2쪽".
- 회원 화면 `members/page.tsx`: 한 쪽 100명. **총원**은 GoTrue 총원, **유료**는 활성 이용권(`status=active`·미만료) user_id 를 전량 읽어 distinct 로 센다(쪽만 세면 줄어든다). 이용권·환불 판정은 그 쪽의 100명 것만 `.in('user_id', …)` 로 읽는다. **검색**은 브라우저 안 필터(그 쪽만 걸러짐)에서 서버 검색(`?q=`, 전원을 100명씩 훑어 이메일·이름 대조)으로 — 한 쪽 안에서만 거르면 다른 쪽 회원을 못 찾는다. 범위 밖 `page=` 는 마지막 쪽.
- 결제 화면 `payments/page.tsx`: 날짜별 판매 합계는 **합계라서 이전/다음이 성립하지 않는다** — `.limit(1000)` 대신 `fetchAllRows` 로 전량(1000행씩 끝까지). 회원 대조용 `listUsers perPage 1000` → `listAllUsers`. 최근 결제 표는 20건씩 이전/다음(`?page=`, 60일 54건 → 3쪽).
- `scripts/current_members.mjs`: `per_page=1000` 한 번 → 100명씩 끝까지. 두 리포트(`report:payments`·`report:funnel-daily`)가 그대로 쓴다.
- `scripts/row_cap_check.mjs`: 없어진 자리 4곳을 목록에서 지우고, **목록이 실물과 어긋나면 exit 1** 로 대조하는 규칙을 추가. 그 규칙이 9/7 목록에 빠져 있던 상한 자리 4곳을 찾아냈다 — `src/lib/subscriberReport.ts:93`·`scripts/free_to_paid.mjs:61`·`scripts/inflow_to_payment.mjs:63`(각 perPage/per_page 1000 한 번)·`src/lib/accountDeletion.ts:33`(10쪽 반복이라 10,000명까지 안전). 목록에 올려 두기만 했다(수정 안 함, 이 항목 범위 밖).
- `scripts/admin_paging_check.mjs` + `npm run check:admin-paging`(신설): 임시 관리자 계정·로컬 운영빌드로 **실제로 눌러 본다** — 이전/다음 클릭, 총원·유료가 DB 직접 집계와 같은지, 마지막 쪽 회원이 검색으로 찾아지는지, `page=999` 클램프, 결제 표 3쪽 넘김. 다른 단추(삭제·유료 토글·재발급)는 누르지 않는다.

### 실행 결과(전부 2026-09-08)
- `tsc --noEmit` 0 · `eslint`(변경 파일) 0.
- `npm run check:row-cap` → exit 0: `page.tsx:24 subscriptions 33/1000(3%)` · 회원 146명/1000(15%) ×3 · accountDeletion 146/10000. "상한까지 여유 있음".
- `npm run check:admin-paging` → **13/13 통과**:
```
기대값 — 회원 147명(임시 계정 포함) · 유료 22명 · 2쪽, 마지막 쪽 47명
  ✓ 회원 1쪽 100명 — 100명 (기대 100)
  ✓ 회원 1쪽 안내 문구 — 1–100명 / 전체 147명 · 1/2쪽
  ✓ 1쪽에서 이전 잠김
  ✓ 1쪽에서 다음 열림
  ✓ 총원·유료가 DB 와 같음 — 전체 147명 · 유료 22명
  ✓ 다음 눌러 2쪽 도달 — 47명 (기대 47) · http://127.0.0.1:3118/admin/members?page=2
  ✓ 마지막 쪽에서 다음 잠김
  ✓ 이전 눌러 한 쪽 뒤로 — http://127.0.0.1:3118/admin/members
  ✓ 검색이 마지막 쪽의 회원을 찾음 — 'lix…@gmail.com' → 1명
  ✓ 범위 밖 page=999 → 마지막 쪽 — 47명 · 101–147명 / 전체 147명 · 2/2쪽
  ✓ 결제 1쪽 20건씩 — 20건 · 1–20건 / 전체 54건 · 1/3쪽
  ✓ 결제 다음 눌러 2쪽 — 20건 · http://127.0.0.1:3118/admin/payments?page=2
  ✓ 결제 이전 눌러 1쪽 — http://127.0.0.1:3118/admin/payments
관리자 쪽 넘김 검사 — 13항목 중 통과 13            (exit 0)
```
  첫 실행은 10/13 이었다 — 둘 다 검사 스크립트 쪽 결함(이전 클릭을 느슨한 URL 패턴으로 기다려 넘어가기 전에 통과, 결제 표 행 수를 날짜별 판매 표까지 세어 38건). 정확한 주소 대기·쪽 넘김이 붙은 절의 표만 세도록 고친 뒤 13/13.
- `npm run check:admin` → exit 0: 10면 중 10면 봄 · 명암비 1199개 중 미달 0 · 아이콘 1057개 중 0 · 휴대폰 기준 미달 0(권장 미달 34건은 종전과 같은 11px 배지·40px 단추, 새로 넣은 이전/다음·검색 단추는 44px).
- `npm run report:funnel-daily -- --date 2026-08-23` → "결제창 진입 0건 — 결제 활동 없음 (검증·탈퇴 계정 2건 제외)" — 9/7 과 동일(회원 필터가 100명씩 읽어도 같은 답).

### 지시문과 달랐던 점
- 회원 135명·이용권 30건이라 적혀 있었으나 실물은 회원 146명·subscriptions 33행(검사 중엔 임시 계정 포함 147명). 판단에 영향 없음.
- 결제 화면의 `.limit(1000)` 은 목록이 아니라 **합계**(날짜별 판매)라 "이전/다음"이 성립하지 않는다 — 전량을 쪽 단위로 끝까지 읽는 방식으로 상한만 없앴고, 이전/다음은 그 화면의 최근 결제 표(20건씩)에 붙였다.
- 대시보드 `src/app/admin/(protected)/page.tsx:24` 의 같은 `.limit(1000)` 은 지시 범위("두 화면") 밖이라 그대로 두었다 — `check:row-cap` 목록에 남아 있다. 결제 화면의 `loadSales` 와 같은 코드이므로 다음 항목에서 `fetchAllRows` 로 바꾸면 된다(한 줄).

## 라이브 새벽 검사 — 시험일정 시간대 수정 최종 확인 (work/live-dday-check, 2026-09-08 04:21 KST)

- 백로그: "⏸️ KST 00:00~09:00 사이에만 라이브 화면 검사로 시간대 수정 최종 확인" — 조건 충족(실행 시각 KST 04:21, 서버 UTC 날짜는 아직 9/7). 코드 무변경, 검사 실행·기록만.
- 실행: `npm run check:pages`(대상 https://kptest.cloud, 로그인 계정 생성→25화면→삭제). 시작 04:21:41 · 종료 04:22:40 KST. 결과 전문:

```
https://kptest.cloud · 훑은 화면 25개 (실글/KBS 두 모드)
응답 시간(검사 기준) — 중앙값 1805ms · 상위10% 1977ms · 최대 2099ms
느린 화면 3개:
  2099ms  silyong /dashboard
  1977ms  silyong /practice/areas
  1955ms  silyong /insights
문제 없음 ✓            (exit 0)
```

- 판정: **React #418 없음.** 검사는 `pageerror`·`console.error` 를 화면마다 모으고 하나라도 있으면 "콘솔:" 문제로 낸다. `/dashboard` `/cbt` `/practice` 계열 전부 `(main)/layout.tsx` 아래라 `ScheduleModal` 의 플로팅 버튼(접수 중이면 D-숫자 배지를 서버에서 그림)이 매 화면에 실렸으므로, 어긋났다면 잡혔다.
- 직접 증거 하나 더: 04:23 KST 에 `curl https://kptest.cloud/` 로 받은 **서버 렌더 HTML 에 `D-DAY`/`D-n` 배지가 0개**. 서버(UTC 9/7 19:23)가 로컬 날짜로 계산했다면 121회 "접수 중 D-DAY" 배지가 박혀 나왔을 자리다. 즉 서버도 한국 날짜(9/8, 접수 마감)로 판정하고 있다 — `8fce1e2` 가 라이브에 올라가 작동 중.
- 지시문과 달랐던 점: 없음.
- **검수 통과** (main, 2026-09-08): 코드 변경 없음(REPORT.md만), 백로그 시간대·범위 조건 충족 확인. `npm run check:pages` 재실행으로 재현 — `문제 없음 ✓`, 25화면·중앙값 1836ms대(실행마다 수치는 다름, 형태 일치), 계정 정리 로직이 생성한 userId로만 스코프됨을 스크립트에서 직접 확인. main에 병합, work/live-dday-check 삭제.

## 유료 회원 "AI 첨삭 30회 제한?" 문의 — 한도 초기화 시각·문구 정정 (관리자 직접, main, 2026-09-08)

- 문의(9/7 23:50, 유료·이용권 9/27까지): "유료인데 AI 첨삭이 30회로 제한". 사실: `antiSharing.DAILY_GRADE_LIMIT=30` 은 계정 공유·자동화 남용을 막는 하루 상한이고 구독 화면(`/subscribe`)과 약관에 고지돼 있다. 그러나 ①대시보드 카드가 "무제한 AI 첨삭"이라고 말했고 ②하루 기준이 서버(UTC) 날짜라 **한국 시간 오전 9시**에 풀려, 밤에 걸린 사람은 "내일 다시"라는 안내대로 자정을 넘겨도 계속 막혔다.
- 수정: `todayKey()` → `kstYmd()`(한국 자정 초기화), 한도 문구에 "매일 30회·한국 시간 자정" 명시, 대시보드 "무제한" 제거, 고객센터 FAQ 한 줄. KBS패스에도 같은 수정.
- 답: 관리자 답글(해결 띠)로 사유·자정 초기화·필요 시 늘려 드림을 전달. 연락처는 휴대폰 번호라 사람이 문자로 답할 수도 있다.
- 운영자 결정(2026-09-08): **상한은 그대로 두되 걸리면 설명 창**. `src/components/grading/DailyLimitDialog.tsx` — 이유(계정 공유·자동화 방지), 한국 자정까지 남은 시간(Asia/Seoul 로 계산), 오늘 결과는 남아 있음, 궁금하면 고객센터 문의(늘려 준다는 약속은 하지 않음 — 운영자 지시). 한도 값·문구·판별(`isDailyLimitMessage`)을 `src/lib/antiSharingLimits.ts`(import 없는 순수 파일)로 빼 서버(`antiSharing`)와 세 화면(`EssayGrader`·`ManuscriptEditor`·`PracticeEssay`)이 같은 문구를 쓴다. `npm run check:limit-dialog` 가 문구 판별·배선을 대조(8/8). KBS패스에도 같은 코드.

## 회원 탈퇴 기능 (관리자 직접, main, 2026-09-07 — 고객센터 문의 "회원 탈퇴 하고 싶어요 어디서 신청하나요")

- 문제: 탈퇴할 길이 없었다. 개인정보처리방침은 "탈퇴를 통해 동의를 철회할 수 있다"고 적어 두었는데 실제로는 관리자에게 부탁하는 수밖에 없었다.
- 만든 것: `/account`(내 정보·이용권·학습 기록 수 + 탈퇴 절, `DeleteAccountForm` — 동의 체크 + "탈퇴" 낱말 입력) → `deleteMyAccount` 서버 액션 → `/account/deleted`. 내비 오른쪽 위 [계정]·이메일 링크, 모바일 메뉴 [계정 관리], 고객센터 FAQ 한 줄.
- **결제 기록 보존**: `subscriptions.user_id` 가 CASCADE + NOT NULL 이고 마이그레이션 036 이 **라이브에 미적용**(null 삽입 23502 실측)이라 그냥 지우면 결제 기록이 사라진다. SQL 편집기는 사람만 열 수 있으므로 마이그레이션 없이 되는 방법으로 — 결제 행을 시스템 계정 `withdrawn-ledger@kptest.cloud` 로 옮긴 뒤 사람만 지운다(`src/lib/accountDeletion.ts`). 관리자 회원 삭제도 같은 함수를 쓴다(예전엔 036 미적용이면 던지고 끝났다). 036 이 적용된 뒤에도 그대로 동작한다.
- 잡은 결함: 보관 계정 생성이 GoTrue 500 — 비밀번호를 UUID 둘로 이어 73자였는데 bcrypt 한도가 72자. 서버 액션이 던지면 손님은 오류코드만 있는 화면을 보므로 모든 실패를 말로 돌려주고 운영자 알림을 남기게 했다.
- 검사: `scripts/account_delete_check.mjs` + `npm run check:account` — 계정 생성 → 시험 세션·0원 결제 행 심기 → 로그인 → 낱말 없이는 버튼 잠김 → 탈퇴 → 완료 화면 → 세션 끊김 → 계정 404 · 세션 삭제 · 결제 행이 보관 계정으로 귀속. 로컬 7/7, 라이브는 배포 뒤 재실행(아래).
- **추가(사용자 지시 "조금 하기 어렵게", "그 사람에게 주소를 알려줘")**: ①탈퇴 문턱 셋 — 사유 선택(필수, `DELETE_REASONS`)·가입 이메일 그대로 입력·브라우저 확인 창. 사유는 `feedback`(`#account/delete-reason`)에 글로 남는다(삭제 뒤 user_id NULL). ②**운영자 답글** — 해결 띠 본문이 8/28 한 건("결과 다시 보기")에 맞춰 굳어 있어 어떤 문의에도 그 글이 떴다. 관리자 '처리함'에 답글 칸을 두고 `page_views`(`#event/feedback_reply`, visitor_id=문의 id)에 저장, 대시보드 띠가 문의별 답글(주소는 링크로)을 보여 준다. 문의한 분께는 이 경로로 `https://kptest.cloud/account` 를 실었다(운영자 대신 관리자 계정 없이 서비스 키로 기록). `check:account` 9/9(이메일 대조·확인 창 취소·사유 기록 포함).

## 블로그 후기 이벤트를 '확실하게' — 문을 만들고 안전장치를 맞춤 (관리자 직접, main, 2026-09-07)

- 출발점: 두 사이트 모두 참여 0건(감사 로그 `checked:0` 만 반복). 이벤트 페이지로 가는 길이 구독 화면의 한 줄 링크뿐이었고(첫 화면 팝업은 정책상 꺼짐), 두 저장소가 갈라지면서 서로의 안전장치가 빠져 있었다.
- **문(진입점)**: `src/components/blog/BlogReviewEventCard.tsx` 신설 — 블로그 글 하단(`blog/[slug]/page.tsx`, PromoBanner 아래)과 대시보드(바로가기 카드 위)에 "후기 쓰면 이용권 7일 · 사진 5장 · 1,500자 · 광고 표시 · 선착순 N자리" 카드. 블로그 글은 정적 생성이라 자리 수는 브라우저에서 `/api/promo/quota` 로 읽는다(서버에서 세면 빌드 시점 숫자가 굳어 마감 뒤에도 카드가 남는다). 마감이면 카드를 지우고, 세기에 실패하면 숫자만 비운다.
- **안전장치 맞춤**: KBS패스에만 있던 "선착순 한도 회귀검사"(자동 지급·관리자 승인이 같은 자리를 쓰는지, 회수된 자리 반환, 마감이어도 접수)를 `check:blog-promo` 에 가져옴.
- **중복 검사 창 제거**: `blog-review-actions.ts` 가 최근 500건만 훑어 같은 글을 견줬다 — 500건이 넘으면 옛 신청이 창 밖으로 밀려 같은 글이 다시 통한다. 주소 경로로 `ilike` 좁혀 뽑은 뒤 다듬은 값으로 정확히 견주도록 바꿈(한도 50).
- **팝업 날짜**: `EventPopup.tsx` 의 `daysUntil` 이 ScheduleModal 과 같은 로컬 날짜 계산이었다(켜는 순간 새벽 hydration 불일치 예정). `examDday.daysUntil`(한국 날짜)로 교체.
- **문구**: 이벤트 페이지 "잠긴 모의고사 전 회차" → "모의고사 전 회차"(KBS패스 9/6 수정분 이식).
- 실행: `tsc` 0 · `eslint` 0 · `check:blog-promo` 전 항목 통과(라이브 e2e 포함: 접수·중복 차단·승인 1회·회수) · `check:blog-cta` 통과.
- 남은 것(정책): 첫 화면 팝업은 "실제 통과 사례 1건" 뒤에 켠다는 규칙 유지. 카드가 들어갔으니 참여가 생기면 `check:audit-revoke`·3시간 감사가 그대로 돈다.

## 시험일정 '오늘'을 한국 날짜로 — 서버(UTC) 새벽 hydration 불일치 예방 (관리자 직접, main, 2026-09-07)

- 계기: 자매 저장소 KBS패스에서 2026-09-07 새벽 KBS 모드 7화면에 React #418 발생. 원인은 `ScheduleModal` 이 `new Date()` **로컬 날짜**로 '오늘'을 잡는 것 — Vercel 서버는 UTC 라 한국 새벽 0~9시엔 서버의 오늘이 하루 전이고, 접수 경계일엔 상태("접수 예정"↔"접수 중")가, 접수 중엔 D-숫자가 서버·브라우저에서 달라진다. 이 저장소의 `ScheduleModal` 은 같은 코드였고 **제121회 접수 마감이 2026-09-07** 이라 9/8 00:00~09:00 KST 에 kptest.cloud 에서 같은 사고(서버 "접수 중 D-0" vs 브라우저 "접수 마감")가 예정돼 있었다.
- 변경: `src/lib/examDday.ts` 신설(Intl Asia/Seoul 로 오늘, `Date.UTC` 날짜 번호로 비교, `roundStatus`/`daysUntil`/`primaryRound`), `ScheduleModal` 은 이 함수만 쓴다(자체 `startOfToday`/`daysBetween`/`statusOf` 제거). 화면 문구·구조 무변경.
- 검사: `scripts/exam_dday_check.mjs` + `npm run check:dday` — 마감 당일 새벽(2026-09-06T23:30Z)·마감 직후 자정(2026-09-07T15:00Z)·시험일·122회 접수 시작 등 7순간을 TZ=UTC 와 TZ=Asia/Seoul 자식 프로세스로 계산해 같은 답인지 대조. 실행 결과 7/7 통과, `tsc` 0, `eslint` 0.
- 라이브 확인: 9/8 새벽 0~9시에 `check:pages` 0건이면 완결(관리 틱에서).

## 결제 퍼널 일일 요약에 회원 필터 + 1000행 상한 대비 검사 (관리자 직접, main, 2026-09-07)

- 백로그: "결제 퍼널 일일 요약에 회원 필터 붙이기" · "1000행 조용한 상한 대비 검사"
- 범위: 스크립트만(조회 전용). `src/`·DB·배포 무변경.

### 1. 회원 필터 — `scripts/current_members.mjs` 신설, 두 리포트가 같이 쓴다

- `payment_attempt_report.mjs:38-47` 에 있던 "지금 회원인 사람만" 로직을 `fetchMemberIds(ENV)`·`splitByMembership(items, ids)` 로 빼고, `payment_funnel_daily.mjs` 도 같은 함수를 부른다. 제외 건수는 두 리포트 모두 출력한다.
- 함께 고친 것: 0건 경로의 `process.exit(0)` 을 없앴다. fetch 연결이 남은 채 강제 종료하면 Windows Node 가 `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` 로 0이 아닌 코드를 내며 죽는다(이번 검증 중 실측). 본문을 `printFunnel()` 로 감싸 자연 종료로 바꿨다.
- 실행 결과
  - `report:funnel-daily -- --date 2026-08-23` → 종전 "진입 2건(2명) → 시도 0건" 이 **"결제창 진입 0건 — 결제 활동 없음 (검증·탈퇴 계정 2건 제외)"** 로 바뀜, exit 0. 설계서(`docs/checkout_dropoff_plan.md`)가 예상한 그대로.
  - `-- --date 2026-09-05` → "진입 1건(1명) → 시도 1건 → 완결 1건, 사람 완결률 100%" — 종전과 동일(회원 건이라 필터 영향 없음).
  - `report:payments` → "(탈퇴·검증 계정 5건 제외) … 사람 단위 29/31명 완결" — 종전과 동일 출력.

### 2. `scripts/row_cap_check.mjs` + `npm run check:row-cap`

- 상한을 박은 자리 5곳(관리자 화면 4 + 위 회원 필터의 per_page=1000)의 실제 행 수를 `HEAD … Prefer: count=exact` 로 세어 상한 대비 % 를 출력, 80% 이상이면 exit 1.
- 덤으로 `src/` 전체에서 `.range/.limit/.single` 없이 전량을 읽는 select 를 훑어, 가리키는 테이블이 500행 이상인 자리만 나열한다(수정 금지, 자리 목록이지 결함 목록이 아님 — 필터가 붙은 조회는 실제 행이 더 적다).
- 실행 결과(2026-09-07): `subscriptions` 30행(3%) · 회원 135명(14%) → **상한까지 여유 있음, exit 0**. 전량 읽기 자리 중 큰 테이블: `questions`(연습 화면 다수)·`quiz_answers` 3,673행(result/insights/wrong)·`page_views` 11,770행(resolved-notice-actions·admin feedback). `quiz_answers`·`page_views` 는 사용자/기간 필터가 붙어 있어 지금은 잘리지 않으나, 무필터 집계를 추가할 때는 이 목록을 먼저 볼 것.
- 다음 항목 후보(별도): 회원이 800명을 넘기 전에 관리자 회원·결제 화면과 `current_members.mjs` 에 페이지네이션.

### 검수 통과 (리뷰어, 2026-09-08)
- diff 재확인(`main..work/admin-paging`, 11파일): 결제 코드(`api/portone/**`, 결제창 호출부, 금액·상품 정의) 무변경, DB 스키마·마이그레이션 없음, 삭제·환불 실행 없음.
- `tsc --noEmit` 0 · `eslint`(변경 파일 9곳) 0.
- `npm run check:row-cap` 재실행 → exit 0, REPORT 표와 일치("상한까지 여유 있음").
- `npm run check:admin-paging` 재실행 → **13/13 통과**, REPORT 로그와 항목·숫자 동일 재현(회원 147명·유료 22명·2쪽, 결제 54건·3쪽). 검증용 계정 1개(uid 스코프) 삭제, 시드 전체 삭제 없음 — `git status` 로 잔여 없음 확인.
- 집계(총원·유료·매출)가 전체 기준으로 유지됨을 diff에서 확인 — `countPaidMembers`·`loadSales` 모두 `fetchAllRows`/`listAllUsers` 로 전량을 읽은 뒤 집계.
- main에 병합(`--no-ff`), BACKLOG 체크, work/admin-paging 삭제. origin push는 아직 안 함.

## 무료 체험에서 유료로 넘어간 비율 (work/free-to-paid)

- 날짜: 2026-09-05
- 백로그: "무료 체험에서 유료로 넘어간 비율 `scripts/free_to_paid.mjs`"
- 범위: **읽기 전용.** Supabase REST 는 전부 GET, 포트원은 `getPayments` 조회만. 개인정보는 id 앞 8자만 출력. 표본 10명 미만인 층은 비율(%) 없이 인원수만.

### 지시문과 달랐던 점 (중요)

- **`subscriptions` 의 무료 발급(amount=0)은 전체 29행 중 1행뿐이다** (6/16 `goodwill-…`, 환불 고객 사후 보상). 지시문대로만 세면 표본 1명, 게다가 그 1명은 결제(6/12)가 무료 발급보다 먼저라 "무료→유료 전환"이 아니다. 이 층으로는 아무 결론도 낼 수 없다.
- 이 서비스의 실제 "무료 체험"은 구독 행이 아니라 **①모의고사 무료 회차**(`src/lib/programs.ts` freeRounds=2, 로그인만 하면 구독 없이 1~2회차를 푼다) **②무료 AI 분석 3회**(`src/lib/aiTrial.ts` FREE_AI_TRIAL, 주석에 "전환율 레버"라고 적혀 있다)다. 백로그의 "왜"(무료 회차 수 재검토)가 가리키는 것도 ①이다. 그래서 스크립트는 지시문 그대로의 층 ①에 더해 대리 지표 ②③을 따로 낸다. 세 층은 모집단이 달라 합치지 않는다.
- 결제 사실은 **포트원 원장**(PAID·CANCELLED·PARTIAL_CANCELLED, `customer.id` = 회원 id)에서만 읽었다. `subscriptions` 유료 행에는 원장과 어긋난 수기 행(`sub_a336`·`demo-promo`)이 있어 기준으로 쓰지 않았다.
- "결제 전에 체험한 사람"만 체험자로 친다. 결제한 뒤 1·2회차를 푸는 것은 체험이 아니므로 첫 무료 세션 시각 < 첫 결제 시각인 사람만 센다.

### 결과 (실제 실행 출력, `npm run report:free-to-paid`, 2026-01-01 ~ 09-05)

```
회원 130명 · 원장 결제자 28명(현재 회원 28명)

① 무료 발급(subscriptions.amount=0) 받은 사람 → 이후 유료 결제
   무료 발급 1건 / 1명 (subscriptions 전체 29행)
   user=e00e0952 무료 goodwill    2026-06-17 — 결제(2026-06-12)가 무료 발급보다 먼저였다: 전환이 아니라 사후 보상
   ⇒ 무료 발급 1명 중 이후 유료 결제 0명
   ⚠ 표본 10명 미만 — 비율을 내지 않는다. 이 층으로는 결론을 낼 수 없다

② 무료 회차(실용글쓰기 1~2회차)를 결제 전에 풀어 본 사람 → 이후 유료 결제  [대리 지표]
   모의고사 세션 215건 / 76명 · 그중 결제 전에 무료 회차를 시작한 사람 67명
   ⇒ 무료 회차 체험 67명 중 이후 유료 결제 18명 (27%)
      첫 무료 세션 → 첫 결제: 중앙값 0일 · 최소 0일 · 최대 86일
      분포: 당일 13명 · 1~3일 3명 · 4~7일 1명 · 8~14일 0명 · 15일+ 1명
        user=5d5196b0 무료 2026-06-02 → 결제 2026-08-27 (86일) [취소됨]
        user=be2644ee 무료 2026-06-08 → 결제 2026-06-11 (2일) [취소됨]
        (나머지 16명: 당일 13 · 2~3일 2 · 7일 1 — 전원 PAID)
   결제자 28명 쪽에서 보면: 무료 회차를 먼저 풀어 본 사람 18명 (64%), 안 풀고 바로 결제 10명(그중 모의고사 기록이 아예 없는 사람 2명)

③ 무료 AI 분석(3회)을 결제 전에 써 본 사람 → 이후 유료 결제  [대리 지표, #event/ai_trial_used 기준]
   이벤트 41건 / 현재 회원 19명 · 그중 결제 전에 쓴 사람 19명
   ⇒ 무료 AI 체험 19명 중 이후 유료 결제 11명 (58%)
      첫 사용 → 첫 결제: 중앙값 0일 · 최소 0일 · 최대 6일
```

### 읽는 법과 결론 (표본 67명·19명 — 방향은 읽히지만 단정은 아님)

- **무료 회차를 푼 사람 67명 중 18명이 결제했다.** 그중 2명은 첫 결제가 취소된 건이다 — `5d5196b0`은 운영자 본인 계정의 8/27 카카오페이 확인 결제(앞선 조사에서 확인, 86일 이상치의 정체), `be2644ee`는 6/11 결제 1분 뒤 환불. 이 둘을 빼면 **실결제 16명, 전원 첫 무료 세션 후 7일 안**, 그중 13명은 **같은 날** 결제했다.
- **무료 회차는 결제 직전 단계로 기능하고 있다.** 결제자 28명 중 18명(64%)이 결제 전에 1~2회차를 풀었고, 결제까지의 간격이 대부분 0일이다. "무료로 풀어 보고 → 3회차가 잠긴 걸 보고 → 그 자리에서 산다"는 흐름이 숫자로 보인다. 무료 회차 수(2회)를 줄일 근거는 없다 — 오히려 체험 없이 결제한 10명 중 8명도 모의고사 기록은 있어(결제 뒤 시작), 시험 화면이 결제 동기임은 같다.
- **무료 AI 분석은 더 강한 신호다.** 결제 전에 써 본 19명 중 11명(58%)이 결제했고 전원 6일 안. 다만 이 19명은 이미 모의고사를 끝까지 푼 사람들이라 원래 결제 의향이 높은 집단이다 — AI 체험이 원인인지, 의향 높은 사람이 AI까지 써 본 것인지는 이 숫자로 가를 수 없다.
- **이어지지 않는 쪽도 봐야 한다.** 무료 회차 체험자 67명 중 49명은 결제하지 않았다. 대부분이 같은 날 결정하는 구조라, 이 49명은 "나중에 살 사람"이라기보다 첫날 떨어져 나간 사람으로 봐야 한다. 다음 개선을 전환에 건다면 대상은 이 49명이 무료 2회차를 끝냈는지·어디서 멈췄는지다(이 스크립트 범위 밖).
- 비율(%)은 지시대로 표본 10명 이상인 층에만 붙였다. 한 자릿수 층(①)은 인원수만.

### 검산 (독립 경로)

- 원장 대신 `subscriptions` 유료 행(started_at, 수기 행 2건 제외)으로 같은 질문을 던지면 결제자 26명 중 무료 회차 선행 17명. 원장 기준(28명 중 18명)과의 차이 2명은 6월 결제 직후 환불돼 구독 행이 없는 `sub-44e3`·`sub-c0ba`(revenue_integrity_check 가 이미 잡아 둔 건) — 원장이 2명 더 세는 것이 맞다.
- AI 체험: page_views 원본에서 `#event/ai_trial_used` 를 남긴 계정 24개(탈퇴 5 포함) 중 결제 11명 — 스크립트의 11명과 일치.
- 결제자 28 = 무료 회차 선행 18 + 비선행 10, 합계 검산 일치.

### 변경 파일

- `scripts/free_to_paid.mjs` (신규)
- `package.json` (`report:free-to-paid` 1줄 추가)
- `REPORT.md` (본 절)

### 테스트 방법과 실제 실행 결과

- `npm run report:free-to-paid` → 위 인용 블록 그대로 출력, exit 0.
- `npm run report:free-to-paid -- --from 2026-06-01` → 데이터가 전부 6월 이후라 동일 결과(회원 130·결제자 28·67명 중 18명·19명 중 11명).
- `node --experimental-strip-types --no-warnings scripts/free_to_paid.mjs --from x` → "날짜 형식이 아니다: x (YYYY-MM-DD)", exit 1.
- 실행 중 DB 쓰기 없음(코드상 `fetch` 는 전부 기본 GET, 포트원은 `getPayments` 만). `.env.local` 값 미노출.
- 실물 대조 중 발견한 부수 사실(수정하지 않음): `ai_trial_usage` 표가 프로덕션에 없다(PGRST205) — 마이그레이션 035 미적용 상태로, `readTrialUsed` 는 `app_metadata` 폴백으로 동작 중. 035의 동시성 수정이 아직 살아 있지 않다는 뜻이다. DB 마이그레이션은 NEED_HUMAN 대상이라 여기 적어 두기만 한다.

### 검수 통과 (리뷰어)

- 커밋 `5fd61db` diff 재확인: `REPORT.md`·`package.json`(스크립트 1줄)·`scripts/free_to_paid.mjs`(신규) 3건뿐. `src/`·DB 스키마·배포 관련 변경 없음.
- 스크립트 실물 확인: Supabase 호출은 전부 기본 `fetch`(GET), 포트원은 `getPayments` 조회 1건뿐 — 쓰기·삭제·취소 계열 호출 없음. `id8()` 로 모든 사용자 id를 앞 8자까지만 출력. 표본 10명 미만 층은 `share()` 가드로 비율을 내지 않음(①이 실제로 그렇게 출력됨).
- `npm run report:free-to-paid` 재실행 → REPORT에 인용된 출력과 정확히 일치(회원 130명·원장 결제자 28명, ① 1명 중 0명, ② 67명 중 18명(27%), ③ 19명 중 11명(58%)).
- 실행 후 `git status` 로 워킹트리 변화 없음 확인 — 주장대로 읽기 전용.
- 지시문과 실물이 다르다는 점(무료 발급 행이 1건뿐)을 숨기지 않고 앞세워, 대리 지표 ②③을 별도로 낸 점이 백로그의 "왜"에 더 부합함을 확인.
- main에 fast-forward 병합.


## 유입 경로별 결제 전환 (work/inflow-to-payment)

### 검수 통과 (리뷰어)

- diff는 `REPORT.md`·`package.json`(스크립트 1줄)·`scripts/inflow_to_payment.mjs`(신규) 3건뿐. `src/`·DB·배포 무변경.
- 스크립트 실물 확인: 포트원 호출은 `client.payment.getPayments` 조회뿐, Supabase 호출도 전부 GET(`fetch` 기본 메서드) — 쓰기·삭제 없음.
- `npm run report:inflow` 재실행 → REPORT 인용 블록과 완전히 일치(원장 40건/22명·완결20/20, 비콘 payment_started 40건/25브라우저 등).
- `npm run report:inflow -- --days 7` 재실행 → "진입 12건/11명·완결 9건/9명" REPORT 기재와 일치.
- `npm run report:inflow -- --days x` 재실행 → 에러 메시지 일치, 종료 코드 1 확인.
- 개인정보: 집계표에 customerId 미노출(요구한 id 앞 8자보다 더 보수적), referrer는 호스트명만 출력됨을 코드·출력에서 확인.
- 지시문 전제("가입 시 기록된 referrer·utm") 불일치를 실물 대조로 확인 후 대리 지표로 보완한 처리 타당.
- main에 fast-forward 병합, BACKLOG 항목 `[x]` 처리, work 브랜치 삭제 완료.

- 날짜: 2026-09-05
- 백로그: "유입 경로별 결제 전환 `scripts/inflow_to_payment.mjs`"
- 범위: **읽기 전용.** 포트원 `getPayments`·Supabase REST 조회만. 추적 코드·외부 분석도구 추가 없음. 고객 식별값은 출력하지 않고(집계만), referrer 는 호스트명만.

### 지시문과 달랐던 점 (중요)

- **"가입 시 기록된 referrer·utm"은 존재하지 않는다.** 실물 대조: 회원 130명의 `user_metadata` 키는 avatar_url·email·name·provider_id 등 OAuth 프로필뿐이고 `app_metadata`는 provider·ai_trial_used 뿐. public 스키마 11개 테이블 중 유입 관련 열은 `page_views.referrer` 하나다. 가입 이벤트(`signup`)의 meta 도 provider(email/google)만 싣는다(`src/app/(auth)/signup/page.tsx:71`, `src/app/auth/callback/route.ts:49`).
- 따라서 지시문 그대로면 결제 시도자 **전원 "미상"** 이 되어 표가 한 줄이다. 그래서 스크립트는 ①지시문대로의 원장 표(전원 미상 + "수집 안 되고 있음" 명시)에 더해 ②**대리 지표**로 비콘(`page_views`)에서 `payment_started`를 찍은 브라우저의 최초 방문 referrer·결제 세션 referrer를 세는 표를 낸다. ①과 ②는 조인 키가 없어 **서로 이어지지 않는 별개 모집단**이며 출력에 그렇게 적었다.
- 지시문의 "결제창 완결률 9건 중 5건"은 8/28 시점 숫자다. 지금 30일 기준은 원장 20/22명(진입 40건/22명 → 완결 20건/20명).

### 결과 (실제 실행 출력, `npm run report:inflow`, 2026-08-06 ~ 09-05)

```
① 원장(포트원) 기준 — 탈퇴·검증 계정 5건 제외, 현재 회원 130명 기준
   결제창 진입 40건/22명 · 완결 20건/20명
   경로      진입(명)  완결(명)
   미상          22       20
   ⚠ 가입 시 유입 정보(referrer·utm)는 수집 안 되고 있음

② 비콘(page_views) 기준 — payment_started 40건/25브라우저 · purchase_success 22건/20브라우저
   (a) 브라우저의 최초 방문 referrer            진입  완결   주 도착 페이지
   search.naver.com                               8     8   /×3, /blog/category/guide×2
   blog.naver.com                                 5     5   /×5
   m.search.naver.com                             5     3   /blog/category/guide×2, /blog/실글패스-무료-기능-총정리×1
   chatgpt.com                                    2     2   /×2
   m.blog.naver.com                               2     1   /×2
   직접 유입 / 앱 (referrer 없음)                 1     0   /×1
   로컬 개발 브라우저 (127.0.0.1)                 1     1   /dashboard×1
   google.com                                     1     0   /×1
   (b) 결제 시도 세션의 첫 페이지 referrer: search.naver 7/6, m.search.naver 6/3, 직접 4/3, blog.naver 4/4, google 2/2, chatgpt 2/2
```

### 읽는 법과 결론 (단정 아님 — 표본 25브라우저)

- **결제창까지 온 사람은 어느 경로에서 왔든 대부분 낸다.** 원장 22명 중 20명, 비콘 25브라우저 중 20. 경로별로 봐도 네이버 검색 8/8, 네이버 블로그 5/5, chatgpt 2/2. 완결이 빠진 5건은 m.search.naver 2, m.blog.naver 1, 직접 1, google 1로 흩어져 있어 특정 경로의 결제 문제로 보이지 않는다.
- **유입은 사실상 네이버 한 곳이다.** 최초 방문 기준 25 중 20이 네이버(검색 13 + 블로그 7). 그 다음이 chatgpt 2, google 1. 병목이 "결제수단"이 아니라 "결제창에 오는 사람 수"라는 앞선 결론과 맞고, 그 사람 수가 **단일 채널(네이버 검색·블로그)에 의존**한다는 점이 새로 보인다. 다음 개선을 유입에 건다면 네이버 검색 노출(블로그 글·가이드 카테고리)이 가장 짧은 지렛대고, 구글은 30일간 결제 시도자 1명뿐이라 별도 여지가 있다.
- **주 도착 페이지는 홈(`/`)과 `/blog/category/guide`.** 블로그 글이 결제자의 첫 접점인 경우가 실제로 있다(`실글패스-무료-기능-총정리` 1건 포함).
- 로컬 개발 브라우저(127.0.0.1 → /dashboard) 1건은 사람 유입이 아니라 개발자 발자국이다. 숨기지 않고 이름을 붙여 표시했다(제외하면 24브라우저).
- 비율(%)은 일부러 쓰지 않았다. 한 자릿수 표본에 비율을 붙이면 과대해석된다.

### 무엇을 남겨야 하는가 (구현하지 않음 — 범위 밖)

지금 구조에서 "가입자별 유입 경로"를 알려면 **가입 시점에 브라우저가 이미 갖고 있는 정보를 회원에 붙여 두기만** 하면 된다. 개인정보를 늘리지 않는 최소안:

1. **첫 방문 정보를 브라우저에 보관**: `TrafficTracker`가 `kpt_vid`를 처음 만들 때 `document.referrer`의 **호스트명**, 도착 `pathname`, 그리고 URL의 `utm_source/medium/campaign`(있을 때만)을 localStorage 에 함께 저장. 전체 URL·쿼리는 저장하지 않는다.
2. **가입 시 회원에 부착**: 이메일 가입은 `supabase.auth.signUp({ options: { data: { signup_referrer_host, signup_landing_path, signup_utm_source, … } } })`로 `user_metadata`에 싣고, OAuth 가입은 `/auth/callback` 의 `signup` 서버 이벤트 meta 에 같은 값을 붙인다(현재 provider만). 이 스크립트의 `inflowOf`는 `referr|utm|source|landing` 키를 자동 탐지하므로 **키가 생기면 ① 표가 그대로 채워진다.**
3. **utm 은 비콘에도 없다**: `/api/track`는 `pathname`만 받으므로 utm 을 붙인 링크를 뿌려도 어디에도 남지 않는다. 페이지뷰 비콘에 utm 3개를 선택적으로 실어 `page_views.referrer` 옆에 저장하려면 열 추가(DB 스키마 변경 → NEED_HUMAN)가 필요하다. 열 없이 하려면 referrer 문자열에 `?utm_source=…`를 덧붙이는 편법이 있으나 관리자 트래픽 화면의 호스트 분류를 흔들 수 있어 권하지 않는다.
4. 원장↔비콘 조인(결제 건별로 클라이언트 유입을 묻는 것)은 `docs/checkout_dropoff_plan.md` ②(C)의 paymentId 전달과 같은 문제이며 결제 코드(`PaymentButton.tsx`) 변경이라 NEED_HUMAN 대상이다. 위 1·2만으로도 "가입자 기준 경로별 결제 전환"은 나온다.

### 변경 파일

- `scripts/inflow_to_payment.mjs` (신규)
- `package.json` — `report:inflow` 항목 추가
- `REPORT.md` (본 절)

### 테스트 방법과 실제 실행 결과

- `npm run report:inflow` → 위 출력, 종료 코드 0.
- `npm run report:inflow -- --days 7` → 7일 창(8/29~9/5) 원장 진입 12건/11명·완결 9건/9명 출력 확인.
- `npm run report:inflow -- --days x` → "--days 는 1~365 정수여야 한다: x" 출력 후 종료 코드 1.
- 대조: `npm run report:payments -- --from 2026-08-06` → "탈퇴·검증 계정 5건 제외 / 건 단위 20/40건 완결" — 이 스크립트의 원장 숫자(40건 진입·20건 완결·5건 제외)와 일치.
- 합계 검증: ②(a)·(b) 각 표의 진입 합은 25 = payment_started 브라우저 수.
- `git status`: 변경은 위 3개 파일뿐. `src/`·DB·배포 무변경.

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

## 서버 액션 본인 확인 감사 (work/fable-codex-action-auth-audit, 2026-09-12, 워커 Codex)

실물: 19개 use-server 파일, export async 41개(전부 함수 선언); actions.ts 13개 포함. 주석 속 지시문은 제외, 인라인 액션 없음. 아래는 수정 후 상태이며 묶은 함수도 전부 나열했다.
경로 M=`src/app/(main)/`, A=`src/app/admin/(protected)/`, L=`src/lib/`; ① U=getUser, G=관리자 헬퍼 내부 getUser, ×=없음; ② A=assertAdmin, R=requireAdmin, —=비관리자; ③ S=본인 ID, P=본인 부모행을 먼저 확인, A=관리자 권한+대상 지정, ×=권한 없는 대상 지정; ④ 직접 DB/Auth/Storage 쓰기 error 수신, —=직접 쓰기 없음. ★=service_role 쓰기(위임 포함).
| 파일 | 함수 | ①②③④ | 처리 |
|---|---|---|---|
| M account/actions.ts ★ | deleteMyAccount | U/—/S/× | 사람 확인 필요: feedback insert 오류 미수신, 결제 보관·탈퇴 위임이라 미수정 |
| M cbt/actions.ts ★ | gradeExamEssay | U/—/P/✓ | 본인 session → answerRow.id로 캐시 갱신; 유지 |
| M cbt/actions.ts | createSession, getOrCreateExamSession | U/—/S/✓ | insert user_id=user.id; 유지 |
| M cbt/actions.ts | findResumableExamSession | U/—/—/— | 본인 세션 읽기; 유지 |
| M cbt/actions.ts | saveExamProgress | U/—/S/✓ | id+user_id 조건; 유지 |
| M cbt/actions.ts | submitSession | U/—/P/✓ | 본인 세션 선조회 후 session_id 답안 upsert·세션 갱신; 유지 |
| M manuscript/actions.ts | gradeManuscript | U/—/S/✓ | insert user_id=user.id; 유지 |
| M practice/actions.ts ★ | gradeEssayPractice | U/—/S(위임)/— | 사용량에 user.id 전달; 직접 저장 없음 |
| M practice/actions.ts | getPracticeProgress | U/—/—/— | 본인 세션 읽기; 유지 |
| M practice/actions.ts | savePracticeProgress | U/—/S/✓ | 세션 insert error 수신·throw 추가 |
| M resolved-notice-actions.ts ★ | acknowledgeResolvedNotices | U/—/P/✓ | 본인 feedback만 이벤트로 저장; insert error 수신·throw 추가 |
| M review/actions.ts ★ | submitReview | U/—/S/✓ | 삭제 user_id 조건·삽입 user_id 고정; 유지 |
| M subscribe/blog-review-actions.ts ★ | submitBlogReview | U/—/S/✓ | 사람 확인 필요: 구독 발급 영역, 직접 쓰기 누락 없음·미수정 |
| M subscribe/promo-actions.ts ★ | redeemPromoCode | U/—/S/✓ | 사람 확인 필요: 구독 발급 영역, 직접 쓰기 누락 없음·미수정 |
| A alertChannelActions.ts | sendTestAlert | G/A/—/— | 관리자 이메일 allowlist; 유지 |
| A feedback/actions.ts ★ | setFeedbackResolved | G/A/A/✓ | 답글 delete error 수신·throw 추가 |
| A members/actions.ts ★ | createMember | G/A/A/✓ | Auth createUser error 수신; 유지 |
| A members/actions.ts ★ | deleteMember | G/A/A/—(위임) | 사람 확인 필요: 결제 보관·회원 삭제 위임, 미수정 |
| A members/actions.ts ★ | setMemberPaid | G/A/A/✓ | 사람 확인 필요: 대상 userId로 구독 발급·취소, 미수정 |
| A payments/actions.ts ★ | reconcilePayment | G/A/A/—(위임) | 사람 확인 필요: 결제 고객 ID로 발급, 위임 함수 insert error 수신; 미수정 |
| A promo-reviews/actions.ts ★ | approveBlogReview | G/A/A/✓ | assertAdmin 추가; feedback update error 수신·지급 완료 후 처리 표시 실패 안내 반환 |
| A promo-reviews/actions.ts ★ | rejectBlogReview | G/A/A/✓ | assertAdmin 추가, update error 수신·ok:false 반환 |
| A promo-reviews/actions.ts ★ | revokeBlogReview | G/A/A/✓ | assertAdmin 추가; 회수 로직·반환값 유지 |
| A promo-reviews/actions.ts ★ | revokeAutoGrant | G/A/A/✓ | assertAdmin 추가; 회수 로직·반환값 유지 |
| A promo-reviews/actions.ts ★ | restoreBlogReview | G/A/A/✓ | assertAdmin 추가; 복구 로직·반환값 유지 |
| A promo-reviews/test/actions.ts | runBlogRuleTest, blogRuleSummary, runBlogRuleTestOnHtml, judgeSelfTest | G/A/—/— | 관리자 실험실 호출만 확인됨; 4개 모두 assertAdmin 추가 |
| A questions/actions.ts ★ | createQuestion, updateQuestion, deleteQuestion | G/R/A/✓ | requireAdmin이 로그인·관리자 이메일 확인; 정적 검사에서 관리자 가드로 인정(3건 통과) |
| A reports/actions.ts ★ | setReportResolved, deleteReport | G/A/A/✓ | 관리자+신고 id 지정; 유지 |
| A reviews/actions.ts ★ | setReviewVerified, setReviewVisible | G/A/A/✓ | 관리자+후기 id 지정; 유지 |
| A reviews/actions.ts ★ | deleteReview | G/A/A/✓ | 후기에서 읽은 proof_path 삭제 error 수신·throw 추가 |
| L serverNow.ts | serverNow | ×/—/—/— | Date.now()만 반환; 바로 위 public-action 이유 주석 추가, 공개 유지 |
| L study-actions.ts | toggleBookmark, submitQuestionReport | U/—/S/✓ | 본인 user_id 쓰기·삭제 범위 및 error 수신; 유지 |
집계(액션 단위, 직접 검사/쓰기 기준): 41개 중 최초 누락 14개, 수정 13개, 누락 잔여 1개(deleteMyAccount의 feedback insert 오류 미수신). 사람 확인 필요는 보호 영역 6개(실제 누락 1개 포함); 공개 serverNow와 requireAdmin 3개는 보안 누락 수에서 제외.
소유 조건: 회원 쓰기는 user.id 고정 또는 검증된 부모행을 거친다. 관리자 쓰기에 관리자 자신의 user_id를 붙이면 타 회원 관리가 깨지므로 권한 검사+대상 지정으로 판정했다. RLS가 막지 못하던 무인증 구독 4개는 함수 첫머리 assertAdmin으로 보호했다.
보조 함수까지 확인한 추가 한계: antiSharing의 recordPaidGrade/refundPaidGrade, analytics/trackServerEvent의 insert, operatorAlerts/recordOperatorAlert의 insert는 error 미수신. 채점·제출·홍보·신고 액션의 위임 경로이며 위 표의 직접 쓰기 ✓가 전체 호출 그래프의 오류 처리를 보장하지 않는다. accountDeletion의 보관 계정 createUser도 error 미수신. 환불·결제 공유 경로와 액션 밖 보조 함수는 미수정, 후속 검토 필요.
정적 검사: scripts/server_action_auth_check.mjs와 check:action-auth 추가. 문자열·주석을 제외한 토큰과 괄호로 본문을 분리하며 지원하지 않는 export는 실패 처리; 바로 위 public-action 이유만 예외. 역할·소유권·실행 경로를 증명하는 검사는 아니다.
최종 정적 검사 실패 0건. 이전 실패 7건은 구독 4개 assertAdmin 추가와 안전한 requireAdmin 3개 인정으로 해소했다. 공개 예외로 숨기지 않았다. 잔여 오류 처리 누락 1개는 인증 정적 검사 범위 밖이며 위 표에 유지했다.
검증: `npm.cmd run check:action-auth` · exit 0 · 마지막 줄 `server-action-auth: PASS 41 / FAIL 0`.
역검증: approveBlogReview의 assertAdmin 호출 하나를 임시 제거하고 `node scripts/server_action_auth_check.mjs` 실행 · exit 1 · 마지막 줄 `server-action-auth: PASS 40 / FAIL 1`; approveBlogReview만 FAIL 확인 후 원본 Buffer 복구·동일성 true, 최종 검사 재실행 PASS 41 / FAIL 0 · exit 0.
검증: `npx.cmd tsc --noEmit` · exit 0 · 마지막 줄 없음(출력 없음).
검증: `npx.cmd eslint scripts/server_action_auth_check.mjs 'src/app/(main)/practice/actions.ts' 'src/app/(main)/resolved-notice-actions.ts' 'src/app/admin/(protected)/feedback/actions.ts' 'src/app/admin/(protected)/promo-reviews/actions.ts' 'src/app/admin/(protected)/promo-reviews/test/actions.ts' 'src/app/admin/(protected)/reviews/actions.ts' src/lib/serverNow.ts` · exit 0 · 마지막 줄 없음(출력 없음).
변경: 위 7개 TS + scripts/server_action_auth_check.mjs + package.json + REPORT.md. 네트워크·DB·외부 API·설치·커밋 실행 없음; src/app/api/portone/** 무변경. 구독 4개는 권한 검사와 승인 후 feedback update 오류 처리만 추가; 지급·회수·복구 비즈니스 로직 유지.
커밋 메시지 제안: `fix(security): 서버 액션 본인 확인 감사 + 정적 검사`

리뷰어 반려 반영: 무인증 구독 4개에 assertAdmin 추가(로직 무변경), requireAdmin 인정
새 검사 결과: check:action-auth PASS 41 / FAIL 0 (exit 0), tsc --noEmit exit 0, 변경 코드 전체 eslint exit 0. 역검증 PASS 40 / FAIL 1 (예상 exit 1), 원복 후 PASS 41 / FAIL 0 (exit 0).

## 중간 저장 답안 서버 쪽 손상 검증 (work/fable-codex-saved-answers, 2026-09-12, 워커 Codex)

### 무엇을 왜 바꿨는지
서버 액션은 TypeScript 타입만 있고 런타임 검증이 없어, 클라이언트가 보낸 배열·비문자 값이 `quiz_sessions.saved_answers`에 저장되고 그대로 시험 화면에 복구될 수 있었다(야간에 고친 localStorage 초안 검증의 서버 쪽 짝). 순수 함수 `sanitizeSavedAnswers(raw: unknown)`(`src/lib/savedAnswers.ts`)가 객체가 아니거나 배열이면 `{}`, 객체면 문자열 값인 자체 열거 항목만 남긴다. 던지지 않는다(복구 실패가 시험 진입을 막으면 안 된다). 시험 `saveExamProgress`·`getOrCreateExamSession`, 연습 `savePracticeProgress`·`getPracticeProgress` 4곳에 연결했다.

### 지시문과 달랐던 점
- 이 브랜치(main 기준)에는 야간 `examDraft.ts` 수정이 없다. `examDraft.ts`는 건드리지 않았다 — 초안은 '하나라도 비문자면 전체 거부', 서버는 '부분 복구'로 정책이 달라 함수를 공유하면 판정이 바뀐다.
- 워커가 야간 검사 파일과 `check:draft`를 이 브랜치에 복사해 넣었으나 그 검사는 여기서 첫 사례부터 실패한다(전제가 되는 수정이 없다). 리뷰어 Fable이 반려해 둘 다 이 브랜치에서 뺐다. 야간 수정은 원본 폴더 WIP로 따로 들어간다.

### 변경 파일
`src/lib/savedAnswers.ts`(신규) · `scripts/saved_answers_check.mjs`(신규) · `src/app/(main)/cbt/actions.ts` · `src/app/(main)/practice/actions.ts` · `package.json`(`check:saved-answers`) · `REPORT.md`

### 검증 (워커 실행 → 리뷰어 재실행)
- 빈 객체를 돌려주는 임시 구현으로 먼저 돌림: 통과 9 · 실패 7 · exit 1 → 검사가 실제로 잡는 것 확인
- `Array.isArray` 조건을 일부러 빼고 돌림: 통과 15 · 실패 1 · exit 1 → 빨간불 확인 후 복원
- `npm run check:saved-answers`: 통과 16 · 실패 0 · exit 0 (리뷰어 재실행 동일)
- `npx tsc --noEmit`: exit 0 (리뷰어 재실행 동일)
- 변경 TS/MJS 4파일 `npx eslint`: 오류 0 (리뷰어 재실행 동일)
- 설치된 Next 문서(`node_modules/next/dist/docs/…/use-server.md`, `mutating-data.md`)의 서버 함수 입력 검증 지침과 대조함

### 하지 않은 것
운영 DB의 기존 `saved_answers` 행 점검(네트워크 없는 샌드박스), `next build`, 브라우저 확인. 워커 Codex는 두 번 모두 30분 타임아웃으로 커밋 전에 끊겨(2회차는 첫 명령도 못 돌림), 반려 반영·축약·커밋은 리뷰어 Fable이 대신 했다.
## 기기 수 제한 판정 순수화 + 회귀 검사 (work/fable-codex-device-window, 2026-09-12, 워커 Codex)

- 무엇을 왜: 2026-09-09 가상 데스크톱 기기 누적으로 유료 채점이 막힌 사고의 재발을 오프라인에서 감지하도록 창 계산과 기기 제한 판정을 순수 함수로 분리했다.
- `deviceWindowStart(now, hours)`는 밀리초 단위 창 시작 ISO를 반환하고, `isDeviceBlocked`는 중복 ID를 제거해 현재 기기가 없는 경우에만 한도를 적용한다.
- `DEVICE_WINDOW_HOURS = 24`와 사고 이유 한 줄 주석을 새 모듈로 옮겼다. 반환 문구·DB 조회 조건·upsert·일일 한도는 유지하고 `antiSharingLimits.ts`는 수정하지 않았다.
- 변경 파일: `src/lib/deviceWindow.ts`(신규), `src/lib/antiSharing.ts`, `scripts/device_window_check.mjs`(신규), `package.json`, `REPORT.md`.
- 회귀 사례: 기존 기기/새 기기의 한도 도달·미달, 중복 ID, 밀리초 창 계산, 25시간 전 제외와 ISO gte 경계 포함. 한도 초과의 기존 기기·빈 목록·일회성 iterable·경계 ±1ms도 확인했다.
- 의도적 실패 확인: 현재 기기 예외 조건을 잠시 제거하고 `npm.cmd run check:device-window` 실행 → exit 1, 마지막 줄 `Passed: 5, Failed: 1`; finally에서 원복한 뒤 재검사했다.
- 검증: `npm.cmd run check:device-window` → exit 0, 마지막 줄 `Passed: 6, Failed: 0`.
- 검증: `npx.cmd tsc --noEmit` → exit 0, 출력 없음(마지막 줄 없음).
- 검증: `npx.cmd eslint src/lib/antiSharing.ts src/lib/deviceWindow.ts scripts/device_window_check.mjs` → exit 0, 출력 없음(마지막 줄 없음).
- 지시문과 달랐던 점: 실제 `scripts/paid_block_check.mjs`의 package.json 명령은 `check:paid-block`이 아니라 `check:blocks`다. 나머지 대상 함수·상수는 일치했다.
- 하지 않은 것: 실제 DB·화면 검사(`check:paid-block`으로 지칭된 실제 `check:blocks`)는 네트워크가 없어 미실행. 외부 API·npm install·next build·dev 서버·git commit도 실행하지 않았다.
- 커밋 메시지 제안: `refactor(paid): 기기 수 제한 판정을 순수 함수로 + 회귀 검사`
## 오답 재시험 결과 저장 (work/fable-codex-wrong-retake-persist, 2026-09-12, 워커 Codex)

- 조사: 001_cbt.sql의 세션은 UUID PK, user_id(FK)·year·round NOT NULL; started_at 기본 now(), completed_at·score·total nullable. 연도 범위 CHECK·사용자별 세션 UNIQUE 없음.
- 답안은 UUID PK, session_id·question_id FK/NOT NULL, user_answer·is_correct nullable. 008은 nullable ai_score·ai_feedback, 017은 세션 saved_answers·time_left·saved_at 추가.
- 026은 program NOT NULL/default silyong 및 silyong/kbs CHECK. 032는 UNIQUE(session_id, question_id) 추가. 답안 UPDATE RLS 정책은 마이그레이션에서 발견되지 않음(SELECT·INSERT만 있음).
- 유형별 연습은 9001 및 유형 round로 savePracticeProgress에서 사용자/program/year/round의 미완료 세션을 찾아 saved_answers에 저장. 일반 essay/page.tsx는 실제 시험 답안 덮어쓰기를 막으려고 saveKey를 생략함.
- 오답 목록은 완료 시각 기준 문항별 마지막 답을 사용하며 센티넬도 포함. insights/page.tsx 및 exam_dropoff_check.mjs는 이미 year<9000으로 제외하므로 변경 없음.
- 관리자 첫 화면의 완료 수·최근 완료 세션 조회에는 연도 필터가 없었음. 9001 취급을 유지하려고 year<9000 대신 year!=9002만 추가.
- 택한 안: 스키마 변경 없이 답변 시도마다 year=9002/round=1 세션 생성 → 서버 판정 답안 INSERT → 세션 완료. 모든 쓰기 error 확인 및 예외의 실패 값 반환.
- 지시문의 공용 get-or-create/upsert 안과 다름: 공용 completed_at을 갱신하면 다른 문항의 옛 정답까지 새 시험 오답보다 최신으로 바뀜. 갱신하지 않으면 새 재시험이 이전 시험보다 오래된 기록이 됨.
- 시도별 세션은 답안 UPDATE RLS·기존 행 삭제 없이 문항별 시각을 보존함. 여러 센티넬 중 해당 문항의 최신 완료 시도를 선택하며, 동시 완료 시각 동률은 세션 ID로 결정해 응답 순서에 흔들리지 않게 함.
- 오답 목록의 세션·답안을 페이지 조회해 기록 누적 시 조회 한도로 최신 답이 누락되는 문제를 방지. 저장 완료 후 목록을 새로 열 때 제외된다는 문구로 조정.
- 오답 진입만 persistWrongRetakes를 전달. 저장 중 안내·저장 실패 안내 표시, 저장 중 중복 선택·문항 이동·초기화 방지. 유형별 객관식 연습은 기존 로컬 판정 유지.
- 변경: src/app/(main)/practice/wrong/actions.ts, wrong/page.tsx, practice/multiple/PracticeMultiple.tsx, src/app/admin/(protected)/page.tsx.
- 변경: src/lib/wrongNoteRetake.ts, scripts/wrong_note_retake_check.mjs, package.json, REPORT.md.
- 검증: 정답 비교를 ===에서 !==로 일부러 변경하고 npm.cmd run check:wrong-retake → exit 1, 마지막 줄 RED_EXIT=1(AssertionError). finally에서 원복.
- 검증: npm.cmd run check:wrong-retake → exit 0, 마지막 줄 PASS: grading, program/type/choice guards, latest retake, independent questions, incomplete sessions, stable ties.
- 검증: npx.cmd tsc --noEmit → exit 0, 진단 출력 없음(확인 출력 TSC_EXIT=0).
- 검증: npx.cmd eslint [변경 TS/TSX 5개와 검사 mjs] → exit 0, 진단 출력 없음(확인 출력 ESLINT_EXIT=0).
- 검증: git diff --check → exit 0, 공백 오류 없음(LF/CRLF 경고만).
- 미실행: 실제 DB·RLS·브라우저 저장/재진입 확인, 로그인 검사, DB/API 호출, 설치, 마이그레이션, 커밋. 네트워크 미사용.
- 한계: 시도마다 세션이 증가하며 답안/완료 저장 실패 시 미완료 세션이 남을 수 있음(목록·요청된 집계에는 미포함). 별도 요청 간 트랜잭션은 없음.
- 사람 확인: 운영 quiz_answers UNIQUE(session_id, question_id) 존재 및 RLS 실물 확인(마이그레이션과 다를 수 있음). 두 문항 재시험 사이 새 모의고사 제출, 두 탭 경합, 저장 실패 및 목록 재진입을 운영과 분리된 DB에서 검증.
- 커밋 메시지 제안: fix(practice): 오답 재시험에서 맞히면 정말로 목록에서 빠진다

- 리뷰어 반려 반영: 계정 화면 완료 수·결과 화면 다음 회차 조회 제외, 관리자 화면 상수화

### 리뷰 반영 후 quiz_sessions 전체 검색 점검 (2026-09-12)

`rg`가 설치되어 있지 않아 `git grep -n 'quiz_sessions'`로 저장소 전체를 검색하고, `Get-ChildItem src,scripts -Recurse -File | Select-String 'quiz_sessions'`로 미추적 파일도 보완했다. 조회 뒤 필터와 사용처까지 확인한 정적 점검이며 DB/API는 호출하지 않았다.

- `src/app/(main)/account/page.tsx`: 세션 수에 `neq('year', WRONG_NOTE_RETAKE_YEAR)` 추가; 9001 포함 동작 유지.
- `src/app/(main)/cbt/[examId]/result/page.tsx`: 완료 회차 목록에서 상수로 9002 제외; 별도 결과 조회는 본인 session ID 단건이며 집계 조회가 아님.
- `src/app/(main)/cbt/actions.ts`: 단건 소유권 확인 또는 user/program/year/round 일치 조회; 다른 연도 기록이 자동으로 섞이지 않음. insert/update도 확인.
- `src/app/(main)/cbt/page.tsx`: 조회에는 9002가 포함되지만 실제 문항 회차에 year-round 키로 연결하므로 9002가 시험 카드·이어풀기에 표시되지 않음.
- `src/app/(main)/dashboard/page.tsx`: 기존 `lt('year', 9000)`으로 제외.
- `src/app/(main)/insights/page.tsx`: 기존 `lt('year', 9000)`으로 제외.
- `src/app/(main)/practice/actions.ts`: user/program/year/round 일치 조회로 9001 연습과 9002가 분리됨.
- `src/app/(main)/practice/essay/page.tsx`: 검색 결과는 저장 키 설명 주석이며 직접 조회 없음.
- `src/app/(main)/practice/wrong/page.tsx`: 문항별 최신 정오답 반영에 9002 포함이 필요하므로 유지.
- `src/app/(main)/practice/wrong/actions.ts`: 재시험 세션 insert 반환 및 해당 ID 완료 update 반환; 다른 세션 집계 없음.
- `src/app/admin/(protected)/page.tsx`: 완료 활동·전체 완료 수 두 조회의 9002 리터럴을 공통 상수로 교체.
- `src/app/admin/(protected)/paid-members/page.tsx`: 기존 `lt('year', 9000)`으로 제외.
- `scripts/free_to_paid.mjs`: 추가 누수 발견·수정. year 조건 없이 round=1 재시험을 무료 회차 체험/모의고사 수로 집계할 수 있어 공통 상수를 import하고 REST 조회에 `year=neq.${WRONG_NOTE_RETAKE_YEAR}` 추가; 9001 기존 동작 유지.
- `scripts/ai_cost_check.mjs`: 세션은 AI 답안의 소유자·기간 연결용; ai_score 있는 답안만 세므로 객관식 재시험은 원가에 포함되지 않음.
- `scripts/data_integrity_check.mjs`: 전체 세션의 참조·빈 답안·점수 정합성 검사이므로 9002 포함이 맞음.
- `scripts/exam_dropoff_check.mjs`: 기존 REST `year=lt.9000`으로 제외.
- `scripts/predicted_score_accuracy_check.mjs`: 기존 REST `year=lt.9000`으로 제외.
- `scripts/funnel_report.py`: 조회 후 Python의 year<9000 필터로 제외.
- `scripts/fix_practice_year_sentinel.py`: 특정 BAD_YEAR 일치 조회·이관이며 9002 전체 집계가 아님.
- `scripts/account_delete_check.mjs`: 생성한 테스트 세션 ID의 삭제 여부 확인; 필터 불필요.
- `scripts/authed_page_sweep.mjs`: 테스트 계정 세션 조회 후 정리; 9002도 정리 대상이어야 함.
- `scripts/cleanup_test_accounts.mjs`: 테스트 계정의 전체 세션 정리 목적; 9002 포함 유지.
- `scripts/exam_autosave_check.mjs`: 전용 테스트 계정 최신 세션의 저장 검사; 운영 집계가 아님.
- `scripts/exam_entry_check.mjs`: 전용 테스트 계정의 진입 전후 세션 수·정리 검사; 운영 집계가 아님.
- `scripts/exam_flow_check.mjs`: 전용 테스트 계정의 제출 세션·점수 검사와 정리; 운영 집계가 아님.
- `scripts/exit_save_check.mjs`: 전용 테스트 계정의 저장 답안 확인과 정리; 운영 집계가 아님.
- `scripts/session_resume_check.mjs`: 테스트 계정 및 특정 year/round의 이어풀기 검사와 정리; 운영 집계가 아님.
- `scripts/a11y_structure_check.mjs`: 테스트 계정 정리용 DELETE만 해당.
- `scripts/admin_ui_check.mjs`: 테스트 계정 정리용 DELETE만 해당.
- `scripts/authed_ui_check.mjs`: 테스트 계정 정리용 DELETE만 해당.
- `scripts/error_recovery_check.mjs`: 테스트 계정 정리용 DELETE만 해당.
- `scripts/exam_screen_ui_check.mjs`: 테스트 계정 정리용 DELETE만 해당.
- `scripts/free_to_paid_resume_check.mjs`: 테스트 계정 정리용 DELETE만 해당.
- `scripts/manuscript_check.mjs`: 테스트 계정 정리용 DELETE만 해당.
- `scripts/subscription_gate_check.mjs`: 테스트 계정 정리용 DELETE만 해당.
- `scripts/paid_essay_resume_check.mjs`: 테스트 세션 생성·정리만 해당.
- `scripts/past_result_link_check.mjs`: 테스트 세션 생성·정리만 해당.
- `scripts/predicted_score_check.mjs`: 테스트 세션 생성·정리만 해당.
- `scripts/review_invite_check.mjs`: 테스트 세션 생성·정리만 해당.
- `supabase/migrations/001_cbt.sql`: 테이블·RLS와 답안 소유권의 세션 subquery; 9002도 같은 소유권 검사가 필요함.
- `supabase/migrations/017_session_save.sql`: 저장 필드·인덱스 DDL이며 운영 집계 없음.
- `supabase/migrations/026_multi_program.sql`: program 필드·제약·인덱스 DDL이며 운영 집계 없음.
- `supabase/migrations/999_apply_all_pending.sql`: 저장 필드·인덱스 DDL이며 운영 집계 없음.
- `docs/empty_session_plan.md`: 과거 정리·인덱스 계획과 예시 SQL이며 현재 실행 코드가 아님.
- `README.md`: 연습 저장 키 설명이며 실행 조회 없음.
- `REPORT.md`: 과거 점검 결과 및 이번 기록이며 실행 조회 없음.

추가 누수는 `scripts/free_to_paid.mjs` 1곳을 수정했다. 위 정적 점검 범위에서 그 외 실제 집계 누수는 발견하지 못했다. 전환 보고서 실행은 네트워크·결제 원장 접근이 필요하므로 실행하지 않았다.

### 리뷰 반영 후 검증

- `npx.cmd tsc --noEmit`: exit 0, 진단 없음 (`TSC_EXIT=0`).
- `npx.cmd eslint 'src/app/(main)/account/page.tsx' 'src/app/(main)/cbt/[examId]/result/page.tsx' 'src/app/admin/(protected)/page.tsx' 'src/app/(main)/practice/multiple/PracticeMultiple.tsx' 'src/app/(main)/practice/wrong/page.tsx' 'src/app/(main)/practice/wrong/actions.ts' 'src/lib/wrongNoteRetake.ts' 'scripts/wrong_note_retake_check.mjs' 'scripts/free_to_paid.mjs'`: exit 0, 진단 없음 (`ESLINT_EXIT=0`).
- `npm.cmd run check:wrong-retake`: exit 0 (`WRONG_RETAKE_EXIT=0`); `PASS: grading, program/type/choice guards, latest retake, independent questions, incomplete sessions, stable ties`.
- `git diff --check`: exit 0 (`DIFF_CHECK_EXIT=0`); 공백 오류 없음, LF/CRLF 경고만 출력.
- 검증은 순차 실행. 네트워크·DB/API 호출·결제 관련 실행·git commit 없음. 기존 미커밋 변경 보존.
## ESLint 경고 0 (work/fable-codex-lint-zero, 2026-09-12, 워커 Codex)

- 지시문과 달랐던 점: 실측 오류 0·경고 25건(23건보다 2건 많음). 수정 25건·남긴 경고 0건, 변경 26파일(REPORT 포함).
- 최초 `npx.cmd eslint scripts src -f unix` · exit 1 · 마지막 줄: `The unix formatter is no longer part of core ESLint. Install it manually with npm install -D eslint-formatter-unix`(설치하지 않음).
- 대체 `npx.cmd eslint scripts src -f json -o lint-before.json` · exit 0 · 출력 없음; 아래 수정 전 파일:줄:규칙 목록은 JSON에서 추출. U = `@typescript-eslint/no-unused-vars`, scripts 경로는 `scripts/` 기준.
- `ai_cost_check.mjs:22:U` pass; `alert_triage_check.mjs:14:U` pass.
- `audio_download_guard_check.mjs:13:U` pass; `blog_audit_revoke_check.mjs:25:U` pass.
- `blog_cta_check.mjs:18:U` pass; `check_exit_hygiene_check.mjs:14:U` pass.
- `content_page_quiz_check.mjs:34:U` pass; `daily_sales_check.mjs:11:U` pass.
- `deploy_freshness_check.mjs:22:U` pass; `event_popup_check.mjs:28:U` pass.
- `exam_dropoff_check.mjs:33:U` mean; `exam_timer_check.mjs:15:U` pass.
- `first_click_check.mjs:16:U` pass; `landing_cache_check.mjs:18:U` pass.
- `navigation_speed_check.mjs:24:U` pass; `next_round_check.mjs:13:U` pass.
- `own_copy_spelling_check.mjs:59:U` pass; `payment_block_guidance_check.mjs:31:U` pass.
- `public_page_bundle_check.mjs:19:U` pass; `revenue_integrity_check.mjs:69:U` paidByOrderId.
- `server_region_check.mjs:17:U` pass; `site_score.mjs:108:U` catch 인자 e.
- `spelling_consistency_check.mjs:43:U` ARROW; `trial_check.mjs:13:U` pass; `src/app/page.tsx:6:U` Gift.
- 처리: pass 20개는 마지막 출력에 `(통과 N · 실패 M)` 추가. 미호출 함수 mean·정규식 ARROW·catch 인자 e·Gift import 제거. paidByOrderId 대입만 제거하고 `new Map(paid.map(...))` 호출·평가는 보존.
- 남긴 경고: 없음(훅 경고도 없음). 검사 판정·종료 코드·제품 동작 유지. 주석 추가 및 ESLint 설정/max-lines 변경 없음. 커밋하지 않음.
- 검증 `npx.cmd eslint scripts src` · exit 0 · 마지막 줄 없음(출력 없음), 오류 0·경고 0.
- 검증 `npx.cmd tsc --noEmit` · exit 0 · 마지막 줄 없음(출력 없음).
- 검증 `npm.cmd run check:alert-triage` · exit 0 · `볼 것만 위로 온다. (통과 14 · 실패 0)`.
- 검증 `npm.cmd run check:audio-guard` · exit 0 · `재생기에서 권하는 길은 닫혀 있다. (통과 5 · 실패 0)`.
- 검증 `npm.cmd run check:exit-hygiene` · exit 0 · `검사가 결과를 찍고 제때 끝난다. (통과 44 · 실패 0)`.
- 검증 `npm.cmd run check:exam-timer` · exit 0 · `시간을 제때, 과하지 않게 알린다. (통과 12 · 실패 0)`.
- 검증 `npm.cmd run check:landing-cache` · exit 0 · `첫 방문자는 만들어 둔 것을 받는다. (통과 6 · 실패 0)`.
- 검증 `npm.cmd run check:next-round` · exit 0 · `끝낸 사람에게 다음을 준다. (통과 8 · 실패 0)`.
- 검증 `npm.cmd run check:own-copy` · exit 0 · `우리 글은 깨끗하다. (통과 2 · 실패 0)`.
- 검증 `git diff --check` · exit 0 · 마지막 줄 없음(출력 없음). 검사 스크립트는 순차 실행, 한글 출력 교정 뒤 7개 모두 재검증.
- 미실행(네트워크 필요), 아래는 모두 `npm.cmd run <이름>`이며 exit/마지막 줄 해당 없음; 머리 주석·fetch·브라우저 이동·DB 호출로 판별:
- `check:ai-cost`, `check:audit-revoke`, `check:blog-cta`, `check:page-quiz`, `check:sales`, `check:deployed`.
- `check:popup`, `check:dropoff`, `check:first-click`, `check:nav`, `check:pay-guide`, `check:bundle`.
- `check:revenue`, `check:region`, `check:spelling-consistency`, `check:trial`, `score`(site_score.mjs, 대응 check:* 없음).
- 커밋 메시지 제안(요청한 첫 줄 그대로; 실제 수정 수는 위 25건):
chore(lint): 경고 23건을 0으로 — 동작 변경 없음
- 리뷰어 Fable 보정: `revenue_integrity_check.mjs`의 `new Map(...)` 단독 문장은 부수 효과가 없어 줄 자체를 지웠다(대입만 지우면 뜻 없는 계산이 남는다).
## 맞춤법 검사 문서 확장 (work/fable-codex-own-copy-docs, 2026-09-12, 워커 Codex)

- 화면으로 복사되는 문서의 오표기도 막도록 기존 src ts·tsx에 README.md와 docs/**/*.md만 추가했다.
- 변경 파일: scripts/own_copy_spelling_check.mjs, REPORT.md.
- src 271개·문서 8개(README 1개, docs 재귀 7개)·ALWAYS_WRONG 34개 규칙을 확인했다.
- Markdown의 백틱/물결표 코드 블록과 백틱 인라인 코드를 공백으로 가려 원문 줄 번호를 유지한다.
- 기존 ts·tsx 제외 경로·교육용 자료 및 표기 설명 예외·검출 출력 형식은 유지했다. 파일 수만 src/문서로 나눴다.
- 문서에서 걸린 것: 0건 / 고친 것: 0건 / 남긴 것: 0건. 인용이라 남김·판단 보류 항목 없음.
- README 검사 표에 check:own-copy 행이 없어 요청대로 추가하지 않았다.
- 실물 대조: walk·ALWAYS_WRONG·스크립트 경로는 지시문과 일치한다. 기존 자기 검증은 문자열 검출 1건이며 오탐 예외는 검사 루프에 있다.
- 문서 자기 검증은 실제 findHits 경로로 코드 블록·인라인 코드의 오표기를 제외하고 같은 표기의 본문 5행만 잡는지 확인한다.
- 실패 확인 1: README 끝에 틀린 본문을 임시 추가하고 npm.cmd run check:own-copy 실행 → exit 1, README.md:369 검출, 마지막 줄 `우리 글에 틀린 표기가 있다.`
- 실패 확인 2: 인라인 코드 마스킹을 임시 해제하고 같은 명령 실행 → exit 1, 문서 자기 검증 실패, 마지막 줄 `우리 글에 틀린 표기가 있다.`
- 두 실패 확인 후 임시 변경은 원본 바이트로 복구했다.
- 최종 검증: npm.cmd run check:own-copy · exit 0 · 마지막 줄 `우리 글은 깨끗하다.`
- 최종 검증: npx.cmd eslint scripts/own_copy_spelling_check.mjs · exit 0 · 마지막 비어 있지 않은 줄 `✖ 1 problem (0 errors, 1 warning)`; 기존 pass 미사용 경고 1건.
- 최종 검증: npx.cmd tsc --noEmit · exit 0 · 출력 없음(마지막 줄 없음). TS import는 없지만 추가 실행했다.
- git diff --check · exit 0 · 공백 오류 없음. 규칙 비활성화·네트워크·DB·외부 API·설치·커밋 없음.
- 커밋 메시지 제안: feat(check): 맞춤법 검사가 README·docs 도 훑는다
- 리뷰어 Fable 보정: 스크립트 머리의 "왜 필요한가" 주석(보기 제외·언제나 틀린 것만 넣는 이유)이 한 줄로 갈렸던 것을 되살리고 문서 범위 설명 두 줄만 더했다.
## 오답노트 문항 제외 설계 (work/fable-codex-wrong-note-dismiss, 2026-09-12, 워커 Codex)

- 커밋 메시지 제안: `docs(practice): 오답노트 문항 제외 설계 + SQL 초안`
- 무엇을 왜: 2026-09-10 문의 1건을 근거로 문항별 제외·복원 설계를 작성했다. 답안과 성적을 보존하며 복습 목록만 정리하기 위한 안이다.
- 변경 파일: `docs/wrong_note_dismiss_plan.md`, `docs/wrong_note_dismissals.draft.sql`, `REPORT.md`.
- 권장안: 새 `wrong_note_dismissals` 표에 사용자·문항 UNIQUE, 본인 행 RLS, authenticated SELECT·INSERT·DELETE GRANT를 명시한다.
- `003_reviews.sql`의 삭제 정책과 `submitReview`의 실제 permission denied 기록을 대조해 RLS와 GRANT를 구분했다.
- `migration_tables`가 모든 `*.sql`을 세므로 DRAFT 이름도 검사 대상이다. 실행되지 않은 초안을 `docs/`에 두었다.
- 지시문과 달랐던 점: 지시된 파일은 모두 존재하나 `PracticeMultiple:choose`는 로컬 상태만 바꾸므로 재시험 정답이 DB에 저장된다고 볼 수 없다. `InsightsPage`는 추가로 year < 9000을 적용한다.
- 지시문과 달랐던 점: `check:own-copy`는 src의 ts·tsx만 검사해 Markdown은 대상이 아니다. 문서·SQL에 기존 34개 금지 표기 규칙을 별도로 대조했다.
- 검증: `npm.cmd run check:own-copy` · exit 0 · 마지막 줄 `우리 글은 깨끗하다.` (271개 파일·34개 규칙).
- 검증: PowerShell here-string으로 `node --input-type=module -`에 기존 ALWAYS_WRONG 추출·문서 대조 코드를 전달 · exit 0 · 마지막 줄 `document-copy: 2 files, 34 rules, 0 hits`.
- 검증: `Select-String`·`Get-ChildItem`으로 인용 대조 · exit 0 · 마지막 결과 `6개 — 001_cbt.sql, 003_reviews.sql, 021_bookmarks_reports.sql, 026_multi_program.sql, 033_questions_server_only.sql, 034_reviews_hide_private_columns.sql`. 명령별 결과는 설계 문서에 기록했다.
- 검증: `git diff --check` · exit 0 · 출력 없음(마지막 줄 없음).
- 사람이 결정할 것: 새 표 권장안, 다시 틀려도 명시적 복원 전까지 제외 유지 여부, 약점 통계는 유지하고 두 오답 화면의 표시만 제외하는 범위.
- 사람이 결정할 것: 실제 번호 배정·0NN_ 이름으로 migrations 편입·SQL Editor 검토 및 실행. SQL의 실제 구문 실행·운영 RLS·GRANT 동작은 검증하지 않았다.
- 하지 않은 것: 코드·화면·DB 변경, 마이그레이션 실행, 네트워크·외부 API·설치·배포·커밋. Fable 검수용 문서와 SQL 초안만 남겼다.

## 보조 함수 쓰기 결과 수신 (work/fable-codex-write-error-audit, 2026-09-12, 워커 Codex)

- 전수 범위: `src/lib/**`, 모든 서버 액션, 그 밖의 서버 코드의 쓰기·`auth.admin` 호출을 대조했다. 오류 미수신 9곳 / 수정 8곳 / 수정 금지 미수신 1곳. 변경 파일 10개(이 보고서 포함).
- 지시문과 달랐던 점: `analytics.ts` 대신 `src/lib/analytics/trackServerEvent.ts`; 보관 계정은 `created.data`만 사용했고, 탈퇴 사유는 `.then` 양쪽에서 삼켰다. `/api/track` 2곳과 이용권 회수 cron 1곳도 발견했다.

| 파일 | 함수 | 호출 | 처리 |
|---|---|---|---|
| `src/lib/antiSharing.ts` | `recordPaidGrade` | `usage_daily.upsert` | 미수신 → `{ error }`, 실패 로그 + `{ ok, error }` 반환 |
| `src/lib/antiSharing.ts` | `refundPaidGrade` | `usage_daily.upsert` | 미수신 → `{ error }`, 실패 로그 + `{ ok, error }` 반환; 사용량 0 이하는 성공 반환 |
| `src/lib/analytics/trackServerEvent.ts` | `trackServerEvent` | `page_views.insert` | 미수신 → 오류·예외 로그, 흐름 유지 |
| `src/lib/operatorAlerts.ts` | `recordOperatorAlert` | `page_views.insert` | 미수신 → 오류·예외 로그, 텔레그램 단계 유지 |
| `src/lib/accountDeletion.ts` | `withdrawnHolderId` | `auth.admin.createUser` | 오류 미확인 → 구조 분해·로그; 기존 계정 조회 폴백 유지 |
| `src/app/(main)/account/actions.ts` | `deleteMyAccount` | `feedback.insert` | `.then` 성공 결과의 error·거부 예외 로그, 탈퇴 계속 |
| `src/app/api/track/route.ts` | `POST` 이벤트 분기 | `page_views.insert` | 미수신 → 오류 로그, 204 유지 |
| `src/app/api/track/route.ts` | `POST` 페이지뷰 분기 | `page_views.insert` | 미수신 → 오류·예외 로그, 204 유지 |
| `src/app/api/cron/blog-review-audit/route.ts:50` | `revokeGrants` | `subscriptions.update(...).select('id')` | **수정 금지**: data만 받고 error 미수신; 검사 FAIL로 남김 |
| `src/lib/payment.ts` | `grantSubscriptionForPayment` | `subscriptions.insert` | **수정 금지**: 기존 error 수신 확인, 미수신 아님 |
| `src/lib/subscriptionRevocation.ts` | `revokeSubscriptionForPayment` | `subscriptions.update` | **수정 금지**: 기존 error 수신 확인, 미수신 아님 |
| `src/app/api/portone/webhook/route.ts` | `POST` | 발급·회수 보조 함수 위임 | **수정 금지**: 직접 DB 쓰기 없음, 위임 결과 확인 |
| `src/app/(main)/subscribe/{blog-review-actions,promo-actions}.ts` | `submitBlogReview`, `redeemPromoCode` | `subscriptions.insert` | **수정 금지**: 기존 error 수신 확인 |
| `src/app/admin/(protected)/{members,promo-reviews}/actions.ts` | `setMemberPaid`, `approveBlogReview`, `revokeBlogReview`, `revokeAutoGrant`, `restoreBlogReview` | `subscriptions.insert/update` | **수정 금지**: 기존 error 수신 확인 |

- `auth.admin.listUsers`는 조회라 쓰기 미수신 집계에서 제외했다(accountDeletion·subscriberReport는 data만 수신, adminPaging은 error도 수신). 나머지 auth 쓰기(createUser·deleteUser·updateUserById)와 기기 upsert는 기존 오류 수신을 확인했다.
- 호출자 **9곳이 결과를 아직 안 본다**: `src/app/(main)/cbt/actions.ts:126,152,162`, `manuscript/actions.ts:97,130,141`, `practice/actions.ts:97,128,137`(뒤 두 경로도 `src/app/(main)/` 기준). 증가 3곳·복원 6곳, 호출부 변경 없음; 실패 시 채점 차단 정책은 사람이 결정한다.
- 로그는 모듈·실패 작업·결과와 `{ code, message }` 형식이며, 새 throw·추가 DB 요청·사용자 차단을 넣지 않았다. 읽기 실패·동시 갱신 정책은 그대로다.
- `scripts/supabase_write_result_check.mjs`와 `check:write-results` 추가: src 전체의 5종 쓰기와 auth.admin 쓰기를 정규식 토큰·괄호 대응으로 검사한다(파서 설치 없음). error 별칭·다중 행 체인·return·직접 `.then`을 인정한다.
- 유일한 코드 옆 예외는 `CopyGuard.tsx`의 DOM `classList.remove`: `// write-result-ignored: 이유`. 경로별 예외 하드코딩 없음. `.then` 콜백이 실제 오류를 처리하는지까지 정적으로 보증하지는 않는다.
- 아래 검증은 모두 로컬 실행. DB·외부 API·네트워크·설치·커밋 없음. 수정 금지 경로는 주석도 바꾸지 않았다.

| 검증 명령 | exit | 마지막 줄 |
|---|---:|---|
| `npm.cmd run check:write-results` (복원 후 최종) | 1 | `supabase-write-results: PASS 59 / FAIL 1` — 위 수정 금지 cron 1건 |
| `npx.cmd tsc --noEmit` | 0 | 출력 없음 |
| `npx.cmd eslint 'src/app/(main)/account/actions.ts' src/app/api/track/route.ts src/lib/accountDeletion.ts src/lib/analytics/trackServerEvent.ts src/lib/antiSharing.ts src/lib/operatorAlerts.ts src/components/cbt/CopyGuard.tsx scripts/supabase_write_result_check.mjs` | 0 | 출력 없음 |
| `npm.cmd run check:action-auth` | 0 | `server-action-auth: PASS 42 / FAIL 0` |
| `npm.cmd run check:alert-triage` | 0 | `볼 것만 위로 온다. (통과 14 · 실패 0)` |
| `node --input-type=module` (표준입력: checkSource 경계 사례 15개 + 실파일 변이·복원 assert) | 0 | `red-mutation-restored: PASS` (앞선 `scanner-fixtures: PASS 15 / FAIL 0`) |
| 위 변이 중 `node scripts/supabase_write_result_check.mjs` | 1 | `supabase-write-results: PASS 58 / FAIL 2` — trackServerEvent의 수신 제거를 탐지, finally로 원문 복원 확인 |
| `git diff --check` | 0 | diff 오류 없음(환경 CRLF 경고만) |

커밋 메시지 제안:
fix(lib): 보조 함수의 DB 쓰기도 실패를 안다 — { error } 수신 + 정적 검사
- 리뷰어 Fable 보정: 수정 금지로 남긴 cron `revokeGrants`의 update 도 `{ error }`를 받아 로그만 남긴다(흐름·반환값 무변경 — 회수 실패가 "회수 0건"으로 보고되던 것). 검사 결과 60/0.
## REPORT 보관 분할 (work/fable-codex-report-archive, 2026-09-12, 워커 Codex)

- 변경: REPORT.md, docs/reports/REPORT-2026-08.md, docs/reports/REPORT-section-index.md. 원래 절 순서·날짜 근거·본문 SHA-256·참조 조사 표는 상단 색인에 기록했다.
- 날짜 판정: 제목 우선 → 본문 첫 날짜 → 앞 절의 달 추정. 이번 월 추정 0절; 제목의 8/27은 2026-08-27로 판정했다.
- 절 수 검증: 분할 직후 원본 29 = 남긴 23 + 옮긴 6. 이 검증 기록 1절을 추가한 최종 REPORT는 24절이며, 원본 대조는 29 = (24 - 1) + 6이다.
- SHA-256: CRLF→LF만 정규화해 원본 HEAD와 대조. 이동 본문 6/6, 유지 본문 23/23, 제목 포함 전체 절 29/29 일치; 각 파일 안의 원래 순서도 일치.
- 참조 조사: Select-String으로 README·docs·스크립트·CLAUDE.md·BACKLOG.md 검색. 상세 표는 색인에 기록; 깨지는 앵커·줄 번호 링크 없음, 링크 수정 0건.

| 검증 명령 | exit | 마지막 줄 |
|---|---|---|
| node - (표준 입력으로 원본·분할 파일의 절 수·SHA-256·순서 대조) | 0 | PASS original=29 kept=23 moved=6 body_sha256=29/29 whole_sha256=29/29 moved_sha256=6/6 order=PASS |
| npm.cmd run check:own-copy | 0 | 우리 글은 깨끗하다. (통과 3 · 실패 0) |
| git diff --stat | 0 | 1 file changed, 20 insertions(+), 338 deletions(-) |

- git diff --stat은 추적 파일만 표시한다. 신규 보관 파일·색인 2개는 미추적 상태로 저장했으며, 커밋은 하지 않았다.
- 커밋 메시지 제안:
`docs(report): 8월 절을 docs/reports/ 로 보관 — 기록 무손실`

## 한도 문구 상수 대조 (work/fable-codex-limits-copy, 2026-09-12, 워커 Codex)

- 실물: DEVICE_LIMIT=3, DAILY_GRADE_LIMIT=30, FREE_AI_TRIAL=3, REWARD_DAYS=7, MIN_IMAGES=5, MIN_CHARS=1500, RECOMMENDED_KEEP_DAYS=30. programs.ts의 SILYONG 객체는 freeRounds=2·examMinutes=120이며 숫자 export const 형태가 아니다. 지시문과 값 차이 없음.
- src/app/**·src/components/**의 TSX 전체 숫자 검색 후 문맥 대조: 대상 숫자 문구 26곳(한 문장 안의 서로 다른 숫자 별도 집계), 불일치 0곳, 상수 연결 25곳. 아래 경로는 src/ 기준이며 반복 횟수를 괄호로 표시한다.

| 파일 | 기존 문구 | 상수 | 현재 일치·처리 |
|---|---|---|---|
| app/page.tsx | 가입만 하면 결제 없이 3회 체험 / 3회 무료 체험 / 3회 무료로 먼저 써보세요 / AI 첨삭 3회 무료 체험 | FREE_AI_TRIAL | 같음·4곳 연결 |
| app/page.tsx | CBT 실전 모의고사 무료 2회차 / 실전 화면·120분 제한 CBT | freeRounds / examMinutes | 같음·2곳 연결 |
| app/(auth)/signup/page.tsx | 서술형 AI 첨삭 3회 무료 체험 | FREE_AI_TRIAL | 같음·유지: 순수 파일(antiSharingLimits.ts)로 옮겨야 함 |
| app/(legal)/support/page.tsx | 하루 30회에서 / 하루 30회까지만 / 최대 3대 기기 | DAILY_GRADE_LIMIT(2) / DEVICE_LIMIT | 같음·3곳 연결 |
| app/(legal)/support/page.tsx | 서술형 9문항 기준 모의고사 3회 분량 | floor(DAILY_GRADE_LIMIT / 9) | 같음·1곳 연결 |
| app/(legal)/refund/page.tsx / app/(legal)/terms/page.tsx | 기기 수(최대 3대) | DEVICE_LIMIT | 같음·각 1곳 연결 |
| app/(main)/subscribe/page.tsx | 기기 3대까지 / 하루 30회까지 | DEVICE_LIMIT / DAILY_GRADE_LIMIT | 같음·2곳 연결 |
| app/(main)/dashboard/page.tsx | AI 채점…기간 중 하루 30회까지 | DAILY_GRADE_LIMIT | 같음·1곳 연결 |
| app/(main)/practice/essay/page.tsx | 모의고사 1·2회 무료 | getProgram(program).freeRounds | 같음·1곳, 회차 목록 생성으로 연결 |
| app/essay-guide/page.tsx | 모의고사 2회분은 무료(2곳) | freeRounds | 같음·2곳 연결 |
| app/exam-info/page.tsx | 무료로 모의고사 2회분 / 모의고사 2회분은 무료 / CBT 방식 · 약 120분 | freeRounds(2) / examMinutes | 같음·3곳 연결 |
| app/exam-compare/page.tsx | 시험 시간: 실용글쓰기 120분 | examMinutes | 같음·1곳 연결 |
| components/blog/BlogCTA.tsx | 모의고사를…2회분 무료 | freeRounds | 같음·1곳 연결 |
| components/study/EssayPointMap.tsx | 선택형까지 합쳐 120분입니다 | examMinutes | 같음·1곳 연결 |
| components/grading/DailyLimitDialog.tsx | 서술형 9문항 기준으로 모의고사 3회 분량 | floor(DAILY_GRADE_LIMIT / 9) | 같음·1곳 연결 |
| app/(main)/event/blog-review/page.tsx, app/admin/(protected)/promo-reviews/page.tsx, components/blog/BlogReviewEventCard.tsx, components/promo/EventPopup.tsx, components/subscribe/BlogReviewForm.tsx | 이용권 7일·사진 5장·본문 1,500자·유지 권장 30일 | REWARD_DAYS / MIN_IMAGES / MIN_CHARS / RECOMMENDED_KEEP_DAYS | 이미 상수 사용·변경 없음(26곳 집계 제외) |

- 못 고친 1곳: 가입 화면은 'use client'이고 aiTrial.ts → supabase/server.ts → next/headers 의존성이 있다. 같은 값이므로 지시대로 보류했으며 상수 정의는 이동하지 않았다. 변경한 클라이언트 DailyLimitDialog는 기존 순수 antiSharingLimits import만 사용한다. 나머지 변경 TSX 12개는 'use client'가 없고 서버 전용 import를 클라이언트에 추가하지 않았다. tsc 통과는 확인했으나 Next 빌드는 실행하지 않았다.
- 제외: 결제 1회·유료 이용권 30일·환불 7일·금액 5,500원, KBS 전용 안내의 120분·무료 1회분, 날짜·통계·문항 분량·주석은 해당 상수의 한도가 아니다. 문장 말투와 현재 표시 값, 결제·금액 정의는 유지했다.
- 검사: 상수 선언 정규식·프로그램 객체에서 값을 읽고 TypeScript 구문 트리의 문자열/JSX 문구를 문맥 낱말과 단위로 연결한다. 주석·문맥 없는 숫자·결제 횟수·KBS 안내는 제외한다. 동적 표현의 계산 결과까지 검증하는 검사는 아니다.

| 검증 명령 | exit | 마지막 줄 |
|---|---|---|
| npm.cmd run check:limits-copy | 0 | 한도 문구 대조: 통과 1 / 실패 0 |
| node scripts/limits_copy_check.mjs (가입 문구 3→4 변조 후 finally 원복) | 1(의도한 실패) | 한도 문구 대조: 통과 0 / 실패 1 |
| npm.cmd run check:own-copy | 0 | 우리 글은 깨끗하다. (통과 3 · 실패 0) |
| npx.cmd tsc --noEmit | 0 | 출력 없음 |
| npx.cmd eslint (변경 TSX 13개 및 scripts/limits_copy_check.mjs) | 0 | 출력 없음 |
| git diff --check | 0 | 오류 없음(LF→CRLF 안내만 출력) |

- 커밋 메시지 제안: `fix(copy): 한도 숫자를 상수에서 읽는다 + 문구-상수 대조 검사` — 커밋하지 않음.

## 오프라인 검사 묶음 (work/fable-codex-offline-check-bundle, 2026-09-12, 워커 Codex)

| 오프라인 | 네트워크 | 브라우저 |
|---|---|---|
| 26 (묶음 24 · 제외 2) | 20 | 37 |

- 기존 83개 기준(새 실행기 제외). 이름·파일·판정·근거 전체: [분류표](docs/reports/offline_check_classification_2026-09-12.md). 목록은 package.json의 offlineChecks 한 곳에서 관리한다.
- 오프라인 전체: `check:schedule`, `check:device-window`, `check:limit-dialog`, `check:attempts`, `check:methods`, `check:renewal`, `check:feedback`, `check:alerts`, `check:chunk`, `check:keyshape`, `check:pace`, `check:next-round`, `check:audio-guard`, `check:exam-timer`, `check:exit-hygiene`, `check:alert-triage`, `check:landing-cache`, `check:dday`, `check:own-copy`, `check:limits-copy`, `check:write-results`, `check:action-auth`, `check:wrong-retake`, `check:saved-answers`, `check:blog`, `check:revoke`.
- 최초 실행: 24 통과·2 실패, 9.63초, exit 1. 재판정 후 제외: check:blog는 Python 미설치(spawn python ENOENT, 최초 표시 -4058), check:revoke는 isActivePass가 subscriptionDisplay.ts로 이동하여 기존 문자열 검사 11/12 실패(exit 1). 둘 다 오프라인이며 검사 자체는 수정하지 않았다.

| 검사 | exit | 마지막 출력 줄 |
|---|---|---|
| check:schedule | 0 | 문제 없음 ✓ |
| check:device-window | 0 | Passed: 6, Failed: 0 |
| check:limit-dialog | 0 | 한도에 걸리면 설명 창이 뜬다. |
| check:attempts | 0 | 16/16 통과 |
| check:methods | 0 | 6/6 통과 |
| check:renewal | 0 | 13/13 통과 |
| check:feedback | 0 | 17/17 통과 |
| check:alerts | 0 | 9/9 통과 |
| check:chunk | 0 | 14/14 통과 |
| check:keyshape | 0 | 12/12 통과 |
| check:pace | 0 | 속도 안내는 맞는 말을 한다. |
| check:next-round | 0 | 끝낸 사람에게 다음을 준다. (통과 8 · 실패 0) |
| check:audio-guard | 0 | 재생기에서 권하는 길은 닫혀 있다. (통과 5 · 실패 0) |
| check:exam-timer | 0 | 시간을 제때, 과하지 않게 알린다. (통과 12 · 실패 0) |
| check:exit-hygiene | 0 | 검사가 결과를 찍고 제때 끝난다. (통과 44 · 실패 0) |
| check:alert-triage | 0 | 볼 것만 위로 온다. (통과 14 · 실패 0) |
| check:landing-cache | 0 | 첫 방문자는 만들어 둔 것을 받는다. (통과 6 · 실패 0) |
| check:dday | 0 | 7/7 통과 — 서버가 어느 시간대여도 브라우저(한국)와 같은 답 |
| check:own-copy | 0 | 우리 글은 깨끗하다. (통과 3 · 실패 0) |
| check:limits-copy | 0 | 한도 문구 대조: 통과 1 / 실패 0 |
| check:write-results | 0 | supabase-write-results: PASS 60 / FAIL 0 |
| check:action-auth | 0 | server-action-auth: PASS 42 / FAIL 0 |
| check:wrong-retake | 0 | PASS: grading, program/type/choice guards, latest retake, independent questions, incomplete sessions, stable ties |
| check:saved-answers | 0 | 결과: 통과 16, 실패 0 |

- `npm.cmd run check:offline` exit 0 — 오프라인 검사: 통과 24 · 실패 0 · 소요 7.70초.
- 검증: `npx.cmd eslint scripts/offline_check_bundle.mjs` exit 0; `node -e "require('./package.json')"` exit 0. check:bundle을 목록 앞에 임시 추가하고 BUNDLE_CHECK_BASE=http://127.0.0.1:1로 실행: 24 통과·1 실패, 9.49초, exit 1; finally로 목록 원복. 별도 임시 fixture의 실제 180초 제한: 180.60초, exit 1, 하위 프로세스 종료·후속 검사 통과 확인(검증 exit 0); fixture 삭제.
- 커밋 메시지 제안: `feat(check): 네트워크 없는 검사 묶음 check:offline` — 커밋하지 않음.

## 스택 적대적 검토 (work/fable-codex-stack-review, 2026-09-12, 검토자 Codex)

- 범위: `origin/main...HEAD` 78파일, +1,948/-448줄(변경 2,396줄). 세션 참조 41파일 전부 대조; src TS/JS 278파일의 import·액션·쓰기 구문도 검사했다. 아래 원인 줄은 수정 전 HEAD 기준이다.
- 결과: 막아야 함 0건 / 고쳐야 함 6건(모두 수정) / 참고 1건. 실제 DB·브라우저·Next 빌드 실행 없이 소스와 메모리 DB 대역으로 재현했다.

| 파일 · 줄 | 무엇이 | 왜 문제 / 재현 조건 | 심각도 |
|---|---|---|---|
| `src/app/(main)/cbt/page.tsx:39,46` | 완료·미완료 조회에 year 제한 없음 | 최신 9002 시도가 1,000행을 채우면 정상 시험이 응답 상한 밖으로 밀려 성적·이어풀기 표시가 사라짐 | 고쳐야 함 · 수정 |
| `src/app/(main)/cbt/[examId]/result/page.tsx:42` | 결과용 단건 조회가 9002도 허용 | 본인 재시험 ID로 결과 URL을 열면 문항 없는 시험 성적·추천 화면을 생성 | 고쳐야 함 · 수정 |
| `scripts/funnel_report.py:101` | 1,000행 제한 뒤 메모리에서 year 제외 | 응답에 재시험이 섞이면 정상 시험이 잘린 뒤 제거되어 시작·완료 인원 과소 집계 | 고쳐야 함 · 수정 |
| `scripts/server_action_auth_check.mjs:38,84,95` | 두 번째 변수 export 누락·내부 함수 인증을 인정 | `export const safe=async()=>{await assertAdmin()}, unsafe=async()=>1` 및 호출하지 않는 내부 인증 함수가 exit 0 | 고쳐야 함 · 수정 |
| `scripts/supabase_write_result_check.mjs:16,59` | 보간·나눗셈 사이 쓰기 누락, 병렬 결과 수신 오탐 | 템플릿 보간의 insert와 `/ 2; await …insert(); … / 3`은 검출 0건; `const [{error}]=await Promise.all([…insert()])`도 실패 판정 | 고쳐야 함 · 수정 |
| `scripts/limits_copy_check.mjs:64,65` | 템플릿 조각·강조 태그가 문맥을 끊음 | 보간 앞 `AI 첨삭`, 뒤 `하루 99회` 또는 강조 태그 안 숫자가 한도 검사에서 누락 | 고쳐야 함 · 수정 |
| `docs/wrong_note_dismiss_plan.md:8,32,55,57` | 병렬 작업 전 설명이 스택 실물과 다름 | 현재 재시험은 서버 저장하며 동률을 session_id로 정렬하고 맞춤법 검사도 docs를 읽음; 후속 설계 시 옛 전제를 오인할 수 있음 | 참고 · 초안 원문 유지 |

- 수정: CBT 조회 3곳·퍼널 URL 1곳에 DB 단계 year 제외. 인증·쓰기 검사는 기존 TypeScript 파서로 구문을 읽고 각 export·Promise.all 결과 자리를 대조; 문구는 보간·강조 문맥을 연결했다. 새 패키지 없음.
- 회귀: `scripts/stack_review_regression_check.mjs` 46사례(가짜 인증·문자열·주석·정상/누락 병렬 수신·잘못된 문구·1,000개 재시험·결과 ID). 수정 파일 총 8개(REPORT·새 회귀 검사 포함).

| 세션·답안 조회 위치 | 9002 판정 |
|---|---|
| `src/app/(main)/dashboard/page.tsx:55,150`, `insights/page.tsx:22,56` | 제외됨: year < 9000 세션과 그 세션의 답안만 집계 |
| `src/app/admin/(protected)/paid-members/page.tsx:57,67` | 제외됨: year < 9000 및 해당 session_id 답안 |
| `src/app/(main)/account/page.tsx:26`, `src/app/admin/(protected)/page.tsx:38,39,94` | 제외됨: year != 9002, AI 답안은 제외한 세션과 연결 |
| `src/app/(main)/cbt/[examId]/result/page.tsx:69` | 제외됨: 다음 회차 추천 year != 9002; 단건 결과 조회도 이번 수정으로 제외 |
| `scripts/free_to_paid.mjs:92` | 제외됨: year != 9002 |
| `scripts/exam_dropoff_check.mjs:37,38`, `scripts/predicted_score_accuracy_check.mjs:76,78` | 제외됨: year < 9000 세션 기준으로 답안 연결 |
| `scripts/funnel_report.py:101`, `src/app/(main)/cbt/page.tsx:34,45` | 메모리 제외·회차 키 매칭만 하던 곳; 이번에 조회 단계에서 제외 |
| `src/app/(main)/cbt/actions.ts:91,106,228,258,330`, `practice/actions.ts:174,212` | 본인 session_id·question_id 또는 명시한 year/round 단건 처리; 전체 성적 집계 아님 |
| `src/app/(main)/practice/wrong/page.tsx:28,41`, `wrong/actions.ts:23,27,31` | 의도적 포함: 최신 오답 판정·재시험 쓰기; 완료한 시도만 판정 |
| `scripts/ai_cost_check.mjs:64,66`, `scripts/paid_block_check.mjs:137` | year 필터 없음; 현재 재시험은 ai_score=null·객관식이므로 각각 AI 점수·서술형 문항 조건에서 집계되지 않음 |
| `scripts/data_integrity_check.mjs:45,46`, `scripts/fix_practice_year_sentinel.py:32` | 전체 행 참조 무결성 검사 / 명시된 이전 year 대상 조회; 성적 집계 아님 |
| 나머지 세션 참조 검사·정리 스크립트 20개 및 소스 주석 | 테스트 계정·직접 만든 session_id의 저장/삭제 검증, 정리 또는 주석; 운영 성적·추천 집계 없음 |

- 동작 무변경 주장 대조: lint 삭제분은 미사용 함수·정규식·일반 데이터 Map·Gift import였고 필요한 부수 효과 없음. device-window 판정식·24시간 경계 동일, limits-copy 현재 숫자 동일, write-error-audit의 204·탈퇴·알림 후속 흐름 유지.
- 경계: 클라이언트 68개에서 로컬 import 346회 추적, 합법적 `'use server'` 액션 경계 23회에서 중단. next/headers·service_role·antiSharing 유입 0건; type-only import 제외. 빌드 성공을 뜻하지는 않는다.
- 문서: dd6460b 전후 원본 29절 모두 동일(이동 6절); 기존 검사 개수 83 + 실행기 1, offlineChecks 24와 분류표 일치. 과거 검사 실행 기록은 이번 실행의 증거로 쓰지 않았다.
- 검사 한계: 인증 호출 존재와 쓰기 결과 수신을 확인하며 모든 제어 흐름·권한 정책·then 콜백 처리를 증명하지는 않는다. 결제·환불·구독 발급 로직 수정 및 커밋 없음.

| 검증 명령 | exit | 마지막 줄 |
|---|---:|---|
| `node scripts/stack_review_regression_check.mjs` | 0 | `stack-review-regressions: PASS 46 / FAIL 0` |
| `npm.cmd run check:offline` | 0 | `오프라인 검사: 통과 24 · 실패 0 · 소요 6.30초` |
| `npx.cmd tsc --noEmit` | 0 | 출력 없음 |
| `npx.cmd eslint scripts/server_action_auth_check.mjs scripts/supabase_write_result_check.mjs scripts/limits_copy_check.mjs scripts/stack_review_regression_check.mjs 'src/app/(main)/cbt/page.tsx' 'src/app/(main)/cbt/[examId]/result/page.tsx'` | 0 | 출력 없음 |
| `node --input-type=module -` (세 검사 CLI 변이; src/app 임시 파일 finally 삭제) | 0 | `red-mutations: PASS 3 / FAIL 0; fixture removed` — 각 하위 검사 exit 1, 원본 문구 검사는 같은 잘못된 입력에 exit 0 확인 |
| `git -c core.autocrlf=false diff --check` | 0 | 출력 없음 |

- 커밋 메시지 제안: `fix(review): 스택 검토에서 잡은 6건`

## 코덱스 루프 실행기 (work/fable-codex-loop-runner, 2026-09-12, 워커 Codex)

feat(loop): 코덱스 샌드박스용 루프 실행기 — 커밋·병합은 실행기가

- 이유: 전달받은 9/12 실측에서 workspace-write의 .git 쓰기 차단으로 기존 루프가 30분을 소진했다. Git 쓰기를 바깥 Node 실행기로 옮기고 Codex는 오프라인 파일 작업·판정만 맡긴다.
- 변경 파일: `scripts/codex_loop_runner.mjs`, `scripts/codex_loop_runner_check.mjs`, `package.json`, `docs/loop_codex_sandbox.md`, `REPORT.md`.
- 워커 1: REVIEW 우선, 아니면 첫 미완료 BACKLOG(⏸ 제외). 새 work 브랜치 생성, 반려 수정은 기존 브랜치 유지.
- 워커 2: stdin을 닫아 Codex 실행. 완료 신호·제안 메시지로 커밋, 미완료는 wip 보관 후 이어서 1회, 끝나면 main 복귀.
- 워커 3: 완료한 REVIEW 삭제도 커밋에 포함. 로그·항목 연결은 logs에 보관하고 커밋에서 제외.
- 리뷰어 1: 최신 work 브랜치 diff·REPORT 끝 절·원래 항목으로 오프라인 PASS/FAIL 판정만 요청.
- 리뷰어 2: PASS는 no-ff 병합·항목 앞 40자 일치 확인·BACKLOG 완료·REPORT 추가·후속 커밋·브랜치 삭제.
- 리뷰어 3: FAIL 이력 3회면 NEED_HUMAN. 충돌은 abort 후 파일명 반려. NEED_HUMAN 존재 시 두 역할 즉시 종료.
- 실행 제한: Codex 호출당 기본 15분(CODEX_LOOP_MINUTES), Windows taskkill /T /F. 워커 재시도에도 별도 제한 적용. approval_policy 인자 없음.
- 가짜 실행기로 임시 Git 저장소에서 9개 시나리오 검증. 실제 codex.exe·네트워크 호출 없음. 현재 작업 저장소 커밋 없음.
- 첫 검사에서 Windows Git의 ignored logs 제외 pathspec 때문에 6건 실패, 로컬 info/exclude + git add -A로 수정 후 9/9 통과.

| 검증 명령 | exit | 마지막 줄 |
|---|---:|---|
| `npm.cmd run check:loop-runner` | 0 | `loop-runner: PASS 9 / FAIL 0` |
| `npm.cmd run check:offline` | 0 | `오프라인 검사: 통과 26 · 실패 0 · 소요 83.43초` |
| `npx.cmd eslint scripts/codex_loop_runner.mjs scripts/codex_loop_runner_check.mjs` | 0 | 출력 없음 |
| `node -e "require('./package.json')"` | 0 | 출력 없음 |

- 사람이 결정할 것: bat 호출 교체와 CLAUDE.md 규칙 갱신. 제안 diff는 `docs/loop_codex_sandbox.md`; bat 두 파일과 CLAUDE.md는 수정하지 않았다.
- 운영 메모: logs의 항목 연결·반려 이력을 회차 사이 보존. 기존 미커밋 변경·중복 실행 잠금은 중단하며, 실행기 도입 전 브랜치는 항목 연결 확인이 필요하다.
- 커밋 메시지 제안: `feat(loop): 코덱스 샌드박스용 루프 실행기 — 커밋·병합은 실행기가`

## API 라우트 감사 (work/fable-codex-api-route-audit, 2026-09-12, 워커 Codex)

실물은 route.ts 9개·export 핸들러 9개(GET 5, POST 4). 수정 6개, 그대로 2개, 결제 읽기 전용 1개. 아래 경로는 `/api` 기준이다.
공개 POST 공통 상한 B: content-length > 16,384 바이트면 읽기 전 거부, text() 결과 > 16,384 UTF-16 코드 단위면 JSON.parse 전 거부, null·배열·비객체 거부. 기존 필드 제한과 정상 응답 유지.

| 경로 | 메서드 | 인증 방식 | 입력 검증 | DB 쓰기·error 수신 | 응답·남용 피해 | 판정 |
|---|---|---|---|---|---|---|
| /client-error | POST | 없음 | B; 문자열 digest 64/message 200/path 120; stale===true; enum 없음 | alert helper→page_views insert, error 수신 | 빈 204; digest 변경으로 시간당 중복 억제 우회·DB/텔레그램 도배 | 고침 |
| /feedback | POST | 없음(세션 선택) | B; message 문자열 최소2/최대2000, contact120/path200/UA300; enum 없음 | feedback insert 및 alert helper, 모두 error 수신 | ok/truncated 또는 고정 오류; 연락처 반환 없음; 접수·알림 도배 | 고침 |
| /track | POST | 없음 | B; event 정규식 a-z0-9_ 1~40(명시 enum 없음); /경로≤512·admin/api 제외; ID64/meta·referrer512 | page_views insert 2곳, 모두 error 수신 | 빈 204; 무한 적재·통계 및 alert_* 이벤트 위조 | 고침 |
| /cron/blog-review-audit | GET | cron 비밀 | 본문 없음; 입력 쿼리 없음; 비밀 미설정 차단·바이트 길이 확인 후 timingSafeEqual | subscriptions update 및 alert helper, error 수신 | 후보200/처리50, id·블로그 URL·상태·detail; 총 바이트 상한 없음; 비밀 유출 시 이용권 회수·외부 조회·알림 반복 | 고침 |
| /cron/refund-audit | GET | cron 비밀 | 본문 없음; dry는 정확히 1만 참; 비밀 미설정 차단·상수시간 비교 | revoke helper→subscriptions update 및 alert, error 수신 | 최대500건 주문ID·집계·오류; 총 바이트 상한 없음; 비밀 유출 시 원장 조회·회수 반복 | 고침 |
| /cron/subscriber-report | GET | cron 비밀 | 본문 없음; preview 임의 비어있지 않은 값(JSON)/image; now 유한 양수(날짜 범위 상한 없음); 상수시간 비교 | 없음(조회만) | 집계·고정 규격 이미지; 이메일은 내부 필터에만 사용; 텔레그램 오류 body 총량 상한 없음; 비밀 유출 시 보고 스팸·집계 부하 | 고침 |
| /portone/webhook | POST | 세션 없음·Webhook.verify 서명 | 비밀 미설정503; raw text 상한 없음; SDK 검증; Paid/Cancelled/PartialCancelled만 처리 | grant/revoke/alert helper, insert/update error 수신 확인 | 짧은 상태·실패 이유만; 서명 전 대형 본문 메모리, 유효 이벤트 재전송 부하 | 사람 확인(수정 금지) |
| /promo/quota | GET | 없음 | 본문·입력 없음 | 없음(count 조회) | used/total/left/closed 4필드만; 반복 count 부하 | 그대로 |
| /version | GET | 없음 | 본문·입력 없음 | 없음 | site/host/commit/builtAt만; 빌드 식별 정보 공개 | 그대로 |

- 변경: 공개 POST 3곳에 B·바로 위 public-route 이유 한 줄; cron 3곳에 timingSafeEqual. 이메일·전화 원문을 반환하는 비관리자 응답은 발견하지 못함.
- 실물 차이: subscriber-report는 unauthorized가 아닌 authorized였으므로 부정 조건까지 함께 변경. 다른 promo 라우트는 없고 quota만 존재. cron 비교는 ===뿐 아니라 !==도 있었음.
- 검사: scripts/api_route_guard_check.mjs는 TypeScript AST로 함수/화살표/지역 별칭 export를 검사(PATCH 포함), 재export는 실패 처리, 중첩 함수·문자열 속 인증은 제외. 공개 본문 파싱 전후 8줄의 상한 표현을 확인하며 제어 흐름·실효 인증을 증명하는 검사는 아님.
- 결제 예외: 수정 금지와 지정 인증 이름 목록이 충돌하므로 정확히 portone/webhook POST만 Webhook.verify 호출로 별도 통과·예외 출력. 결제 폴더 diff 없음. package.json에 check:api-guards와 offlineChecks 항목 추가.
- 사람 확인 4건: ①공개 POST 호출 빈도 제한/WAF(상한은 빈도·헤더 없는 스트림 수신 메모리까지 막지 못함) ②운영 CRON_SECRET 설정 및 호출자 헤더 확인(환경 변경 안 함) ③결제 웹훅 본문 상한/검사 예외 별도 승인 ④기존 loop-runner 시간 초과를 감독 환경에서 재검증.
- cron의 preview 허용 목록·now 날짜 범위와 보호된 응답 총 바이트 상한은 기존 그대로이며 표에 기록. 네트워크·실제 DB 쓰기·텔레그램 전송·결제 호출·현재 저장소 커밋은 실행하지 않음.

| 검증 명령 | exit | 마지막 줄 |
|---|---:|---|
| `node scripts/api_route_guard_regression_check.mjs` | 0 | `api-route-regression: PASS 76 / FAIL 0` |
| blog-review-audit GET 인증 호출 삭제 후 `node scripts/api_route_guard_check.mjs` | 1(의도) | `api-route-guards: PASS 8 / FAIL 1` (finally로 원복) |
| `npm.cmd run check:api-guards` (원복 후) | 0 | `api-route-guards: PASS 9 / FAIL 0` |
| `npm.cmd run check:offline` | 1 | `오프라인 검사: 통과 26 · 실패 1 · 소요 222.35초` |
| `npx.cmd tsc --noEmit` | 0 | 출력 없음 |
| `npx.cmd eslint scripts/api_route_guard_check.mjs scripts/api_route_guard_regression_check.mjs src/app/api/{client-error,feedback,track}/route.ts src/app/api/cron/{blog-review-audit,refund-audit,subscriber-report}/route.ts` (실행 시 경로 각각 나열) | 0 | 출력 없음 |

- offline 유일 실패: check:loop-runner, `TIMEOUT 180초 — PASS NEED_HUMAN이면 두 역할 즉시 종료`; API 검사 및 write-results/action-auth 포함 나머지 26개 통과. 기존 검사 제한은 바꾸지 않음.
- 커밋 메시지 제안: `fix(api): 라우트 감사 — 공개 라우트 입력 상한·cron 비밀 상수시간 비교 + 정적 검사`
- 리뷰어 Fable 반려 반영: blog-review-audit·refund-audit 의 "비밀 미설정이면 닫힘"은 되돌렸다 — 운영 `ops/blog_audit.bat` 이 인증 헤더 없이 3시간마다 호출해 실제 응답을 받고 있어(CRON_SECRET 미설정) 그대로 두면 감사·환불 안전망이 멈춘다. 상수시간 비교는 유지. **사람 확인**: CRON_SECRET 을 Vercel env 에 넣고 bat 에 `-H "Authorization: Bearer …"` 를 같이 넣은 뒤에 닫힘으로 바꿀 것.

## loop-runner 검사 속도 (work/fable-codex-loop-runner-check-speed, 2026-09-12, 워커 Codex)
perf(check): loop-runner 검사 123.85초 → 98.60초 — 임시 저장소 재사용·짧은 타임아웃

| 시나리오 | 전(초) | 후(초) |
|---|---:|---:|
| 워커 브랜치·커밋·완료·로그·보류 | 8.28 | 7.69 |
| 이어서 1회·wip | 7.41 | 7.94 |
| 미완료 무한 재실행 방지 | 7.18 | 6.88 |
| PASS 병합·BACKLOG·REPORT·삭제 | 16.38 | 15.10 |
| FAIL 3회·반려 이력·NEED_HUMAN | 15.41 | 18.40 |
| 반려 워커 수정·REVIEW 삭제·재검수 | 32.01 | 19.46 |
| NEED_HUMAN 즉시 종료 | 3.82 | 1.31 |
| 타임아웃·프로세스 트리 종료·wip | 15.17 | 9.41 |
| 병합 충돌 abort·반려 | 17.40 | 11.77 |
| 전체(정리 포함) | 123.85 | 98.60 |

- 전/후는 같은 샌드박스의 `LOOP_CHECK_TIMING=1` 실측(리뷰어 종전 측정 152초와 구별). 측정 출력은 환경변수로만 켠다.
- 초기 커밋 직후의 저장소를 한 번 복제·보관하고 나머지 8개에 디렉터리 복사: init/add/commit 24회 제거. 변동 없는 단언 사이 브랜치 조회 5회 제거; 9개 시나리오와 단언 유지.
- 타임아웃은 회당 1.5초→1.2초(0.02분), 가짜 실행기·하위 프로세스 종료 단언 유지. 모든 가짜 실행기는 기존 자식 프로세스 방식 유지.
- `offlineCheckTimeoutSec`를 package.json에서 읽고 미지정 시 180초 유지; 양수·유한 숫자·Node 타이머 범위 검증 및 실제 설정값을 TIMEOUT에 출력. package.json 수정 불필요.
- 목표 30초 미달: 25.25초(20.4%) 단축. 남은 주요 비용은 여러 역할을 순차 실행하는 시나리오의 실제 Git checkout/commit/merge 및 Node 프로세스 시작이며, 세부 비용은 별도 분리 측정하지 않음. 부하 편차도 있어 일부 시나리오는 증가.
- 실행기 로직 변경 없음: `git diff --stat scripts/codex_loop_runner.mjs` · exit 0 · 출력 없음; 단독 및 묶음 모두 9개 통과.
- `node scripts/codex_loop_runner_check.mjs` (LOOP_CHECK_TIMING=1) · 전/후 exit 0 · 마지막 줄 `loop-runner: PASS 9 / FAIL 0` · 123.85초/98.60초.
- `npm.cmd run check:offline` · exit 0 · 마지막 줄 `오프라인 검사: 통과 27 · 실패 0 · 소요 106.53초` · 명령 전체 110.73초.
- `npx.cmd eslint scripts/codex_loop_runner_check.mjs scripts/codex_loop_runner.mjs scripts/offline_check_bundle.mjs` · exit 0 · 출력 없음 · 10.92초.
- 격리 복사본 상한 설정 smoke(Node stdin) · exit 0 · 마지막 줄 `timeout-config: PASS 7 / FAIL 0; 2.59s` · 기본값 성공, 0.1초 실제 종료, 잘못된 값 5종 거부.
- 위 절 첫 줄은 커밋 메시지 제안이며 실제 저장소 커밋은 하지 않음.

## 빌드에서만 깨지는 형태 정적 검사 (work/fable-codex-build-break-guards, 2026-09-12, 워커 Codex)
feat(check): 빌드에서만 깨지는 형태 정적 검사 — use server export·클라이언트 서버모듈·dynamicParams

- (a) 첫 문장 use server: 값 export는 async 함수만 허용; 상수·동기 함수가 tsc 뒤 Next 빌드를 깨뜨린 사고 방지. 타입 export는 제외.
- (b) use client부터 tsconfig paths·상대 의존성/재수출/동적 import/require 추적: next/headers·Supabase admin·server-only·antiSharing·서비스 키 차단. 빌드 실패·비밀 번들 노출 방지; 타입 의존 제외·use server 경계에서 중단.
- (c) generateStaticParams를 export하는 동적 page.tsx에 export const dynamicParams=false 요구. 없는 한글 글의 운영 500 방지; 실제 한 줄 주석 dynamic-params-ok: 이유는 예외.

| 파일 | 규칙 | 최초 검사 내용 |
|---|---|---|
| `src/app/try/[topic]/page.tsx` | (c) | generateStaticParams는 있으나 dynamicParams=false 없음; 수정 전 기록 |
| 서버 액션 20개 | (a) | 모두 통과 |
| 클라이언트 진입점 68개 | (b) | 모두 통과; 구조 수정 없음 |
| 나머지 정적 동적 라우트 2개 | (c) | 모두 통과 |

- 수정 전 위반을 위 표에 저장한 뒤 `/try/[topic]`에 dynamicParams=false 추가: 소스 수정 1건, 남긴 위반 0건; (b) 구조 수정 없음.
- TypeScript AST 사용(정규식 없음); package.json의 check:build-guards에 --self-test를 포함하고 offlineChecks에 등록. 별도 regression npm 명령 없음.
- os.tmpdir() 픽스처 41개: 상수/동기/재수출/타입 별표 export, 경로 별칭/순환/서버 액션 경계, 동적 경로/거짓 예외 주석 등 확인 후 삭제.
- (b) 검사 분기를 실제로 끈 mutation: `node --input-type=module`(stdin) · exit 1 · 마지막 줄 `mutation b disabled: exit 1`; 24 !== 41로 실패 확인 후 finally에서 원복.
- 원복 회귀 검사: PASS 41 / FAIL 0. 현재 저장소: (a) 20/0, (b) 68/0, (c) 3/0 (통과/실패).

| 검증 명령 | exit | 마지막 줄 |
|---|---:|---|
| `npm.cmd run check:build-guards` | 0 | `build-guards: a PASS 20 / FAIL 0 · b PASS 68 / FAIL 0 · c PASS 3 / FAIL 0 · self-test PASS` |
| `npm.cmd run check:offline` | 0 | `오프라인 검사: 통과 28 · 실패 0 · 소요 145.99초` |
| `npx.cmd tsc --noEmit` | 0 | 출력 없음 |
| `npx.cmd eslint scripts/build_break_guard_check.mjs scripts/build_break_guard_regression_check.mjs 'src/app/try/[topic]/page.tsx'` | 0 | 출력 없음 |

- 절 첫 줄은 커밋 메시지 제안이며 실제 커밋하지 않음. 로컬 Next 빌드는 실행하지 않았으며, 위 세 형태에 대한 정적 검사 결과임.

## 루프 규칙 적용 — 사람 결정용 (work/fable-codex-loop-rules-apply, 2026-09-12, 워커 Codex)
chore(loop): 루프 규칙·bat 을 실행기 방식으로 — 사람 결정용

- 변경 파일 3개: `CLAUDE.md`, `scripts_bat/worker.bat`, `scripts_bat/reviewer.bat`; 이 절은 REPORT.md에 추가.
- CLAUDE.md: 제안 diff의 7개 규칙 문장을 그대로 적용. Git 쓰기·반려 문서 관리는 실행기, 워커는 저장·완료 신호, 리뷰어는 판정 담당. 다른 절 유지.
- bat: 기존 Claude 호출·모델 제한 검사·sonnet 재시도를 역할별 실행기 한 줄과 LOOP_EXIT 저장·반환으로 교체. 표제·chcp·cd·로그·건너뛰기 유지.
- 워커 가드: BACKLOG 미완료가 없고 REVIEW.md도 없을 때만 건너뛰므로 반려 문서만 있어도 실행기로 진입.
- 제안과 달랐던 점: CLAUDE.md는 없음. bat은 이번 지시대로 로그 리다이렉션·종료 코드 전달·REVIEW.md 가드 추가.
- 바이트 검사 전: 두 bat 모두 CRLF 18줄; 기존 호출문 비-ASCII는 worker 192바이트, reviewer 174바이트. HEAD와 체크아웃은 줄바꿈 정규화 후 동일.
- 바이트 검사 후: Node Buffer로 확인, 두 bat 각각 CRLF 15줄·단독 CR/LF 0개·비-ASCII 0바이트·마지막 CRLF 있음, exit 0.
- 정적 대조: check:loop-runner의 scripts/codex_loop_runner_check.mjs가 참조하는 ./codex_loop_runner.mjs 및 [runner, role]과 bat의 scripts/codex_loop_runner.mjs worker/reviewer 일치, exit 0.
- 실행기 및 check:loop-runner는 실행하지 않음. 예약 작업 설정과 NEED_HUMAN.md도 변경하지 않음.
- npm.cmd run check:own-copy: exit 0, 통과 3·실패 0; src 275개·README.md와 docs 문서 13개 검사. CLAUDE.md·bat·REPORT.md는 범위 밖.
- git diff --check: exit 0. git diff --stat: 변경 본체 3파일, 14줄 추가·20줄 삭제; 이 보고 절 추가 후 최종 stat 별도 확인.
- 병합 전 사람이 할 것: NEED_HUMAN.md 차단 사유를 확인하고 해제; 예약 작업이 병합된 새 bat을 읽는지 확인; 첫 실행 로그(worker/reviewer.log 및 codex 역할별 로그) 확인.
- 실제 커밋·PR 생성은 하지 않음. 절 첫 줄은 커밋 메시지 제안이며 병합 여부는 사람이 결정.

## exam-flow 시작 관문 (work/fable-codex-exam-flow-gate, 2026-09-12, 워커 Codex)
fix(check): 브라우저 검사가 시험 '시작 안내' 관문을 통과한다 — exam-flow 3일째 빨간불
- 위 첫 줄은 커밋 메시지 제안이며 커밋은 하지 않았다.
- 원인: b5c1934 이후 회차 진입은 ExamIntro이고, 기존 검사는 4초 뒤 곧바로 문항 수를 읽었다.
- 실제 조작은 이름이 “시작하기”인 link → ?start=1. getOrCreateExamSession이 세션을 생성/재사용한 뒤 ExamPlayer가 뜬다. 신규 started_at은 DB DEFAULT now()(001_cbt.sql)로 기록된다.
- 공용 passExamStartGate는 안내 또는 완료 표시를 기다리고, 안내가 있을 때만 시작한다. 클릭 뒤 n/m 완료를 waitForFunction으로 최대 20초 기다린다. 링크·버튼 역할을 지원한다.
- exam-flow는 안내의 시간과 getProgram().examMinutes, 객관식+서술형 수와 실제 플레이어 총문항 수를 비교하여 ok/bad로 남긴다.

| 검사(scripts/*.mjs) | 기존 관문 처리 | 변경/판단 |
| --- | --- | --- |
| exam_flow_check | 없음 | 공용 처리 + 안내 설정 대조 |
| error_recovery_check | 없음 | 회선 차단 전에 공용 처리 |
| exam_autosave_check | 없음 | 시작·답안 선택 전에 공용 처리 |
| exam_screen_ui_check | 없음 | 모바일·데스크톱 모두 공용 처리 |
| exit_save_check | 없음 | 두 기기 진입에 공용 처리 |
| free_to_paid_resume_check | 없음 | 최초·재진입에 공용 처리 |
| session_resume_check | 없음(저장 세션은 안내 생략) | 공용 처리, 기존 답안/세션 판정 유지 |
| exam_entry_check | 있음(시작 링크 클릭, 재진입 ?start=1) | 유지: 안내·빈 세션 자체를 검증 |
| authed_ui_check / exam_timer_check | 대상 아님 | 목록까지만 방문 / 오프라인 소스·함수 검사 |
| authed_page_sweep / subscription_gate_check | 없음 | 유지: 접근·리다이렉트 검사, 문항 조작 없음 |
| paid_essay_resume / review_invite / past_result_link_check | 대상 아님 | 결과·목록 검사이므로 유지 |
- shoot-exam/shoot-question/shoot-result는 검사 아닌 촬영 도구라 변경하지 않았다. 검색은 rg가 없어 PowerShell Select-String으로 대체했다.
- 새 파일: scripts/exam_start_gate.mjs, scripts/exam_start_gate_check.mjs. package.json에 check:exam-gate와 offlineChecks 항목 추가.
- 검증: 변경·신규 스크립트 9개 각각 node --check · exit 0 · 마지막 줄 “node --check: 9/9 PASS”.
- 검증: npx.cmd --no-install eslint <위 변경 검사 7개 + 신규 스크립트 2개> · exit 0 · 출력 없음(셸 기록: eslint exit=0).
- 검증: npm.cmd run check:exam-gate · exit 0 · 마지막 줄 “시험 시작 관문 5/5 통과”.
- 검증: git diff --check · exit 0 · 오류 없음(줄바꿈 변환 경고만 있음).
- 브라우저 실행은 미실행(네트워크 없음), 리뷰어 검증 요청. 실제 브라우저 동작의 통과는 주장하지 않는다.

## PR 오프라인 검사 CI (work/fable-codex-ci-offline-checks, 2026-09-12, 워커 Codex)
ci: PR마다 tsc·eslint·check:offline 을 GitHub Actions 로
- 위 첫 줄은 커밋 메시지 제안이다. 저장소 커밋은 하지 않았다.
- `.github/workflows/offline-checks.yml`: 모든 대상 브랜치의 pull_request 및 main push에서 실행.
- ubuntu-latest · checkout@v4 · setup-node@v4(Node 24, cache: npm) · npm ci 뒤 tsc / eslint / check:offline을 각각 별도 step으로 실행.
- contents: read만 허용, 브랜치별 concurrency와 cancel-in-progress, job timeout 20분, secrets·DB·브라우저 검사 없음.
- 실제 package.json의 offlineChecks는 29개(요청 배경의 30개와 차이). 기존 목록은 추가·제외 없이 유지했다.
- `.env.local` 의존 오프라인 검사 0개: 검사 및 로컬 import 47개 파일 추적에서 참조 없음. 없는 경우 `{}`로 바꿀 대상도 없었다.
- `.env.local`이 실제로 없는 Windows 클론에서 전체 묶음 통과. 기존 온라인 검사들의 환경 파일 처리는 변경하지 않았다.
- codex_loop_runner.mjs: 기존 플랫폼 분기를 유지하고 비Windows는 요청대로 detached 없이 child.kill('SIGKILL'); Windows는 taskkill.exe /T /F와 실패 시 SIGKILL 유지.
- codex_loop_runner_check.mjs: Windows는 heartbeat 손자 PID, Linux는 fake Codex 자신의 PID를 기록하고 process.kill(pid, 0)이 ESRCH를 내는지 확인한다.
- Linux 경로는 두 번의 타임아웃, exit 1, TIMEOUT 출력, wip 보존, main 복귀와 직접 자식 종료를 검증한다. Linux 손자 트리 종료는 보장하지 않는다.
- Linux 실제 실행은 못 했다. Windows의 기존 타임아웃·프로세스 트리 종료를 포함한 loop-runner는 PASS 9 / FAIL 0.
- offline_check_bundle.mjs 점검: npm.cmd 호출 없음, process.execPath 및 path/fileURLToPath 사용, Windows taskkill/Linux detached 프로세스 그룹 종료 분기 이미 있어 수정 불필요.
- README 검사 표 바로 아래에 PR마다 GitHub Actions가 오프라인 검사를 실행한다는 안내를 추가했다.
- YAML 검증: 설치된 js-yaml로 파싱하고 이벤트·권한·취소·러너·시간제한·Node/cache·실행 단계 및 npm 스크립트 존재를 assert로 대조, exit 0.
- YAML 검증 마지막 결과 줄: `YAML (js-yaml), workflow steps, npm scripts: PASS; offlineChecks=29`.
- 검증 환경: Windows, Node v24.16.0. 로컬 npm ci는 네트워크 제한으로 실행하지 않았으며 Actions 설치 단계는 첫 PR 확인 대상이다.
- `npm.cmd run check:offline` · exit 0 · 마지막 줄: `오프라인 검사: 통과 29 · 실패 0 · 소요 189.75초`.
- `npx.cmd tsc --noEmit` · exit 0 · 마지막 줄: 출력 없음.
- `npx.cmd eslint scripts src --max-warnings 0` · exit 0 · 마지막 줄: 출력 없음.
- `git diff --check` · exit 0 · 오류 없음(줄바꿈 변환 경고만 있음).
- **사람 확인**: 첫 PR에서 Actions 실제 실행 결과와 총 소요 시간을 확인하고, 실패하면 실패 step 및 check:offline 표의 검사 이름·exit·마지막 줄을 기록한다.

## 스택 후반부 적대적 검토 (work/fable-codex-stack-review-2, 2026-09-12, 검토자 Codex)

- 범위: `git diff a818598...HEAD`, `git log --oneline a818598..HEAD`의 7341278~2bc1e40 7개 커밋. 기존 작업 트리 깨끗함 확인 후 검토; 실제 Codex·네트워크·결제 호출·현재 저장소 커밋 없음.
- 발견 8건: 막아야 함 3 / 고쳐야 함 5 / 참고 0. 아래는 수정 전 실패를 재현한 건만 기록하며, 줄 번호는 수정 후 기준이다.

| 파일 · 줄 | 무엇이 · 재현 조건 | 심각도 | 수정 |
|---|---|---|---|
| `scripts/codex_loop_runner.mjs:165` | `git add -f logs/private.txt` 후 워커 실행: dirty 검사에서 logs를 빼므로 남의 staged 파일이 워커 커밋에 섞임(차단 기대 exit 1, 실제 0). | 막아야 함 | 모든 staged 변경 및 tracked logs 변경을 시작 전에 차단 |
| `scripts/codex_loop_runner.mjs:119` | main과 동일한 work 브랜치에 항목 연결 후 리뷰어 PASS: 빈 diff인데 BACKLOG 체크·브랜치 삭제 수행. | 막아야 함 | 빈 diff는 호출 전 반려, 항목·브랜치 보존 |
| `scripts/codex_loop_runner.mjs:108` | REVIEW와 미완료 BACKLOG 공존 → 반려 워커가 2회 미완료: REVIEW를 work에 커밋하고 main 복귀 시 잃어 다음 워커가 새 작업을 선택. | 고쳐야 함 | main에 REVIEW 복원; 재진입 시 미추적 복사본의 checkout 충돌도 처리 |
| `scripts/codex_loop_runner.mjs:129` | 기존 미추적 REVIEW 내용을 가짜 리뷰어가 덮어쓰고 PASS: 전후 status가 같은 `?? REVIEW.md`라 수정 감지를 우회하고 병합. | 막아야 함 | REVIEW 내용도 비교하고 변경·work 브랜치를 보존한 채 exit 1 |
| `src/app/api/track/route.ts:17`, `client-error/route.ts:24`, `feedback/route.ts:18` (같은 api 폴더) | 헤더 없음/거짓 1 + 한글 포함 16,385바이트 JSON이 저장됨; `req.text()`는 초과 스트림도 끝까지 읽음. BOM 3바이트는 디코딩 후 사라짐. | 고쳐야 함 | `src/lib/boundedRequestText.ts:2`에서 실제 수신 바이트 제한·초과 reader 취소, 기존 204/400 유지 |
| `scripts/api_route_guard_regression_check.mjs:34`, `package.json:110` | cron 비밀 미설정 정책 변경 뒤에도 3곳 전부 차단을 기대하여 원본 검사 exit 1; offlineChecks 미등록이라 CI는 이 실패를 검사하지 않음. | 고쳐야 함 | 기존 cron 정책에 기대값 일치(운영 코드 불변), 오프라인 묶음에 회귀 검사 등록 |
| `scripts/api_route_guard_check.mjs:55` | 인증하는 정상 `export const PUT = (async () => { await auth.getUser() }) satisfies Handler`가 Unsupported handler 예외로 실패. | 고쳐야 함 | 괄호·as·satisfies를 벗긴 함수 AST 검사 |
| `scripts/build_break_guard_check.mjs:10` | `'use strict'; 'use server'; export const value = 1` 및 같은 형태 client→next/headers가 검사 대상에서 누락(회귀 대상 45개 중 43개만 수집). | 고쳐야 함 | 선두 문자열 지시문 전체 탐색; 로컬 Next get-page-static-info의 지시문 처리와 대조 |

- 수정: 위 8건과 연결된 회귀 검사만 추가. 실행기 16개 시나리오, 빌드 검사 45개 픽스처; API는 16,383/16,384/16,385바이트·거짓/누락 헤더·BOM·스트림 취소·비JSON·정상 비콘 검사.
- Git 안전성 대조: 잔존 lock은 보존·호출 거부; main이 다른 worktree에서 사용 중이면 checkout 실패·현재 work/결과 보존·main 불변·lock 해제. 기존 merge 충돌 검사는 abort 후 HEAD/파일 보존 확인.
- 앞 40자만 같은 두 BACKLOG 항목은 문서대로 반려하고 어느 것도 체크하지 않음(재현 검사 통과); 실제 오완료로 분류하지 않음. REVIEW와 미완료 BACKLOG 공존 시 REVIEW 우선 및 같은 브랜치 재사용 확인.
- 정상 클라이언트 대조: `src/lib/analytics/trackEvent.ts:15`의 event/meta/null/visitorId/sessionId, `TrafficTracker.tsx:42`의 path/referrer 형태 및 호출부의 이벤트 이름을 확인. 36자 UUID·512자 meta/path·null meta를 mock insert로 통과 확인; 기존 필드 제한 유지.
- 정적 검사 대조: default async function·지역 alias·재export·satisfies·타입 전용 import/export·동적 import 및 next/dynamic·순환 의존을 픽스처로 확인. API 재export는 명시적 실패 정책; 인증/상한 AST 검사는 제어 흐름의 안전성을 증명하지 않는다.
- 관문: 7개 호출자는 모두 `/cbt/...`; 기존/이어풀기는 `ExamPlayer.tsx:316`의 n/m 완료와 일치. `/practice/essay`에는 호출 없음. 관문 파서 5/5 통과; 실제 서비스 브라우저 실행은 네트워크 없어 미실행.
- CI: package.json/lock 루트 dependencies·devDependencies 동일(assert 통과), 새 의존성 없음. 묶음은 process.execPath/정규 경로, 임시 Git은 `-c user.name/email` 사용. Linux 실행·npm ci는 미실행; Linux 손자 종료 미보장은 기존 REPORT에 이미 명시되어 있음.
- REPORT 사실 대조: 이전 API 절의 PASS 76은 현재 원본 회귀 검사와 불일치했으며 위 6번으로 고침. 과거 검증 기록은 그대로 두고 현재 결과를 아래에 기록한다.

| 검증 명령 | exit | 마지막 줄 |
|---|---:|---|
| 수정 전 `LOOP_CHECK_FILTER=review-2 node scripts/codex_loop_runner_check.mjs` (pwsh 환경변수로 지정) | 1 | `loop-runner: PASS 0 / FAIL 3` |
| 수정 전 `node scripts/api_route_guard_regression_check.mjs` | 1 | `Node.js v24.16.0` (32행: false !== true) |
| 수정 후 `npm run check:offline` (리뷰어 실행) | 0 | `오프라인 검사: 통과 30 · 실패 0 · 소요 127.81초` |
| `npx tsc --noEmit` (리뷰어 실행) | 0 | 출력 없음 |
| 변경 코드 10개 `npx eslint --max-warnings 0` (리뷰어 실행) | 0 | 출력 없음 · `node scripts/api_route_guard_regression_check.mjs` → `api-route-regression: PASS 137 / FAIL 0` |

- ESLint 대상: scripts/{codex_loop_runner,codex_loop_runner_check,api_route_guard_check,api_route_guard_regression_check,build_break_guard_check,build_break_guard_regression_check}.mjs, src/lib/boundedRequestText.ts, src/app/api/{track,client-error,feedback}/route.ts (실행 시 각각 전체 경로 나열).
- 커밋 메시지 제안: `fix(review): 스택 후반부 검토에서 잡은 8건`
- 검토자 회차가 20분 제한에 걸려 검증 표를 못 채웠고, 위 세 줄은 리뷰어 Fable 이 같은 트리에서 실행해 채웠다.
