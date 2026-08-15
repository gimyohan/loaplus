import { apiFetch } from '@/lib/api'
import type { AbilityStoneOutcome, AbilityStoneSlot, AbilityStoneState } from '@/types/abilityStone'

/** 세공을 한 번도 하지 않은 초기 상태 — 잔여 10/10/10, 확률 인덱스 5(=75%, docs/ability_stone.typ 참고). */
export const ABILITY_STONE_INITIAL_STATE: AbilityStoneState = {
  majorFailCnt: 0,
  minorFailCnt: 0,
  debuffSuccCnt: 0,
  majorRemCnt: 10,
  minorRemCnt: 10,
  debuffRemCnt: 10,
  currProbabilityIdx: 5,
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

/** 원시 성공 횟수 → 목표 등급 인덱스 변환(docs/ability_stone.typ "목표 등급 인덱스" 표, 주각인/부각인 공용). */
export function gradeFromRawSuccess(raw: number): number {
  if (raw <= 5) return 0
  if (raw === 6) return 1
  if (raw <= 8) return 2
  if (raw === 9) return 3
  return 4
}

/**
 * 한 번의 세공 시도 결과를 상태에 반영한다(docs/ability_stone.typ "상태 전이" 참고).
 * - 주 각인/부 각인: 성공하면 실패 카운터는 그대로, 실패하면 +1.
 * - 디버프: 반대로 "성공"이 안 좋은 결과다 — 성공하면 성공 카운터 +1, 실패(=디버프가 오르지
 *   않음)하면 그대로.
 * - 슬롯과 무관하게, 성공하면 다음 확률 인덱스(k)가 -1(더 어려워짐), 실패하면 +1(더 쉬워짐)이며
 *   0~5 범위에서 고정된다.
 */
export function applyAbilityStoneAttempt(
  state: AbilityStoneState,
  slot: AbilityStoneSlot,
  success: boolean,
): AbilityStoneState {
  const next = { ...state }
  if (slot === 'MAJOR') {
    next.majorRemCnt -= 1
    if (!success) next.majorFailCnt += 1
  } else if (slot === 'MINOR') {
    next.minorRemCnt -= 1
    if (!success) next.minorFailCnt += 1
  } else {
    next.debuffRemCnt -= 1
    if (success) next.debuffSuccCnt += 1
  }
  next.currProbabilityIdx = clamp(state.currProbabilityIdx + (success ? -1 : 1), 0, 5)
  return next
}

/** 세 슬롯 잔여 횟수가 모두 0이면 더 세공할 게 없는 종결 상태다. */
export function isAbilityStoneTerminal(state: AbilityStoneState): boolean {
  return state.majorRemCnt === 0 && state.minorRemCnt === 0 && state.debuffRemCnt === 0
}

/** Ability_Stone_Dp_States 조회 — 상태 하나에 대해 100개 목표 조합의 확률/최선의 수를 받아온다. */
export async function fetchAbilityStoneStrategy(state: AbilityStoneState): Promise<AbilityStoneOutcome[]> {
  const query = new URLSearchParams(Object.entries(state).map(([key, value]) => [key, String(value)]))
  return apiFetch<AbilityStoneOutcome[]>(`/api/ability-stone/strategy?${query.toString()}`)
}
