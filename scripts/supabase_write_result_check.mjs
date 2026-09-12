import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name)
    return entry.isDirectory() ? files(file) : /\.[cm]?[jt]sx?$/.test(file) ? [file] : []
  })
}

function method(node) {
  if (!node) return null
  if (ts.isPropertyAccessExpression(node)) return node.name.text
  if (ts.isElementAccessExpression(node) && ts.isStringLiteralLike(node.argumentExpression)) return node.argumentExpression.text
  return null
}

function unwrapParent(node) {
  while (ts.isParenthesizedExpression(node.parent) || ts.isAsExpression(node.parent)
    || ts.isNonNullExpression(node.parent) || ts.isSatisfiesExpression(node.parent)) node = node.parent
  return node
}

function receivesError(binding) {
  return !!binding && ts.isObjectBindingPattern(binding) && binding.elements.some(element =>
    !element.dotDotDotToken && (element.propertyName ?? element.name).getText().replace(/['"]/g, '') === 'error')
}

// 구문 트리로 실행식을 읽어 나눗셈·템플릿 보간 안의 쓰기도 찾는다.
export function checkSource(source, file = 'source.tsx') {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
  if (tree.parseDiagnostics.length) throw new Error('Cannot parse write source')
  const results = []
  function visit(node) {
    if (ts.isCallExpression(node)) {
      const name = method(node.expression)
      const receiver = node.expression.expression
      const authWrite = receiver && method(receiver) === 'admin' && method(receiver.expression) === 'auth'
        && /^(createUser|updateUserById|deleteUser|inviteUserByEmail|generateLink)$/.test(name)
      if (/^(insert|update|upsert|delete|remove)$/.test(name) || authWrite) {
        let end = node, then = false
        while (true) {
          end = unwrapParent(end)
          const access = end.parent
          if ((ts.isPropertyAccessExpression(access) || ts.isElementAccessExpression(access))
            && access.expression === end && ts.isCallExpression(access.parent) && access.parent.expression === access) {
            if (method(access) === 'then') then = true
            end = access.parent
          } else break
        }
        let slot = null
        // Promise.all은 배열의 각 결과를 해당 구조 분해 자리와 대조한다.
        if (ts.isArrayLiteralExpression(end.parent)) {
          const array = end.parent, call = array.parent
          if (ts.isCallExpression(call) && call.arguments[0] === array && method(call.expression) === 'all'
            && call.expression.expression.getText(tree) === 'Promise') {
            slot = array.elements.indexOf(end)
            end = unwrapParent(call)
          }
        }
        const awaited = ts.isAwaitExpression(end.parent)
        if (awaited) end = unwrapParent(end.parent)
        const returned = ts.isReturnStatement(end.parent)
        let binding = awaited && ts.isVariableDeclaration(end.parent) ? end.parent.name : null
        if (slot !== null) binding = binding && ts.isArrayBindingPattern(binding) ? binding.elements[slot]?.name : null
        let statement = end
        while (statement.parent && !ts.isStatement(statement)) statement = statement.parent
        const ignored = [statement, node, node.expression].some(target =>
          (ts.getLeadingCommentRanges(source, target.getFullStart()) ?? []).some(comment =>
            /^\/\/ write-result-ignored:\s*\S/.test(source.slice(comment.pos, comment.end))))
        results.push({
          line: tree.getLineAndCharacterOfPosition(node.expression.name?.getStart(tree) ?? node.getStart(tree)).line + 1,
          method: name, ok: receivesError(binding) || returned || then || ignored, ignored,
        })
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(tree)
  return results
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let passed = 0, failed = 0
  for (const file of files(path.join(root, 'src'))) {
    try {
      for (const result of checkSource(fs.readFileSync(file, 'utf8'), file)) {
        const label = path.relative(root, file).replaceAll('\\', '/') + ':' + result.line + ' .' + result.method + '()'
        if (result.ok) {
          passed++
          console.log('PASS ' + label + (result.ignored ? ' (write-result-ignored)' : ''))
        } else {
          failed++
          console.error('FAIL ' + label + ': missing { error } = await / .then() / return')
        }
      }
    } catch (error) {
      failed++
      console.error('FAIL ' + path.relative(root, file) + ': ' + error.message)
    }
  }
  console.log('supabase-write-results: PASS ' + passed + ' / FAIL ' + failed)
  process.exitCode = failed ? 1 : 0
}
