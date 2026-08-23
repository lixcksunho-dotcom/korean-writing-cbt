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

  // 화면에 보이는 결제수단 버튼(METHODS 배열)과 '준비중(soon)' 여부
  const uiMethods = [...code.matchAll(/\{\s*key:\s*'([a-z]+)'\s*,\s*label:\s*'([^']+)'([^}]*)\}/g)]
    .map((m) => ({ key: m[1], label: m[2], soon: /soon:\s*true/.test(m[3]) }))

  callSites.push({
    file: path.relative(process.cwd(), file).replaceAll('\\', '/'),
    line,
    payMethods: [...new Set(payMethods)],
    easyPayProviders: [...new Set(easyPayProviders)],
    hasEasyPayObject,
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

console.log(`
## 이니시스 V2에서 카카오페이·네이버페이가 뜨려면

| 조건 | 현재 상태 | 필요한 것 |
|---|---|---|
| payMethod: 'EASY_PAY' 로 호출 | CARD만 호출 | 간편결제 버튼이 payMethod를 EASY_PAY로 바꿔 호출 |
| easyPay.easyPayProvider 지정 | 지정 없음 | 이니시스 V2는 간편결제사 필수 — 미지정 시 400 ("간편 결제 수단은 필수 입력입니다") |
| 이니시스 계약에 해당 간편결제사 개통 | 코드로 확인 불가 | KG이니시스 상점 계약에 카카오페이/네이버페이가 열려 있는지 사람이 확인 |
`)
