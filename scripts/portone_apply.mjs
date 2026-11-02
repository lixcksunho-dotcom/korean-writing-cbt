// 만물엄마(749) 채널로 결제를 다시 붙인다 — 값 등록 → 결제 열기 → 배포 → 실물 확인을 한 번에.
//   npm run portone:apply            (portone.new.env 의 값을 읽어 Vercel 프로덕션에 등록 → 배포 → 검사)
//   npm run portone:apply -- --dry   (무엇을 할지만 보여 주고 아무것도 안 바꾼다)
//
// 왜 필요한가: 포트원 심사가 끝나는 날 해야 할 일이 네 가지(새 채널 키 등록·옛 카카오페이 키 정리·
// 결제 중지 해제·재배포)인데 손으로 하면 순서가 어긋난다 — 키만 넣고 중지를 안 풀면 계속 닫혀 있고,
// 중지만 풀면 옛 채널(invalid cid)로 열린다. 이 스크립트는 **새 카드 채널 키가 있을 때만** 움직이고,
// 그 배포에서 `NEXT_PUBLIC_CHECKOUT_PAUSED=false` 를 같이 넣어 연다(businessInfo.ts CHECKOUT_MIGRATION).
//
// 값은 .env.local 이 아니라 **portone.new.env**(git 제외)에서 읽는다 — .env.local 에는 옛 사업자(743)의 키가
// 그대로 있어서, 그걸 읽으면 옛 채널(카카오페이 invalid cid)로 결제를 다시 여는 사고가 된다. 새 키만 그 파일에 붙인다.
// 상점 ID·API 시크릿·웹훅 시크릿은 portone.new.env 에 있으면 덮어쓰고, 없으면 Vercel 의 기존 값을 그대로 둔다
// (businessInfo.ts 주석: "기존 상점 ID와 서버 API/웹훅 비밀키는 유지한다"). 값은 절대 출력하지 않는다.
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

// kptest(korean-writing-cbt) 는 kbspass 와 다른 Vercel 팀에 있다(.vercel/project.json 의 orgId). 이 PC 의 vercel 로그인이
// 그 팀을 못 보면(2026-11-02 실측: 로그인 계정에 kbstest 팀만 있음) 아래 사전 점검에서 멈춘다 — `npx vercel login` 으로 kptest 소유 계정에 들어갈 것.
const SCOPE = process.env.VERCEL_SCOPE
  || (fs.existsSync('.vercel/project.json') ? JSON.parse(fs.readFileSync('.vercel/project.json', 'utf-8')).orgId : '')
  || 'team_93bAHMFniABDqPstw278AvmA'
const DRY = process.argv.includes('--dry')
const ENV_FILE = process.env.PORTONE_ENV_FILE || 'portone.new.env'

const ENV = Object.fromEntries(
  (fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf-8') : '').split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] }),
)

// [이름, 공개 여부, 필수 여부]
const KEYS = [
  ['NEXT_PUBLIC_PORTONE_CHANNEL_KEY', true, true],            // 새 사업자(749) 이니시스 카드 채널 — 이것이 없으면 아무것도 안 한다
  ['NEXT_PUBLIC_PORTONE_CHANNEL_KEY_KAKAOPAY', true, false],   // 749 카카오페이 채널 — 없으면 Vercel 의 옛 키를 지워 버튼을 숨긴다(옛 키는 invalid cid 로 전부 실패)
  ['NEXT_PUBLIC_PORTONE_STORE_ID', true, false],              // 같은 포트원 계정이면 그대로 — 있을 때만 덮어쓴다
  ['PORTONE_API_SECRET', false, false],
  ['PORTONE_WEBHOOK_SECRET', false, false],
]

const has = (k) => (ENV[k] ?? '').trim() !== ''
const shape = (k, v) => {
  if (k.endsWith('STORE_ID')) return v.startsWith('store-') ? 'ok' : "'store-' 로 시작해야 한다"
  if (k.includes('CHANNEL_KEY')) return v.startsWith('channel-key-') ? 'ok' : "'channel-key-' 로 시작해야 한다"
  return v.length >= 20 ? 'ok' : '너무 짧다(20자 미만)'
}

console.log(`포트원 값 → Vercel(${SCOPE}) 프로덕션${DRY ? ' [dry — 바꾸지 않음]' : ''}\n`)
let missingRequired = 0
let badShape = 0
for (const [k, pub, req] of KEYS) {
  if (!has(k)) { console.log(`  ${req ? '✖' : '·'}  ${k.padEnd(42)} 없음${req ? ' (필수)' : ' (선택 — Vercel 기존 값 유지)'}`); if (req) missingRequired++; continue }
  const s = shape(k, ENV[k])
  if (s !== 'ok') badShape++
  console.log(`  ${s === 'ok' ? '○' : '✖'}  ${k.padEnd(42)} ${ENV[k].length}자 · ${pub ? '공개' : '비밀'}${s === 'ok' ? '' : ` · ${s}`}`)
}
if (missingRequired) {
  console.log('\n새 카드 채널 키(NEXT_PUBLIC_PORTONE_CHANNEL_KEY)가 ' + ENV_FILE + ' 에 없다 — 아무것도 바꾸지 않는다.')
  console.log('포트원 콘솔 → 결제 연동 → 채널 관리에서 749(만물엄마) 이니시스 채널의 키를 복사해 portone.new.env 에 `이름=값` 한 줄로 붙인다(.env.local 에 붙이지 말 것).')
  process.exit(1)
}
if (badShape) { console.log(`\n생김새가 다른 값 ${badShape}개 — 복사가 잘렸는지 확인할 것.`); process.exit(1) }
if (!has('NEXT_PUBLIC_PORTONE_CHANNEL_KEY_KAKAOPAY')) console.log('\n※ 카카오페이 채널 키가 없다 — Vercel 의 옛 키를 지워 버튼을 숨긴다. 749 카카오페이 심사가 끝나면 키를 넣고 다시 이 명령을 돌리면 된다.')

// 0) 사전 점검 — 이 로그인으로 kptest 프로젝트의 환경변수를 볼 수 있어야 아래가 전부 의미가 있다(값은 안 찍힌다: 이름 목록만).
{
  const r = spawnSync('npx', ['vercel', 'env', 'ls', '--environment', 'production', '--scope', SCOPE], { encoding: 'utf-8', shell: process.platform === 'win32' })
  const out = (r.stdout || '') + (r.stderr || '')
  if (r.status !== 0 || !/PORTONE/.test(out)) {
    console.log(`\nVercel 사전 점검 실패(scope ${SCOPE}): ${out.trim().split('\n').filter((l) => /Error|scope|login/i.test(l)).join(' / ') || '포트원 변수가 안 보인다'}`)
    console.log('이 PC 의 vercel 로그인이 kptest 프로젝트 팀에 접근하지 못한다. `npx vercel login` 으로 kptest(korean-writing-cbt) 소유 계정에 로그인하거나 VERCEL_SCOPE=<팀 slug> 로 지정하고 다시 돌릴 것. 아무것도 바꾸지 않았다.')
    process.exit(1)
  }
  console.log(`Vercel 사전 점검 OK — scope ${SCOPE} 에서 포트원 변수 확인됨`)
}

const run = (cmd, args, input) => {
  console.log(`\n$ ${cmd} ${args.join(' ')}`)
  if (DRY) return 0
  const r = spawnSync(cmd, args, { input, stdio: [input == null ? 'inherit' : 'pipe', 'inherit', 'inherit'], shell: process.platform === 'win32' })
  return r.status ?? 1
}

// 1) 환경변수 — .env.local 에 있는 것만 덮어쓴다(--force). 비밀은 --sensitive.
for (const [k, pub] of KEYS) {
  if (!has(k)) continue
  const code = run('npx', ['vercel', 'env', 'add', k, 'production', '--scope', SCOPE, '--force', ...(pub ? [] : ['--sensitive'])], ENV[k] + '\n')
  if (code !== 0) { console.log(`\n${k} 등록 실패(exit ${code}) — 멈춘다. vercel 로그인 상태를 확인할 것.`); process.exit(code) }
}
// 1b) 옛 카카오페이 키 정리 — 새 키가 없으면 지운다(없는 변수를 지우는 실패는 무시).
if (!has('NEXT_PUBLIC_PORTONE_CHANNEL_KEY_KAKAOPAY')) {
  run('npx', ['vercel', 'env', 'rm', 'NEXT_PUBLIC_PORTONE_CHANNEL_KEY_KAKAOPAY', 'production', '--scope', SCOPE, '--yes'])
}
// 1c) 결제 중지 해제 — 이 배포에서 같이 열린다.
{
  const code = run('npx', ['vercel', 'env', 'add', 'NEXT_PUBLIC_CHECKOUT_PAUSED', 'production', '--scope', SCOPE, '--force'], 'false\n')
  if (code !== 0) { console.log('\nNEXT_PUBLIC_CHECKOUT_PAUSED 등록 실패 — 멈춘다(채널 키는 등록됐으니 이 변수만 넣고 배포하면 된다).'); process.exit(code) }
}

// 2) 재배포 — NEXT_PUBLIC_ 값은 빌드에 박히므로 반드시 새 빌드.
const dep = run('npx', ['vercel', 'deploy', '--prod', '--yes', '--scope', SCOPE])
if (dep !== 0) { console.log('\n배포 실패 — 환경변수는 등록됐으니 배포만 다시 돌리면 된다.'); process.exit(dep) }

// 3) 실물로 — 라이브 커밋, 결제수단 진단. (결제 중지 문구가 첫 화면 푸터에서 사라졌는지도 본다)
for (const s of ['check:deployed', 'check:methods']) {
  const code = run('npm', ['run', '--silent', s])
  if (code !== 0) console.log(`\n${s} 가 exit ${code} — 위 출력을 읽고 판단할 것.`)
}
if (!DRY) {
  const html = await (await fetch('https://kptest.cloud/', { cache: 'no-store' })).text()
  console.log(html.includes('신규 결제를 잠시 중지') ? '\n✖ 첫 화면 푸터에 아직 "신규 결제를 잠시 중지" 가 있다 — 배포가 옛 빌드이거나 변수가 안 들어갔다.' : '\n○ 첫 화면에서 결제 중지 문구가 사라졌다.')
}
console.log('\n남은 사람 일: 포트원 콘솔 웹훅(Transaction.Paid + Cancelled)이 새 채널에도 걸려 있는지 확인 → 실결제 1건 → npm run verify:payment → 사업자 표기(businessInfo.ts)를 만물엄마로 바꾸는 배포.')
