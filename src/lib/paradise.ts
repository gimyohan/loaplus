import type { ParadiseSummary } from '@/types/paradise'

/** 티켓(천상 스택) 사용: 1개 소모하되 0 밑으로는 내려가지 않는다 */
export function decrementParadiseTicket(data: ParadiseSummary): ParadiseSummary {
  return { ...data, ticketCount: Math.max(data.ticketCount - 1, 0) }
}

/** 열쇠(지옥 열쇠) 사용: 1개 소모하되 0 밑으로는 내려가지 않는다 */
export function decrementParadiseKey(data: ParadiseSummary): ParadiseSummary {
  return { ...data, keyCount: Math.max(data.keyCount - 1, 0) }
}

/**
 * 매주 초기화 시점의 자동 충전 처리 (설정 모달의 자동 충전 토글, docs/reset_logic.typ).
 * 티켓은 5개 미만이면 5개로 채우고(이미 5개 이상이면 그대로 유지), 열쇠는 무조건 3개를 더한다.
 */
export function applyParadiseWeeklyRecharge(data: ParadiseSummary): ParadiseSummary {
  return { ...data, ticketCount: Math.max(data.ticketCount, 5), keyCount: data.keyCount + 3 }
}
