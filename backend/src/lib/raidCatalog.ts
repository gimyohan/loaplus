import raidCatalogData from '../data/raidCatalog.json' with { type: 'json' }

import type { RewardEntry } from './actionLogs.js'

export interface RaidGateDefinition {
  goldReward: number
  boundGoldReward: number
}

export interface RaidDifficultyDefinition {
  key: string
  name: string
  /** 이 난이도에 입장 가능한 최소 아이템 레벨. 프론트의 목표 선택 목록을 이 값으로 걸러 보여준다. */
  minItemLevel: number
  gates: RaidGateDefinition[]
}

export interface RaidDefinition {
  key: string
  name: string
  difficulties: RaidDifficultyDefinition[]
}

// workspace/frontend/src/data/raidCatalog.json을 그대로 옮긴 참조 데이터. 프론트에서 목록이
// 바뀌면 이쪽도 함께 갱신해야 한다 (docs/db_schema.typ의 Character_Raids 참고).
export const RAID_CATALOG = raidCatalogData.raids as RaidDefinition[]

/** raidKey+difficultyKey로 카탈로그에서 (레이드, 난이도) 하나를 찾는다. 없으면 null. */
export function findRaidDifficulty(raidKey: string, difficultyKey: string): RaidDifficultyDefinition | null {
  const raid = RAID_CATALOG.find((candidate) => candidate.key === raidKey)
  const difficulty = raid?.difficulties.find((candidate) => candidate.key === difficultyKey)
  return difficulty ?? null
}

/**
 * 관문 하나를 완료 처리할 때 지급할 보상 목록을 만든다. goldReward/boundGoldReward가 0인
 * 재화는 애초에 지급되지 않으므로 rewards 배열에 넣지 않는다 (docs/db_schema.typ의
 * Character_Raids "Action_Logs 연동" 참고). itemName은 금액을 담지 않고 카테고리 이름만
 * 담는다 — 금액은 amount에 있으므로 프론트가 "골드 x2,500"처럼 일반화된 형식으로 조립한다.
 */
export function buildRaidGateRewardEntries(gate: RaidGateDefinition): RewardEntry[] {
  const rewards: RewardEntry[] = []
  if (gate.goldReward > 0) {
    rewards.push({ categoryKey: 'gold', itemName: '골드', amount: gate.goldReward })
  }
  if (gate.boundGoldReward > 0) {
    rewards.push({ categoryKey: 'boundGold', itemName: '귀속골드', amount: gate.boundGoldReward })
  }
  return rewards
}
