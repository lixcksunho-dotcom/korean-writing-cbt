import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { checkSource as auth } from './server_action_auth_check.mjs'
import { checkSource as writes } from './supabase_write_result_check.mjs'
import { checkSource as limits } from './limits_copy_check.mjs'

let passed = 0
function check(name, run) {
  run()
  passed++
  console.log('PASS ' + name)
}

const authCases = [
  ['missing auth', 'export async function action() { return 1 }', [false]],
  ['authenticated function', 'export async function action() { await assertAdmin() }', [true]],
  ['arrow expression', 'export const action = async () => assertAdmin()', [true]],
  ['single arrow parameter', 'export const action = async input => input', [false]],
  ['multiple exports in one declaration', 'export const safe = async () => { await assertAdmin() }, unsafe = async () => { return 1 }', [true, false]],
  ['nested auth is not executed', 'export async function action() { const unused = () => assertAdmin(); return 1 }', [false]],
  ['method definition is not a call', 'export async function action() { const obj = { getUser() {} }; return obj }', [false]],
  ['fake auth string', 'export async function action() { return "getUser()" }', [false]],
  ['fake auth comment', 'export async function action() { /* assertAdmin() */ return 1 }', [false]],
  ['division does not hide auth', 'export async function action() { const x = 1 / 2; await assertAdmin(); return x / 3 }', [true]],
  ['template auth executes', 'export async function action() { return `${await assertAdmin()}` }', [true]],
  ['typed arrow return', 'export const action = async (): Promise<{ ok: boolean }> => { await assertAdmin(); return {ok:true} }', [true]],
  ['documented public action', '// public-action: clock only\nexport async function clock() { return Date.now() }', [true]],
]
for (const [name, source, expected] of authCases) {
  check(name, () => assert.deepEqual(auth('"use server";\n' + source).map(r => r.ok), expected))
}
check('inline action is inspected', () => assert.deepEqual(auth('function Page() { async function action() { "use server"; return 1 } }').map(r => r.ok), [false]))
check('ordinary use server string is not a directive', () => assert.deepEqual(auth('const label = "use server"; export const value = 1'), []))
check('unsupported export fails closed', () => assert.throws(() => auth('"use server"; export { action } from "./other"')))

const writeCases = [
  ['unreceived direct write', "await db.from('t').insert({})", [false]],
  ['error alias received', "const { data, error: writeError } = await db.from('t').insert({}).select('id').single()", [true]],
  ['nested data.error is insufficient', "const { data: { error } } = await db.from('t').insert({})", [false]],
  ['result forwarded', "async function f() { return db.from('t').insert({}) }", [true]],
  ['then receiver', "db.from('t').insert({}).then(({error}) => log(error))", [true]],
  ['division cannot swallow a write', "const half = count / 2; await db.from('t').insert({}); const ratio = count / 3;", [false]],
  ['template interpolation executes a write', 'const label = `${await db.from("t").insert({})}`', [false]],
  ['plain template is inert', 'const label = `await db.from("t").insert({})`', []],
  ['comment is inert', "// await db.from('t').insert({})", []],
  ['regex is inert', 'const pattern = /db.insert()/g', []],
  ['Promise.all without receiving', "await Promise.all([db.from('t').insert({})])", [false]],
  ['Promise.all error received', "const [{ error }] = await Promise.all([db.from('t').insert({})])", [true]],
  ['Promise.all positions checked separately', "const [{ error }, { data }] = await Promise.all([db.from('t').insert({}), db.from('t').update({})])", [true, false]],
  ['Promise.all skipped slot', "const [, { error }] = await Promise.all([db.from('t').insert({}), db.from('t').update({})])", [false, true]],
  ['auth admin write', 'await admin.auth.admin.createUser({})', [false]],
  ['computed method write', "await db.from('t')['insert']({})", [false]],
  ['local DOM exemption', '// write-result-ignored: DOM operation\ndocument.body.classList.remove("x")', [true]],
  ['fake exemption inside string', 'const s = "// write-result-ignored: fake";\nawait db.from("t").insert({})', [false]],
]
for (const [name, source, expected] of writeCases) {
  check(name, () => assert.deepEqual(writes(source).map(r => r.ok), expected))
}

for (const [name, source, expected] of [
  ['split multiline template mismatch', 'const label = `AI 첨삭 ${name}\n하루 99회까지`', [false]],
  ['split multiline template correct', 'const label = `AI 첨삭 ${name}\n하루 30회까지`', [true]],
  ['multiline plain template mismatch', 'const label = `AI 첨삭\n하루 99회까지`', [false]],
  ['ordinary literal mismatch', 'const label = "AI 첨삭 하루 99회"', [false]],
  ['JSX child context', 'const el = <p>AI 첨삭 <b>하루 99회</b></p>', [false]],
  ['payment copy excluded', 'const label = "1회 결제"', []],
  ['copy comment excluded', '// AI 첨삭 하루 99회', []],
]) {
  check(name, () => assert.deepEqual(limits(source).map(r => r.ok), expected))
}

// 실제 페이지의 조회식을 실행하되 DB는 필터 후 1000행을 반환하는 메모리 대역이다.
function sessionQueries(file) {
  const source = fs.readFileSync(file, 'utf8')
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
  const queries = []
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
      && node.expression.name.text === 'from' && node.arguments[0]?.text === 'quiz_sessions') {
      let end = node
      while (ts.isPropertyAccessExpression(end.parent) && ts.isCallExpression(end.parent.parent)) end = end.parent.parent
      queries.push(end.getText(tree))
    }
    ts.forEachChild(node, visit)
  }
  visit(tree)
  return queries
}

function queryRows(query, rows, sessionId = 'exam') {
  const supabase = { from() {
    let selected = rows
    const builder = {
      select() { return this },
      eq(key, value) { selected = selected.filter(row => row[key] === value); return this },
      neq(key, value) { selected = selected.filter(row => row[key] !== value); return this },
      lt(key, value) { selected = selected.filter(row => row[key] < value); return this },
      not(key, operator, value) { assert.equal(operator, 'is'); return this.neq(key, value) },
      is(key, value) { return this.eq(key, value) },
      order() { return this },
      single() { return this },
      rows() { return selected.slice(0, 1000) },
    }
    return builder
  } }
  return vm.runInNewContext(query, { supabase, user: { id: 'u' }, program: 'silyong', sessionId, WRONG_NOTE_RETAKE_YEAR: 9002 }).rows()
}

const exam = { id: 'exam', user_id: 'u', program: 'silyong', year: 2026, round: 1, completed_at: '2026-09-12' }
const rows = [...Array.from({ length: 1000 }, (_, i) => ({ ...exam, id: 'retake-' + i, year: 9002 })), exam]
const listQueries = sessionQueries('src/app/(main)/cbt/page.tsx')
check('CBT completed sessions survive 1000 retakes', () => assert.deepEqual(queryRows(listQueries[0], rows).map(r => r.id), ['exam']))
check('CBT incomplete sessions survive 1000 failed retakes', () => assert.deepEqual(queryRows(listQueries[1], rows.map(r => ({ ...r, completed_at: null }))).map(r => r.id), ['exam']))
const resultQuery = sessionQueries('src/app/(main)/cbt/[examId]/result/page.tsx')[0]
check('retake ID cannot render as an exam result', () => assert.equal(queryRows(resultQuery, rows, 'retake-0').length, 0))
check('real exam result remains accessible', () => assert.equal(queryRows(resultQuery, rows).length, 1))
check('funnel filters before the API row limit', () => {
  const source = fs.readFileSync('scripts/funnel_report.py', 'utf8')
  const url = source.match(/get\("(quiz_sessions\?[^"\n]+)"\)/)?.[1]
  assert.ok(url)
  const params = new URLSearchParams(url.split('?')[1])
  assert.equal(params.get('year'), 'lt.9000')
  const result = rows.filter(r => r.year < Number(params.get('year').split('.')[1])).slice(0, Number(params.get('limit')))
  assert.deepEqual(result.map(r => r.id), ['exam'])
})

console.log(`stack-review-regressions: PASS ${passed} / FAIL 0`)
