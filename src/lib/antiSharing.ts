import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { kstYmd } from '@/lib/examDday'
import { DEVICE_LIMIT, DAILY_GRADE_LIMIT, dailyLimitMessage } from '@/lib/antiSharingLimits'
import { DEVICE_WINDOW_HOURS, deviceWindowStart, isDeviceBlocked } from '@/lib/deviceWindow'

// 계정 돌려쓰기(공유) 방지 — 유료 이용 시에만 적용.
//  - 기기 수 제한: 한 계정이 사용할 수 있는 활성 기기는 최대 DEVICE_LIMIT 대
//  - 일일 한도: 하루 AI 첨삭 횟수는 DAILY_GRADE_LIMIT 회까지
// 위반 시 사람이 읽을 수 있는 한국어 사유를 '돌려준다'(던지지 않는다).
// 던지면 Next.js 운영 빌드가 message를 지워서, 기기 한도에 걸린 사람이 이유를 모른 채
// "오류가 발생했습니다"만 보고 무한히 다시 누르게 된다.
// 값은 antiSharingLimits.ts(브라우저에서도 읽는 순수 파일)에 있고 여기서 다시 내보낸다.
export { DEVICE_LIMIT, DAILY_GRADE_LIMIT }

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
  // 한국 날짜(YYYY-MM-DD). 예전엔 서버(UTC) 날짜라 한도가 한국 시간 오전 9시에 풀렸다 —
  // "내일 다시"라는 안내와 어긋나 밤에 한도에 걸린 사람이 자정을 넘겨도 계속 막혔다(2026-09-07 문의).
  return kstYmd()
}

/**
 * 유료 AI 기능 사용 전 호출. 기기 한도·일일 한도를 검사한다.
 * 막아야 하면 사유 문장을, 통과하면 null을 돌려준다. 통과 시 현재 기기를 등록(갱신)한다.
 */
export async function paidUsageBlock(userId: string): Promise<string | null> {
  const admin = createAdminClient()
  const deviceId = await getDeviceId()

  // 1) 기기 수 제한 — '하루 안에 함께 쓰인' 기기만 센다.
  //    옛 기기 ID(쿠키를 지웠거나 가상 데스크톱이 새로 만든 것)는 하루가 지나면 자연히 빠진다.
  const windowStart = deviceWindowStart(new Date(), DEVICE_WINDOW_HOURS)
  const { data: devices } = await admin
    .from('device_usage')
    .select('device_id')
    .eq('user_id', userId)
    .gte('last_seen', windowStart)
  if (isDeviceBlocked({
    seenDeviceIds: (devices ?? []).map(d => d.device_id as string),
    currentDeviceId: deviceId,
    limit: DEVICE_LIMIT,
  })) {
    return `같은 시간대에 기기 ${DEVICE_LIMIT}대를 넘게 쓰고 있어 잠시 제한했습니다. 하루가 지나면 자동으로 풀리고, 본인 계정이 맞는데 계속 막히면 고객센터로 알려 주세요.`
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
    return dailyLimitMessage()
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
/**
 * 우리 쪽 사정으로 채점이 실패했을 때 오늘 사용 횟수를 되돌린다.
 *
 * 왜 필요한가: 사용량은 AI 호출 '앞'에서 센다(그래야 실패를 골라 공짜로 무한 호출하지
 * 못한다). 그런데 무료 체험만 되돌리고 유료는 되돌리지 않고 있었다 — 통신 오류나 5xx로
 * 채점이 실패해도 하루 30회에서 한 번이 깎였다. 돈을 낸 사람이 우리 잘못으로 손해를 본다.
 *
 * 되돌리는 것은 '우리 쪽 사정'일 때뿐이다(aiGradingFailure 의 refund 판정). 응답 파싱
 * 실패는 되돌리지 않는다 — 그건 특정 입력을 골라 무한히 부르는 통로가 된다.
 */
export async function refundPaidGrade(userId: string): Promise<void> {
  const admin = createAdminClient()
  const day = todayKey()
  const { data: row } = await admin
    .from('usage_daily')
    .select('grade_count')
    .eq('user_id', userId)
    .eq('day', day)
    .maybeSingle()
  const used = (row?.grade_count as number | undefined) ?? 0
  if (used <= 0) return
  await admin.from('usage_daily').upsert(
    { user_id: userId, day, grade_count: used - 1 },
    { onConflict: 'user_id,day' }
  )
}

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
