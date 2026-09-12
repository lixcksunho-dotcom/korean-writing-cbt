import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { stripVTControlCharacters } from 'node:util'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const timeoutMs = 180_000
const cell = value => stripVTControlCharacters(String(value)).replaceAll('|', '\\|').replace(/[\r\n]+/g, ' ')

function commandArgs(command) {
  // 셸 구문을 추측해서 실행하면 운영체제마다 다른 검사가 돌 수 있다.
  if (typeof command !== 'string' || !/^(node|python|python3)\s+[\w./:=\s-]+$/.test(command)) {
    throw new Error('지원하지 않는 명령: node/python과 공백으로 구분한 단순 인자만 허용')
  }
  const [runtime, ...args] = command.trim().split(/\s+/)
  const file = args.find(arg => !arg.startsWith('-'))
  if (!file || !/^scripts\/[\w.-]+\.(mjs|py)$/.test(file) || path.resolve(root, file) === fileURLToPath(import.meta.url)) {
    throw new Error('scripts/*.mjs 또는 scripts/*.py 검사 파일이 필요하며 묶음 자체는 실행할 수 없음')
  }
  return [runtime === 'node' ? process.execPath : runtime, args]
}

async function run(command) {
  const [executable, args] = commandArgs(command)
  return new Promise(resolve => {
    let tail = ''
    let error = ''
    let timedOut = false
    const child = spawn(executable, args, {
      cwd: root, shell: false, windowsHide: true,
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    for (const stream of [child.stdout, child.stderr]) {
      stream.setEncoding('utf8')
      stream.on('data', chunk => { tail = (tail + chunk).slice(-8192) })
    }
    child.on('error', err => { error = err.message })
    const timer = setTimeout(() => {
      timedOut = true
      // 하위 프로세스가 출력 파이프를 붙잡아 다음 검사를 막지 않게 함께 종료한다.
      if (process.platform === 'win32') {
        const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
          shell: false, windowsHide: true, stdio: 'ignore',
        })
        killer.on('error', () => child.kill('SIGKILL'))
        killer.on('exit', code => { if (code !== 0) child.kill('SIGKILL') })
      } else {
        try { process.kill(-child.pid, 'SIGKILL') } catch { child.kill('SIGKILL') }
      }
    }, timeoutMs)
    child.on('close', (code, signal) => {
      clearTimeout(timer)
      const last = stripVTControlCharacters(tail).trim().split(/\r?\n/).at(-1) || '(출력 없음)'
      resolve({
        code: timedOut || error ? 1 : code ?? 1,
        last: timedOut ? `TIMEOUT 180초 — ${last}` : error || (signal ? `${signal} — ${last}` : last),
      })
    })
  })
}

async function main() {
  const { scripts, offlineChecks } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
  if (!Array.isArray(offlineChecks) || !offlineChecks.length || new Set(offlineChecks).size !== offlineChecks.length) {
    throw new Error('offlineChecks는 중복 없는 검사 이름 배열이어야 함')
  }
  const started = performance.now()
  let failed = 0
  console.log('| 검사 | exit | 마지막 출력 줄 |')
  console.log('|---|---|---|')
  for (const name of offlineChecks) {
    let result
    try {
      if (typeof name !== 'string' || !name.startsWith('check:') || name === 'check:offline' || !Object.hasOwn(scripts, name)) {
        throw new Error('package.json에 등록된 개별 check:* 이름이 필요함')
      }
      result = await run(scripts[name])
    } catch (error) {
      result = { code: 1, last: error.message }
    }
    if (result.code !== 0) failed++
    console.log(`| ${cell(name)} | ${result.code} | ${cell(result.last)} |`)
  }
  console.log(`오프라인 검사: 통과 ${offlineChecks.length - failed} · 실패 ${failed} · 소요 ${((performance.now() - started) / 1000).toFixed(2)}초`)
  process.exitCode = failed ? 1 : 0
}

main().catch(error => {
  console.error(`오프라인 검사 설정 오류: ${error.message}`)
  process.exitCode = 1
})
