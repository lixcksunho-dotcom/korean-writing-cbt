import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

// 계정 돌려쓰기(공유) 방지 — 유료 이용 시에만 적용.
//  - 기기 수 제한: 한 계정이 사용할 수 있는 활성 기기는 최대 DEVICE_LIMIT 대
//  - 일일 한도: 하루 AI 첨삭 횟수는 DAILY_GRADE_LIMIT 회까지
// 위반 시 사람이 읽을 수 있는 한국어 사유를 '돌려준다'(던지지 않는다).
// 던지면 Next.js 운영 빌드가 message를 지워서, 기기 한도에 걸린 사람이 이유를 모른 채
// "오류가 발생했습니다"만 보고 무한히 다시 누르게 된다.
export const DEVICE_LIMIT = 3
export const DAILY_GRADE_LIMIT = 30
// 기기 한도 계산 시 '최근 활동'만 센다(일수). 쿠키를 지워 생긴 옛 기기ID는 이 기간이 지나면
// 한도에서 빠져, 정상 이용자가 오래전 기기 때문에 잠기는 오탐을 막는다.
// (계정 공유는 여러 기기가 '동시에' 최근 활동하므로 이 필터로도 여전히 걸린다.)
const DEVICE_ACTIVE_DAYS = 90

const DEVICE_COOKIE = 'kpt_did'

// 이 브라우저의 기기 식별자(쿠키). 없으면 발급해 1년짜리 httpOnly 쿠키로 저장.
async function getDeviceId(): Promise<string> {
  const jar = await cookies()
  const existing = jar.get(DEVICE_COOKIE)?.value
  if (existing) return existing
  const id = crypto.randomUUID()
  jar.set(DEVICE_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  })
  return id
}

function todayKey(): string {
  // 서버 기준 날짜(YYYY-MM-DD)
  return new Date().toISOString().slice(0, 10)
}

/**
 * 유료 AI 기능 사용 전 호출. 기기 한도·일일 한도를 검사한다.
 * 막아야 하면 사유 문장을, 통과하면 null을 돌려준다. 통과 시 현재 기기를 등록(갱신)한다.
 */
export async function paidUsageBlock(userId: string): Promise<string | null> {
  const admin = createAdminClient()
  const deviceId = await getDeviceId()

  // 1) 기기 수 제한 — 최근 활동한 기기만 센다(오래된 옛 기기ID는 제외).
  const activeSince = new Date(Date.now() - DEVICE_ACTIVE_DAYS * 86400_000).toISOString()
  const { data: devices } = await admin
    .from('device_usage')
    .select('device_id')
    .eq('user_id', userId)
    .gte('last_seen', activeSince)
  const ids = new Set((devices ?? []).map(d => d.device_id as string))
  if (!ids.has(deviceId) && ids.size >= DEVICE_LIMIT) {
    return `계정 공유가 의심되어 이용이 제한되었습니다. 한 계정은 기기 ${DEVICE_LIMIT}대까지만 사용할 수 있어요. 본인 계정이 맞다면 고객센터로 문의해 주세요.`
  }
  // 이 등록이 조용히 실패하면 기기 수가 영영 늘지 않아 제한 자체가 무력해진다.
  // 사용자를 막을 일은 아니라 던지지는 않지만, 모르고 지나가서도 안 된다.
  const { error: deviceError } = await admin.from('device_usage').upsert(
    { user_id: userId, device_id: deviceId, last_seen: new Date().toISOString() },
    { onConflict: 'user_id,device_id' }
  )
  if (deviceError) {
    console.error('[antiSharing] 기기 등록 실패 — 기기 수 제한이 집계되지 않음', {
      userId, code: deviceError.code, message: deviceError.message,
    })
  }

  // 2) 일일 한도
  const day = todayKey()
  const { data: row } = await admin
    .from('usage_daily')
    .select('grade_count')
    .eq('user_id', userId)
    .eq('day', day)
    .maybeSingle()
  const used = (row?.grade_count as number | undefined) ?? 0
  if (used >= DAILY_GRADE_LIMIT) {
    return `오늘 AI 첨삭 한도(${DAILY_GRADE_LIMIT}회)를 모두 사용했어요. 내일 다시 이용해 주세요.`
  }

  return null
}

/**
 * 오늘 사용 횟수 1 증가. AI 호출 '앞'에서 부른다 — 성공 후에 세면 응답 파싱이 깨지는
 * 입력으로 무한 재시도가 되고 그동안 요금은 계속 나간다(consumeAiTrial과 같은 이유).
 *
 * 읽고 나서 쓰는 방식이라 동시 요청이 겹치면 한 건이 덜 세어질 수 있다. 하루 30회
 * 한도에서는 실익이 없어 그대로 둔다.
 */
export async function recordPaidGrade(userId: string): Promise<void> {
  const admin = createAdminClient()
  const day = todayKey()
  const { data: row } = await admin
    .from('usage_daily')
    .select('grade_count')
    .eq('user_id', userId)
    .eq('day', day)
    .maybeSingle()
  const used = (row?.grade_count as number | undefined) ?? 0
  await admin.from('usage_daily').upsert(
    { user_id: userId, day, grade_count: used + 1 },
    { onConflict: 'user_id,day' }
  )
}
