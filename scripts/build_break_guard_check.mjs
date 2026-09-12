// (a) use server의 비동기 함수 외 값 export는 tsc를 통과해도 Next 빌드를 깨뜨린다.
// (b) 클라이언트의 서버 모듈 의존은 빌드를 깨뜨리거나 서비스 키를 번들에 노출한다.
// (c) 한글 정적 동적 라우트는 dynamicParams=false가 없으면 없는 글이 운영에서 500이 된다.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const has = (node, kind) => node.modifiers?.some(m => m.kind === kind)
const directive = tree => {
  for (const statement of tree?.statements ?? []) {
    if (!ts.isExpressionStatement(statement) || !ts.isStringLiteral(statement.expression)) break
    if (['use client', 'use server'].includes(statement.expression.text)) return statement.expression.text
  }
  return ''
}
const slash = file => file.split(path.sep).join('/')

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name)
    return entry.isDirectory() ? sourceFiles(file) : ['.ts', '.tsx'].includes(path.extname(file)) ? [file] : []
  })
}

function exception(tree) {
  let allowed = false
  function visit(node) {
    for (const range of [...ts.getLeadingCommentRanges(tree.text, node.pos) ?? [], ...ts.getTrailingCommentRanges(tree.text, node.end) ?? []]) {
      if (range.kind !== ts.SyntaxKind.SingleLineCommentTrivia) continue
      const text = tree.text.slice(range.pos + 2, range.end).trim()
      const marker = 'dynamic-params-ok:'
      if (text.startsWith(marker) && text.slice(marker.length).trim()) allowed = true
    }
    ts.forEachChild(node, visit)
  }
  visit(tree)
  return allowed
}

export function checkProject(root) {
  const configPath = path.join(root, 'tsconfig.json')
  const config = ts.readConfigFile(configPath, ts.sys.readFile)
  if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'))
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root)
  if (parsed.errors.length) throw new Error(parsed.errors.map(e => ts.flattenDiagnosticMessageText(e.messageText, '\n')).join('\n'))
  const names = sourceFiles(path.join(root, 'src'))
  const program = ts.createProgram(names, { ...parsed.options, noEmit: true })
  const checker = program.getTypeChecker()
  const results = []
  const record = (file, rule, issues) => results.push({ file: slash(path.relative(root, file)), rule, pass: issues.length === 0, issues })
  const resolve = (name, from) => ts.resolveModuleName(name, from, parsed.options, ts.sys).resolvedModule?.resolvedFileName
  function unwrap(node) {
    while (node && (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node))) node = node.expression
    return node
  }
  function target(symbol) {
    return symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol
  }
  function asyncSymbol(symbol, seen = new Set()) {
    symbol = target(symbol)
    if (seen.has(symbol)) return false
    seen.add(symbol)
    return symbol.declarations?.some(declaration => {
      let node = ts.isVariableDeclaration(declaration) ? declaration.initializer : ts.isExportAssignment(declaration) ? declaration.expression : declaration
      node = unwrap(node)
      if (node && ts.isIdentifier(node)) {
        const next = checker.getSymbolAtLocation(node)
        return next ? asyncSymbol(next, seen) : false
      }
      return node && (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) && !!node.body && has(node, ts.SyntaxKind.AsyncKeyword)
    }) ?? false
  }
  function exportsOf(tree) {
    const symbol = checker.getSymbolAtLocation(tree)
    const runtime = runtimeNames(tree)
    return symbol ? checker.getExportsOfModule(symbol).filter(s => runtime.has(s.name)) : []
  }
  function runtimeNames(tree, seen = new Set()) {
    if (!tree || seen.has(tree.fileName)) return new Set()
    seen.add(tree.fileName)
    const names = new Set()
    function binding(node) {
      if (ts.isIdentifier(node)) names.add(node.text)
      else for (const element of node.elements) if (ts.isBindingElement(element)) binding(element.name)
    }
    for (const statement of tree.statements) {
      if (ts.isExportDeclaration(statement)) {
        if (statement.isTypeOnly) continue
        if (statement.exportClause) {
          if (ts.isNamedExports(statement.exportClause)) {
            for (const element of statement.exportClause.elements) if (!element.isTypeOnly) names.add(element.name.text)
          } else names.add(statement.exportClause.name.text)
        } else if (statement.moduleSpecifier) {
          const resolved = resolve(statement.moduleSpecifier.text, tree.fileName)
          for (const name of runtimeNames(resolved && program.getSourceFile(resolved), seen)) if (name !== 'default') names.add(name)
        }
      } else if (ts.isExportAssignment(statement) || has(statement, ts.SyntaxKind.DefaultKeyword)) names.add('default')
      else if (has(statement, ts.SyntaxKind.ExportKeyword) && !ts.isInterfaceDeclaration(statement) && !ts.isTypeAliasDeclaration(statement)) {
        if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) binding(declaration.name)
        else if (statement.name) names.add(statement.name.text)
      }
    }
    return names
  }
  function typeExport(symbol) {
    return symbol.declarations?.every(d => (ts.isExportSpecifier(d) && (d.isTypeOnly || d.parent.parent.isTypeOnly)) || (ts.isExportDeclaration(d) && d.isTypeOnly)) || !(target(symbol).flags & ts.SymbolFlags.Value) && target(symbol).flags !== ts.SymbolFlags.Unknown
  }
  function dependencies(tree) {
    const imports = []
    const secrets = []
    function visit(node) {
      if (ts.isTypeNode(node)) return
      if (ts.isImportDeclaration(node)) {
        const clause = node.importClause
        if (clause?.isTypeOnly || clause && !clause.name && clause.namedBindings && ts.isNamedImports(clause.namedBindings) && clause.namedBindings.elements.length > 0 && clause.namedBindings.elements.every(e => e.isTypeOnly)) return
        imports.push(node.moduleSpecifier.text)
        return
      }
      if (ts.isExportDeclaration(node)) {
        if (node.isTypeOnly || node.exportClause && ts.isNamedExports(node.exportClause) && node.exportClause.elements.length > 0 && node.exportClause.elements.every(e => e.isTypeOnly)) return
        if (node.moduleSpecifier) imports.push(node.moduleSpecifier.text)
        return
      }
      if (ts.isImportEqualsDeclaration(node)) {
        if (!node.isTypeOnly && ts.isExternalModuleReference(node.moduleReference)) imports.push(node.moduleReference.expression.text)
        return
      }
      if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || ts.isIdentifier(node.expression) && node.expression.text === 'require') && node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) imports.push(node.arguments[0].text)
      if ((ts.isIdentifier(node) || ts.isStringLiteralLike(node)) && node.text.includes('SUPABASE_SERVICE_ROLE_KEY')) secrets.push('SUPABASE_SERVICE_ROLE_KEY')
      ts.forEachChild(node, visit)
    }
    visit(tree)
    return { imports, secrets }
  }
  function clientIssues(file) {
    const issues = new Set()
    const visited = new Set()
    function walk(current, chain) {
      if (visited.has(current)) return
      visited.add(current)
      const tree = program.getSourceFile(current)
      if (!tree) throw new Error(`Cannot read dependency: ${current}`)
      if (directive(tree) === 'use server') return
      const trail = [...chain, slash(path.relative(root, current))]
      const { imports, secrets } = dependencies(tree)
      for (const secret of secrets) issues.add(`${trail.join(' -> ')}: ${secret}`)
      for (const name of imports) {
        if (['next/headers', '@/lib/supabase/admin', 'server-only'].includes(name)) {
          issues.add(`${trail.join(' -> ')} -> ${name}`)
          continue
        }
        const resolved = resolve(name, current)
        if (!resolved || slash(resolved).split('/').includes('node_modules')) continue
        if (directive(program.getSourceFile(resolved)) === 'use server') continue
        if (['antiSharing.ts', 'antiSharing.tsx'].includes(path.basename(resolved)) || slash(resolved).endsWith('/lib/supabase/admin.ts')) issues.add(`${trail.join(' -> ')} -> ${name}`)
        else walk(resolved, trail)
      }
    }
    walk(file, [])
    return [...issues]
  }
  for (const file of names) {
    const tree = program.getSourceFile(file)
    if (tree.parseDiagnostics.length) throw new Error(`Cannot parse ${file}`)
    const exports = exportsOf(tree)
    if (directive(tree) === 'use server') {
      const issues = exports.filter(symbol => !typeExport(symbol) && !asyncSymbol(symbol)).map(symbol => `${symbol.name}: async 함수가 아닌 값 export`)
      record(file, 'a', issues)
    }
    if (directive(tree) === 'use client') record(file, 'b', clientIssues(file))
    const relative = slash(path.relative(root, file))
    if (relative.startsWith('src/app/') && relative.endsWith('/page.tsx') && relative.split('/').some(part => part.startsWith('[') && part.endsWith(']')) && exports.some(s => s.name === 'generateStaticParams' && !typeExport(s))) {
      const valid = tree.statements.some(s => ts.isVariableStatement(s) && has(s, ts.SyntaxKind.ExportKeyword) && !!(s.declarationList.flags & ts.NodeFlags.Const) && s.declarationList.declarations.some(d => ts.isIdentifier(d.name) && d.name.text === 'dynamicParams' && unwrap(d.initializer)?.kind === ts.SyntaxKind.FalseKeyword))
      record(file, 'c', valid || exception(tree) ? [] : ['generateStaticParams에 export const dynamicParams = false 또는 이유 주석 필요'])
    }
  }
  return results
}

async function main() {
  let regressionFailed = false
  if (process.argv.includes('--self-test')) {
    try {
      const { runRegression } = await import('./build_break_guard_regression_check.mjs')
      await runRegression(checkProject)
    } catch (error) {
      regressionFailed = true
      console.error(`build-guards regression: FAIL ${error.message}`)
    }
  }
  const results = checkProject(path.resolve(import.meta.dirname, '..'))
  for (const result of results.filter(r => !r.pass)) console.error(`${result.file} | ${result.rule} | ${result.issues.join('; ')}`)
  console.log(`build-guards: ${['a', 'b', 'c'].map(rule => `${rule} PASS ${results.filter(r => r.rule === rule && r.pass).length} / FAIL ${results.filter(r => r.rule === rule && !r.pass).length}`).join(' · ')} · self-test ${regressionFailed ? 'FAIL' : process.argv.includes('--self-test') ? 'PASS' : 'SKIP'}`)
  if (regressionFailed || results.some(r => !r.pass)) process.exitCode = 1
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error); process.exitCode = 1 })
