// 불편사항 접수가 받을 것은 받고 버릴 것은 버리는지 본다.
//   npm run check:feedback
//
// 두 방향으로 샌다. 너무 깐깐하면 진짜 불편한 사람이 말을 못 하고,
// 너무 헐거우면 빈 글·도배가 쌓여 정작 읽어야 할 말이 묻힌다.
import { judgeFeedback, normalizeContact, MIN_LENGTH, MAX_LENGTH, MAX_CONTACT } from '../src/lib/feedbackMessage.ts'

const results = []
const eq = (name, got, want) => results.push({ ok: Object.is(got, want), name, detail: `${got} (기대 ${want})` })

eq('빈 글은 안 받는다', judgeFeedback('').ok, false)
eq('공백만 있는 글도 빈 글', judgeFeedback('   \n\t ').ok, false)
eq('전각 공백만 있어도 빈 글', judgeFeedback('\u3000\u3000').ok, false)
eq('한 글자는 안 받는다', judgeFeedback('ㅠ').ok, false)
eq('세 글자 불평도 받는다(안돼요)', judgeFeedback('안돼요').ok, true)
eq(`${MIN_LENGTH}자(최소)는 받는다`, judgeFeedback('느림').ok, true)
eq('짧은 불평도 받는다', judgeFeedback('느려요').ok, true)
eq('앞뒤 공백은 지운다', judgeFeedback('  로그인이 안 돼요  ').ok && judgeFeedback('  로그인이 안 돼요  ').message, '로그인이 안 돼요')
eq('문자열이 아니면 안 받는다', judgeFeedback(null).ok, false)
eq('숫자도 안 받는다', judgeFeedback(12345).ok, false)

const long = 'ㄱ'.repeat(MAX_LENGTH + 500)
const j = judgeFeedback(long)
eq('아주 긴 글은 잘라서 받는다', j.ok && j.message.length, MAX_LENGTH)
eq('잘렸다는 사실을 알린다', j.ok && j.truncated, true)
eq('딱 맞는 길이는 안 잘린다', judgeFeedback('ㄱ'.repeat(MAX_LENGTH)).truncated, false)

eq('연락처 없음은 null', normalizeContact(''), null)
eq('연락처 공백만도 null', normalizeContact('   '), null)
eq('연락처는 형식을 안 따진다', normalizeContact('카톡 abc'), '카톡 abc')
eq('연락처 길이는 자른다', normalizeContact('a'.repeat(MAX_CONTACT + 50)).length, MAX_CONTACT)

const failed = results.filter((r) => !r.ok)
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name} — ${r.detail}`)
console.log(`\n${results.length - failed.length}/${results.length} 통과`)
process.exit(failed.length ? 1 : 0)
