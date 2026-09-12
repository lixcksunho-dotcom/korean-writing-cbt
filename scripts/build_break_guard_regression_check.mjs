import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export async function runRegression(checkProject) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kptest-build-guards-'))
  const expected = []
  const write = (file, text) => {
    const destination = path.join(root, file)
    fs.mkdirSync(path.dirname(destination), { recursive: true })
    fs.writeFileSync(destination, text)
  }
  const fixture = (file, text, rule, pass) => {
    write(file, text)
    expected.push({ file, rule, pass })
  }
  try {
    write('tsconfig.json', JSON.stringify({ compilerOptions: { target: 'ESNext', module: 'ESNext', moduleResolution: 'Bundler', jsx: 'preserve', paths: { '@/*': ['./src/*'], '~/*': ['./src/*'] } }, include: ['src/**/*'] }))
    fixture('src/actions-good.ts', `'use server'; export interface I { x: string }; export type T = string; export async function f() {}; export const g = async () => {}; const h = async function() {}; export { h }; export default async () => {};`, 'a', true)
    fixture('src/action-prologue.ts', `'use strict'; 'use server'; export const value = 1`, 'a', false)
    fixture('src/client-prologue.tsx', `'use strict'; 'use client'; import 'next/headers'`, 'b', false)
    fixture('src/action-default-function.ts', `'use server'; export default async function () {}; const a = (async () => {}) satisfies Function; export { a as b }`, 'a', true)
    fixture('src/client-next-dynamic.tsx', `'use client'; import dynamic from 'next/dynamic'; const C = dynamic(() => import('./lib/server'))`, 'b', false)
    for (const [name, text] of Object.entries({ constant: 'export const x = 1', sync: 'export function f() {}', promise: 'export const f = () => Promise.resolve(1)', alias: 'const x = 1; export { x }', default: 'export default 3', mixed: 'export const f = async () => {}, x = 1', star: 'export * from "./values"', named: 'export { value as renamed } from "./values"', enum: 'export enum E { A }' })) fixture(`src/action-${name}.ts`, `'use server'; ${text}`, 'a', false)
    write('src/values.ts', 'export const value = 1; export interface I {}')
    fixture('src/action-types.ts', `'use server'; export type { value } from './values'; export { type I } from './values';`, 'a', true)
    fixture('src/action-type-star.ts', `'use server'; export type * from './values'`, 'a', true)
    fixture('src/client-empty-import.tsx', `'use client'; import {} from 'server-only'`, 'b', false)
    fixture('src/client-empty-export.tsx', `'use client'; export {} from 'server-only'`, 'b', false)
    fixture('src/action-reexport.ts', `'use server'; export { f } from './actions-good'`, 'a', true)
    write('src/lib/supabase/admin.ts', 'export const admin = process.env.SUPABASE_SERVICE_ROLE_KEY')
    write('src/lib/antiSharing.ts', 'export const x = 1')
    write('src/lib/server.ts', 'import "server-only"; export const x = 1')
    write('src/barrel.ts', 'export * from "./lib/server"')
    write('src/cycle-a.ts', 'import "./cycle-b"')
    write('src/cycle-b.ts', 'import "./cycle-a"; import "next/headers"')
    for (const [name, text] of Object.entries({ headers: 'import "next/headers"', admin: 'import "@/lib/supabase/admin"', relative: 'import "./lib/supabase/admin"', alternate: 'import "~/lib/supabase/admin"', barrel: 'import "./barrel"', cycle: 'import "./cycle-a"', dynamic: 'import("next/headers")', require: 'require("server-only")', secret: 'const key = process.env.SUPABASE_SERVICE_ROLE_KEY', literal: 'const key = "SUPABASE_SERVICE_ROLE_KEY"', anti: 'import "./lib/antiSharing"', equals: 'import x = require("server-only")' })) fixture(`src/client-${name}.tsx`, `'use client'; ${text}`, 'b', false)
    fixture('src/client-good.tsx', `'use client'; import type { admin } from '@/lib/supabase/admin'; import { type x } from './lib/server'; export type { x } from './lib/server'; import { f } from './actions-good'; const text = "import 'next/headers'"; // SUPABASE_SERVICE_ROLE_KEY\nexport const C = () => <div>{text}</div>`, 'b', true)
    fixture('src/client-empty.tsx', `'use client'; import './empty'`, 'b', true)
    write('src/empty.ts', '')
    write('src/clean-cycle-a.ts', 'import "./clean-cycle-b"')
    write('src/clean-cycle-b.ts', 'import "./clean-cycle-a"')
    fixture('src/client-cycle-good.tsx', `'use client'; import './clean-cycle-a'`, 'b', true)
    const staticParams = 'export async function generateStaticParams() { return [] };'
    for (const [name, suffix, pass] of [
      ['missing', '', false], ['true', 'export const dynamicParams = true', false],
      ['local', 'const dynamicParams = false', false], ['let', 'export let dynamicParams = false', false],
      ['false', 'export const dynamicParams = false', true], ['exception', '// dynamic-params-ok: 요청 시 생성이 필요함', true],
      ['empty-reason', '// dynamic-params-ok:   ', false], ['fake-comment', 'const text = "// dynamic-params-ok: fake"', false],
    ]) fixture(`src/app/${name}/[slug]/page.tsx`, staticParams + '\n' + suffix, 'c', pass)
    fixture('src/app/nested/[id]/detail/page.tsx', staticParams, 'c', false)
    fixture('src/app/catch/[...path]/page.tsx', staticParams + 'export const dynamicParams = false', 'c', true)
    fixture('src/app/alias/[[...id]]/page.tsx', 'const f = () => []; export { f as generateStaticParams }', 'c', false)
    write('src/app/live/[id]/page.tsx', 'export default function Page() {}')
    write('src/app/static/page.tsx', staticParams)
    const results = checkProject(root)
    assert.equal(results.length, expected.length, '검사 대상 파일 수')
    for (const entry of expected) {
      const actual = results.find(r => r.file === entry.file && r.rule === entry.rule)
      assert.ok(actual, `${entry.file}: 규칙 ${entry.rule} 누락`)
      assert.equal(actual.pass, entry.pass, `${entry.file}: 규칙 ${entry.rule}: ${actual.issues.join('; ')}`)
    }
    console.log(`build-guards regression: PASS ${expected.length} / FAIL 0`)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
}
