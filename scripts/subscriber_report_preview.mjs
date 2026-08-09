// 아침 보고를 지금 만들어 본다 — 텔레그램으로 보내지 않고 숫자와 그림만 꺼낸다.
//   npm run report:subs
//
// 매일 아침을 기다려야 결과를 볼 수 있으면 고칠 수가 없다. 크론이 부르는 것과
// 똑같은 라우트를 로컬 운영빌드로 띄워서 부른다(계산·그림 코드가 갈라지지 않게).
//
// 실제 전송까지 해 보려면:  npm run report:subs -- --send
// (그때는 .env.local에 TELEGRAM_BOT_TOKEN·TELEGRAM_CHAT_ID가 있어야 한다)
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const PORT = Number(process.env.REPORT_PREVIEW_PORT ?? 3130)
const BASE = `http://127.0.0.1:${PORT}`
const SECRET = `preview-${Date.now()}`
const send = process.argv.includes('--send')

const nextBin = path.join('node_modules', 'next', 'dist', 'bin', 'next')
function run(args, env) {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [nextBin, ...args], { stdio: 'inherit', env: { ...process.env, ...env } })
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

const server = spawn(process.execPath, [nextBin, 'start', '-p', String(PORT)], {
  stdio: 'ignore',
  env: { ...process.env, CRON_SECRET: SECRET },
})

try {
  let up = false
  for (let i = 0; i < 60 && !up; i++) {
    try { up = (await fetch(`${BASE}/`)).ok } catch { /* 아직 */ }
    if (!up) await new Promise((r) => setTimeout(r, 1000))
  }
  if (!up) throw new Error(`로컬 서버가 ${PORT}포트에 뜨지 않았습니다`)

  const headers = { Authorization: `Bearer ${SECRET}` }
  const url = `${BASE}/api/cron/subscriber-report`

  const jr = await fetch(`${url}?preview=json`, { headers })
  const raw = await jr.text()
  let j = null
  try { j = JSON.parse(raw) } catch { /* JSON이 아니면 아래에서 원문을 보여 준다 */ }
  if (!jr.ok || !j) {
    console.error(`보고를 만들지 못했습니다 (HTTP ${jr.status})`)
    console.error(raw.slice(0, 600) || '(응답 본문 없음)')
    process.exitCode = 1
  } else {
    console.log('\n─ 텔레그램으로 갈 글 ─────────────────────────────\n')
    console.log(j.caption)
    console.log('\n──────────────────────────────────────────────────')
    const w = j.report.weeks.map((x) => `${x.label} ${x.count}`).join(' · ')
    console.log(`주간 신규 구독: ${w}`)
  }

  const ir = await fetch(`${url}?preview=image`, { headers })
  if (ir.ok) {
    const out = path.join('scripts', '_subscriber_report.png')
    fs.writeFileSync(out, Buffer.from(await ir.arrayBuffer()))
    console.log(`그림: ${out}`)
  } else {
    console.error('그림을 만들지 못했습니다:', ir.status, (await ir.text()).slice(0, 200))
    process.exitCode = 1
  }

  if (send) {
    const sr = await fetch(url, { headers })
    const sb = await sr.json().catch(() => ({}))
    console.log(sr.ok ? '텔레그램 전송 완료' : `전송 실패 ${sr.status}: ${JSON.stringify(sb).slice(0, 200)}`)
    if (!sr.ok) process.exitCode = 1
  } else {
    console.log('(전송은 안 했습니다 — 실제로 보내 보려면 -- --send)')
  }
} finally {
  server.kill()
}
