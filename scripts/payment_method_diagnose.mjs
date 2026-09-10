// 간편결제 경로 진단 — 결제창 호출부(src/ 내 PortOne requestPayment)를 읽어서
// ①현재 열려 있는 payMethod ②easyPayProvider 지정 여부 ③이니시스 V2에서
// 카카오페이·네이버페이가 뜨려면 무엇이 더 필요한지를 표로 정리한다.
//
//   node scripts/payment_method_diagnose.mjs [--json]
//
// 읽기 전용이다. 결제 코드를 고치지 않고, 포트원 API도 부르지 않는다.
import fs from 'node:fs'
import path from 'node:path'

const SRC = path.resolve('src')
const AS_JSON = process.argv.includes('--json')

// ---- 1. requestPayment 호출부 수집 ------------------------------------------
function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) yield* walk(p)
    else if (/\.(tsx?|jsx?|mjs)$/.test(e.name)) yield p
  }
}

const callSites = []
for (const file of walk(SRC)) {
  const text = fs.readFileSync(file, 'utf-8')
  if (!text.includes('requestPayment(')) continue
  const line = text.slice(0, text.indexOf('requestPayment(')).split('\n').length

  // 주석에는 과거 사고 기록으로 'EASY_PAY' 같은 문자열이 남아 있다 — 실제로
  // 실행되는 코드만 보려면 주석을 지운 본문에서 찾아야 한다.
  const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')

  // 호출 인자에 직접 적힌 값 + 같은 파일의 헬퍼(portoneMethodParams 등)가
  // 돌려주는 값까지 파일 단위로 훑는다. 진단용이라 정적 문자열만 본다.
  const payMethods = [...code.matchAll(/payMethod\s*:\s*['"]([A-Z_]+)['"]/g)].map((m) => m[1])
  const easyPayProviders = [...code.matchAll(/easyPayProvider\s*:\s*['"]([A-Z_]+)['"]/g)].map((m) => m[1])
  const hasEasyPayObject = /easyPay\s*:\s*\{/.test(code)
  // 카카오페이처럼 PG 자체가 간편결제사인 수단은 이니시스와 별개 채널로 열린다 —
  // 그 채널키는 `NEXT_PUBLIC_PORTONE_CHANNEL_KEY_<수단>` 환경변수로 들어온다(README "카카오페이 켜는 법").
  const channelKeyEnvs = [...new Set(
    [...code.matchAll(/NEXT_PUBLIC_PORTONE_CHANNEL_KEY_([A-Z]+)/g)].map((m) => m[1]),
  )]

  // 화면에 보이는 결제수단 버튼(METHODS 배열)과 '준비중(soon)' 여부
  const uiMethods = [...code.matchAll(/\{\s*key:\s*'([a-z]+)'\s*,\s*label:\s*'([^']+)'([^}]*)\}/g)]
    .map((m) => ({ key: m[1], label: m[2], soon: /soon:\s*true/.test(m[3]) }))

  callSites.push({
    file: path.relative(process.cwd(), file).replaceAll('\\', '/'),
    line,
    payMethods: [...new Set(payMethods)],
    easyPayProviders: [...new Set(easyPayProviders)],
    hasEasyPayObject,
    channelKeyEnvs,
    uiMethods,
  })
}

// ---- 2. SDK 규격 확인(설치된 @portone/browser-sdk 타입에서 실물 대조) --------
const sdkEasyPayType = path.resolve('node_modules/@portone/browser-sdk/dist/v2/request/PaymentRequestUnionEasyPay.d.ts')
const sdkProviderEnum = path.resolve('node_modules/@portone/browser-sdk/dist/v2/entity/EasyPayProvider.d.ts')
const sdk = {
  easyPayParamExists: fs.existsSync(sdkEasyPayType),
  providers: fs.existsSync(sdkProviderEnum)
    ? [...fs.readFileSync(sdkProviderEnum, 'utf-8').matchAll(/readonly ([A-Z_]+): "/g)].map((m) => m[1])
    : [],
}

// ---- 3. 출력 -----------------------------------------------------------------
if (AS_JSON) {
  console.log(JSON.stringify({ callSites, sdk }, null, 2))
  process.exit(0)
}

console.log('# 간편결제 경로 진단\n')
console.log('## requestPayment 호출부\n')
console.log('| 파일 | payMethod | easyPayProvider | easyPay 객체 |')
console.log('|---|---|---|---|')
for (const c of callSites) {
  console.log(
    `| ${c.file}:${c.line} | ${c.payMethods.join(', ') || '(없음)'} | ${c.easyPayProviders.join(', ') || '지정 안 함'} | ${c.hasEasyPayObject ? '있음' : '없음'} |`,
  )
}

console.log('\n## 화면에 보이는 결제수단 버튼\n')
console.log('| key | 라벨 | 상태 |')
console.log('|---|---|---|')
for (const c of callSites) {
  for (const m of c.uiMethods) {
    console.log(`| ${m.key} | ${m.label} | ${m.soon ? '준비중(결제창 안 엶)' : '결제창 엶'} |`)
  }
}

console.log(`\n## SDK 규격(설치본 실물)\n`)
console.log(`- easyPayProvider 파라미터: ${sdk.easyPayParamExists ? '존재(PaymentRequestUnionEasyPay)' : '타입 파일 없음'}`)
console.log(`- 지원 provider enum: ${sdk.providers.join(', ') || '(확인 불가)'}`)

// ---- 4. 수단별로 "지금 어디까지 돼 있고 무엇이 더 필요한가" ---------------------
// 8/24 첫 진단 때는 이 표를 글자로 박아 뒀다("CARD만 호출") — 카카오페이가 열린 뒤에도
// 재실행하면 옛 표가 그대로 나왔다. 호출부에서 읽은 값으로 채운다.
//
// 코드 밖 조건(계약·심사)은 코드로 확인할 수 없다 — 포트원 연동 문서(developers.portone.io,
// 2026-09-10 확인) 기준으로 '무엇이 더 필요한지'만 적는다.
const providersInCode = new Set(callSites.flatMap((c) => c.easyPayProviders))
const channelEnvsInCode = new Set(callSites.flatMap((c) => c.channelKeyEnvs))
const uiKeys = new Set(callSites.flatMap((c) => c.uiMethods.filter((m) => !m.soon).map((m) => m.key)))

const CANDIDATES = [
  {
    provider: 'KAKAOPAY', label: '카카오페이', ui: 'kakaopay', ownChannel: true,
    outside: '카카오페이 가맹 계약(CID) → 포트원 콘솔 채널 추가 → 채널키 환경변수',
  },
  {
    provider: 'NAVERPAY', label: '네이버페이(결제형)', ui: 'naverpay', ownChannel: true,
    outside: '별도 PG 채널 — 네이버페이 가맹 계약·검수(검수 전엔 "API 호출 권한이 없습니다") → 채널 추가 → 채널키 환경변수. windowType 은 PC POPUP·모바일 REDIRECTION만',
  },
  {
    provider: 'TOSSPAY', label: '토스페이', ui: 'tosspay', ownChannel: true,
    outside: '별도 PG 채널 — 토스페이 계약 → 채널 추가 → 채널키 환경변수',
  },
  {
    provider: '(이니시스 경유)', label: '이니시스 간편결제(네이버·토스·페이코 등)', ui: 'easypay', ownChannel: false,
    outside: '채널 추가 없이 easyPay.easyPayProvider 만 지정 — 단, 그 간편결제사가 KG이니시스 상점 계약에 열려 있어야 한다(포트원 문서에 목록 없음, 이니시스 확인 필요). 미지정 호출은 400 ("간편 결제 수단은 필수 입력입니다")',
  },
]

console.log(`\n## 수단별 현재 상태와 열려면 필요한 것\n`)
console.log('| 수단 | 호출부 | 전용 채널키 env | 화면 버튼 | 지금 | 코드 밖에서 필요한 것 |')
console.log('|---|---|---|---|---|---|')
for (const c of CANDIDATES) {
  const inCode = c.ownChannel ? providersInCode.has(c.provider) : false
  const envOk = c.ownChannel ? channelEnvsInCode.has(c.provider) : null
  const uiOk = uiKeys.has(c.ui)
  const state = inCode && (envOk || !c.ownChannel) && uiOk
    ? '열림(채널키가 배포에 있으면)'
    : inCode || uiOk ? '일부만' : '없음'
  console.log(
    `| ${c.label} | ${inCode ? 'EASY_PAY + ' + c.provider : '없음'} | ${envOk === null ? '해당 없음' : envOk ? `CHANNEL_KEY_${c.provider}` : '없음'} | ${uiOk ? '있음' : '없음'} | ${state} | ${c.outside} |`,
  )
}
console.log(`
- 채널키 값이 실제 배포(Vercel)에 들어 있는지는 이 스크립트가 보지 않는다 — 원장(포트원)에 그 채널 건이 찍히는지로 확인한다(\`npm run report:method-impact\`).
- 새 수단을 코드에 붙이는 일은 결제창 호출부 변경이라 사람 판단 대상(CLAUDE.md NEED_HUMAN).`)
