# 오프라인 검사 분류 — 2026-09-12

기존 `check:*` 83개의 실제 스크립트 내용과 오프라인 후보의 로컬 import를 확인했다. 분류는 기본 명령 전체 기준이며, 순수 검증 뒤에 실제 요청이 있으면 네트워크로 분류한다. 브라우저 검사는 네트워크·DB가 함께 필요해도 브라우저로 한 번만 센다.

기존 검사: 오프라인 26 · 네트워크 20 · 브라우저 37. 실행 목록은 오프라인 24개이며 아래 두 개는 실행 실패 때문에 제외했다. 새 `check:offline`은 이 수에 포함하지 않는 오프라인 실행기다.

| 이름 | 파일 | 판정 | 근거 |
|---|---|---|---|
| `check:schema` | `scripts/schema_drift_check.py` | 네트워크 | .env.local·SUPABASE 키를 읽고 requests.get으로 운영 DB 스키마 조회 |
| `check:questions` | `scripts/audit_questions.py` | 네트워크 | supabase_rest.get으로 DB 조회 및 urllib.request.urlopen으로 음성 확인 |
| `check:duplicates` | `scripts/question_overlap_check.py` | 네트워크 | supabase_rest.get → .env.local·SUPABASE·urllib.request.urlopen |
| `check:schedule` | `scripts/schedule_freshness_check.mjs` | 오프라인 | examSchedule.ts 파일과 현재 날짜 비교; https URL은 출력만 함 |
| `check:pages` | `scripts/authed_page_sweep.mjs` | 브라우저 | Playwright chromium.launch 및 .env.local·SUPABASE DB/API와 BASE URL의 웹 서버 필요 |
| `check:blog` | `scripts/blog_keyword_overlap.py` | 오프라인 | 로컬 src/content/blog/*.json만 읽음; Python 미설치(ENOENT)로 묶음 제외 |
| `check:contrast` | `scripts/contrast_check.mjs` | 브라우저 | Playwright chromium.launch 및 BASE URL의 웹 서버 필요 |
| `check:mobile` | `scripts/mobile_ux_check.mjs` | 브라우저 | Playwright chromium.launch 및 BASE URL의 웹 서버 필요 |
| `check:vitals` | `scripts/web_vitals_check.mjs` | 브라우저 | Playwright chromium.launch 및 BASE URL의 웹 서버 필요 |
| `check:ui-authed` | `scripts/authed_ui_check.mjs` | 브라우저 | Playwright chromium.launch 및 .env.local·SUPABASE DB/API와 BASE URL의 웹 서버 필요 |
| `check:keyboard` | `scripts/keyboard_desktop_check.mjs` | 브라우저 | Playwright chromium.launch 및 BASE URL의 웹 서버 필요 |
| `check:a11y` | `scripts/a11y_structure_check.mjs` | 브라우저 | Playwright chromium.launch 및 .env.local·SUPABASE DB/API와 BASE URL의 웹 서버 필요 |
| `check:recovery` | `scripts/error_recovery_check.mjs` | 브라우저 | Playwright chromium.launch 및 .env.local·SUPABASE DB/API와 BASE URL의 웹 서버 필요 |
| `check:exam-flow` | `scripts/exam_flow_check.mjs` | 브라우저 | Playwright chromium.launch 및 .env.local·SUPABASE DB/API와 BASE URL의 웹 서버 필요 |
| `check:manuscript` | `scripts/manuscript_check.mjs` | 브라우저 | Playwright chromium.launch 및 .env.local·SUPABASE DB/API와 BASE URL의 웹 서버 필요 |
| `check:sub-gate` | `scripts/subscription_gate_check.mjs` | 브라우저 | Playwright chromium.launch 및 .env.local·SUPABASE DB/API와 BASE URL의 웹 서버 필요 |
| `check:pulse` | `scripts/today_pulse_check.mjs` | 브라우저 | Playwright chromium.launch 및 .env.local·SUPABASE DB/API와 로컬 Next 서버 필요 |
| `check:report` | `scripts/report_check.mjs` | 네트워크 | next build/start 자식 프로세스 및 localhost HTTP; 보고 라우트의 DB 의존 |
| `check:admin` | `scripts/admin_ui_check.mjs` | 브라우저 | Playwright chromium.launch 및 .env.local·SUPABASE DB/API와 로컬 Next 서버 필요 |
| `check:account` | `scripts/account_delete_check.mjs` | 브라우저 | Playwright chromium.launch 및 .env.local·SUPABASE DB/API와 BASE URL의 웹 서버 필요 |
| `check:review-invite` | `scripts/review_invite_check.mjs` | 브라우저 | Playwright chromium.launch 및 .env.local·SUPABASE DB/API와 BASE URL의 웹 서버 필요 |
| `check:blocks` | `scripts/paid_block_check.mjs` | 네트워크 | .env.local·SUPABASE_SERVICE_ROLE_KEY 및 fetch로 운영 DB 조회 |
| `check:device-window` | `scripts/device_window_check.mjs` | 오프라인 | deviceWindow.ts 순수 함수와 assert; 외부 import 없음 |
| `check:entry` | `scripts/exam_entry_check.mjs` | 브라우저 | Playwright chromium.launch 및 .env.local·SUPABASE DB/API와 BASE URL의 웹 서버 필요 |
| `check:dropoff` | `scripts/exam_dropoff_check.mjs` | 네트워크 | .env.local 및 fetch로 운영 DB의 학습 기록 조회 |
| `check:score` | `scripts/predicted_score_accuracy_check.mjs` | 네트워크 | .env.local 및 fetch로 운영 DB와 예상 점수 대조 |
| `check:predicted` | `scripts/predicted_score_check.mjs` | 브라우저 | Playwright chromium.launch 및 .env.local·SUPABASE DB/API와 BASE URL의 웹 서버 필요 |
| `check:limit-dialog` | `scripts/daily_limit_dialog_check.mjs` | 오프라인 | antiSharingLimits.ts 순수 함수 및 화면 소스 readFileSync |
| `check:blog-render` | `scripts/blog_render_check.mjs` | 브라우저 | Playwright chromium.launch 및 BASE URL의 웹 서버 필요 |
| `check:signup` | `scripts/signup_flow_check.mjs` | 브라우저 | Playwright chromium.launch 및 .env.local·SUPABASE DB/API와 BASE URL의 웹 서버 필요 |
| `check:data` | `scripts/data_integrity_check.mjs` | 네트워크 | .env.local 및 fetch로 Supabase REST·관리자 사용자 조회 |
| `check:revenue` | `scripts/revenue_integrity_check.mjs` | 네트워크 | .env.local·SUPABASE fetch·PortOneClient(PORTONE_API_SECRET) 조회 |
| `check:policy` | `scripts/policy_consistency_check.mjs` | 네트워크 | 순수 검증 뒤 fetch(POLICY_CHECK_BASE 또는 https://kptest.cloud) 실행 |
| `check:revoke` | `scripts/refund_revocation_check.mjs` | 오프라인 | 순수 decideRevocation 및 소스 문자열 대조; 11/12 실패로 묶음 제외 |
| `check:attempts` | `scripts/payment_attempt_check.mjs` | 오프라인 | paymentAttemptFunnel.ts 순수 집계에 고정 배열 입력 |
| `check:methods` | `scripts/payment_method_check.mjs` | 오프라인 | PaymentButton.tsx를 문자열로 검사; PortOne 호출 없음 |
| `check:renewal` | `scripts/renewal_check.mjs` | 오프라인 | subscriptionRenewal.ts 순수 집계와 고정 날짜 |
| `check:feedback` | `scripts/feedback_check.mjs` | 오프라인 | feedbackMessage.ts 순수 입력 검증; 접수 요청 없음 |
| `check:alerts` | `scripts/alert_channel_check.mjs` | 오프라인 | alertChannel.ts에 불리언 입력; 메시지 발송 없음 |
| `check:chunk` | `scripts/stale_chunk_check.mjs` | 오프라인 | staleChunkRecovery.ts에 오류 문자열 입력; 브라우저 실행 없음 |
| `check:keyshape` | `scripts/api_key_shape_check.mjs` | 오프라인 | apiKeyShape.ts에 가짜 문자열 입력; 환경변수·API 사용 없음 |
| `check:autosave` | `scripts/exam_autosave_check.mjs` | 브라우저 | Playwright chromium.launch 및 .env.local·SUPABASE DB/API와 BASE URL의 웹 서버 필요 |
| `check:resume` | `scripts/session_resume_check.mjs` | 브라우저 | Playwright chromium.launch 및 .env.local·SUPABASE DB/API와 BASE URL의 웹 서버 필요 |
| `check:exam-ui` | `scripts/exam_screen_ui_check.mjs` | 브라우저 | Playwright chromium.launch 및 .env.local·SUPABASE DB/API와 BASE URL의 웹 서버 필요 |
| `check:past-result` | `scripts/past_result_link_check.mjs` | 브라우저 | Playwright chromium.launch 및 .env.local·SUPABASE DB/API와 BASE URL의 웹 서버 필요 |
| `check:resolved-notice` | `scripts/resolved_notice_check.mjs` | 브라우저 | Playwright chromium.launch 및 .env.local·SUPABASE DB/API와 BASE URL의 웹 서버 필요 |
| `check:free-to-paid` | `scripts/free_to_paid_resume_check.mjs` | 브라우저 | Playwright chromium.launch 및 .env.local·SUPABASE DB/API와 BASE URL의 웹 서버 필요 |
| `check:paid-essay-resume` | `scripts/paid_essay_resume_check.mjs` | 브라우저 | Playwright chromium.launch 및 .env.local·SUPABASE DB/API와 BASE URL의 웹 서버 필요 |
| `check:exit-save` | `scripts/exit_save_check.mjs` | 브라우저 | Playwright chromium.launch 및 .env.local·SUPABASE DB/API와 BASE URL의 웹 서버 필요 |
| `check:promo` | `scripts/promo_redeem_check.mjs` | 브라우저 | Playwright chromium.launch 및 .env.local·SUPABASE DB/API와 BASE URL의 웹 서버 필요 |
| `check:pace` | `scripts/exam_pace_check.mjs` | 오프라인 | examPace.ts 순수 계산과 고정 숫자 |
| `check:quota-cap` | `scripts/blog_quota_cap_check.mjs` | 브라우저 | Playwright chromium.launch 및 .env.local·SUPABASE DB/API와 BASE URL의 웹 서버 필요 |
| `check:blog-promo` | `scripts/blog_promo_review_check.mjs` | 브라우저 | Playwright chromium.launch 및 .env.local·SUPABASE DB/API와 BASE URL의 웹 서버 필요 |
| `check:spelling-consistency` | `scripts/spelling_consistency_check.mjs` | 네트워크 | .env.local·SUPABASE 및 fetch로 운영 문항 조회 |
| `check:blog-lab` | `scripts/blog_rule_lab_check.mjs` | 네트워크 | 마지막 fetchBlogPost → blogPromoFetch.ts의 fetch로 네이버 실제 요청 |
| `check:audit-revoke` | `scripts/blog_audit_revoke_check.mjs` | 네트워크 | .env.local·SUPABASE fetch·requireSite 및 운영 감사 cron 호출 |
| `check:popup` | `scripts/event_popup_check.mjs` | 브라우저 | Playwright chromium.launch 및 .env.local·SUPABASE DB/API와 BASE URL의 웹 서버 필요 |
| `check:trial` | `scripts/trial_check.mjs` | 브라우저 | Playwright chromium.launch 및 BASE URL의 웹 서버 필요 |
| `check:sales` | `scripts/daily_sales_check.mjs` | 네트워크 | 고정 데이터 검증 뒤 .env.local을 읽고 Supabase 원장 fetch |
| `check:blog-cta` | `scripts/blog_cta_check.mjs` | 네트워크 | requireSite 및 운영 /blog URL fetch로 발행 HTML 검사 |
| `check:next-round` | `scripts/next_round_check.mjs` | 오프라인 | nextRoundToTake.ts 순수 함수 및 결과 화면 파일 읽기 |
| `check:audio-guard` | `scripts/audio_download_guard_check.mjs` | 오프라인 | TSX 파일에서 audio 속성을 검사; 음성 다운로드 없음 |
| `check:exam-timer` | `scripts/exam_timer_check.mjs` | 오프라인 | examTimerLevel.ts 순수 함수 및 ExamPlayer.tsx 읽기 |
| `check:exit-hygiene` | `scripts/check_exit_hygiene_check.mjs` | 오프라인 | scripts 파일 안 chromium.launch·close 문자열 대조만 수행 |
| `check:bundle` | `scripts/public_page_bundle_check.mjs` | 네트워크 | 운영 BASE와 /_next/static/chunks를 fetch; 서버 응답 필요 |
| `check:alert-triage` | `scripts/alert_triage_check.mjs` | 오프라인 | operatorAlertTriage.ts 순수 함수; URL은 입력 문자열 |
| `check:nav` | `scripts/navigation_speed_check.mjs` | 브라우저 | Playwright chromium.launch 및 BASE URL의 웹 서버 필요 |
| `check:first-click` | `scripts/first_click_check.mjs` | 브라우저 | Playwright chromium.launch 및 BASE URL의 웹 서버 필요 |
| `check:region` | `scripts/server_region_check.mjs` | 네트워크 | 운영 BASE fetch 응답의 x-vercel-id로 리전 확인 |
| `check:landing-cache` | `scripts/landing_cache_check.mjs` | 오프라인 | 소스의 revalidate 확인; 로컬 warm_pages.bat 존재 여부는 선택 사항 |
| `check:pay-guide` | `scripts/payment_block_guidance_check.mjs` | 브라우저 | Playwright chromium.launch 및 .env.local·SUPABASE DB/API와 BASE URL의 웹 서버 필요 |
| `check:page-quiz` | `scripts/content_page_quiz_check.mjs` | 브라우저 | Playwright chromium.launch 및 BASE URL의 웹 서버 필요 |
| `check:deployed` | `scripts/deploy_freshness_check.mjs` | 네트워크 | git fetch origin 및 운영 /api/version fetch; Vercel 배포 확인 |
| `check:dday` | `scripts/exam_dday_check.mjs` | 오프라인 | Node 자식 프로세스에서 examSchedule.ts·examDday.ts 계산; HTTP 없음 |
| `check:ai-cost` | `scripts/ai_cost_check.mjs` | 네트워크 | .env.local·SUPABASE 키 및 fetch로 운영 사용량·원장 조회 |
| `check:own-copy` | `scripts/own_copy_spelling_check.mjs` | 오프라인 | src·README·docs 파일의 표기 대조만 수행 |
| `check:limits-copy` | `scripts/limits_copy_check.mjs` | 오프라인 | 로컬 TypeScript AST·상수 대조; createClient 모듈 실행 없음 |
| `check:row-cap` | `scripts/row_cap_check.mjs` | 네트워크 | .env.local·SUPABASE fetch(HEAD 포함)로 행 수·사용자 수 조회 |
| `check:write-results` | `scripts/supabase_write_result_check.mjs` | 오프라인 | src 파일의 쓰기 체인 문자열 검사; Supabase 접속 없음 |
| `check:action-auth` | `scripts/server_action_auth_check.mjs` | 오프라인 | src 파일의 인증 호출 토큰 검사; 인증 요청 없음 |
| `check:wrong-retake` | `scripts/wrong_note_retake_check.mjs` | 오프라인 | wrongNoteRetake.ts 순수 함수와 assert; DB import 없음 |
| `check:admin-paging` | `scripts/admin_paging_check.mjs` | 브라우저 | Playwright chromium.launch 및 .env.local·SUPABASE DB/API와 로컬 Next 서버 필요 |
| `check:saved-answers` | `scripts/saved_answers_check.mjs` | 오프라인 | savedAnswers.ts 순수 함수와 assert; 저장소 접속 없음 |
| `check:offline` | `scripts/offline_check_bundle.mjs` | 오프라인 | package.json의 offlineChecks만 순차 실행; 목록 자체의 네트워크를 차단하는 방화벽은 아님 |

## 실행 후 제외한 검사

- `check:blog`: 로컬 JSON만 읽는 오프라인 검사지만 이 샌드박스의 PATH에 Python이 없다. 최초 실행은 `spawn python ENOENT`였다. 검사 파일과 명령은 수정하지 않았다.
- `check:revoke`: 네트워크가 없는 소스 검증이다. `isActivePass`가 `src/lib/subscriptionDisplay.ts`로 옮겨졌는데 `subscription.ts`에서 `status === 'active'` 문자열을 요구하여 11/12로 실패한다. 두 파일을 확인했고 검사 수정 없이 목록에서 제외했다.

## 목록 유지와 실행 규칙

새 검사의 실제 호출과 import를 확인한 뒤 `package.json`의 `offlineChecks` 배열에 이름을 추가한다. 실행기는 같은 파일의 scripts 명령을 읽으며 목록을 따로 갖지 않는다. Node는 현재 process.execPath, Python은 명령의 python/python3 실행기를 셸 없이 호출한다. 현재 명령 형태인 단순 공백 구분 인자만 지원하고 인용·셸 연산자는 설정 오류로 실패시킨다.

각 검사는 최대 180초이며 초과 시 자식 트리를 종료하고 실패 처리한 뒤 다음 검사를 실행한다. 명령 부재·실행 오류·비정상 종료도 실패다. 각 행은 exit와 마지막 출력 줄, 마지막 줄은 통과·실패·소요 시간이다. 최초 후보 실행은 24 통과·2 실패(9.63초, exit 1)였고 최종 목록 결과 전체는 REPORT.md에 기록한다.
