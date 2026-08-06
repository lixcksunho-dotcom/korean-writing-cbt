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
| `npm run check:contrast` | 글자·배경 명암비 + 아이콘·입력칸 안내글 (공개 25개 면) | 눈으로는 "좀 흐린가" 하고 넘어간다. 주 CTA가 2.15:1이던 것도 이걸로 찾았다 |
| `npm run check:mobile` | 휴대폰 화면의 누름 대상·가로 스크롤·겹침 | 대부분 휴대폰으로 들어온다. 떠 있는 버튼이 전환 버튼을 덮고 있어도 데스크톱에선 안 보인다 |
| `npm run check:ui-authed` | 로그인 뒤 17개 화면 × 2모드의 명암비·휴대폰 사용성 | 위 두 검사는 공개 면만 본다. 정작 돈 낸 사람이 오래 머무는 곳은 로그인 뒤다 |
| `npm run check:keyboard` | 키보드 전용 조작 + 2560px 넓은 화면 줄 길이 | 마우스로만 눌러 보면 초점 표시·초점 함정은 절대 안 걸린다 |
| `npm run check:signup` | 가입 폼을 실제로 채워 계정이 만들어지는가 | 다른 검사는 관리자 API로 계정을 만들어서, 정작 사람이 쓰는 폼은 아무도 지나가지 않는다 |
| `npm run check:exam-flow` | 시험 한 회차를 끝까지 풀고 제출 → 결과 화면·DB 저장까지 | 화면만 훑어서는 안 잡힌다. 답안 저장이 실패해도 세션만 '완료'가 되던 사고가 실제로 있었다 |
| `npm run check:blog-render` | 블로그 글 본문(발행 HTML)의 명암비·휴대폰 사용성 | 본문은 파이프라인이 만든 HTML을 그대로 넣는다. 인라인 style이 섞여 사이트 토큰만 지켜서는 알 수 없다 |
| `npm run check:recovery` | 오류가 났을 때 빠져나올 수 있는가(제출 끊김·세션 만료·없는 주소) | 잘 되는 경로는 개발하며 수없이 지나가지만 끊겼을 때 화면은 아무도 안 본다 |
| `npm run check:admin` | 관리자 10개 화면의 명암비·휴대폰 사용성 | 내가 매일 쓰는 화면인데 한 번도 안 쟀다. 여기서 문제 관리가 마이그레이션 033 이후로 죽어 있던 걸 찾았다 |
| `npm run check:vitals` | 느린 회선 체감 성능 (LCP·CLS) | 빠른 회선에서 재면 전부 0으로 나와 아무것도 못 잡는다 |
| `npm run funnel` | 전환 퍼널 (DB 상태 + 이벤트) | 이벤트만 보면 실제보다 적게 잡힌다 |
| `npm run cleanup:test` | 남은 검증용 계정 정리 | 실행이 끊기면 뒷정리를 못 해 관리자 지표에 섞인다 (`-- --yes`로 실제 삭제) |

`npm test`를 뺀 나머지는 `.env.local`의 `SUPABASE_SERVICE_ROLE_KEY`를 쓴다.

`check:admin`만 예외로 로컬에서 돈다. 관리자 권한은 서버가 뜰 때 읽는 `ADMIN_EMAILS`로
정해지는데 그 값을 운영에서 바꿀 수 없어서, 임시 계정을 만들고 **그 계정만 관리자로 지정한**
운영빌드를 잠깐 띄워서 잰다. 화면 안의 단추는 하나도 누르지 않는다 — 회원 삭제·결제 복구가
같은 화면에 있다.

배포가 도는 중에 검사를 돌리면 미리 만들어 둔 글이 잠깐 404로 나온다. 실제로 블로그 55편을
전부 확인하면 모두 200인데, 배포 직후에 돌린 검사만 2편을 못 열었다고 했다. 실패가 나오면
배포가 끝났는지부터 본다.

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

## 글꼴

**웹폰트를 쓰지 않는다.** 시스템 한글 글꼴로 그린다(`src/app/globals.css`).

한동안 Noto Sans KR을 `next/font`로 자체 호스팅했는데, 2026-08-03에 재 보니 이득 쪽이
하나도 없었다.

- 느린 회선(1.6Mbps·150ms·CPU 4배)에서 CLS `/exam-info` 0.167, `/blog` 0.123 — 기준 초과
- 빠른 회선에서는 **아예 적용되지 않았다** (실제 그려진 글꼴: 맑은 고딕 48% / Arial 52%)
- woff2 요청만 막고 같은 조건으로 재면 두 면 모두 **0.0000**

한글은 unicode-range 서브셋이 621개라 `display: optional`의 차단 구간이 서브셋마다 따로
돈다. 빠른 회선에서는 페이지가 먼저 그려져 어느 조각도 못 들어오고, 느린 회선에서는 늦게
도착한 조각이 하나씩 적용되며 문단이 계속 다시 접힌다. 결국 회선 속도에 따라 글꼴이
달라지면서 밀림만 남았다.

`adjustFontFallback: true`도 답이 아니었다. 그 보정 대체 폰트는 `src: local(Arial)`이라
한글 글리프가 없고, 한글은 그다음 시스템 글꼴로 넘어가 override가 닿지 않는다.

걷어낸 뒤 전 면 CLS 0.0000, LCP도 내려갔다(`/blog` 2576 → 1788ms, `/exam-info` 2304 →
1592ms). 안드로이드의 Noto Sans CJK KR은 Noto Sans KR과 사실상 같은 디자인이고, iOS는
Apple SD Gothic Neo, 윈도우는 맑은 고딕이라 본문 품질도 떨어지지 않는다.

> 다시 웹폰트를 넣게 되면 `npm run check:vitals`로 **느린 회선에서** 재 볼 것.
> 빠른 회선에서 재면 교체가 안 일어나 CLS가 0으로 나오는데, 이걸 개선으로 착각하기 쉽다
> (실제로 한 번 그렇게 잘못 결론 냈다).

## 성능 — 아는 것과 모르는 것

느린 회선(1.6Mbps·150ms·CPU 4배)에서 `npm run check:vitals`로 잰 값이다.

- **CLS 0.0000** 전 면. LCP 1.8~2.6초로 기준(2.5초) 근처.
- **반응 지연 16~64ms** — 실제로 눌렀을 때는 빠르다(구글이 순위에 쓰는 INP 기준 200ms).
- **TBT 1100~1800ms** — 기준(600ms)을 넘는다. 하이드레이션이 한 덩어리(2.7초짜리 긴 작업
  하나)로 돌면서 초기에 메인 스레드를 막는다. JS 244KB 중 대부분이 공용 번들이고,
  제3자 스크립트는 없다.

`/spelling`의 첫 화면 밖 클라이언트 조각(맛보기 문제·하단 고정 CTA)을 `next/dynamic`으로
떼 보는 실험을 했는데 **효과가 없었다**(5회 중앙값 1744ms, 대조군 `/blog`도 같이 흔들렸다).
남은 비용이 개별 컴포넌트가 아니라 공용 번들이라는 뜻이다. 줄이려면 클라이언트 컴포넌트
수를 구조적으로 줄여야 한다. 같은 실험을 반복하지 않도록 적어 둔다.

측정 자체가 4배 스로틀 + 개발 기기 부하에 흔들린다(같은 면을 5번 재면 1475~2250ms).
절대값보다 **같은 조건에서의 변화**를 볼 것.

## 문항 데이터

`questions` 테이블은 **서버 전용**이다. 공개 SELECT 정책을 없애고 `src/lib/questionBank.ts`
(service_role)로만 읽는다 — anon 키는 클라이언트 번들에 실려 나가는 공개값이라, 열어 두면
정답과 해설이 그대로 노출된다.

연습 전용 문항은 센티넬 연도(`year >= 9000`)를 쓴다. 실제 시험 회차는 `year < 9000`.
`savePracticeProgress`는 `quiz_sessions`를 `(user, year, round)`로 찾으므로, 실제 회차 번호를
연습 화면에 넘기면 그 사람이 풀던 진짜 시험 세션을 덮어쓴다.
