import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name)
    return entry.isDirectory() ? files(file) : /\.[cm]?[jt]sx?$/.test(file) ? [file] : []
  })
}

// 문자열·주석의 가짜 호출과 중첩 인자를 실제 쓰기 체인으로 오인하지 않게 한다.
export function checkSource(source) {
  const pattern = /\/\/[^\n]*|\/\*[\s\S]*?\*\/|'(?:\\[\s\S]|[^'\\])*'|"(?:\\[\s\S]|[^"\\])*"|`(?:\\[\s\S]|[^`\\])*`|\/(?![/*])(?:\\.|\[(?:\\.|[^\]\\])*\]|[^/\r\n\\])+\/[dgimsuvy]*|[A-Za-z_$][\w$]*|\?\.|=>|[^\s]/g
  const all = [...source.matchAll(pattern)]
  const comments = all.filter(m => m[0].startsWith('//'))
  const items = all.filter(m => !m[0].startsWith('//') && !m[0].startsWith('/*'))
  const value = i => items[i]?.[0]
  const pairs = new Map()
  const stack = []
  for (let i = 0; i < items.length; i++) {
    if (['(', '[', '{'].includes(value(i))) stack.push(i)
    if ([')', ']', '}'].includes(value(i))) {
      const start = stack.pop()
      if (start !== undefined) { pairs.set(start, i); pairs.set(i, start) }
    }
  }
  function receiverStart(end) {
    let start = end
    if (value(start) === ')') {
      start = pairs.get(start)
      if (start === undefined) return end
      if (/^[\w$]+$/.test(value(start - 1) ?? '')) start--
    } else if (value(start) === ']') {
      start = pairs.get(start) ?? start
      if (/^[\w$]+$/.test(value(start - 1) ?? '')) start--
    }
    if (['.', '?.'].includes(value(start - 1))) return receiverStart(start - 2)
    return start
  }
  const results = []
  for (let i = 0; i < items.length; i++) {
    if (!['.', '?.'].includes(value(i - 1)) || value(i + 1) !== '(') continue
    const method = value(i)
    const write = /^(insert|update|upsert|delete|remove)$/.test(method)
    const authWrite = value(i - 2) === 'admin' && value(i - 4) === 'auth' && /^(createUser|updateUserById|deleteUser|inviteUserByEmail|generateLink)$/.test(method)
    if (!write && !authWrite) continue
    const start = receiverStart(i - 2)
    let end = pairs.get(i + 1) ?? i + 1
    let then = false
    while (['.', '?.'].includes(value(end + 1)) && value(end + 3) === '(') {
      if (value(end + 2) === 'then') then = true
      const next = pairs.get(end + 3)
      if (next === undefined) break
      end = next
    }
    const awaited = value(start - 1) === 'await'
    const returned = value(start - (awaited ? 2 : 1)) === 'return'
    let received = false
    let statementStart = start - (awaited ? 1 : 0)
    if (awaited && value(start - 2) === '=' && value(start - 3) === '}') {
      const binding = pairs.get(start - 3)
      if (value(binding - 1) === 'const') {
        statementStart = binding - 1
        for (let j = binding + 1; j < start - 3; j++) {
          if (value(j) === 'error' && ['{', ','].includes(value(j - 1)) && [':', ',', '}'].includes(value(j + 1))) received = true
          if (['{', '[', '('].includes(value(j))) j = pairs.get(j) ?? j
        }
      }
    }
    const line = source.slice(0, items[i].index).split('\n').length
    const firstLine = source.slice(0, items[Math.max(0, statementStart)].index).split('\n').length
    const lastLine = source.slice(0, items[end].index + value(end).length).split('\n').length
    const ignored = comments.some(comment => {
      if (!/^\/\/ write-result-ignored:\s*\S/.test(comment[0])) return false
      const commentLine = source.slice(0, comment.index).split('\n').length
      return commentLine === firstLine - 1 || commentLine === line - 1 || (commentLine >= firstLine && commentLine <= lastLine)
    })
    results.push({ line, method, ok: received || returned || then || ignored, ignored })
  }
  return results
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let passed = 0
  let failed = 0
  for (const file of files(path.join(root, 'src'))) {
    for (const result of checkSource(fs.readFileSync(file, 'utf8'))) {
      const label = `${path.relative(root, file).replaceAll('\\', '/')}:${result.line} .${result.method}()`
      if (result.ok) {
        passed++
        console.log(`PASS ${label}${result.ignored ? ' (write-result-ignored)' : ''}`)
      } else {
        failed++
        console.error(`FAIL ${label}: missing const { error } = await / .then() / return`)
      }
    }
  }
  console.log(`supabase-write-results: PASS ${passed} / FAIL ${failed}`)
  process.exitCode = failed ? 1 : 0
}
