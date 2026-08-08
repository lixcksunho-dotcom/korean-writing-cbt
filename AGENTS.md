<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 글자 색은 배경을 보고 고른다

아래 값은 전부 실제로 재서 고친 것들이다(WCAG AA 기준 4.5, 큰 글자·그래픽 3).
**흰 배경 기준으로 색을 고르면 연한 동색 배경 위에서 어긋난다** — 실제로 red-500을
red-600으로 올렸다가, 그 빨강이 앉는 자리가 대부분 `bg-red-50`이라 4.36으로 여전히
미달이어서 두 번 고쳤다.

| 쓰려던 색 | 흰 배경 | 연한 동색 배경 | 대신 쓸 것 |
|---|---|---|---|
| `text-gray-400` | 2.60 | — | `text-gray-500` (흰 배경) |
| `text-gray-500` | 4.83 | `bg-gray-100` 4.39 | 회색 배경이면 `text-gray-600` |
| `text-red-500` | 3.81 | — | `text-red-600` |
| `text-red-600` | 4.83 | `bg-red-50` 4.36 | 연빨강 위면 `text-red-700` |
| `text-amber-600` | 3.20 | — | `text-amber-700` |
| `text-emerald-600` | 3.65 | — | `text-emerald-700` |
| `text-[#cbd5e1]` | 1.42 | — | 정보면 `text-[#64748b]`, 장식이면 `aria-hidden` |
| 금색(`bg-amber-500`) 위 흰 글자 | 2.15 | — | 글자를 `text-[#0f172a]`로(금색은 살린다) |

장식에 `aria-hidden`을 붙이는 건 검사를 통과시키려는 게 아니라 낭독기가 읽지 않아야
할 것을 표시하는 것이다. 명암비 수집도 그 표시를 따른다.

고치고 나면 `npm run check:contrast`(공개) · `check:ui-authed`(로그인 뒤) ·
`check:admin`(관리자) · `check:exam-flow`(오답이 있어야 보이는 화면)로 확인한다.
검사는 한 번에 하나씩 — 겹쳐 돌리면 없는 실패가 만들어진다.
