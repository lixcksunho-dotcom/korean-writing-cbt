// 아침 보고가 조용히 망가지지 않게 지킨다.
//   npm run check:report
//
// 이건 사람이 안 보는 자리에서 매일 도는 코드다. 깨져도 '보고가 안 왔네' 하고
// 며칠 지나서야 안다. 그래서 크론이 부르는 라우트를 그대로 불러 본다.
//
// 실제로 이 기능을 만들면서 두 번 틀렸다 — PostgREST 1000행 절단으로 방문자가
// 2주 내내 0명이었고, 그다음엔 검사 트래픽이 사람으로 잡혀 하루 492명이 됐다.
// 둘 다 '눈으로 보고' 찾았다. 눈은 매일 아침 거기 없다.
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const PORT = Number(process.env.REPORT_CHECK_PORT ?? 3140)
const BASE = `http://127.0.0.1:${PORT}`
const SECRET = `check-${Date.now()}`

const results = []
const ok = (n, d) => results.push({ ok: true, n, d })
const bad = (n, d) => results.push({ ok: false, n, d })

const nextBin = path.join('node_modules', 'next', 'dist', 'bin', 'next')
function run(args) {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [nextBin, ...args], { stdio: 'inherit', env: process.env })
    p.on('exit', (c) => (c === 0 ? resolve() : reject(new Error(`next ${args[0]} 실패 (${c})`))))
  })
}
function newestMtime(dir) {
  let newest = 0
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    newest = Math.max(newest, e.isDirectory() ? newestMtime(p) : fs.statSync(p).mtimeMs)
  }
  return newest
}
if (!fs.existsSync('.next/BUILD_ID') || fs.statSync('.next/BUILD_ID').mtimeMs < newestMtime('src')) {
  console.log('빌드가 소스보다 오래됐습니다 — 다시 만듭니다.')
  await run(['build'])
}

// 텔레그램 값이 있어도 이 검사에서는 절대 보내지 않는다 — 매일 아침 것과 헷갈리면 안 된다.
const server = spawn(process.execPath, [nextBin, 'start', '-p', String(PORT)], {
  stdio: 'ignore',
  env: { ...process.env, CRON_SECRET: SECRET, TELEGRAM_BOT_TOKEN: '', TELEGRAM_CHAT_ID: '' },
})

const url = `${BASE}/api/cron/subscriber-report`
const auth = { Authorization: `Bearer ${SECRET}` }

try {
  let up = false
  for (let i = 0; i < 60 && !up; i++) {
    try { up = (await fetch(`${BASE}/`)).ok } catch { /* 아직 */ }
    if (!up) await new Promise((r) => setTimeout(r, 1000))
  }
  if (!up) throw new Error(`로컬 서버가 ${PORT}포트에 뜨지 않았습니다`)

  // 1) 잠겨 있는가. 열려 있으면 아무나 매일 여러 번 보고를 띄울 수 있다.
  {
    const noAuth = await fetch(`${url}?preview=json`)
    const wrong = await fetch(`${url}?preview=json`, { headers: { Authorization: 'Bearer nope' } })
    if (noAuth.status === 401 && wrong.status === 401) ok('접근 제한', '비밀 없이는 401')
    else bad('접근 제한', `열려 있다 — 무인증 ${noAuth.status}, 틀린 비밀 ${wrong.status}`)
  }

  // 2) 숫자가 형태를 갖추는가. undefined·NaN이 캡션에 섞이면 그대로 폰에 뜬다.
  const res = await fetch(`${url}?preview=json`, { headers: auth })
  const raw = await res.text()
  let j = null
  try { j = JSON.parse(raw) } catch { /* 아래에서 원문을 보여 준다 */ }
  if (!res.ok || !j) {
    bad('보고 생성', `HTTP ${res.status} — ${raw.slice(0, 200)}`)
  } else {
    const r = j.report
    const nums = [r.todayCount, r.yesterdayCount, r.last7, r.prev7, r.total,
      r.visitors7, r.visitorsPrev7, r.subscribeView7, r.paymentStart7, r.signup7, r.visitorDaysCounted]
    if (nums.some((n) => typeof n !== 'number' || !Number.isFinite(n) || n < 0)) {
      bad('숫자 형태', `음수·NaN·빈 값이 있다 — ${JSON.stringify(nums)}`)
    } else ok('숫자 형태', `${nums.length}개 전부 0 이상의 수`)

    if (/undefined|NaN|null/.test(j.caption)) bad('캡션', `읽을 수 없는 값이 섞였다 — ${j.caption.slice(0, 120)}`)
    else if (!j.caption.includes('신규 구독 유입')) bad('캡션', '제목 줄이 없다')
    else ok('캡션', `${j.caption.split('\n').length}줄`)

    if (r.weeks?.length !== 10) bad('주간 칸', `10주여야 하는데 ${r.weeks?.length}`)
    else if (r.weeks.some((w) => typeof w.count !== 'number' || !/^\d{2}-\d{2}$/.test(w.label))) bad('주간 칸', '칸 모양이 깨졌다')
    else ok('주간 칸', `10주 · 합계 ${r.weeks.reduce((s, w) => s + w.count, 0)}건`)

    // 주간 합계는 누적과 맞아야 한다. 어긋나면 주 경계 계산이 밀린 것이다.
    // (10주보다 오래된 결제는 주간 막대에 안 들어가므로 '이하'가 맞는 관계다)
    const weekSum = r.weeks.reduce((s, w) => s + w.count, 0)
    if (weekSum > r.total) bad('주간 합계', `주간 합 ${weekSum} > 누적 ${r.total} — 같은 결제를 두 번 셌다`)
    else ok('주간 합계', `주간 합 ${weekSum} ≤ 누적 ${r.total}`)

    if (!Array.isArray(r.days) || r.days.length < 1 || r.days.length > 14) {
      bad('일별 칸', `1~14일이어야 하는데 ${r.days?.length}`)
    } else ok('일별 칸', `${r.days.length}일`)

    // 방문자가 통째로 0이면 대개 데이터를 못 받아 온 것이다(PostgREST 1000행 절단).
    if (r.days.every((d) => d.visitors === 0)) bad('방문자 수집', '최근 며칠이 전부 0명 — 데이터를 못 받아 왔을 수 있다')
    else ok('방문자 수집', `일별 ${r.days.map((d) => d.visitors).join('·')}`)
  }

  // 3) 주 경계가 KST 기준으로 맞는가 — 시각을 고정해서 확인한다.
  //    고르는 순간이 중요하다. KST 날짜와 UTC 날짜가 갈리면서 '주'까지 갈리는 지점,
  //    즉 월요일 새벽(KST)을 쓴다 — 2026-08-10(월) 08:00 KST = 8/9(일) 23:00 UTC.
  //    KST로 보면 새 주(08-10)의 첫날이고, UTC로 보면 아직 지난 주(일요일)다.
  //    (처음엔 일요일 밤을 골랐는데 두 계산이 같은 답을 내서 아무것도 못 걸렀다.
  //     일부러 UTC로 망가뜨려 보고 나서야 알았다.)
  {
    const at = Date.parse('2026-08-09T23:00:00Z') // = 8/10(월) 08:00 KST
    const r2 = await fetch(`${url}?preview=json&now=${at}`, { headers: auth })
    const j2 = await r2.json().catch(() => null)
    const last = j2?.report?.weeks?.[j2.report.weeks.length - 1]
    if (!last) bad('주 경계(KST)', '주간 칸을 읽지 못함')
    else if (last.label !== '08-10') bad('주 경계(KST)', `마지막 주가 08-10이어야 하는데 ${last.label} — UTC로 계산되고 있다`)
    else ok('주 경계(KST)', '월요일 새벽이 새 주(08-10)로 넘어간다')
  }

  // 4) 그림이 진짜 PNG로 나오는가
  {
    const ir = await fetch(`${url}?preview=image`, { headers: auth })
    const buf = Buffer.from(await ir.arrayBuffer())
    const isPng = buf.length > 8 && buf[0] === 0x89 && buf.toString('latin1', 1, 4) === 'PNG'
    if (!ir.ok) bad('그림', `HTTP ${ir.status}`)
    else if (!isPng) bad('그림', `PNG가 아니다 (${buf.length}바이트)`)
    else if (buf.length < 5000) bad('그림', `너무 작다 (${buf.length}바이트) — 빈 그림일 수 있다`)
    else ok('그림', `PNG ${Math.round(buf.length / 1024)}KB`)
  }

  // 5) 토큰이 없을 때 조용히 성공하지 않는가. 200을 돌려주면 '보냈다'고 착각한 채
  //    크론 로그에도 아무것도 안 남아 며칠을 모르고 지나간다.
  {
    const sr = await fetch(url, { headers: auth })
    if (sr.status === 503) ok('미설정 처리', '토큰이 없으면 503으로 알린다')
    else bad('미설정 처리', `503이어야 하는데 ${sr.status}`)
  }
} catch (e) {
  bad('검사 진행', String(e).slice(0, 160))
} finally {
  server.kill()
}

console.log('\n아침 보고 점검\n')
for (const r of results) console.log(`  ${r.ok ? '○' : '×'} ${r.n} — ${r.d}`)
const fails = results.filter((r) => !r.ok)
console.log(`\n통과 ${results.length - fails.length} / ${results.length}`)
if (fails.length) process.exitCode = 1
