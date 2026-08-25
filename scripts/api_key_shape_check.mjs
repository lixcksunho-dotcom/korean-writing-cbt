// 환경변수에 들어온 키의 모양을 제대로 짚는지 본다.
//   npm run check:keyshape
//
// 주의: 이 판정은 '호출이 안 된다'는 뜻이 아니다. 앞뒤 공백만으로는 fetch도 SDK도
// 멀쩡히 200을 받는다(실측). 그래서 화면에서도 참고 문구로만 쓰고, 되는지 안 되는지는
// 반드시 실제로 호출해 보고 말한다.
import { describeKeyShape } from '../src/lib/apiKeyShape.ts'

const results = []
const eq = (name, got, want) => results.push({ ok: got === want, name, detail: `${got} (기대 ${want})` })
const P = 'sk-ant-'

eq('정상 키', describeKeyShape('sk-ant-abc123', P).ok, true)
eq('값 없음', describeKeyShape(undefined, P).ok, false)
eq('빈 문자열', describeKeyShape('', P).ok, false)
eq('줄바꿈 섞임', describeKeyShape('sk-ant-abc\n', P).ok, false)
eq('캐리지리턴 섞임', describeKeyShape('sk-ant-abc\r', P).ok, false)
eq('앞뒤 공백', describeKeyShape(' sk-ant-abc ', P).ok, false)
eq('큰따옴표로 감쌈', describeKeyShape('"sk-ant-abc"', P).ok, false)
eq('작은따옴표로 감쌈', describeKeyShape("'sk-ant-abc'", P).ok, false)
eq('접두사가 다름', describeKeyShape('sk-proj-abc', P).ok, false)
eq('접두사를 안 주면 접두사는 안 본다', describeKeyShape('whatever-key').ok, true)

// 문제를 알려 줄 때 키 값이 섞여 나가면 안 된다(화면·로그에 그대로 남는다).
const leaked = [
  describeKeyShape('sk-ant-SECRET123\n', P),
  describeKeyShape('"sk-ant-SECRET123"', P),
  describeKeyShape(' sk-ant-SECRET123 ', P),
  describeKeyShape('sk-proj-SECRET123', P),
].filter((r) => !r.ok && r.problem.includes('SECRET123'))
eq('문제 설명에 키 값이 절대 안 섞인다', leaked.length, 0)

// 줄바꿈이 있으면서 앞뒤 공백도 있을 때 — 더 치명적인 줄바꿈을 먼저 짚는다
eq('줄바꿈을 공백보다 먼저 짚는다', describeKeyShape(' sk-ant-abc\n', P).problem.includes('줄바꿈'), true)

const failed = results.filter((r) => !r.ok)
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name} — ${r.detail}`)
console.log(`\n${results.length - failed.length}/${results.length} 통과`)
process.exit(failed.length ? 1 : 0)
