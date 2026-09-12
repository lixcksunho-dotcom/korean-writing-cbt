import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

const root = process.cwd()
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const values = {}
for (const [file, names] of [
  ['antiSharingLimits', ['DEVICE_LIMIT', 'DAILY_GRADE_LIMIT']],
  ['aiTrial', ['FREE_AI_TRIAL']],
  ['blogPromoRules', ['REWARD_DAYS', 'MIN_IMAGES', 'MIN_CHARS', 'RECOMMENDED_KEEP_DAYS']],
]) {
  const source = read(`src/lib/${file}.ts`)
  for (const name of names) {
    const match = source.match(new RegExp(`export\\s+const\\s+${name}\\s*=\\s*(\\d+)\\b`))
    if (!match) throw new Error(`상수 값을 읽을 수 없음: ${file}.${name}`)
    values[name] = Number(match[1])
  }
}
// 프로그램 설정은 export const 숫자가 아니라 객체 속성이므로 해당 객체에서 읽는다.
const program = read('src/lib/programs.ts').match(/const SILYONG\s*:\s*ProgramConfig\s*=\s*\{([\s\S]*?)\n\}/)?.[1]
for (const name of ['freeRounds', 'examMinutes']) {
  const match = program?.match(new RegExp(`\\b${name}:\\s*(\\d+)\\b`))
  if (!match) throw new Error(`프로그램 값을 읽을 수 없음: ${name}`)
  values[name] = Number(match[1])
}

function* files(dir) {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = `${dir}/${entry.name}`
    if (entry.isDirectory()) yield* files(file)
    else if (file.endsWith('.tsx')) yield file
  }
}

function ruleFor(text, unit, file) {
  if (unit === '대' && /기기/.test(text)) return 'DEVICE_LIMIT'
  if (/^회/.test(unit)) {
    if (/무료/.test(text) && /모의고사|CBT|회차/.test(text)) return 'freeRounds'
    if (unit === '회' && /무료|체험/.test(text) && !/환불|미사용|결제 후/.test(text)) return 'FREE_AI_TRIAL'
    if (unit === '회' && /하루|일일/.test(text) && /첨삭|채점|한도|받을 수/.test(text)) return 'DAILY_GRADE_LIMIT'
    if (unit === '회' && /첨삭|채점/.test(text) && !/모의고사|환불|미사용|사용 시작|결제/.test(text)) return 'DAILY_GRADE_LIMIT'
  }
  const blog = /promo|blog-review|BlogReview|BlogCTA|EventPopup/.test(file) || /블로그|후기 이벤트/.test(text)
  if (blog) {
    if (unit === '장' && /사진|이미지/.test(text)) return 'MIN_IMAGES'
    if (unit === '자' && /본문|공백/.test(text)) return 'MIN_CHARS'
    if (unit === '일' && /되도록|권장|부탁|그대로/.test(text)) return 'RECOMMENDED_KEEP_DAYS'
    if (unit === '일' && /이용권|답례|지급|공개/.test(text) && !/결제|환불|보지 않기|숨김/.test(text)) return 'REWARD_DAYS'
  }
  if (unit === '분' && /시험|CBT|선택형.*합쳐/.test(text) && !/KBS|듣기|한 문항/.test(text)) return 'examMinutes'
  return null
}

let passed = 0, failed = 0
for (const file of [...files('src/app'), ...files('src/components')]) {
  // 이전한 KBS 서비스의 공개 시험 정보는 실용글쓰기 설정과 비교하지 않는다.
  if (file === 'src/app/kbs-korean/page.tsx') continue
  const source = read(file)
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  function visit(node) {
    const literal = ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)
    if (literal || ts.isJsxText(node)) {
      const text = node.text
      const context = ts.isJsxText(node)
        ? node.parent.getText(tree).replace(/<[^>]*>/g, ' ').replace(/\{[^}]*\}/g, ' ')
        : text
      if (ts.isPropertyAssignment(node.parent) && node.parent.name.getText(tree) === 'kbs') return
      for (const match of text.matchAll(/(?<![\d,])([0-9][0-9,]*)\s*(회차|회분|회|대|일|자|장|분)(?!기)/g)) {
        if (/^\s*결제/.test(text.slice(match.index + match[0].length))) continue
        const nearby = context.length > 400 ? text.slice(Math.max(0, match.index - 90), match.index + match[0].length + 90) : context
        const name = ruleFor(nearby, match[2], file)
        if (!name) continue
        const actual = Number(match[1].replaceAll(',', ''))
        const ok = actual === values[name]
        if (ok) passed++; else failed++
        const line = tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1
        console.log(`${ok ? 'PASS' : 'FAIL'} ${file}:${line} ${match[0]} ↔ ${name}=${values[name]} | ${text.trim().replace(/\s+/g, ' ')}`)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(tree)
}
console.log(`한도 문구 대조: 통과 ${passed} / 실패 ${failed}`)
process.exitCode = failed ? 1 : 0
