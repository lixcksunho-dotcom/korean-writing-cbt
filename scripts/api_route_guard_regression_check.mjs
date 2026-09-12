import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { timingSafeEqual } from 'node:crypto'
import ts from 'typescript'
import { checkSource } from './api_route_guard_check.mjs'

let passed = 0
function eq(actual, expected) { assert.equal(actual, expected); passed++ }
const ok = (source, file) => checkSource(source, file).every(r => r.ok)
eq(ok('export async function POST(req: Request) { await req.json() }'), false)
eq(ok('export const PUT = async () => { await auth.getUser() }'), true)
eq(ok('export async function DELETE() { function unused() { getUser() } }'), false)
eq(ok('export async function PATCH() { const text = "getUser()" }'), false)
eq(ok('const handler = async () => {}; export { handler as POST }'), false)
eq(ok('export function GET() {}', 'src/app/api/cron/test/route.ts'), false)
eq(ok('// public-route: anonymous beacon\nexport async function POST(req: Request) { await req.json() }'), false)
eq(ok('// public-route: anonymous beacon\nexport async function POST(req: Request) { const body = await req.text(); if(body.length > 100) return }'), true)
eq(ok('// public-route: anonymous beacon\nconst unrelated = 1;\nexport async function POST() {}'), false)
assert.throws(() => checkSource('export { POST } from "./other"')); passed++

for (const name of ['blog-review-audit', 'refund-audit', 'subscriber-report']) {
  const file = `src/app/api/cron/${name}/route.ts`
  const source = fs.readFileSync(file, 'utf8')
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
  const fn = tree.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'unauthorized')
  const code = ts.transpile(fn.getText(tree))
  const env = {}
  const context = vm.createContext({ Buffer, timingSafeEqual, process: { env } })
  vm.runInContext(code, context)
  const denied = value => context.unauthorized(new Request('https://local.test', { headers: { authorization: value } }))
  eq(denied(''), true)
  eq(denied('Bearer '), true)
  env.CRON_SECRET = 'local-test-secret'
  eq(denied('Bearer local-test-secret'), false)
  eq(denied('Bearer local-test-secrex'), true)
  eq(denied('short'), true)
  eq(denied('Bearer local-test-secreé'), true)
}

for (const name of ['track', 'client-error', 'feedback']) {
  const file = `src/app/api/${name}/route.ts`
  const source = fs.readFileSync(file, 'utf8')
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
  const fn = tree.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'POST')
  const code = ts.transpile(fn.getText(tree).replace('export ', ''))
  let effects = 0
  const query = { data: [], error: null }
  for (const method of ['from', 'select', 'eq', 'gte', 'limit']) query[method] = () => query
  query.insert = () => { effects++; return query }
  const context = vm.createContext({ Request, Response, console, MAX: 200, MAX_PATH: 512,
    EVENT_NAME: /^[a-z0-9_]{1,40}$/, DEDUPE_MS: 3600000,
    createAdminClient: () => query,
    createClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }),
    recordOperatorAlert: async () => { effects++ },
    judgeFeedback: raw => ({ ok: typeof raw === 'string', message: raw, truncated: false }),
    normalizeContact: () => null,
  })
  vm.runInContext(code, context)
  for (const body of ['null', '[]', '42', '"text"', '{', JSON.stringify({ extra: 'x'.repeat(16384) })]) {
    const result = await context.POST(new Request('https://local.test', { method: 'POST', body }))
    eq(result.status, name === 'feedback' ? 400 : 204)
    eq(effects, 0)
  }
  const result = await context.POST({ headers: new Headers({ 'content-length': '16385' }), text() { throw new Error('must not read') } })
  eq(result.status, name === 'feedback' ? 400 : 204)
  eq(effects, 0)
  const valid = JSON.stringify({ path: '/', message: 'hello', digest: 'test' })
  eq((await context.POST(new Request('https://local.test', { method: 'POST', body: valid }))).status, name === 'feedback' ? 200 : 204)
  eq(effects > 0, true)
}
console.log(`api-route-regression: PASS ${passed} / FAIL 0`)
