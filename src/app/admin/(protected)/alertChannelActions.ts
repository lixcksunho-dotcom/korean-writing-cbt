'use server'

import { createClient } from '@/lib/supabase/server'
import { sendTelegram } from '@/lib/operatorAlerts'

// 알림이 실제로 사장님 휴대폰까지 가는지 눌러서 확인한다.
// '설정이 있다'와 '진짜 도착한다'는 다르다 — 봇을 차단했거나 대화방 id가 틀리면
// 설정은 멀쩡한데 아무것도 안 온다. 그건 보내 봐야만 안다.
async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
  if (!user || !adminEmails.includes(user.email ?? '')) throw new Error('Forbidden')
}

export async function sendTestAlert(): Promise<{ ok: boolean; detail: string }> {
  await assertAdmin()
  const at = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
  return sendTelegram(`✅ 실글패스 알림 테스트\n\n${at}\n이 메시지가 보이면 사고 알림도 여기로 옵니다.`)
}
