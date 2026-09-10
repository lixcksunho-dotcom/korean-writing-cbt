# 빈 시험 세션 정리 방안

작성 2026-09-10. 코드·DB 무변경, **문서와 SQL 초안까지만**. DB에 손대는 것은 사람이 SQL Editor에서 돌린다.

## 0. 지금 상태 (2026-09-10 실측)

`npm run check:dropoff` 와 읽기 전용 대조(`quiz_sessions` 283행 · `quiz_answers` 전량)로 잰 것.

| 항목 | 값 |
|---|---|
| `quiz_sessions` 전체 | 283행 (실전 `year<9000` 261 · 유형별 연습 `year>=9000` 22) |
| 실전 회차: 시작 / 끝냄 / 중단 | 255 / 133 / 122 |
| 중단 122건 중 **아무 흔적 없는 빈 행** | 118건 (풀다 만 것 4건) |
| 빈 행 전체(연습 포함) | 132건 — 실전 123 · 연습 9 |
| 빈 실전 행: 시작 안내 배포 전 / 후 | 118 / 5 |
| 완주율 | 열어 본 것까지 52% · 한 문제라도 푼 것만 97% |
| 같은 (사람·프로그램·연도·회차) **미완료 중복** | 9묶음 27행 → 여분 18행 (실전 8묶음 · 연습 1묶음) |
| 중복 묶음 중 두 행 이상에 답안·저장이 있는 것 | **0** |
| 중복 간격 | ≤3초 4 · 3초~1분 2 · 1분~1시간 8 · 1일 이상 4 |
| 시작 안내 배포 뒤 생긴 중복 | 0 |

- 백로그 지시문(233건·112건·49%·95%)은 9/8 실측이다. 이틀 사이 22건이 더 쌓여 숫자는 바뀌었지만 구조는 같다: **중단의 대부분(97%)이 빈 행**이다.
- 중복 27행 중 17행(4묶음)은 **운영자 계정** 하나가 만든 것이다(관리자 목록에 있는 계정, 같은 회차를 20분 간격으로 여러 번 연 흔적). 실사용자의 중복은 5묶음 10행이고, 그중 1초·2초 간격이 두 건 — 코드 주석의 "요청이 겹치면 둘 다 만들어진다"가 실제로 난 자리다.
- 빈 행의 정의(이 문서 전체에서 같은 뜻): `completed_at IS NULL` 이고 `saved_at IS NULL` 이고 `saved_answers` 가 비었고 `quiz_answers` 에 한 줄도 없는 행. 저장은 눌렀지만 답안이 0개인 행이 1건 있는데, 그건 "저장한 사람"이므로 빈 행으로 치지 않는다.

## ① 세션을 '시작' 시점에 만들려면 — 이미 그렇게 돼 있다

지시문의 전제("`/cbt/[회차]`를 여는 순간 `getOrCreateExamSession`이 행을 만든다")는 **9/9 커밋 b5c1934 이후로는 사실이 아니다.** 지금 흐름:

```
/cbt/[examId]            → findResumableExamSession (읽기만, 만들지 않음)
   ├ 이어풀 것 없음      → <ExamIntro> 안내 화면 (행 없음)
   │     └ '시작하기' 누름 → /cbt/[examId]?start=1
   └ ?start=1 또는 이어풀 것 있음 → getOrCreateExamSession (여기서 만든다) → <ExamPlayer>
```

- `src/app/(main)/cbt/[examId]/page.tsx:49-60` 이 갈림길이고, 행을 만드는 곳은 `src/app/(main)/cbt/actions.ts:219` `getOrCreateExamSession` 한 군데다(연습은 `practice/actions.ts:186` `savePracticeProgress` 가 저장할 때 만든다 — 열 때 만들지 않는다).
- 배포 뒤 숫자: 시작 14건 · 끝냄 9 · 시작만 하고 안 푼 것 5. 이제 빈 행은 "눌러 본 사람"이 아니라 **"시작하기를 누르고도 안 푼 사람"** 이라 의미가 다르다. `check:dropoff` 가 표본 10건 넘고 이 비율이 70%를 넘으면 exit 1 로 알린다. `check:entry` 가 "누르기 전엔 정말 아무것도 안 남는가"를 매번 눌러 확인한다.

### 그래도 남아 있는 구멍 두 개

**(a) 읽고-넣기 경합.** `getOrCreateExamSession` 은 SELECT 뒤 INSERT 라 같은 사람의 요청 두 개가 겹치면 둘 다 "없음"을 보고 둘 다 만든다. '시작하기'가 `<Link>` 라 두 번 누르거나, 느린 연결에서 한 번 더 누르면 난다(실측 1~2초 간격 중복이 그것). 이건 코드로 완전히 막을 수 없고 **②의 유니크 인덱스가 막는다.** 인덱스가 들어가면 코드는 충돌(23505)을 받았을 때 다시 읽기만 하면 된다:

```ts
// actions.ts getOrCreateExamSession — 인덱스 적용 뒤에 붙일 것(지금은 적용하지 말 것)
const { data: created, error } = await supabase.from('quiz_sessions')
  .insert({ user_id: user.id, year, round, program }).select('id').single()
if (error?.code === '23505') {
  // 같은 순간 다른 요청이 먼저 만들었다 — 그 행을 쓴다.
  return getOrCreateExamSession(year, round, program)
}
if (error) throw error
```

`practice/actions.ts` `savePracticeProgress` 의 insert 도 같은 처리가 필요하다(같은 테이블·같은 키).

**(b) `?start=1` 이 GET 이라는 것.** 주소창에 남고, 새로고침·뒤로가기·북마크로 다시 들어온다. 다시 들어와도 `getOrCreateExamSession` 이 미완료 행을 먼저 찾아 **재사용**하므로 중복은 안 생긴다. Link 프리페치도 문제없다 — 이 경로는 동적이고 `loading.tsx` 가 없어서 Next 16은 프리페치를 건너뛴다(`node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md` "Dynamic Route: prefetching is skipped"). 단, **`[examId]` 아래에 `loading.tsx` 를 추가하는 순간** 부분 프리페치가 켜지므로, 그때는 시작 버튼을 `<form action>`(POST 서버 액션) 으로 바꿔야 한다. 지금 당장 바꿀 이유는 없다.

## ② 같은 회차 미완료 중복을 막는 부분 유니크 인덱스 — 초안

### 인덱스

```sql
-- 한 사람이 한 회차에 '진행 중' 세션을 하나만 갖는다.
-- 완료된 세션(completed_at IS NOT NULL)은 몇 번이고 다시 풀 수 있어야 하므로 부분 인덱스.
-- 017/026 의 quiz_sessions_inprogress_idx 와 열·조건이 같으므로 그 인덱스를 이것으로 대체한다.
CREATE UNIQUE INDEX IF NOT EXISTS quiz_sessions_one_open_per_round
  ON public.quiz_sessions (user_id, program, year, round)
  WHERE completed_at IS NULL;

DROP INDEX IF EXISTS public.quiz_sessions_inprogress_idx;
```

- `CONCURRENTLY` 는 안 쓴다 — 283행이라 잠금이 밀리초 단위이고, Supabase SQL Editor 는 한 번에 붙여넣은 문장을 트랜잭션으로 묶어 `CONCURRENTLY` 가 실패한다.
- 실전·연습(year≥9000)이 같은 테이블이라 둘 다 걸린다. 연습도 "(프로그램·9001·유형번호) 진행 중 하나"가 맞다(`getPracticeProgress` 주석이 같은 전제로 쓰여 있다).

### 선행 조건: 지금 있는 중복 9묶음을 먼저 풀어야 한다

그대로 돌리면 `could not create unique index` 로 실패한다. 다행히 **어느 묶음에도 답안·저장이 든 행이 둘 이상 없다** — 각 묶음에서 남길 행은 하나로 정해지고, 나머지 18행은 전부 빈 행이다.

먼저 무엇이 지워질지 본다(읽기 전용):

```sql
-- 각 묶음에서 '저장이 있는 행 → 가장 최근 시작' 순으로 1등을 남기고, 나머지(여분)를 나열한다.
WITH ranked AS (
  SELECT s.id, s.user_id, s.program, s.year, s.round, s.started_at, s.saved_at,
         (s.saved_answers IS NOT NULL AND s.saved_answers <> '{}'::jsonb) AS has_saved,
         EXISTS (SELECT 1 FROM public.quiz_answers a WHERE a.session_id = s.id) AS has_answers,
         ROW_NUMBER() OVER (
           PARTITION BY s.user_id, s.program, s.year, s.round
           ORDER BY s.saved_at DESC NULLS LAST, s.started_at DESC
         ) AS rn
  FROM public.quiz_sessions s
  WHERE s.completed_at IS NULL
)
SELECT left(user_id::text, 8) AS who, program, year, round, started_at, saved_at, has_saved, has_answers
FROM ranked
WHERE rn > 1
ORDER BY user_id, program, year, round, started_at;
-- 기대: 18행, has_saved = false 이고 has_answers = false 뿐이어야 한다.
--       하나라도 true 가 있으면 멈추고 사람이 본다(그 사이 새 저장이 생겼다는 뜻).
```

여분 18행을 지우는 것은 **사용자 데이터 삭제**라 CLAUDE.md 상 사람이 결정한다. 지우기로 하면 위 조건을 그대로 WHERE 로 써서 **빈 여분만** 지운다:

```sql
-- ⚠️ 사람이 판단해서 돌린다. 위 SELECT 결과가 18행·전부 false 인 것을 확인한 뒤에만.
WITH ranked AS (
  SELECT s.id,
         (s.saved_answers IS NOT NULL AND s.saved_answers <> '{}'::jsonb) AS has_saved,
         EXISTS (SELECT 1 FROM public.quiz_answers a WHERE a.session_id = s.id) AS has_answers,
         ROW_NUMBER() OVER (
           PARTITION BY s.user_id, s.program, s.year, s.round
           ORDER BY s.saved_at DESC NULLS LAST, s.started_at DESC
         ) AS rn
  FROM public.quiz_sessions s
  WHERE s.completed_at IS NULL
)
DELETE FROM public.quiz_sessions
WHERE id IN (SELECT id FROM ranked WHERE rn > 1 AND NOT has_saved AND NOT has_answers AND saved_at IS NULL);
-- 그다음 위의 CREATE UNIQUE INDEX 를 돌린다.
```

(`saved_at IS NULL` 조건을 한 번 더 건 이유: "저장은 눌렀지만 답안 0개"인 행은 빈 행으로 치지 않기로 했으므로, 그런 행이 여분에 끼면 DELETE 가 그것만 건너뛰고 인덱스 생성이 실패한다 — 조용히 지우는 것보다 실패해서 사람 눈에 띄는 쪽이 낫다.)

**지우지 않고 인덱스만 넣고 싶다면** 조건에 날짜를 걸어 과거 행을 인덱스 밖에 둘 수 있다:

```sql
-- 대안: 과거 중복은 그대로 두고, 이 날 이후에 시작한 행에만 유니크를 건다.
CREATE UNIQUE INDEX IF NOT EXISTS quiz_sessions_one_open_per_round
  ON public.quiz_sessions (user_id, program, year, round)
  WHERE completed_at IS NULL AND started_at >= '2026-09-10 00:00+09';
```

이 경우 `quiz_sessions_inprogress_idx` 는 남겨 둔다(과거 행 조회에 아직 쓰인다). 추천은 첫 번째(여분 18행 삭제 후 무조건 인덱스)다 — 18행이 전부 빈 행이고 그중 13행은 운영자 자신의 것이라 잃을 정보가 없고, 날짜 조건은 "왜 이 날짜인가"를 평생 설명해야 한다.

### 적용 순서와 확인

1. SELECT 로 여분 18행·전부 false 확인
2. (사람 결정) DELETE
3. CREATE UNIQUE INDEX + DROP INDEX
4. 코드 쪽 23505 처리를 **별도 백로그 항목**으로 — 인덱스가 없는 상태에서 먼저 넣어도 해는 없지만, 인덱스가 들어간 뒤에 코드가 없으면 겹친 요청 하나가 "세션을 만들 수 없습니다"로 튕긴다. 순서는 **코드 먼저 배포 → 인덱스**가 안전하다.
5. `python scripts/schema_drift_check.py` 는 테이블 유무만 보므로 인덱스는 잡지 않는다. 확인은 SQL Editor 에서 `SELECT indexname FROM pg_indexes WHERE tablename = 'quiz_sessions';` 로, 그리고 `npm run check:dropoff` 재실행으로 중복 묶음이 0인지 본다(지금 스크립트는 중복을 세지 않는다 — 이 문서 0절의 대조를 스크립트에 옮기는 것도 별도 항목).
6. 마이그레이션 파일은 `supabase/migrations/038_quiz_sessions_one_open.sql` 로 위 SQL 을 옮겨 두면 된다(이 문서는 초안이라 파일을 만들지 않았다).

## ③ 이미 쌓인 빈 행 132건 — 지우지 않고 기준만

### 어디에 새는가

| 읽는 곳 | 빈 행이 섞이나 | 비고 |
|---|---|---|
| 대시보드·성적 추이(`insights`)·오답(`practice/wrong`)·관리자 응시 집계 | 아니오 | 전부 `completed_at IS NOT NULL` 로 거른다 |
| 회차 목록 `/cbt` 이어풀기 배지 | 아니오 | 미완료 행을 읽지만 브라우저 임시본이 있을 때만 배지가 뜬다 |
| **내 계정 `/account` "시험 세션 N개"** | **예** | `account/page.tsx:25` 가 `count: exact` 로 **전체 행**을 센다 — 열어만 본 것도 "세션"으로 보인다 |
| `check:dropoff` | 구분함 | `GATE_FROM`(9/9 04:35 UTC) 전후를 나눠 "대부분 시작 안내 전 것"이라 적는다 |

즉 사용자에게 잘못 보이는 숫자는 `/account` 한 곳뿐이다.

### 기준

1. **배포 전(9/9 04:35 UTC 이전) 빈 행 118건은 '열어봄'이지 '시작'이 아니다.** 어떤 통계에서도 시작·중단·이탈로 세지 않는다. 완주율의 분모는 "끝냄 + 답안이나 저장이 있는 미완료"(지금 97%의 분모)다.
2. **배포 후 빈 행(지금 5건)은 '시작하고 돌아선 사람'이다.** 실패 신호로 다루되 표본 10건 전에는 비율로 말하지 않는다(`check:dropoff` 마지막 절이 이 규칙대로 돈다).
3. **지우지 않는다.** 이유: (가) `started_at` 이 "이 사람이 이 회차에 관심을 보인 시각"으로 남아 유입 분석에 쓸 수 있고, (나) 지워도 `/account` 숫자 말고는 아무것도 달라지지 않으며, (다) 행이 있어야 ②의 유니크가 "다시 열면 그 행을 재사용"하는 쪽으로 동작한다(없으면 새로 만들 뿐이라 결과는 같지만, 굳이 삭제할 이유가 없다).
4. `/account` 의 "시험 세션 N개"는 **완료 기준으로 세도록 고친다**(`.not('completed_at','is',null)` 한 줄) — 화면 코드 수정이라 이 문서 범위 밖, 별도 항목.
5. 이 문서 0절의 정의("빈 행")를 스크립트가 같은 식으로 쓰도록 `check:dropoff` 에 중복 묶음 수·빈 행 수(전/후)를 한 줄 더 찍는 것 — 별도 항목. 그래야 ② 적용 뒤 "중복 0"을 사람이 안 세고 확인한다.

### 굳이 정리하고 싶을 때의 안전한 범위

지운다면 **배포 전 · 빈 행 · 30일 넘은 것**(지금 58건)까지만이 후보다. 이보다 넓히면 "저장은 안 했지만 어제 시작한 사람"의 이어풀기 자리를 없앨 수 있다. 미리보기 SQL:

```sql
SELECT count(*) FROM public.quiz_sessions s
WHERE s.completed_at IS NULL AND s.saved_at IS NULL
  AND (s.saved_answers IS NULL OR s.saved_answers = '{}'::jsonb)
  AND NOT EXISTS (SELECT 1 FROM public.quiz_answers a WHERE a.session_id = s.id)
  AND s.started_at < '2026-09-09 04:35+00'
  AND s.started_at < now() - interval '30 days';
-- 2026-09-10 기준 58 이어야 한다. 지우는 결정은 사람이 한다. 추천은 "지우지 않는다".
```

## 남은 것 (백로그 후보, 이 문서에서 하지 않은 것)

- `actions.ts` `createSession`(169행) 은 어디서도 부르지 않는 죽은 함수다 — 인덱스 뒤에 남아 있으면 23505 처리 없는 insert 가 하나 더 있는 셈이라 지우는 편이 낫다.
- ②-4 의 23505 처리(`getOrCreateExamSession`·`savePracticeProgress`), ③-4 의 `/account` 집계 기준, ③-5 의 `check:dropoff` 중복 계수.
