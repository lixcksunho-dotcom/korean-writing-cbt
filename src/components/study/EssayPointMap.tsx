import { questionBank } from '@/lib/questionBank'

// 서술형이 어느 문항에 몇 점씩 걸려 있는지, 우리 문제은행에서 세어 보여 준다.
//
// 왜 필요한가: 서술형은 700점인데 그 700점이 고르게 퍼져 있지 않다. 39번 하나가
// 300점이다 — 1,000점 만점의 30%가 한 문항에 걸려 있다. 이걸 모르면 앞 문항에
// 시간을 다 쓰고 마지막 한 장을 못 채운다.
//
// 숫자를 글로 적어 두면 회차가 늘 때 어긋난다. 문제은행에서 그때그때 센다.

type Row = { number: number; points: number; count: number }

/** 문항 번호대로 무엇을 요구하는지. 발문을 훑어 정리한 것이라 값이 아니라 설명이다. */
const WHAT: Record<number, string> = {
  31: '맞춤법·표기 고쳐 쓰기',
  32: '문장 고쳐 쓰기·조건에 맞게 쓰기',
  33: '자료 읽고 한 문장으로 쓰기',
  34: '어휘·표현 바르게 고치기',
  35: '조건에 맞춰 문장 만들기',
  36: '짧은 글 다듬기',
  37: '요약문 — 정해진 형식으로 세 문장',
  38: '제안서·공문 빈칸 채우기',
  39: '자료 기반 보고서 — 네 문단 800자 내외',
}

export default async function EssayPointMap() {
  const { data } = await questionBank()
    .from('questions')
    .select('number, points')
    .eq('program', 'silyong')
    .eq('type', 'essay')
    .lt('year', 9000)
    .limit(500)

  const map = new Map<number, Row>()
  for (const q of data ?? []) {
    const n = Number(q.number)
    const p = Number(q.points)
    if (!Number.isFinite(n) || !Number.isFinite(p)) continue
    const row = map.get(n) ?? { number: n, points: p, count: 0 }
    row.count += 1
    map.set(n, row)
  }
  const rows = [...map.values()].sort((a, b) => a.number - b.number)
  if (!rows.length) return null   // 셀 것이 없으면 빈 표를 그리지 않는다

  const total = rows.reduce((s, r) => s + r.points, 0)
  const biggest = rows.reduce((a, b) => (b.points > a.points ? b : a))

  return (
    <section className="mb-10 rounded-2xl border border-[#e2e8f0] bg-white p-5">
      <h2 className="mb-1 text-2xl font-black text-[#0f172a]">서술형 배점 지도</h2>
      <p className="mb-4 text-sm leading-relaxed text-[#475569]">
        서술형은 모두 <b>{total.toLocaleString('ko-KR')}점</b>인데 고르게 퍼져 있지 않습니다.
        <b> {biggest.number}번 한 문항이 {biggest.points}점</b>이에요 —
        1,000점 만점의 {Math.round((biggest.points / 1000) * 100)}%가 여기 걸려 있습니다.
      </p>

      <div className="overflow-hidden rounded-xl border border-[#e2e8f0]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#f8fafc] text-[#475569]">
              <th className="px-3 py-2 text-left font-bold">문항</th>
              <th className="px-3 py-2 text-right font-bold">배점</th>
              <th className="px-3 py-2 text-left font-bold">무엇을 요구하나</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const big = r.points >= 100
              return (
                <tr key={r.number} className={`border-t border-[#e2e8f0] ${big ? 'bg-amber-50/60' : ''}`}>
                  <td className="px-3 py-2 font-bold text-[#1e3a5f] tabular-nums">{r.number}번</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${big ? 'font-black text-[#b45309]' : 'text-[#475569]'}`}>
                    {r.points}점
                  </td>
                  <td className="px-3 py-2 text-[#475569]">{WHAT[r.number] ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-[#475569]">
        {/* 시간 배분은 배점을 따라가야 한다. 앞에서 다 쓰면 마지막 한 장을 못 채운다. */}
        선택형까지 합쳐 120분입니다. 앞 문항({rows[0].number}~{rows[Math.min(4, rows.length - 1)].number}번)은
        한 문항에 3~4분이면 되지만, <b>{biggest.number}번은 30분 넘게 잡아야</b> 800자를 채웁니다.
        앞에서 시간을 다 쓰면 가장 큰 점수를 통째로 놓칩니다.
      </p>
    </section>
  )
}
