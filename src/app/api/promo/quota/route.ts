import { NextResponse } from 'next/server'
import { blogRewardQuota } from '@/lib/blogRewardQuota'

export const dynamic = 'force-dynamic'

// 남은 자리를 알려 준다. 첫 화면은 정적으로 그려서 서버가 그때그때 셀 수 없으므로,
// 팝업이 뜨기 직전에 이걸 한 번 부른다. 마감이면 팝업을 아예 안 띄운다 —
// 끝난 행사를 광고하면 눌러 본 사람만 헛걸음한다.
export async function GET() {
  try {
    const quota = await blogRewardQuota()
    return NextResponse.json(quota, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    // 못 세면 열려 있는 것으로 본다 — 셀 수 없다고 행사를 감출 이유는 없다.
    return NextResponse.json({ used: 0, total: 0, left: 1, closed: false }, { status: 200 })
  }
}
