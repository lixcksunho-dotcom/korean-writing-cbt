// 사후 확인이 '지급된 신청'만 고르는지 본다 — 같은 사람의 지워진 옛 신청을 검사하지 않게.
//   npm run check:audit-selection
import { pickAuditRows } from '../src/lib/blogAuditSelection.ts'
let pass = 0, fail = 0
const ok = (n, d = '') => { pass++; console.log(`  ○ ${n}${d ? ' — ' + d : ''}`) }
const bad = (n, d = '') => { fail++; console.log(`  × ${n}${d ? ' — ' + d : ''}`) }
const c = (id, user, at) => ({ id, user_id: user, contact: `https://blog.naver.com/x/${id}`, created_at: at })
// 2026-09-15 실제: 같은 사람이 07:12 불합격 신청 → 글 삭제 → 07:21 재신청·자동 지급
const rows = [c('old', 'u1', '2026-09-15T07:12:50Z'), c('new', 'u1', '2026-09-15T07:21:16Z'), c('other', 'u2', '2026-09-14T00:00:00Z'), c('manual', 'u3', '2026-09-13T00:00:00Z')]
const granted = new Set(['review-auto-u1', 'review-manual'])
const picked = pickAuditRows(rows, granted).map(r => r.id)
if (picked.includes('new') && !picked.includes('old')) ok('자동 지급자는 최근 신청만', picked.join(',')); else bad('옛 신청이 섞임', picked.join(','))
if (picked.includes('manual')) ok('승인 지급 신청은 그대로'); else bad('승인 지급 신청 누락')
if (!picked.includes('other')) ok('지급 없는 신청은 안 봄'); else bad('지급 없는 신청 포함')
const unsorted = pickAuditRows([rows[1], rows[0]], granted).map(r => r.id)
if (unsorted.includes('new') && !unsorted.includes('old')) ok('입력 순서와 무관'); else bad('순서 의존', unsorted.join(','))
console.log(`\n${fail ? '선택 규칙에 구멍이 있다.' : '지급된 글만 본다.'} (통과 ${pass} · 실패 ${fail})`)
process.exit(fail ? 1 : 0)
