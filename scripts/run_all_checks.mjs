// 검사 사슬 전체를 순서대로 돌리고 결과만 모아 보여 준다.
//   node scripts/run_all_checks.mjs            (전부)
//   SKIP=exam-flow,vitals node scripts/run_all_checks.mjs
import { execSync } from 'node:child_process'
import fs from 'node:fs'
const scripts = Object.keys(JSON.parse(fs.readFileSync('package.json', 'utf-8')).scripts)
  .filter(k => k.startsWith('check:'))
const skip = new Set((process.env.SKIP ?? '').split(',').filter(Boolean))
const out = []
for (const name of scripts) {
  const short = name.slice(6)
  if (skip.has(short)) { out.push(['SKIP', short, '']); continue }
  const t0 = Date.now()
  try {
    // autosave·resume은 '방금 빌드한 로컬 서버'가 전제다(기본 포트가 다른 프로젝트를 가리킨다)
    const env = { ...process.env, AUTOSAVE_BASE: 'http://localhost:3399', RESUME_BASE: 'http://localhost:3399', VITALS_BASE: 'http://localhost:3399', VITALS_BASE: 'http://localhost:3399' }
    execSync(`npm run --silent ${name}`, { stdio: 'pipe', timeout: 1_800_000, env })
    out.push(['○', short, `${((Date.now() - t0) / 1000).toFixed(0)}s`])
  } catch (e) {
    const tail = String(e.stdout ?? '').split('\n').filter(Boolean).slice(-3).join(' | ').slice(0, 160)
    out.push(['×', short, tail])
  }
  console.log(out[out.length - 1].join(' '))
}
const fails = out.filter(r => r[0] === '×')
console.log(`\n통과 ${out.filter(r => r[0] === '○').length} / 실패 ${fails.length} / 건너뜀 ${out.filter(r => r[0] === 'SKIP').length}`)
process.exit(fails.length ? 1 : 0)
