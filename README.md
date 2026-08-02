# 실글패스 (kptest.cloud)

한국실용글쓰기 · KBS한국어능력시험 대비 CBT 서비스. 실전과 같은 제한 시간으로 모의고사를 풀고,
서술형·원고지 답안은 AI가 채점·첨삭한다.

- **스택**: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · Supabase · PortOne V2
- **배포**: `main` 푸시 → Vercel 프로덕션 자동 배포 (1~3분)
- **시험 전환**: 쿠키 `kptest_mode` (`silyong` | `kbs`)

> Next 16이라 관행이 다르다. 코드를 쓰기 전에 `node_modules/next/dist/docs/`의 해당 문서를 볼 것
> (미들웨어가 `middleware.ts`가 아니라 `src/proxy.ts`인 것 등). 자세한 건 `AGENTS.md`.

## 개발

```bash
npm run dev        # 개발 서버
npm run build      # 프로덕션 빌드
npm run lint       # eslint
npx tsc --noEmit   # 타입 검사
```

## 검사 명령

화면을 눈으로 봐서는 안 잡히는 것들이 있다. 아래는 그걸 잡으려고 만든 것들이다.

| 명령 | 무엇을 보는가 | 왜 필요한가 |
| --- | --- | --- |
| `npm test` | 공개 표면 (사이트맵·RSS·robots·구조화데이터·맛보기 문제) | 자격 증명 없이 어디서나 돌아간다 |
| `npm run check:pages` | 로그인 화면 40개(실글·KBS 두 모드) + 페이월 5건 | `npm test`는 로그인 뒤 화면을 못 본다. 페이월이 뚫려도 화면은 멀쩡해 보이고 매출만 샌다 |
| `npm run check:schema` | 코드가 쓰는 테이블·컬럼이 운영 DB에 있는가 | supabase-js는 throw 대신 `{error}`를 준다 — 없는 테이블/컬럼을 써도 화면은 "0건"으로 멀쩡하다 |
| `npm run check:questions` | 문항 정합성 (선택지·정답·해설·길이 단서) | 정답만 유난히 길면 내용을 몰라도 맞힌다 |
| `npm run check:duplicates` | 회차 간 같은 문항 반복 | 이용권을 사서 여러 회차를 도는 사람이 같은 문제를 또 만나면 환불 사유다 |
| `npm run check:blog` | 블로그 글끼리 같은 검색어 경쟁 | 두 글이 같은 검색어를 노리면 둘 다 밀린다 |
| `npm run funnel` | 전환 퍼널 (DB 상태 + 이벤트) | 이벤트만 보면 실제보다 적게 잡힌다 |
| `npm run cleanup:test` | 남은 검증용 계정 정리 | 실행이 끊기면 뒷정리를 못 해 관리자 지표에 섞인다 (`-- --yes`로 실제 삭제) |

`npm test`를 뺀 나머지는 `.env.local`의 `SUPABASE_SERVICE_ROLE_KEY`를 쓴다.

대상 주소는 기본이 프로덕션이다. 로컬로 돌리려면:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000 npm test
PAGE_SWEEP_BASE=http://localhost:3000 npm run check:pages
```

## 데이터베이스

마이그레이션은 `supabase/migrations/`에 있고, **Supabase 대시보드 SQL Editor에서 사람이 실행**한다
(로컬에 `psql`·`supabase` CLI가 없고 service_role 키로는 PostgREST만 가능하다).

적용이 안 된 게 있으면 `npm run check:schema`가 잡아 준다. 실제로 `manuscript_submissions`가
만들어진 적이 없어 원고지 AI 첨삭 결과가 하나도 저장되지 않고 있었는데, 화면에는 "0건"으로만
보여서 오래 지나도록 모르고 있었다.

Editor에서 실행할 때 주의: `DO $$ ... $$;` 블록은 편집기가 `$$` 안의 세미콜론에서 문장을 잘라
실패한다. 재실행 안전한 DDL은 `IF NOT EXISTS`로 쓰는 편이 낫다.

## 운영

문제 오류 신고는 `question_reports`에 쌓이고, 관리자 대시보드(`/admin`)의 '문제 신고' 카드에
**미처리 N** 배지로 뜬다. 대시보드를 안 열어도 알림을 받고 싶으면 환경변수 두 개를 넣는다
(선택 — 없으면 알림만 조용히 꺼진 채로 접수는 정상 동작한다).

```
TELEGRAM_BOT_TOKEN   @BotFather 로 봇을 만들어 받은 토큰
TELEGRAM_CHAT_ID     그 봇과 대화를 시작한 뒤
                     https://api.telegram.org/bot<토큰>/getUpdates 에서 chat.id 확인
```

## 문항 데이터

`questions` 테이블은 **서버 전용**이다. 공개 SELECT 정책을 없애고 `src/lib/questionBank.ts`
(service_role)로만 읽는다 — anon 키는 클라이언트 번들에 실려 나가는 공개값이라, 열어 두면
정답과 해설이 그대로 노출된다.

연습 전용 문항은 센티넬 연도(`year >= 9000`)를 쓴다. 실제 시험 회차는 `year < 9000`.
`savePracticeProgress`는 `quiz_sessions`를 `(user, year, round)`로 찾으므로, 실제 회차 번호를
연습 화면에 넘기면 그 사람이 풀던 진짜 시험 세션을 덮어쓴다.
