import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const runner = fileURLToPath(new URL('./codex_loop_runner.mjs', import.meta.url))
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-loop-check-'))
const started = performance.now()
let passed = 0
let failed = 0
const env = { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: path.join(root, 'gitconfig'), GIT_TERMINAL_PROMPT: '0' }
fs.writeFileSync(env.GIT_CONFIG_GLOBAL, '')
const fake = path.join(root, 'fake-codex.mjs')
fs.writeFileSync(fake, `
import fs from 'node:fs'
import { spawn } from 'node:child_process'
let prompt = ''
for await (const chunk of process.stdin) prompt += chunk
const args = process.argv.slice(2)
if (args.includes('approval_policy') || !args.includes('--sandbox') || args.at(-1) !== '-') process.exit(8)
const config = JSON.parse(fs.readFileSync('logs/fake.json', 'utf8'))
const countFile = 'logs/calls.json'
const calls = fs.existsSync(countFile) ? JSON.parse(fs.readFileSync(countFile, 'utf8')) : []
calls.push(prompt)
fs.writeFileSync(countFile, JSON.stringify(calls))
console.log(JSON.stringify({ type: 'fake', call: calls.length }))
console.error('fake stderr')
const last = args[args.indexOf('--output-last-message') + 1]
if (config.mode === 'mutate-review') {
  fs.writeFileSync('REVIEW.md', 'reviewer changed existing untracked content')
  fs.writeFileSync(last, 'PASS')
} else if (config.mode === 'pass' || config.mode === 'fail' || config.mode === 'invalid') {
  fs.writeFileSync(last, config.mode === 'pass' ? 'PASS\\n확인 완료' : config.mode === 'fail' ? 'FAIL\\n무엇이: 결과 오류\\n왜: 요구사항 불충족\\n어떻게: 결과 수정' : '판정 불명')
} else {
  fs.writeFileSync('result.txt', 'worker result ' + calls.length)
  if (config.mode === 'timeout') {
    // Linux에서 검증용 손자 프로세스가 고아로 남지 않게 실제 종료 대상만 만든다.
    const pid = process.platform === 'win32'
      ? spawn(process.execPath, ['-e', "setInterval(() => require('fs').appendFileSync('logs/heartbeat', '.'), 40)"], { stdio: 'ignore', windowsHide: true }).pid
      : process.pid
    fs.appendFileSync('logs/pids', pid + '\\n')
    setInterval(() => {}, 1000)
  } else {
    const done = config.mode !== 'incomplete' && (config.mode !== 'retry' || calls.length > 1)
    fs.writeFileSync(last, done ? '커밋 메시지 제안: feat(fake): 워커 결과\\nWORKER_DONE' : '아직 작업 중')
  }
}
`)
function git(cwd, ...args) {
  const result = spawnSync('git', ['-c', 'user.name=fixture', '-c', 'user.email=fixture@example.invalid', ...args], { cwd, env, encoding: 'utf8', windowsHide: true })
  assert.equal(result.status, 0, result.stderr)
  return result.stdout.trim()
}
const template = path.join(root, 'template')
function fixture(name) {
  const cwd = path.join(root, name)
  if (fs.existsSync(template)) {
    fs.cpSync(template, cwd, { recursive: true })
    return cwd
  }
  fs.mkdirSync(cwd)
  git(cwd, 'init', '-b', 'main')
  fs.writeFileSync(path.join(cwd, '.gitignore'), 'logs/\n')
  fs.writeFileSync(path.join(cwd, 'BACKLOG.md'), '- [ ] ⏸️ 보류 작업\n- [ ] 실행기 검증 항목\n- [ ] 다음 작업\n')
  fs.writeFileSync(path.join(cwd, 'REPORT.md'), '# REPORT\n\n## 마지막 절\n검증 근거\n')
  git(cwd, 'add', '-A')
  git(cwd, 'commit', '-m', 'fixture')
  fs.mkdirSync(path.join(cwd, 'logs'))
  fs.cpSync(cwd, template, { recursive: true })
  return cwd
}
function run(cwd, role, mode, extra = {}) {
  fs.writeFileSync(path.join(cwd, 'logs/fake.json'), JSON.stringify({ mode }))
  const result = spawnSync(process.execPath, [runner, role], { cwd, env: { ...env, CODEX_LOOP_FAKE: fake, CODEX_LOOP_MINUTES: '0.5', ...extra }, encoding: 'utf8', windowsHide: true, timeout: 25_000 })
  assert.ifError(result.error)
  return result
}
const read = (cwd, file) => fs.readFileSync(path.join(cwd, file), 'utf8')
const calls = cwd => JSON.parse(read(cwd, 'logs/calls.json'))
const branch = cwd => git(cwd, 'for-each-ref', '--format=%(refname:short)', 'refs/heads/work/')
function check(name, fn) {
  if (process.env.LOOP_CHECK_FILTER && !name.includes(process.env.LOOP_CHECK_FILTER)) return
  const start = performance.now()
  try { fn(); passed++; console.log(`PASS ${name}`) }
  catch (error) { failed++; console.error(`FAIL ${name}: ${error.message}`) }
  finally { if (process.env.LOOP_CHECK_TIMING === '1') console.log(`TIMING ${name}: ${((performance.now() - start) / 1000).toFixed(2)}s`) }
}
try {
  check('review-2: staged logs와 일반 변경은 실행 전 보존·차단', () => {
    const cwd = fixture('dirty-review-2')
    fs.writeFileSync(path.join(cwd, 'logs/private.txt'), 'unrelated staged data')
    git(cwd, 'add', '-f', 'logs/private.txt')
    const head = git(cwd, 'rev-parse', 'HEAD')
    assert.equal(run(cwd, 'worker', 'done').status, 1)
    assert.equal(git(cwd, 'rev-parse', 'HEAD'), head)
    assert.equal(branch(cwd), '')
    assert(!fs.existsSync(path.join(cwd, 'logs/calls.json')))
    assert.match(git(cwd, 'diff', '--cached'), /unrelated staged data/)
  })
  check('review-2: 빈 diff PASS는 BACKLOG를 완료시키지 않는다', () => {
    const cwd = fixture('empty-review-2')
    git(cwd, 'branch', 'work/empty')
    fs.writeFileSync(path.join(cwd, 'logs/loop-tasks.json'), JSON.stringify({ 'work/empty': { item: '실행기 검증 항목', complete: true } }))
    run(cwd, 'reviewer', 'pass')
    assert.equal(branch(cwd), 'work/empty')
    assert(!read(cwd, 'BACKLOG.md').includes('- [x]'))
    assert.match(read(cwd, 'REVIEW.md'), /diff/)
  })
  check('review-2: 미완료 반려 수정 뒤에도 REVIEW 우선순위 유지', () => {
    const cwd = fixture('incomplete-review-2')
    git(cwd, 'branch', 'work/rework')
    fs.writeFileSync(path.join(cwd, 'REVIEW.md'), '브랜치: work/rework\n\n기존 작업 수정\n')
    fs.writeFileSync(path.join(cwd, 'logs/loop-tasks.json'), JSON.stringify({ 'work/rework': { item: '실행기 검증 항목' } }))
    const result = run(cwd, 'worker', 'incomplete')
    assert.equal(result.status, 1)
    assert.equal(git(cwd, 'branch', '--show-current'), 'main', result.stderr)
    assert.match(read(cwd, 'REVIEW.md'), /기존 작업 수정/)
    const resumed = run(cwd, 'worker', 'done')
    assert.equal(resumed.status, 0, resumed.stderr)
    assert.equal(branch(cwd), 'work/rework')
    assert.match(calls(cwd).at(-1), /REVIEW.md 반영:/)
  })
  check('review-2: 같은 status의 REVIEW 내용 변경도 자동 병합 차단', () => {
    const cwd = fixture('review-mutation')
    assert.equal(run(cwd, 'worker', 'done').status, 0)
    fs.writeFileSync(path.join(cwd, 'REVIEW.md'), 'pending review')
    const result = run(cwd, 'reviewer', 'mutate-review')
    assert.equal(result.status, 1, result.stderr)
    assert.notEqual(branch(cwd), '')
    assert.match(read(cwd, 'REVIEW.md'), /reviewer changed/)
  })
  check('review-2: 잔존 lock은 호출·변경 없이 거부하고 보존', () => {
    const cwd = fixture('stale-lock')
    fs.writeFileSync(path.join(cwd, 'logs/codex-loop.lock'), '99999999')
    assert.equal(run(cwd, 'worker', 'done').status, 1)
    assert.equal(read(cwd, 'logs/codex-loop.lock'), '99999999')
    assert(!fs.existsSync(path.join(cwd, 'logs/calls.json')))
  })
  check('review-2: main checkout 실패는 work 결과를 보존하고 병합하지 않는다', () => {
    const cwd = fixture('checkout-fail')
    assert.equal(run(cwd, 'worker', 'done').status, 0)
    const work = branch(cwd)
    git(cwd, 'checkout', work)
    git(cwd, 'worktree', 'add', path.join(root, 'occupied-main'), 'main')
    const main = git(cwd, 'rev-parse', 'main')
    const result = run(cwd, 'reviewer', 'pass')
    assert.equal(result.status, 1, result.stderr)
    assert.equal(git(cwd, 'branch', '--show-current'), work)
    assert.equal(git(cwd, 'rev-parse', 'main'), main)
    assert.equal(read(cwd, 'result.txt'), 'worker result 1')
    assert(!fs.existsSync(path.join(cwd, 'logs/codex-loop.lock')))
  })
  check('review-2: BACKLOG 앞 40자 중복은 완료 표시 없이 반려', () => {
    const cwd = fixture('prefix-collision')
    const prefix = 'a'.repeat(40)
    fs.writeFileSync(path.join(cwd, 'BACKLOG.md'), `- [ ] ${prefix} one\n- [ ] ${prefix} two\n`)
    git(cwd, 'add', 'BACKLOG.md')
    git(cwd, 'commit', '-m', 'backlog collision')
    assert.equal(run(cwd, 'worker', 'done').status, 0)
    assert.equal(run(cwd, 'reviewer', 'pass').status, 0)
    assert.match(read(cwd, 'REVIEW.md'), /40자/)
    assert(!read(cwd, 'BACKLOG.md').includes('- [x]'))
  })
  check('워커 브랜치·커밋·WORKER_DONE·로그·보류 건너뜀', () => {
    const cwd = fixture('worker')
    const r = run(cwd, 'worker', 'done')
    assert.equal(r.status, 0, r.stderr)
    assert.match(r.stdout, /WORKER_DONE/)
    assert.equal(git(cwd, 'branch', '--show-current'), 'main')
    const work = branch(cwd)
    assert.equal(git(cwd, 'show', `${work}:result.txt`), 'worker result 1')
    assert.equal(git(cwd, 'log', '-1', '--format=%s', work), 'feat(fake): 워커 결과')
    assert.equal(git(cwd, 'log', '-1', '--format=%an <%ae>', work), '선호 <sunho980101@gmail.com>')
    assert.equal(calls(cwd).length, 1)
    assert.match(calls(cwd)[0], /BACKLOG.md 항목:\n실행기 검증 항목/)
    assert(!git(cwd, 'ls-tree', '-r', '--name-only', work).includes('logs/'))
    assert(fs.readdirSync(path.join(cwd, 'logs')).some(file => file.endsWith('.events')))
    assert(fs.readdirSync(path.join(cwd, 'logs')).some(file => file.endsWith('.err')))
  })
  check('이어서 1회·첫 결과 wip 보관', () => {
    const cwd = fixture('retry')
    const r = run(cwd, 'worker', 'retry')
    assert.equal(r.status, 0, r.stderr)
    assert.equal(calls(cwd).length, 2)
    assert.match(calls(cwd)[1], /이어서: 이전 변경은 wip 커밋/)
    const work = branch(cwd)
    assert.match(git(cwd, 'log', '--format=%s', `main..${work}`), /wip\(/)
    assert.equal(git(cwd, 'rev-list', '--count', `main..${work}`), '2')
  })
  check('미완료 무한 재실행 방지', () => {
    const cwd = fixture('incomplete')
    assert.equal(run(cwd, 'worker', 'incomplete').status, 1)
    assert.equal(calls(cwd).length, 2)
    assert.equal(git(cwd, 'branch', '--show-current'), 'main')
  })
  check('PASS 병합·BACKLOG 완료·REPORT·브랜치 삭제', () => {
    const cwd = fixture('pass')
    assert.equal(run(cwd, 'worker', 'done').status, 0)
    const r = run(cwd, 'reviewer', 'pass')
    assert.equal(r.status, 0, r.stderr)
    assert.match(r.stdout, /PASS work\//)
    assert.equal(branch(cwd), '')
    assert.match(read(cwd, 'BACKLOG.md'), /- \[x\] 실행기 검증 항목/)
    assert.match(read(cwd, 'REPORT.md'), /검수 통과 — work\//)
    assert.equal(git(cwd, 'rev-list', '--count', '--merges', 'main'), '1')
    assert.equal(git(cwd, 'status', '--short'), '')
    assert.match(calls(cwd)[1], /diff:[\s\S]*result.txt[\s\S]*REPORT 끝 절:/)
  })
  check('FAIL 3회·반려 이력·NEED_HUMAN', () => {
    const cwd = fixture('fail')
    assert.equal(run(cwd, 'worker', 'done').status, 0)
    const work = branch(cwd)
    for (let i = 0; i < 3; i++) assert.equal(run(cwd, 'reviewer', 'fail').status, 0)
    assert.equal(JSON.parse(read(cwd, 'logs/review-count.json'))[work].length, 3)
    assert.match(read(cwd, 'NEED_HUMAN.md'), /3회 반려/)
    assert.match(read(cwd, 'REVIEW.md'), /어떻게: 결과 수정/)
    assert.equal(branch(cwd), work)
  })
  check('반려 워커는 같은 브랜치 수정·REVIEW 삭제 포함', () => {
    const cwd = fixture('rework')
    assert.equal(run(cwd, 'worker', 'done').status, 0)
    const work = branch(cwd)
    assert.equal(run(cwd, 'reviewer', 'fail').status, 0)
    assert.equal(run(cwd, 'worker', 'done').status, 0)
    assert.equal(branch(cwd), work)
    assert(!fs.existsSync(path.join(cwd, 'REVIEW.md')))
    assert.match(calls(cwd).at(-1), /REVIEW.md 반영:/)
    assert.equal(run(cwd, 'reviewer', 'pass').status, 0)
    assert.equal(branch(cwd), '')
  })
  check('NEED_HUMAN이면 두 역할 즉시 종료', () => {
    const cwd = fixture('human')
    fs.writeFileSync(path.join(cwd, 'NEED_HUMAN.md'), '확인 필요')
    for (const role of ['worker', 'reviewer']) {
      const r = run(cwd, role, 'done', { CODEX_LOOP_FAKE: path.join(root, 'does-not-exist.mjs') })
      assert.equal(r.status, 0, r.stderr)
      assert.equal(r.stdout.trim(), '사람 확인 대기 중')
    }
    assert(!fs.existsSync(path.join(cwd, 'logs/calls.json')))
    assert.equal(branch(cwd), '')
  })
  check('타임아웃 프로세스 트리 종료·wip 보관', () => {
    const cwd = fixture('timeout')
    const r = run(cwd, 'worker', 'timeout', { CODEX_LOOP_MINUTES: '0.02' })
    assert.equal(r.status, 1, r.stderr)
    assert.match(r.stderr, /TIMEOUT/)
    assert.equal(calls(cwd).length, 2)
    const work = branch(cwd)
    assert.match(git(cwd, 'log', '-1', '--format=%s', work), /^wip\(/)
    assert.equal(git(cwd, 'show', `${work}:result.txt`), 'worker result 2')
    for (const pid of read(cwd, 'logs/pids').trim().split('\n').map(Number)) {
      assert.throws(() => process.kill(pid, 0), /ESRCH/)
    }
    assert.equal(git(cwd, 'branch', '--show-current'), 'main')
  })
  check('병합 충돌 abort·파일명 반려 기록', () => {
    const cwd = fixture('conflict')
    assert.equal(run(cwd, 'worker', 'done').status, 0)
    fs.writeFileSync(path.join(cwd, 'result.txt'), 'main conflict')
    git(cwd, 'add', '-A')
    git(cwd, 'commit', '-m', 'conflict')
    const head = git(cwd, 'rev-parse', 'HEAD')
    assert.equal(run(cwd, 'reviewer', 'pass').status, 0)
    assert.match(read(cwd, 'REVIEW.md'), /충돌: result.txt/)
    assert.equal(git(cwd, 'rev-parse', 'HEAD'), head)
    assert.equal(read(cwd, 'result.txt'), 'main conflict')
    assert(!fs.existsSync(path.join(cwd, '.git/MERGE_HEAD')))
  })
} finally {
  // 검사에서 만든 임시 저장소만 지워 사용자 저장소를 보호한다.
  if (path.dirname(root) !== path.resolve(os.tmpdir()) || !path.basename(root).startsWith('codex-loop-check-')) throw new Error('임시 경로 검증 실패')
  fs.rmSync(root, { recursive: true, force: true })
}
if (process.env.LOOP_CHECK_TIMING === '1') console.log(`TIMING total: ${((performance.now() - started) / 1000).toFixed(2)}s`)
console.log(`loop-runner: PASS ${passed} / FAIL ${failed}`)
process.exitCode = failed ? 1 : 0
