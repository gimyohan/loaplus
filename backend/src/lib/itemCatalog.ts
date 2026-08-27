import itemCatalogData from '../data/itemCatalog.json' with { type: 'json' }

import type { RewardEntry } from './actionLogs.js'

export interface ItemRewardAmount {
  itemId: string
  amount: number
}

export interface ItemDefinition {
  id: string
  name: string
  categoryKey: string
  /** 아이템 이미지 — 프론트의 RewardSelectionModal이 쓴다. 아직 채워진 항목이 없다(항상 null). */
  imageUrl: string | null
  /**
   * 이 아이템 1개가 실제로는 다른 아이템(주로 재화) 몇 개에 해당하는지 — {itemId, amount} 모양을
   * 그대로 재귀적으로 참조한다. 대부분의 아이템은 null(자기 자신이 곧 단위). "이름이 곧 금액"인
   * 골드/귀속 골드/실링 번들만 채워진다(예: gold-bar-stack-300000 → { itemId: "gold", amount:
   * 300000 }) — 골드/귀속골드/실링 자체도 이 카탈로그의 평범한 아이템(id: "gold" 등, value: null)
   * 이라, categoryKey별 전용 필드(goldValue/silverValue...)를 늘리지 않고도 새 재화가 생기면
   * 항목 하나만 추가하면 된다. resolveItemRewards가 로그에 남길 실제 amount를 계산할 때 이
   * 배율을 곱한다.
   */
  value: ItemRewardAmount | null
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

/**
 * {itemId, amount} 목록을 itemCatalog에서 이름/categoryKey를 채운 RewardEntry[]로 변환한다.
 * itemId·itemName은 항상 원본 아이템(예: "gold-bar-stack-300000"/"300,000골드") 기준이라
 * Character_Item_Reward_Stats(아이템별 통계)가 번들 단위로 구분해 셀 수 있고, amount만 그
 * 아이템의 value(재귀 환산)가 있으면 그 배율을 곱해 실제 재화 수량으로 바꾼다 — 그래서
 * Character_Statistics의 골드 합산 컬럼은 "몇 개를 받았는지"가 아니라 "실제로 얼마를 받았는지"를
 * 쌓는다. 카탈로그에 없는 itemId는 운영 데이터 불일치로 보고 조용히 건너뛴다.
 */
export function resolveItemRewards(entries: ItemRewardAmount[]): RewardEntry[] {
  return entries.flatMap((entry) => {
    const item = findItem(entry.itemId)
    if (!item) return []
    const amount = item.value ? entry.amount * item.value.amount : entry.amount
    return [{ categoryKey: item.categoryKey, itemId: item.id, itemName: item.name, amount }]
  })
}
