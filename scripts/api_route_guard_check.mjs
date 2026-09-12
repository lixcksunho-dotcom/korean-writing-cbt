import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = path.resolve(import.meta.dirname, '..')
const methods = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])
const writes = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name)
    return entry.isDirectory() ? files(file) : entry.name === 'route.ts' ? [file] : []
  })
}

function callName(node) {
  if (!ts.isCallExpression(node)) return null
  const callee = node.expression
  return ts.isIdentifier(callee) ? callee.text
    : ts.isPropertyAccessExpression(callee) ? callee.name.text : null
}

// 실행되지 않는 중첩 함수의 가드로 바깥 핸들러를 통과시키면 안 된다.
function nodes(body) {
  const out = []
  function visit(node) {
    if (ts.isFunctionLike(node) || ts.isClassLike(node)) return
    out.push(node)
    ts.forEachChild(node, visit)
  }
  visit(body)
  return out
}

export function checkSource(source, file = 'src/app/api/example/route.ts') {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
  if (tree.parseDiagnostics.length) throw new Error('Cannot parse route source')
  const relative = file.replaceAll('\\', '/')
  const cron = /(?:^|\/)cron\//.test(relative)
  const paymentWebhook = relative.endsWith('/portone/webhook/route.ts')
  const declarations = new Map()
  for (const statement of tree.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name) declarations.set(statement.name.text, { fn: statement, statement })
    if (ts.isVariableStatement(statement)) {
      for (const d of statement.declarationList.declarations) {
        if (ts.isIdentifier(d.name)) declarations.set(d.name.text, { fn: d.initializer, statement })
      }
    }
  }
  const results = []
  const line = node => tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1
  function inspect(name, declaration) {
    const { fn, statement } = declaration ?? {}
    if (!fn || !(ts.isFunctionDeclaration(fn) || ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)) || !fn.body) {
      throw new Error(`Unsupported handler export ${name}; expose the handler directly`)
    }
    const reason = source.slice(0, statement.getStart(tree))
      .match(/(?:^|\n)[ \t]*\/\/ public-route:[ \t]*(\S[^\r\n]*)\r?\n[ \t]*$/)?.[1]
    const all = nodes(fn.body)
    const calls = all.filter(ts.isCallExpression)
    const auth = calls.some(n => ['getUser', 'assertAdmin', 'unauthorized'].includes(callName(n)))
    const secretCheck = calls.some(n => ['unauthorized', 'authorized', 'timingSafeEqual'].includes(callName(n)))
    const parses = calls.filter(n => ['json', 'text', 'formData', 'arrayBuffer', 'parse'].includes(callName(n))
      && ts.isPropertyAccessExpression(n.expression)
      && (n.expression.expression.getText(tree) === fn.parameters[0]?.name.getText(tree)
        || n.expression.expression.getText(tree) === 'JSON'))
    const caps = all.filter(n =>
      (callName(n) === 'slice' && n.arguments.length > 0)
      || (callName(n) === 'get' && n.arguments.some(a => ts.isStringLiteral(a) && a.text === 'content-length'))
      || (ts.isBinaryExpression(n) && [ts.SyntaxKind.GreaterThanToken, ts.SyntaxKind.GreaterThanEqualsToken].includes(n.operatorToken.kind)
        && ts.isPropertyAccessExpression(n.left) && n.left.name.text === 'length'))
    const bounded = parses.length > 0 && parses.every(p => caps.some(c => Math.abs(line(c) - line(p)) <= 8))
    const errors = []
    if (cron && !secretCheck) errors.push('missing cron secret check')
    // 결제 파일은 수정 금지이므로 이 웹훅만 기존 서명 검증을 별도로 확인한다.
    const signedWebhook = paymentWebhook && name === 'POST' && calls.some(n =>
      ts.isPropertyAccessExpression(n.expression) && n.expression.expression.getText(tree) === 'Webhook'
      && callName(n) === 'verify')
    if (!cron && writes.has(name) && !auth && !reason && !signedWebhook) errors.push('missing auth or adjacent public-route reason')
    if (reason && (writes.has(name) || parses.length) && !bounded) errors.push('missing body limit near parsing (8 lines)')
    results.push({ name, line: line(fn), ok: errors.length === 0, reason, errors,
      exception: signedWebhook ? 'read-only payment exception: Webhook.verify; body cap needs human review' : undefined })
  }
  for (const statement of tree.statements) {
    if (statement.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
      if (ts.isFunctionDeclaration(statement) && methods.has(statement.name?.text)) inspect(statement.name.text, { fn: statement, statement })
      if (ts.isVariableStatement(statement)) {
        for (const d of statement.declarationList.declarations) {
          if (methods.has(d.name.getText(tree))) inspect(d.name.getText(tree), { fn: d.initializer, statement })
        }
      }
    }
    if (ts.isExportDeclaration(statement) && !statement.isTypeOnly) {
      if (!statement.exportClause) throw new Error('Unsupported wildcard route re-export')
      if (ts.isNamedExports(statement.exportClause)) {
        for (const e of statement.exportClause.elements) {
          if (!e.isTypeOnly && methods.has(e.name.text)) {
            if (statement.moduleSpecifier) throw new Error(`Unsupported handler re-export ${e.name.text}`)
            inspect(e.name.text, declarations.get((e.propertyName ?? e.name).text))
          }
        }
      }
    }
  }
  return results
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let passed = 0, failed = 0
  for (const file of files(path.join(root, 'src/app/api'))) {
    const relative = path.relative(root, file).replaceAll('\\', '/')
    try {
      for (const r of checkSource(fs.readFileSync(file, 'utf8'), relative)) {
        if (r.ok) passed++
        else failed++
        console.log(`${r.ok ? 'PASS' : 'FAIL'} ${relative}:${r.line} ${r.name}${r.errors.length ? ': ' + r.errors.join('; ') : ''}${r.exception ? ' (' + r.exception + ')' : ''}`)
      }
    } catch (error) {
      failed++
      console.error(`FAIL ${relative}: ${error.message}`)
    }
  }
  console.log(`api-route-guards: PASS ${passed} / FAIL ${failed}`)
  process.exitCode = failed ? 1 : 0
}
