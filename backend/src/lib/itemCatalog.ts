import itemCatalogData from '../data/itemCatalog.json' with { type: 'json' }

import type { RewardEntry } from './actionLogs.js'

export interface ItemDefinition {
  id: string
  name: string
  categoryKey: string
}

// workspace/frontend/src/data/itemCatalog.json을 그대로 옮긴 참조 데이터. 아이템의 "정체성"
// (id/이름/카테고리)만 담고 수량은 담지 않는다 — 수량은 그 아이템을 지급하는 콘텐츠별 보상표
// (ebonyCubeRewards.json, halHourglassRewards.json 등)가 itemId로 이 카탈로그를 참조해 정의한다.
// 여러 콘텐츠가 같은 아이템(예: 4티어 보석)을 줄 때 categoryKey/이름이 어긋나지 않게 하고, 새
// 아이템(5티어 보석 등)이 추가될 때 이 카탈로그에 항목 하나만 늘리면 되게 하기 위함이다.
export const ITEM_CATALOG = itemCatalogData.items as ItemDefinition[]

export function findItem(itemId: string): ItemDefinition | null {
  return ITEM_CATALOG.find((item) => item.id === itemId) ?? null
}

export interface ItemRewardAmount {
  itemId: string
  amount: number
}

/**
 * {itemId, amount} 목록을 itemCatalog에서 이름/categoryKey를 채운 RewardEntry[]로 변환한다.
 * 카탈로그에 없는 itemId는 운영 데이터 불일치로 보고 조용히 건너뛴다.
 */
export function resolveItemRewards(entries: ItemRewardAmount[]): RewardEntry[] {
  return entries.flatMap((entry) => {
    const item = findItem(entry.itemId)
    if (!item) return []
    return [{ categoryKey: item.categoryKey, itemId: item.id, itemName: item.name, amount: entry.amount }]
  })
}
