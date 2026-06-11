import { NextResponse } from 'next/server'

// 임시 점검용: PORTONE_API_SECRET 이 유효한지(401 아닌지)만 확인. 시크릿/결제정보는 노출하지 않음.
// 검증 후 이 파일은 삭제한다.
export async function GET() {
  const secret = process.env.PORTONE_API_SECRET ?? ''
  const res = await fetch('https://api.portone.io/payments?page.number=0&page.size=1', {
    headers: { Authorization: `PortOne ${secret}` },
    cache: 'no-store',
  })
  return NextResponse.json({
    secretLength: secret.length,
    portoneStatus: res.status,
    valid: res.ok,
  })
}
