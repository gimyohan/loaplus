import itemCatalogData from '@/data/itemCatalog.json'

export interface ItemRewardAmount {
  itemId: string
  amount: number
}

export interface ItemDefinition {
  id: string
  name: string
  categoryKey: string
  /** 아직 채워진 항목이 없다(항상 null) — RewardSelectionModal은 없으면 자리표시 아이콘을 보여준다 */
  imageUrl: string | null
  /**
   * 이 아이템 1개가 실제로는 다른 아이템(주로 재화) 몇 개에 해당하는지(예: 300,000골드 번들 →
   * { itemId: "gold", amount: 300000 }) — 로그/통계용 실제 수량 환산은 백엔드(lib/itemCatalog.ts
   * resolveItemRewards)에서만 쓰고, 프론트는 항상 "몇 개를 골랐는지"(reward-list의 amount, 보통
   * 1)만 보여주면 되므로 이 필드를 직접 쓰지 않는다 — 백엔드와 스키마를 맞추기 위해서만 둔다.
   */
  value: ItemRewardAmount | null
}

// workspace/backend/src/data/itemCatalog.json을 그대로 옮긴 참조 데이터. 아이템의 "정체성"
// (id/이름/카테고리/이미지)만 담고 수량은 담지 않는다 — 수량은 그 아이템을 지급하는 콘텐츠별
// 보상표(kurzanShardRewards.json 등)가 itemId로 이 카탈로그를 참조해 정의한다.
export const ITEM_CATALOG = itemCatalogData.items as ItemDefinition[]

export function findItem(itemId: string): ItemDefinition | null {
  return ITEM_CATALOG.find((item) => item.id === itemId) ?? null
}
