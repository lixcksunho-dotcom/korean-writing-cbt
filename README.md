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
| `npm run check:pages` | 로그인 화면 40개(실글·KBS 두 모드) + 페이월(두 모드 유료 7건 + 무료 2건 대조군) | `npm test`는 로그인 뒤 화면을 못 본다. 페이월이 뚫려도 화면은 멀쩡해 보이고 매출만 샌다 |
| `npm run check:schema` | 코드가 쓰는 테이블·컬럼이 운영 DB에 있는가 | supabase-js는 throw 대신 `{error}`를 준다 — 없는 테이블/컬럼을 써도 화면은 "0건"으로 멀쩡하다 |
| `npm run check:questions` | 문항 정합성 (선택지·정답·해설·길이 단서) + 듣기 음성 45개가 실제로 열리는가 | 정답만 유난히 길면 내용을 몰라도 맞힌다 |
| `npm run check:duplicates` | 회차 간 같은 문항 반복 | 이용권을 사서 여러 회차를 도는 사람이 같은 문제를 또 만나면 환불 사유다 |
| `npm run check:schedule` | 시험 일정 표가 아직 쓸 만한가 (남은 회차·날짜 앞뒤 순서) | 손으로 채우는 표라 회차가 다 지나가면 화면이 **지난 회차를 계속 보여 준다**. 안 깨지고 조용히 틀려서 날짜로 감시한다 |
| `npm run check:blog` | 블로그 글끼리 같은 검색어 경쟁 | 두 글이 같은 검색어를 노리면 둘 다 밀린다 |
| `npm run check:contrast` | 글자·배경 명암비 + 아이콘·입력칸 안내글 (공개 25개 면) | 눈으로는 "좀 흐린가" 하고 넘어간다. 주 CTA가 2.15:1이던 것도 이걸로 찾았다 |
| `npm run check:mobile` | 휴대폰 화면의 누름 대상·가로 스크롤·겹침 | 대부분 휴대폰으로 들어온다. 떠 있는 버튼이 전환 버튼을 덮고 있어도 데스크톱에선 안 보인다 |
| `npm run check:ui-authed` | 로그인 뒤 17개 화면 × 2모드의 명암비·휴대폰 사용성 | 위 두 검사는 공개 면만 본다. 정작 돈 낸 사람이 오래 머무는 곳은 로그인 뒤다 |
| `npm run check:a11y` | 화면 뼈대 — 조작 요소 이름·이미지 대체글·제목 단계·h1·main·lang (공개 16면 + 로그인 뒤 7면) | 눈으로는 멀쩡하다. 이름표가 옆에 **보이니까** — 그게 입력칸과 묶였는지는 화면을 봐서는 알 수 없다 |
| `npm run check:keyboard` | 키보드 전용 조작 + 2560px 넓은 화면 줄 길이 | 마우스로만 눌러 보면 초점 표시·초점 함정은 절대 안 걸린다 |
| `npm run check:signup` | 가입 폼 + 구글로 시작하기(구글 로그인 화면까지) | 다른 검사는 관리자 API로 계정을 만들어서, 정작 사람이 쓰는 폼은 아무도 지나가지 않는다 |
| `npm run check:report` | 아침 보고 라우트 — 잠김·숫자 형태·주 경계(KST)·PNG·미설정 처리 | 사람이 안 보는 자리에서 매일 도는 코드다. 깨지면 '보고가 안 왔네' 하고 며칠 뒤에야 안다 |
| `npm run check:manuscript` | 원고지 화면 — 20칸·글자 수·칸 표시·새로고침 복구 (AI 채점은 안 누름) | 이 서비스가 파는 것의 핵심인데 어떤 검사도 손대지 않고 있었다. 붙이자마자 '새로고침하면 글이 다 날아감'이 나왔다 |
| `npm run check:sub-gate` | 이용권 없음·있음·만료 / AI 체험 남음·소진 — 유료 문이 양방향으로 맞는가 | 유료 회차가 막히는지만 보면, 돈 낸 사람까지 막혀도 통과한다. 만료는 status가 아니라 날짜로 판정돼야 한다 |
| `npm run check:exam-flow` | 실글 39문항 + KBS 100문항을 끝까지 풀고 제출 → 결과·DB 저장·오답 화면 색까지 | 화면만 훑어서는 안 잡힌다. 답안 저장이 실패해도 세션만 '완료'가 되던 사고가 실제로 있었다 |
| `npm run check:blog-render` | 블로그 글 본문(발행 HTML)의 명암비·휴대폰 사용성 | 본문은 파이프라인이 만든 HTML을 그대로 넣는다. 인라인 style이 섞여 사이트 토큰만 지켜서는 알 수 없다 |
| `npm run check:recovery` | 오류가 났을 때 빠져나올 수 있는가(제출 끊김·세션 만료·없는 주소) | 잘 되는 경로는 개발하며 수없이 지나가지만 끊겼을 때 화면은 아무도 안 본다 |
| `npm run check:admin` | 관리자 10개 화면의 명암비·휴대폰 사용성 | 내가 매일 쓰는 화면인데 한 번도 안 쟀다. 여기서 문제 관리가 마이그레이션 033 이후로 죽어 있던 걸 찾았다 |
| `npm run check:vitals` | 느린 회선 체감 성능 (LCP·CLS) | 빠른 회선에서 재면 전부 0으로 나와 아무것도 못 잡는다 |
| `npm run funnel` | 전환 퍼널 (DB 상태 + 이벤트) | 이벤트만 보면 실제보다 적게 잡힌다 |
| `npm run cleanup:test` | 남은 검증용 계정 정리 | 실행이 끊기면 뒷정리를 못 해 관리자 지표에 섞인다 (`-- --yes`로 실제 삭제) |

`npm test`를 뺀 나머지는 `.env.local`의 `SUPABASE_SERVICE_ROLE_KEY`를 쓴다.

검사는 **한 번에 하나씩** 돌린다. 여러 개를 동시에 돌리면 같은 기기·같은 서버를 두고
다투다가 없는 문제를 만든다 — 실제로 네 개를 겹쳐 돌렸을 때 시험 제출이 한 번 실패했고
(3/5), 혼자 다시 돌리니 11/11이었다. 그래서 제출 실패 보고에는 실제 서버 응답을 같이
찍는다: `[실패한 요청 없음]`이면 화면 쪽, `[500 POST /cbt/...]`면 서버 쪽이다.

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

## 오류 경계

세 단계다. `(main)/error.tsx`(로그인 뒤) · `error.tsx`(공개 면) · `global-error.tsx`(최후).
공개 면 것이 없으면 global-error까지 올라가는데, 그건 html째로 갈아 끼우는 화면이라
**사이트 안 어디로도 갈 수 없다**. 검색으로 처음 들어온 사람에게는 그게 곧 이탈이다.

동작은 이렇게 확인했다(운영에 500 나는 주소를 남겨 둘 수 없으니 그때그때 로컬에서):

```bash
mkdir -p src/app/boundarytest
printf 'export const dynamic = "force-dynamic"
export default function P(): never { throw new Error("확인용") }
'   > src/app/boundarytest/page.tsx
npm run build && npx next start -p 3119   # 다른 창에서 http://127.0.0.1:3119/boundarytest
rm -rf src/app/boundarytest && npm run build
```

2026-08-07 결과: 상태 500 · 한글 안내 · 빠져나갈 링크 3개(홈·학습자료·블로그) · 오류코드 표시.
폴더 이름을 `_boundarytest`로 하면 Next가 비공개 폴더로 보고 라우팅하지 않는다(404가 나온다).

## 서버 액션이 실패했을 때

운영 빌드는 이유를 가린다 — 화면에도 로그에도 `An error occurred in the Server Components
render. The specific message is omitted in production builds`만 남는다. 진짜 이유는
**로컬 운영빌드를 띄워 서버 로그**를 봐야 나온다.

```bash
npm run build && node node_modules/next/dist/bin/next start -p 3123 > srv.log 2>&1 &
# 재현한 뒤
grep -i error srv.log
```

이 방법으로 `permission denied for table reviews`를 찾았다. **RLS 정책과 테이블 권한은
다른 층이다** — `reviews`에는 본인 삭제 정책이 있지만(003) `authenticated`에 DELETE 권한이
없어서, 정책만 보고 코드를 쓰면 런타임에 막힌다. 정책 파일만 읽고 판단하지 말 것.

## 아침 보고 (텔레그램)

매일 **09:00 KST**에 신규 구독 유입을 그래프로 보낸다. Vercel Cron이
`/api/cron/subscriber-report`를 부른다(`vercel.json`, 크론은 UTC라 `0 0 * * *`).

| 필요한 환경변수 | 어디에 | 없으면 |
|---|---|---|
| `CRON_SECRET` | Vercel (Production) | 라우트가 401로 닫힌다 — 열어 두는 것보다 안 도는 게 낫다 |
| `TELEGRAM_BOT_TOKEN` | Vercel (Production) | 503, 보고가 안 온다 |
| `TELEGRAM_CHAT_ID` | Vercel (Production) | 〃 |

토큰·chat id 만드는 법은 `src/lib/questionReportAlert.ts` 맨 위 주석에 적혀 있다
(문제 오류 신고 알림과 같은 봇을 쓰면 된다).

**아침을 기다리지 않고 지금 확인하기:**

```bash
npm run report:subs           # 숫자 + 그림(scripts/_subscriber_report.png)만, 전송 안 함
npm run report:subs -- --send # 실제로 텔레그램까지 보내 본다(.env.local에 토큰 필요)
```

그림 안 글자가 전부 영어인 이유: PNG를 next/og(Satori)로 만드는데 한글 글꼴이 없어서
한글을 넣으면 네모로 나온다. 글꼴을 실어 나르면 매일 도는 작업에 수 MB가 붙는다 →
**숫자·날짜만 그림에 넣고 읽는 말은 텔레그램 캡션에 싣는다.**

방문자 수는 **2026-08-04부터만** 센다. 그 전 기록에는 내 검사 트래픽이 섞여 있다
(8/3 하루가 페이지뷰 3020·방문자 492인데, 한 명이 40~53쪽씩 보고 238명은 1쪽만 봤다 —
브라우저 컨텍스트마다 새 visitor_id가 생긴 것이다). '90초에 8쪽' 규칙은 1쪽짜리를
못 걸러서 깨끗하게 갈라낼 수 없다. 2026-08-11부터 7일 비교가 온전해진다.

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

- **CLS 0.0000** 전 면. LCP 1.5~2.4초로 기준(2.5초) 안.
- **반응 지연 0~24ms** — 실제로 눌렀을 때는 빠르다(구글이 순위에 쓰는 INP 기준 200ms).
- **TBT 270~1340ms** — 기준(600ms)을 넘는 면이 있다. 프로파일을 떠 보면 긴 작업이
  **딱 두 개**고 큰 쪽 하나(약 530ms, 시작 1.37초)가 전부다 — 페이지 내용이 아니라
  공용 번들 하이드레이션이다. 제3자 스크립트는 없다.

`/spelling`의 첫 화면 밖 클라이언트 조각(맛보기 문제·하단 고정 CTA)을 `next/dynamic`으로
떼 보는 실험을 했는데 **효과가 없었다**(5회 중앙값 1744ms, 대조군 `/blog`도 같이 흔들렸다).
남은 비용이 개별 컴포넌트가 아니라 공용 번들이라는 뜻이다. 줄이려면 클라이언트 컴포넌트
수를 구조적으로 줄여야 한다. 같은 실험을 반복하지 않도록 적어 둔다.

페이지 무게 탓도 아니다. TBT가 가장 높게 나온 `/blog`는 DOM 440개로 `/spelling`(895개)의
절반인데 값은 더 높았다. 같은 커밋을 연달아 세 번 재면 `/blog` 1344 → 812 → 702ms,
`/` 661 → 664 → 526ms로 **40%씩 흔들린다**(1344는 튄 값이고 보통 500~800ms다). 4배 스로틀 + 개발 기기 부하 탓이다.
절대값으로 판정하지 말고 **같은 조건에서 여러 번 잰 변화**를 볼 것.

정리하면 남은 TBT는 개별 화면에서 깎을 수 있는 게 아니라 React를 얼마나 싣느냐의 문제다.
줄이려면 클라이언트 컴포넌트 수를 구조적으로 줄여야 하고, 지금 랜딩에 실린 클라이언트
컴포넌트는 셋(후기 흐름·하단 고정 CTA·시험일정 모달)뿐이다. 더 깎을 데가 별로 없다.

## 문항 데이터

`questions` 테이블은 **서버 전용**이다. 공개 SELECT 정책을 없애고 `src/lib/questionBank.ts`
(service_role)로만 읽는다 — anon 키는 클라이언트 번들에 실려 나가는 공개값이라, 열어 두면
정답과 해설이 그대로 노출된다.

연습 전용 문항은 센티넬 연도(`year >= 9000`)를 쓴다. 실제 시험 회차는 `year < 9000`.
`savePracticeProgress`는 `quiz_sessions`를 `(user, year, round)`로 찾으므로, 실제 회차 번호를
연습 화면에 넘기면 그 사람이 풀던 진짜 시험 세션을 덮어쓴다.
