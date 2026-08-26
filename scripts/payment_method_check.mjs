// 결제 수단 버튼이 '눌리는데 안 되는' 상태가 아닌지 본다.
//   npm run check:methods
//
// 왜 필요한가: 간편결제 버튼이 처음부터 한 번도 작동한 적이 없었다.
// `payMethod: 'EASY_PAY'`만 주고 불렀는데 KG이니시스 V2는 간편결제사를 지정하지 않으면
// 결제창 자체를 안 띄운다("이니시스 V2의 경우 간편 결제 수단은 필수 입력입니다", 400).
// 그런데 화면·빌드·타입 어디에도 표가 안 났다 — 버튼은 멀쩡해 보이고, 누른 사람 화면에서만
// 1초 만에 튕겼다. 8/16·8/18 결제자 두 명이 7번 눌러 7번 다 실패했고(둘 다 카드로 겨우 결제),
// 포트원에는 'READY'만 쌓여 '결제창 열고 그냥 닫은 사람'처럼 보였다.
//
// 화면을 봐서는 안 잡히므로 호출 형태를 직접 읽는다.
import fs from 'node:fs'
import path from 'node:path'

const file = path.join(import.meta.dirname, '../src/components/subscribe/PaymentButton.tsx')
const source = fs.readFileSync(file, 'utf-8')
// 주석에 적힌 예시가 검사를 통과시키면 안 된다(실제로 그 함정을 한 번 밟았다).
const code = source.split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')

/**
 * METHODS 배열의 항목을 하나씩 끊어 읽는다.
 * 정규식으로 `{...}`를 잡으려다 항목 하나가 다음 항목까지 삼켜, 멀쩡한 '카드 결제'가
 * 준비중으로 잡히고 간편결제는 아예 안 보였다 — 중괄호 깊이를 세어야 한다.
 */
function readMethodEntries(src) {
  const start = src.indexOf('const METHODS')
  if (start < 0) return []
  // 타입 주석의 `}[] = [`가 먼저 걸린다 — 대입 뒤의 여는 대괄호를 찾아야 한다.
  const assign = src.slice(start).search(/=\s*\[/)
  if (assign < 0) return []
  const open = start + assign + src.slice(start + assign).indexOf('[')
  const chunks = []
  let depth = 0
  let from = -1
  for (let i = open; i < src.length; i++) {
    const ch = src[i]
    if (ch === '{') { if (depth === 0) from = i; depth++ }
    else if (ch === '}') { depth--; if (depth === 0 && from >= 0) { chunks.push(src.slice(from, i + 1)); from = -1 } }
    else if (ch === ']' && depth === 0) break
  }
  return chunks
    .map((text) => ({ text, key: (text.match(/key:\s*'([a-z]+)'/) ?? [])[1] }))
    .filter((e) => e.key)
    .map((e) => ({
      ...e,
      soon: /soon:\s*true/.test(e.text),
      // soon 값이 조건식이면(예: soon: !CHANNEL_KEY) 열릴지 말지는 환경변수가 정한다.
      // 그런 항목을 '무조건 열려 있다'로 세면, 카드가 사라져도 이 검사가 통과해 버린다.
      conditional: /soon:\s*(?!true|false)\S/.test(e.text),
    }))
}

const results = []
const ck = (ok, name, detail = '') => results.push({ ok, name, detail })
const entries = readMethodEntries(code)
const live = entries.filter((e) => !e.soon && !e.conditional)
const conditional = entries.filter((e) => e.conditional)

// 1) 간편결제를 부르려면 간편결제사를 반드시 지정해야 한다.
const callsEasyPay = /payMethod:\s*'EASY_PAY'/.test(code)
ck(
  !callsEasyPay || /easyPayProvider/.test(code),
  '간편결제(EASY_PAY)를 부를 땐 간편결제사(easyPayProvider)를 지정한다',
  callsEasyPay ? '지정 없이 부르면 이니시스 V2는 결제창을 안 띄운다' : '지금은 EASY_PAY를 부르지 않는다',
)

// 2) '준비중'으로 표시한 수단은 결제창을 부르면 안 된다.
ck(/soon\s*\?\s*handleUnavailable\(/.test(code), "'준비중' 수단은 결제창 대신 안내로 간다", '버튼 onClick 분기')

// 3) 목록을 제대로 읽었는지 먼저 밝힌다 — 0개를 '문제 없음'으로 넘기면 안 된다.
ck(entries.length > 0, '결제 수단 목록을 읽었다', `${entries.length}개: ${entries.map((e) => `${e.key}${e.soon ? '(준비중)' : e.conditional ? '(환경변수에 따라)' : ''}`).join(', ')}`)

// 4) 준비중이 아닌(=실제로 열리는) 수단이 최소 하나는 남아 있어야 한다.
//    전부 준비중이면 화면은 멀쩡한데 아무도 결제할 수 없다.
ck(live.length > 0, '환경변수와 무관하게 열려 있는 수단이 있다', live.map((e) => e.key).join(', ') || '없음 — 설정이 빠지면 매출이 0이 된다')
if (conditional.length) {
  ck(true, '환경변수가 정하는 수단', `${conditional.map((e) => e.key).join(', ')} — 키가 없으면 준비중으로 남는다`)
}

// 5) 준비중 수단에는 왜 안 되는지 안내 문구가 있어야 한다.
//    "안 눌린다"만 알려 주고 대안을 안 주면 그 사람은 그냥 나간다.
const soonWithoutNotice = entries.filter((e) => (e.soon || e.conditional) && !/notice:/.test(e.text)).map((e) => e.key)
ck(soonWithoutNotice.length === 0, '준비중 수단마다 안내 문구가 있다', soonWithoutNotice.join(', ') || '전부 있음')

const failed = results.filter((r) => !r.ok)
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? ` — ${r.detail}` : ''}`)
console.log(`\n${results.length - failed.length}/${results.length} 통과`)
process.exit(failed.length ? 1 : 0)
