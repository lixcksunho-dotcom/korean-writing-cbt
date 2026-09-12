import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = path.resolve(import.meta.dirname, '..')

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name)
    return entry.isDirectory() ? files(file) : /\.[cm]?[jt]sx?$/.test(file) ? [file] : []
  })
}

function hasServerDirective(body) {
  for (const statement of body.statements ?? []) {
    if (!ts.isExpressionStatement(statement) || !ts.isStringLiteral(statement.expression)) break
    if (statement.expression.text === 'use server') return true
  }
  return false
}

// 실행되지 않는 내부 함수의 인증 호출은 바깥 액션을 인증하지 않는다.
function hasAuth(body) {
  let found = false
  function visit(node) {
    if (ts.isFunctionLike(node) || ts.isClassLike(node)) return
    if (ts.isCallExpression(node)) {
      const callee = node.expression
      const name = ts.isIdentifier(callee) ? callee.text
        : ts.isPropertyAccessExpression(callee) ? callee.name.text : null
      if (['getUser', 'assertAdmin', 'requireAdmin'].includes(name)) found = true
    }
    ts.forEachChild(node, visit)
  }
  visit(body)
  return found
}

export function checkSource(source, file = 'action.ts') {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
  if (tree.parseDiagnostics.length) throw new Error('Cannot parse action source')
  const moduleAction = hasServerDirective(tree)
  const results = []
  const inspected = new Set()
  function inspect(fn, statement, name) {
    inspected.add(fn)
    const reason = source.slice(0, statement.getStart(tree))
      .match(/(?:^|\n)[ \t]*\/\/ public-action:[ \t]*(\S[^\r\n]*)\r?\n[ \t]*$/)?.[1]
    results.push({
      name,
      line: tree.getLineAndCharacterOfPosition(fn.getStart(tree)).line + 1,
      ok: !!reason || (!!fn.body && hasAuth(fn.body)),
      reason,
    })
  }
  if (moduleAction) {
    for (const statement of tree.statements) {
      if (!statement.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
        if (ts.isExportDeclaration(statement) && !statement.isTypeOnly
          && !(statement.exportClause && ts.isNamedExports(statement.exportClause)
            && statement.exportClause.elements.every(e => e.isTypeOnly))) {
          throw new Error('Unsupported action re-export; inspect the exported function directly')
        }
        if (ts.isExportAssignment(statement)) throw new Error('Unsupported action export assignment')
        continue
      }
      if (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)) continue
      if (ts.isFunctionDeclaration(statement)) {
        inspect(statement, statement, statement.name?.text ?? 'default')
      } else if (ts.isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) {
          const fn = declaration.initializer
          if (!fn || !(ts.isArrowFunction(fn) || ts.isFunctionExpression(fn))) {
            throw new Error('Unsupported action export ' + declaration.name.getText(tree))
          }
          inspect(fn, statement, declaration.name.getText(tree))
        }
      } else throw new Error('Unsupported action export')
    }
  }
  function visit(node) {
    if (ts.isFunctionLike(node) && node.body && hasServerDirective(node.body) && !inspected.has(node)) {
      inspect(node, node, node.name?.getText(tree) ?? 'inline')
    }
    ts.forEachChild(node, visit)
  }
  visit(tree)
  return results
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let passed = 0, failed = 0
  for (const file of files(path.join(root, 'src'))) {
    const relative = path.relative(root, file).replaceAll('\\', '/')
    try {
      for (const result of checkSource(fs.readFileSync(file, 'utf8'), file)) {
        const label = relative + ':' + result.line + ' ' + result.name
        if (result.ok) {
          passed++
          console.log('PASS ' + label + (result.reason ? ' (public: ' + result.reason + ')' : ''))
        } else {
          failed++
          console.error('FAIL ' + label + ': missing getUser()/assertAdmin()/requireAdmin()')
        }
      }
    } catch (error) {
      failed++
      console.error('FAIL ' + relative + ': ' + error.message)
    }
  }
  console.log(`server-action-auth: PASS ${passed} / FAIL ${failed}`)
  process.exitCode = failed ? 1 : 0
}
