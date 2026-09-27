import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
let passed = 0
let failed = 0

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name)
    return entry.isDirectory() ? files(file) : /\.[cm]?[jt]sx?$/.test(file) ? [file] : []
  })
}

// 주석과 문자열의 가짜 인증 호출이 검사를 통과시키지 못하게 한다.
function tokens(source) {
  const pattern = /\/\/[^\n]*|\/\*[\s\S]*?\*\/|'(?:\\[\s\S]|[^'\\])*'|"(?:\\[\s\S]|[^"\\])*"|`(?:\\[\s\S]|[^`\\])*`|\/(?![/*])(?:\\.|\[(?:\\.|[^\]\\])*\]|[^/\r\n\\])+\/[dgimsuvy]*|[A-Za-z_$][\w$]*|=>|[^\s]/g
  return [...source.matchAll(pattern)]
    .filter(match => !match[0].startsWith('//') && !match[0].startsWith('/*'))
    .map(match => ({ value: match[0], index: match.index }))
}

function close(items, start, left, right) {
  let depth = 0
  for (let i = start; i < items.length; i++) {
    if (items[i].value === left) depth++
    if (items[i].value === right && --depth === 0) return i
  }
  throw new Error(`Unclosed ${left} at ${items[start]?.index}`)
}

function check(file) {
  const source = fs.readFileSync(file, 'utf8')
  const items = tokens(source)
  if (!items.some(t => t.value === "'use server'" || t.value === '"use server"')) return
  const relative = path.relative(root, file).replaceAll('\\', '/')
  const value = i => items[i]?.value
  for (let i = 0; i < items.length; i++) {
    if (value(i) !== 'export') continue
    const exportIndex = i
    let cursor = i + 1
    if (value(cursor) === 'default') cursor++
    if (['type', 'interface'].includes(value(cursor))) continue
    let name
    let arrow = false
    if (value(cursor) === 'async' && value(cursor + 1) === 'function') {
      cursor += 2
      name = value(cursor) === '(' ? 'default' : value(cursor++)
    } else if (['const', 'let', 'var'].includes(value(cursor))) {
      name = value(++cursor)
      while (cursor < items.length && value(cursor) !== '=') cursor++
      if (value(++cursor) !== 'async') throw new Error(`${relative}: unsupported export ${name}`)
      cursor++
      arrow = true
    } else {
      throw new Error(`${relative}: unsupported export at ${items[i].index}`)
    }
    while (cursor < items.length && value(cursor) !== '(') cursor++
    cursor = close(items, cursor, '(', ')') + 1
    let angles = 0
    const typed = value(cursor) === ':'
    if (typed) cursor++
    const typeStart = cursor
    while (cursor < items.length) {
      const token = value(cursor)
      if (token === '<') angles++
      if (token === '>') angles--
      if (token === '{') {
        if (angles > 0 || (typed && cursor === typeStart)) {
          cursor = close(items, cursor, '{', '}') + 1
          continue
        }
        break
      }
      if (arrow && token === '=>') {
        cursor++
        if (value(cursor) !== '{') throw new Error(`${relative}: ${name} needs a block body for inspection`)
        break
      }
      cursor++
    }
    const end = close(items, cursor, '{', '}')
    const body = items.slice(cursor + 1, end)
    const authenticated = body.some((t, index) => ['getUser', 'assertAdmin', 'requireAdmin'].includes(t.value) && body[index + 1]?.value === '(')
    const publicReason = source.slice(0, items[exportIndex].index)
      .match(/(?:^|\n)[ \t]*\/\/ public-action:[ \t]*(\S[^\r\n]*)\r?\n[ \t]*$/)?.[1]
    const line = source.slice(0, items[exportIndex].index).split('\n').length
    if (authenticated || publicReason) {
      passed++
      console.log(`PASS ${relative}:${line} ${name}${publicReason ? ` (public: ${publicReason})` : ''}`)
    } else {
      failed++
      console.error(`FAIL ${relative}:${line} ${name}: missing getUser()/assertAdmin()/requireAdmin()`)
    }
    i = end
  }
}

for (const file of files(path.join(root, 'src'))) {
  try { check(file) } catch (error) {
    failed++
    console.error(`FAIL ${path.relative(root, file)}: ${error.message}`)
  }
}
console.log(`server-action-auth: PASS ${passed} / FAIL ${failed}`)
process.exitCode = failed ? 1 : 0
