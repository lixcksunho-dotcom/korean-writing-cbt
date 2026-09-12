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
eq(ok('export const PUT = (async () => { await auth.getUser() }) satisfies Handler'), true)
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
  // 두 감사 cron은 기존 운영 호출자와 함께 전환하기 전까지 미설정 시 열려 있다.
  eq(denied(''), name === 'subscriber-report')
  eq(denied('Bearer '), name === 'subscriber-report')
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
  const context = vm.createContext({ Request, Response, TextDecoder, console, MAX: 200, MAX_PATH: 512,
    EVENT_NAME: /^[a-z0-9_]{1,40}$/, DEDUPE_MS: 3600000,
    createAdminClient: () => query,
    createClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }),
    recordOperatorAlert: async () => { effects++ },
    judgeFeedback: raw => ({ ok: typeof raw === 'string', message: raw, truncated: false }),
    normalizeContact: () => null,
  })
  vm.runInContext(ts.transpile(fs.readFileSync('src/lib/boundedRequestText.ts', 'utf8').replace('export ', '')), context)
  vm.runInContext(code, context)
  for (const body of ['null', '[]', '42', '"text"', '{', JSON.stringify({ extra: 'x'.repeat(16384) })]) {
    const result = await context.POST(new Request('https://local.test', { method: 'POST', body }))
    eq(result.status, name === 'feedback' ? 400 : 204)
    eq(effects, 0)
  }
  const result = await context.POST({ headers: new Headers({ 'content-length': '16385' }), text() { throw new Error('must not read') } })
  eq(result.status, name === 'feedback' ? 400 : 204)
  eq(effects, 0)
  const beforeOversize = effects
  const bom = '\uFEFF' + JSON.stringify({ path: '/', message: 'hello' }).padEnd(16384)
  eq((await context.POST(new Request('https://local.test', { method: 'POST', body: bom }))).status, name === 'feedback' ? 400 : 204)
  eq(effects, beforeOversize)
  let pulls = 0, cancelled = false
  const stream = new ReadableStream({
    pull(controller) { pulls++; controller.enqueue(new Uint8Array(8192)); if (pulls === 20) controller.close() },
    cancel() { cancelled = true },
  }, { highWaterMark: 0 })
  eq((await context.POST(new Request('https://local.test', { method: 'POST', body: stream, duplex: 'half', headers: { 'content-length': '1' } }))).status, name === 'feedback' ? 400 : 204)
  eq(cancelled, true)
  eq(pulls, 3)
  eq(effects, beforeOversize)
  for (const length of [16383, 16384, 16385]) {
    for (const contentLength of [null, '1']) {
      const base = JSON.stringify({ path: '/', message: 'hello', digest: 'test', extra: '한'.repeat(5000) })
      const body = base + ' '.repeat(length - Buffer.byteLength(base))
      const before = effects
      const headers = contentLength ? { 'content-length': contentLength } : {}
      const result = await context.POST(new Request('https://local.test', { method: 'POST', body, headers }))
      eq(result.status, name === 'feedback' ? length > 16384 ? 400 : 200 : 204)
      eq(effects > before, length <= 16384)
    }
  }
  const valid = JSON.stringify({ path: '/', message: 'hello', digest: 'test' })
  eq((await context.POST(new Request('https://local.test', { method: 'POST', body: valid }))).status, name === 'feedback' ? 200 : 204)
  eq(effects > 0, true)
  if (name === 'track') {
    for (const payload of [
      { event: 'quiz_try', meta: '한'.repeat(512), visitorId: 'a'.repeat(36), sessionId: 'b'.repeat(36) },
      { event: 'feedback_sent', meta: null, visitorId: 'anon', sessionId: 'anon' },
      { path: '/' + 'a'.repeat(511), referrer: 'https://local.test/' + 'a'.repeat(512), visitorId: 'a'.repeat(36), sessionId: 'b'.repeat(36) },
    ]) {
      const before = effects
      eq((await context.POST(new Request('https://local.test', { method: 'POST', body: JSON.stringify(payload) }))).status, 204)
      eq(effects, before + 1)
    }
  }
}
console.log(`api-route-regression: PASS ${passed} / FAIL 0`)
