import halHourglassRewardsData from '../data/halHourglassRewards.json' with { type: 'json' }

import type { RewardEntry } from './actionLogs.js'
import { pickHighestEligibleTarget } from './contentTargets.js'

interface HalHourglassLevelDefinition {
  name: string
  minItemLevel: number
  baseRewards: RewardEntry[]
}

// workspace/frontend/src/data/halHourglassRewards.json을 그대로 옮긴 참조 데이터.
export const HAL_HOURGLASS_LEVELS = halHourglassRewardsData.levels as HalHourglassLevelDefinition[]

/** 캐릭터의 현재 아이템 레벨로 입장 가능한 목표 중 가장 높은 레벨을 고른다 (가디언/쿠르잔과 동일 규칙). */
export function pickHalHourglassLevel(itemLevel: number): string {
  return pickHighestEligibleTarget(HAL_HOURGLASS_LEVELS, itemLevel)
}

export function findHalHourglassLevel(name: string): HalHourglassLevelDefinition | null {
  return HAL_HOURGLASS_LEVELS.find((level) => level.name === name) ?? null
}

/** 완료 시점 보상 = 레벨 기본 보상 × (스택+1)배 (스택 0이어도 최소 1배, docs/ebony_cube_hal_hourglass.typ 참고). */
export function buildHalHourglassCompleteRewards(level: HalHourglassLevelDefinition, sandStack: number): RewardEntry[] {
  const multiplier = sandStack + 1
  return level.baseRewards.map((reward) => ({ ...reward, amount: reward.amount * multiplier }))
}
