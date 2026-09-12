# 오답노트 문항 제외 설계

2026-09-12 · 검토용 초안. 근거 표본은 지시문에 전달된 2026-09-10 유료 이용자 문의 1건이다. 전체 이용자의 요구로 일반화하지 않는다.

## 현재 데이터 흐름

- `src/app/(main)/practice/wrong/page.tsx:WrongPracticePage`는 세션 사용자와 현재 program의 `quiz_sessions` 중 `completed_at`이 있는 세션을 조회한다.
- 해당 세션의 `quiz_answers`에서 `is_correct`가 null이 아닌 답안을 완료 시각 오름차순으로 훑고, 문항별 마지막 답안이 오답인 ID만 남긴다. 완료 시각 동률의 우선순위는 명시돼 있지 않다.
- `src/lib/questionBank.ts:questionBank`로 `questions`를 읽어 현재 program·`type = multiple`을 제한하고 회차·문항 번호순으로 정렬한다. 제외 상태는 없다.
- 회차 필터는 `WrongPracticePage`의 `byRound`·`picked`·`shown`에서 `round` 검색 매개변수를 검증한 뒤 메모리에서 적용한다. SQL 세션 조회에 회차 조건을 넣는 방식은 아니다.
- `src/app/(main)/insights/page.tsx:InsightsPage`도 같은 두 기록 표에서 문항별 최신 답안을 만들지만 `year < 9000` 조건이 추가된다. 약점 분석과 오답 목록은 이 최신 답안을 공유한다.

## 제외 상태를 둘 자리 비교

| 안 | 장점 | 단점·마이그레이션·권한 |
|---|---|---|
| A. 새 표 `wrong_note_dismissals(user_id, program, question_id, dismissed_at)` | 답안·성적 원본을 유지하고 문항별 제외와 복원을 독립적으로 관리한다. `UNIQUE(user_id, question_id)`로 중복 제외를 막는다. | 새 표가 필요하므로 사람이 SQL Editor에서 검토 후 실행한다. 본인 행 SELECT·INSERT·DELETE RLS와 authenticated의 같은 작업 GRANT를 모두 지정해야 한다. |
| B. `quiz_answers`에 제외 시각 열 추가 | 답안과 제외 표시를 한 번에 조회할 수 있다. | 열 추가도 사람이 실행할 마이그레이션이다. 제외가 특정 시도에 붙어 다음 답안이 생기면 의미가 달라진다. 세션 소유권 기반 UPDATE RLS와 열 단위 UPDATE GRANT가 필요하고 답안 수정 권한과 섞이지 않게 해야 한다. |
| B의 무변경 변형: `bookmarks` 행을 제외 표시로 재사용 | 기존 사용자·문항 키와 본인 행 정책을 이용하므로 표 구조 마이그레이션은 없다. | 즐겨찾기와 제외를 구별할 수 없어 기존 기능의 의미를 훼손한다. 구별 열을 추가하면 다시 마이그레이션이 필요하다. 기존 RLS가 있어도 SELECT·INSERT·DELETE GRANT 실재 여부는 별도로 확인해야 한다. |

**권장안은 A**다. 제외는 정답으로 간주하는 행위가 아니라 사용자가 복습 목록을 정리하는 행위다. `quiz_answers.is_correct`를 바꾸거나 답안을 삭제하지 않는다. `supabase/migrations/001_cbt.sql`의 문항 ID는 전역 UUID 기본 키이므로 사용자·문항 UNIQUE에 program을 추가할 필요가 없다. 프로그램 값은 `supabase/migrations/026_multi_program.sql`의 `silyong`, `kbs`를 따른다.

`supabase/migrations/003_reviews.sql`에는 `reviews_delete` 정책이 있지만 DELETE GRANT는 없다. `src/app/(main)/review/actions.ts:submitReview`는 실제 `permission denied for table reviews` 발생과 본인 범위 service_role 삭제 우회를 기록한다. 따라서 새 표에는 RLS와 GRANT 두 층을 명시한다. `supabase/migrations/034_reviews_hide_private_columns.sql`도 REVOKE 후 필요한 열만 GRANT하는 관행을 보여 준다. 운영 DB의 현재 권한은 이번 작업에서 조회하지 않았다.

SQL 초안은 `supabase/migrations/021_bookmarks_reports.sql`처럼 `create table if not exists`, RLS 활성화, `표이름_작업` 정책 이름, 정책 삭제 후 재생성을 따른다. authenticated에는 SELECT·INSERT·DELETE만 허용하고 UPDATE는 열지 않는다. 제외는 충돌 시 무시하는 INSERT, 복원은 본인 행 DELETE로 제안한다. 일반 UPDATE upsert는 사용하지 않는다.

`questionBank`와 `supabase/migrations/033_questions_server_only.sql`이 설명하듯 문제은행의 정답·해설은 공유 유료 콘텐츠여서 사용자별 RLS로 나눌 수 없다. 문항 조회는 서버의 service_role로 유지하고 새 정책에서 questions를 사용자 권한으로 JOIN하거나 공개 SELECT를 추가하지 않는다. SQL의 question_id 외래 키는 존재만 보장하며 program 일치·본인 오답 여부는 보장하지 않는다. 서버 액션에서 이를 확인하고, 표시 조회에서도 실제 questions의 program과 교차 확인한다. 직접 REST 호출로 본인 제외 행이 조작돼도 타인의 기록이나 콘텐츠 접근 권한이 넓어져서는 안 된다.

## 사람이 결정할 정책

- 초기 권장: 다시 틀려도 제외를 유지하고 사용자가 명시적으로 복원한다. `dismissed_at`은 최초 제외 시각이며 자동 해제 트리거는 두지 않는다.
- 대안: 제외 이후 완료된 CBT 세션에서 다시 틀리면 자동 해제한다. 채택한다면 완료 시각·동시 요청·같은 시각 답안의 우선순위를 정하고 별도 구현해야 한다. 현재 연습 화면의 로컬 선택은 저장된 새 시도가 아니다.
- 제외는 오답노트 표시와 개수에만 적용한다. `InsightsPage`의 오답 목록에도 반영하되 약점 정답률·성적 추이에는 적용하지 않는 안을 권장한다. 두 화면의 기존 세션 범위 차이는 유지한다.
- “제외 N개”는 현재 program과 선택 회차 안의 유효한 객관식 제외 문항 수로 정하고, 이후 정답을 맞힌 문항도 제외 보기에서 복원 가능하게 한다. 복원해도 최신 기록이 정답이면 일반 오답 목록에는 나타나지 않는다.

## 화면 초안

1. 오답노트 문항마다 “이제 안 봐도 됨” 버튼을 두고 저장 성공 후 해당 문항을 목록에서 뺀다.
2. 완료 알림에 “되돌리기”를 두며, 상단 “제외 N개 · 보기”에서 나중에도 문항별 복원할 수 있다.
3. 회차 필터는 일반 목록과 제외 보기에 공통 적용한다. 마지막 문항을 제외해도 필터·제외 보기·복원 진입점을 유지한다.
4. `src/app/(main)/practice/multiple/PracticeMultiple.tsx:PracticeMultiple`에는 오답노트 전용 제어를 선택적으로 전달하는 안을 제안한다. 문항 제거 시 인덱스·빈 배열·초점을 처리한다.
5. 신규 제안 위치 `src/app/(main)/practice/wrong/wrongNoteDismissalActions.ts`에 `dismissWrongNoteQuestion`·`restoreWrongNoteQuestion` 서버 액션을 둔다. 아직 존재하지 않는 파일·함수다.
6. 액션은 매 요청 세션 사용자를 확인하고 user_id를 입력으로 받지 않는다. 현재 program·문항 ID 형식·문항의 program·객관식 여부·본인 완료 기록을 검증하며, 제외는 최신 오답만 허용하고 복원은 본인 제외 행을 대상으로 한다.
7. 쓰기는 세션 클라이언트와 본인 user_id·program·question_id 조건으로 제한한다. 오류를 확인해 실패를 알리고 중복 클릭을 막으며 성공 시 두 오답 화면과 개수를 갱신한다. 조회 실패를 정상 0건으로 숨기지 않는다.
8. 유료/무료 구분은 기존 오답노트 접근 규칙을 따른다.

## SQL 초안 위치

`scripts/schema_drift_check.py:migration_tables`는 `supabase/migrations`의 `*.sql` 전부를 읽어 CREATE TABLE을 수집한다. 번호 접두사를 검사하지 않아 `DRAFT_`도 세므로 `docs/wrong_note_dismissals.draft.sql`에 보관한다. 스키마 검사 전체 실행은 DB 네트워크 요청이 있어 하지 않는다. 사람이 실행 전 사용 가능한 번호를 정해 `0NN_` 이름으로 migrations에 편입하고 SQL Editor에서 검토 후 실행해야 한다.

## 하지 않은 것과 지시문과 달랐던 점

애플리케이션 코드·화면 변경, DB 스키마 변경·마이그레이션 실행, 네트워크·외부 API 요청, 설치·배포·커밋은 하지 않았다. 산출물은 설계와 SQL 초안, REPORT 기록뿐이다.

지시된 파일과 주요 조회 흐름은 존재한다. 다만 `PracticeMultiple:choose`는 `setPicked`만 호출하며 서버 답안 저장을 하지 않는다. 화면의 “다시 풀어 맞히면 자동으로 빠짐” 안내를 이 재시험 자체의 영속 동작으로 해석하면 실제 구현과 다르다. 이번에는 수정하지 않는다.

`scripts/own_copy_spelling_check.mjs:walk`는 `src`의 ts·tsx만 검사하므로 요청된 검사만으로 새 Markdown의 맞춤법을 검증할 수 없다. 지정 명령을 실행하고 새 문서에는 동일 금지 표기 규칙을 별도로 적용한다.

## 인용 확인

- 명령: `Select-String -LiteralPath 'src/app/(main)/practice/wrong/page.tsx' -Pattern 'function WrongPracticePage|const byRound|const picked|const shown' -Encoding UTF8`
  결과: 4건 — export default async function WrongPracticePage({ / const byRound = new Map<number, number>() / const picked = roundParam && rounds.includes(Number(roundParam)) ? Number(roundParam) : null / const shown = picked == null ? questions : questions.filter(q => Number(q.round) === picked)

- 명령: `Select-String -LiteralPath 'src/app/(main)/practice/multiple/PracticeMultiple.tsx' -Pattern 'function PracticeMultiple|function choose|setPicked' -Encoding UTF8`
  결과: 5건 — export default function PracticeMultiple({ / const [picked, setPicked] = useState<Record<string, string>>({}) / function choose(val: string) { / setPicked(prev => ({ ...prev, [q.id]: val })) / setPicked({})

- 명령: `Select-String -LiteralPath 'src/app/(main)/insights/page.tsx' -Pattern 'function InsightsPage|latestByQ|bandStats' -Encoding UTF8`
  결과: 8건 — export default async function InsightsPage() { / const latestByQ = new Map<string, typeof answers[number]>() / for (const a of answers) latestByQ.set(a.question_id as string, a) / const latest = [...latestByQ.values()] / const bandStats = BANDS.map(b => { / const weakest = bandStats.length ? bandStats.reduce((m, b) => (b.pct < m.pct ? b : m)) : null / {bandStats.length > 0 && ( / {bandStats.map(b => {

- 명령: `Select-String -LiteralPath 'src/lib/questionBank.ts' -Pattern 'function questionBank' -Encoding UTF8`
  결과: 1건 — export function questionBank() {

- 명령: `Select-String -LiteralPath 'src/app/(main)/review/actions.ts' -Pattern 'function submitReview|permission denied' -Encoding UTF8`
  결과: 2건 — export async function submitReview(data: { / // DELETE '권한'이 없어서 사용자 클라이언트로는 "permission denied for table reviews"가

- 명령: `Select-String -LiteralPath 'scripts/schema_drift_check.py' -Pattern 'def migration_tables|glob\("\*\.sql"\)' -Encoding UTF8`
  결과: 2건 — def migration_tables(): / for f in (ROOT / "supabase" / "migrations").glob("*.sql"):

- 명령: `Select-String -LiteralPath 'scripts/own_copy_spelling_check.mjs' -Pattern 'function walk|const files = walk' -Encoding UTF8`
  결과: 2건 — function walk(dir, out = []) { / const files = walk('src')

- 명령: `Get-ChildItem supabase/migrations -File | Where-Object { $_.Name -in @('001_cbt.sql','003_reviews.sql','021_bookmarks_reports.sql','026_multi_program.sql','033_questions_server_only.sql','034_reviews_hide_private_columns.sql') }`
  결과: 6개 — 001_cbt.sql, 003_reviews.sql, 021_bookmarks_reports.sql, 026_multi_program.sql, 033_questions_server_only.sql, 034_reviews_hide_private_columns.sql

## 검증

- `npm.cmd run check:own-copy` — exit 0, 마지막 줄: `우리 글은 깨끗하다.` (src 271개 파일·34개 규칙; Markdown은 검사 대상 아님).
- 보완 검사는 PowerShell here-string을 `node --input-type=module -`에 전달해 기존 검사에서 `ALWAYS_WRONG` 배열을 읽고 신규 설계 문서·SQL 초안에 동일 금지 표기를 대조한다. DB와 네트워크를 사용하지 않는다. 이는 제한된 표기 검사이며 완전한 한국어 교정은 아니다.
