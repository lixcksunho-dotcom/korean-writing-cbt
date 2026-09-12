// 2026-09-09 가상 데스크톱의 새 기기가 90일간 누적돼 유료 채점이 막힌 사고를 막기 위해 24시간만 센다.
export const DEVICE_WINDOW_HOURS = 24

export function deviceWindowStart(now: Date, hours: number): string {
  return new Date(now.getTime() - hours * 3600_000).toISOString()
}

export function isDeviceBlocked(input: {
  seenDeviceIds: Iterable<string>
  currentDeviceId: string
  limit: number
}): boolean {
  const ids = new Set(input.seenDeviceIds)
  return !ids.has(input.currentDeviceId) && ids.size >= input.limit
}
