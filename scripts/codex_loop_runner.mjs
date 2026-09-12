import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawn, spawnSync } from 'node:child_process'

const role = process.argv[2]
function git(...args) {
  const r = spawnSync('git', ['-c', 'user.name=선호', '-c', 'user.email=sunho980101@gmail.com', ...args], { encoding: 'utf8', windowsHide: true, maxBuffer: 32 * 1024 * 1024 })
  if (r.error || r.status !== 0) throw new Error(r.error?.message || r.stderr || `git ${args[0]} 실패`)
  return r.stdout.trim()
}
const read = file => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''
const json = file => JSON.parse(read(file) || '{}')
const save = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n')
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-')
const branches = () => git('for-each-ref', '--sort=-committerdate', '--format=%(refname:short)', 'refs/heads/work/').split('\n').filter(Boolean)
const status = () => git('status', '--short')
function commit(message) {
  if (!status()) return
  git('add', '-A')
  git('commit', '-m', message)
}
async function runCodex(prompt) {
  const minutes = Number(process.env.CODEX_LOOP_MINUTES || 15)
  if (!Number.isFinite(minutes) || minutes <= 0) throw new Error('CODEX_LOOP_MINUTES는 양수여야 함')
  const base = path.resolve('logs', `codex-${role}-${stamp()}-${process.pid}`)
  const last = `${base}.last.txt`
  const args = ['exec', '--skip-git-repo-check', '--color', 'never', '--json', '--sandbox', 'workspace-write', '-c', 'model_reasoning_effort="medium"', '--output-last-message', last, '-']
  const fake = process.env.CODEX_LOOP_FAKE
  const executable = fake ? process.execPath : json(path.join(process.env.USERPROFILE || os.homedir(), 'ops', 'codex-runtime.json')).codexExecutable || 'codex'
  const out = fs.openSync(`${base}.events`, 'w')
  const err = fs.openSync(`${base}.err`, 'w')
  return new Promise(resolve => {
    let timedOut = false
    let failure = ''
    const child = spawn(executable, fake ? [path.resolve(fake), ...args] : args, { stdio: ['pipe', out, err], windowsHide: true, shell: false })
    fs.closeSync(out)
    fs.closeSync(err)
    child.on('error', error => { failure = error.message })
    child.stdin.on('error', error => { if (error.code !== 'EPIPE') failure = error.message })
    child.stdin.end(prompt)
    const timer = setTimeout(() => {
      timedOut = true
      if (!child.pid) return
      if (process.platform === 'win32') {
        const killed = spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, timeout: 10_000 })
        if (killed.status !== 0) child.kill('SIGKILL')
      } else {
        child.kill('SIGKILL')
      }
    }, minutes * 60_000)
    child.on('close', code => {
      clearTimeout(timer)
      if (timedOut) console.error(process.platform === 'win32' ? 'TIMEOUT — 프로세스 트리 종료' : 'TIMEOUT — 자식 프로세스 종료')
      if (failure) console.error(failure)
      resolve({ message: read(last).trim(), ok: code === 0 && !timedOut && !failure })
    })
  })
}
function reject(branch, content) {
  fs.writeFileSync('REVIEW.md', `브랜치: ${branch}\n\n${content}\n`)
  const counts = json('logs/review-count.json')
  const history = counts[branch] || []
  history.push({ date: new Date().toISOString(), review: content })
  counts[branch] = history
  save('logs/review-count.json', counts)
  if (history.length >= 3) fs.writeFileSync('NEED_HUMAN.md', `# ${branch}: ${history.length}회 반려\n\n${history.map(item => `${item.date}\n${item.review}`).join('\n\n')}\n`)
  console.log(`FAIL ${branch} (${history.length}회)`)
}
async function worker() {
  const review = read('REVIEW.md')
  const tasks = json('logs/loop-tasks.json')
  const item = read('BACKLOG.md').split(/\r?\n/).find(line => /^- \[ \] /.test(line) && !line.includes('⏸'))?.slice(6)
  if (!review && !item) { console.log('실행할 작업 없음'); return }
  const previous = review.match(/^브랜치: (work\/[^\r\n]+)$/m)?.[1]
  const existing = branches()
  if (previous && !existing.includes(previous)) throw new Error(`반려 브랜치 없음: ${previous}`)
  const slug = (item || 'review').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 48) || 'task'
  const branch = previous || (review && existing[0]) || `work/${slug}-${stamp()}`
  // 앞선 미완료 커밋에 REVIEW가 있으면 main의 미추적 복사본이 checkout을 막는다.
  const untrackedReview = review && !git('ls-files', '--', 'REVIEW.md')
  if (untrackedReview) fs.unlinkSync('REVIEW.md')
  try {
    if (existing.includes(branch)) git('checkout', branch)
    else git('checkout', '-b', branch, 'main')
  } finally {
    if (untrackedReview) fs.writeFileSync('REVIEW.md', review)
  }
  tasks[branch] ||= { item: review ? '' : item, created: new Date().toISOString() }
  save('logs/loop-tasks.json', tasks)
  const header = '커밋 금지(실행기가 한다)·네트워크 없음·pwsh(`;`, npm.cmd, npx.cmd)·스킬 문서 읽지 말 것·파일은 바로 저장·끝나면 마지막 줄 WORKER_DONE'
  const prompt = `${header}\n브랜치는 실행기가 준비했다. git 쓰기·브랜치 전환 금지. 오프라인 검사만 실행한다. REVIEW.md 삭제는 실행기가 한다. REPORT.md에 변경과 실제 검사 결과를 기록하고 마지막 메시지에 "커밋 메시지 제안: ..."을 적는다.\n\n${review ? `REVIEW.md 반영:\n${review}` : `BACKLOG.md 항목:\n${item}`}`
  let complete = false
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await runCodex(attempt ? `${prompt}\n\n이어서: 이전 변경은 wip 커밋으로 보관했다. 현재 파일과 커밋을 확인해 남은 작업을 완료하라.` : prompt)
      complete = result.ok && result.message.split(/\r?\n/).at(-1) === 'WORKER_DONE'
      if (review && complete && fs.existsSync('REVIEW.md')) fs.unlinkSync('REVIEW.md')
      const suggestion = result.message.match(/^커밋 메시지 제안\s*[:：]\s*(.+)$/m)?.[1]?.replace(/^`|`$/g, '')
      commit(complete && suggestion ? suggestion : `wip(${branch.slice(5)}): 워커 결과`)
      tasks[branch].complete = complete
      save('logs/loop-tasks.json', tasks)
      if (complete || fs.existsSync('NEED_HUMAN.md')) break
    }
  } finally {
    commit(`wip(${branch.slice(5)}): 워커 결과`)
    git('checkout', 'main')
    // 미완료 REVIEW는 work 브랜치에 커밋됐어도 다음 워커가 main에서 읽어야 한다.
    if (review && !complete) fs.writeFileSync('REVIEW.md', review)
  }
  console.log(`${complete ? 'WORKER_DONE' : 'WORKER_INCOMPLETE'} ${branch}`)
  if (!complete) process.exitCode = 1
}
async function reviewer() {
  const branch = branches()[0]
  if (!branch) { console.log('검수할 작업 없음'); return }
  const tasks = json('logs/loop-tasks.json')
  const diff = git('diff', `main...${branch}`)
  if (!diff) {
    git('checkout', 'main')
    reject(branch, '빈 diff: 변경 없이 BACKLOG를 완료 처리할 수 없음.')
    return
  }
  const report = git('show', `${branch}:REPORT.md`)
  const tail = report.slice(Math.max(0, report.lastIndexOf('\n## ')))
  git('checkout', branch)
  const before = status()
  const reviewBefore = read('REVIEW.md')
  const result = await runCodex(`네트워크 없음. 오프라인 검토만. 스킬 문서 읽지 말 것. 코드와 파일 수정·커밋·merge·브랜치 전환 금지. 판정만 한다. 마지막 메시지 첫 줄은 정확히 PASS 또는 FAIL. FAIL이면 그 아래 REVIEW.md 내용(무엇이/왜/어떻게)을 적는다. 요구사항 충족과 실제 검증 근거를 확인한다.\n브랜치: ${branch}\n항목: ${tasks[branch]?.item || 'REPORT와 diff 참조'}\n워커 완료 신호: ${tasks[branch]?.complete ?? '미상'}\n\ndiff:\n${diff}\n\nREPORT 끝 절:\n${tail}`)
  if (status() !== before || read('REVIEW.md') !== reviewBefore) throw new Error('리뷰어가 파일을 수정함: 작업을 보존하고 자동 병합 중단')
  git('checkout', 'main')
  const [verdict, ...body] = result.message.split(/\r?\n/)
  if (!result.ok || verdict !== 'PASS') {
    reject(branch, result.ok && verdict === 'FAIL' ? body.join('\n').trim() || '반려 사유 누락' : '판정 실패: 타임아웃·실행 오류 또는 PASS/FAIL 형식 오류\n' + result.message)
    return
  }
  const key = tasks[branch]?.item?.slice(0, 40)
  const matches = read('BACKLOG.md').split(/\r?\n/).filter(line => line.startsWith('- [ ] ') && key && line.slice(6, 46) === key)
  if (matches.length !== 1) { reject(branch, 'BACKLOG 항목 앞 40자 매칭이 없거나 중복됨. logs/loop-tasks.json의 항목 연결 확인 필요.'); return }
  try { git('merge', '--no-ff', branch, '-m', `merge: ${branch}`) } catch (error) {
    const conflicts = git('diff', '--name-only', '--diff-filter=U')
    if (!fs.existsSync(git('rev-parse', '--git-path', 'MERGE_HEAD'))) throw error
    git('merge', '--abort')
    reject(branch, `충돌: ${conflicts.replaceAll('\n', ', ') || error.message}`)
    return
  }
  fs.writeFileSync('BACKLOG.md', read('BACKLOG.md').split('\n').map(line => line.startsWith('- [ ] ') && line.slice(6, 46) === key ? line.replace('- [ ]', '- [x]') : line).join('\n'))
  fs.appendFileSync('REPORT.md', `\n검수 통과 — ${branch} (${new Date().toISOString().slice(0, 10)})\n`)
  if (fs.existsSync('REVIEW.md')) fs.unlinkSync('REVIEW.md')
  commit(`chore(review): ${branch} 검수 통과`)
  git('branch', '-d', branch)
  console.log(`PASS ${branch}`)
}
async function main() {
  if (!['worker', 'reviewer'].includes(role)) throw new Error('사용법: node scripts/codex_loop_runner.mjs worker|reviewer')
  process.chdir(git('rev-parse', '--show-toplevel'))
  if (fs.existsSync('NEED_HUMAN.md')) { console.log('사람 확인 대기 중'); return }
  fs.mkdirSync('logs', { recursive: true })
  const exclude = git('rev-parse', '--git-path', 'info/exclude')
  fs.mkdirSync(path.dirname(exclude), { recursive: true })
  if (!read(exclude).split(/\r?\n/).includes('/logs/')) fs.appendFileSync(exclude, '\n/logs/\n')
  const lock = path.resolve('logs/codex-loop.lock')
  let fd
  try { fd = fs.openSync(lock, 'wx') } catch { throw new Error('루프 실행 중 또는 잔여 logs/codex-loop.lock 확인 필요') }
  try {
    fs.writeSync(fd, String(process.pid))
    const staged = git('diff', '--cached', '--name-only')
    if (staged) throw new Error('기존 staged 변경을 먼저 정리해야 함\n' + staged)
    const dirty = git('status', '--short', '--', '.', ':!REVIEW.md')
    if (dirty) throw new Error('기존 미커밋 변경을 먼저 정리해야 함:\n' + dirty)
    await (role === 'worker' ? worker() : reviewer())
  } finally { fs.closeSync(fd); fs.unlinkSync(lock) }
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
