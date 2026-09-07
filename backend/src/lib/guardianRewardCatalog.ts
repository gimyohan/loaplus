import guardianRewardsData from '../data/guardianRewards.json' with { type: 'json' }

import type { RewardEntry } from './actionLogs.js'
import { resolveItemRewards } from './itemCatalog.js'
import type { ItemRewardAmount } from './itemCatalog.js'

interface GuardianRewardDefinition {
  targetName: string
  baseRewards: ItemRewardAmount[]
}

// workspace/frontend/src/data/guardianRewards.json을 그대로 옮긴 참조 데이터. 1640 이상 최상위
// 7개 가디언(아게오로스~잔영 3단계, guardianRaidTargets.json 참고)에만 4티어 보석 보상이
// 있다(사용자 확인) — 그 아래 목표는 이 목록에 없으므로 findGuardianReward가 null을 반환하고
// 보상 없이 처리된다.
export const GUARDIAN_REWARDS = guardianRewardsData.targets as GuardianRewardDefinition[]

function findGuardianReward(targetName: string): GuardianRewardDefinition | null {
  return GUARDIAN_REWARDS.find((entry) => entry.targetName === targetName) ?? null
}

/**
 * 가디언 토벌 '오늘 수확' 보상 = 목표별 기본 보상 × (휴식 게이지 소모 시 2배, 아니면 1배)
 * (사용자 확인). 기본 보상이 없는(1640 미만) 목표는 빈 배열을 반환한다.
 */
export function buildGuardianHarvestRewards(targetName: string, restGaugeConsumed: boolean): RewardEntry[] {
  const reward = findGuardianReward(targetName)
  if (!reward) return []
  const multiplier = restGaugeConsumed ? 2 : 1
  return resolveItemRewards(reward.baseRewards.map((entry) => ({ ...entry, amount: entry.amount * multiplier })))
}
