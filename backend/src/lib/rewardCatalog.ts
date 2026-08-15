import kurzanAzenaBlessingRewardsData from '../data/kurzanAzenaBlessingRewards.json' with { type: 'json' }
import kurzanShardRewardsData from '../data/kurzanShardRewards.json' with { type: 'json' }

import type { RewardEntry } from './actionLogs.js'

interface CatalogItem {
  id: string
  name: string
  quantity: number
  numericValue?: number
}

interface CatalogCategory {
  key: string
  label: string
  items: CatalogItem[]
}

// workspace/frontend/src/data/kurzanShardRewards.json, kurzanAzenaBlessingRewards.json을 그대로
// 옮긴 참조 데이터. 프론트에서 목록이 바뀌면 이쪽도 함께 갱신해야 한다. 이름이 곧 수량인
// 재화(gold/boundGold/silver) 항목에는 프론트에는 없는 numericValue(실제 수량)를 추가로
// 채워뒀다 — 로그의 rewards[].amount를 채우려면 "50,000골드" 같은 표시용 문자열이 아니라
// 숫자가 필요하기 때문 (docs/db_schema.typ Action_Logs 참고).
// 가디언 토벌과 쿠르잔 전선은 같은 재화 체계를 그대로 쓰므로(workspace/frontend의
// GuardianWidget.tsx·KurzanFrontlineWidget.tsx 둘 다 이 두 파일을 그대로 import) 카탈로그도
// 콘텐츠별로 나누지 않고 공유한다 — 이름에 특정 콘텐츠를 접두사로 붙이지 않는 이유.
export const SHARD_REWARD_CATALOG = kurzanShardRewardsData.categories as CatalogCategory[]
export const AZENA_BLESSING_REWARD_CATALOG = kurzanAzenaBlessingRewardsData.categories as CatalogCategory[]

// Action_Logs.rewards(로그 표시용)에 쓸 itemName은 이름이 곧 수량인 카테고리(gold/boundGold/
// silver)에 한해 카테고리 라벨로 일반화된다(lib/actionLogs.ts의 toDisplayRewards 참고) — 이
// 함수가 반환하는 itemName은 항상 카탈로그 원본(구체적인) 이름이며, 그 일반화는 여기서 하지
// 않는다. Character_Item_Reward_Stats(편린/아제나 축복 아이템별 통계)는 이 원본 이름을 그대로
// 써야 어느 금액 단계 아이템이 나왔는지 구분할 수 있기 때문이다.
/** 카탈로그에서 itemId로 보상 항목을 찾아 로그에 남길 형태로 변환한다. 없으면 null. */
export function findRewardCatalogItem(catalog: CatalogCategory[], itemId: string): RewardEntry | null {
  for (const category of catalog) {
    const item = category.items.find((candidate) => candidate.id === itemId)
    if (item) {
      // gold/boundGold/silver는 이름이 곧 수량("10,000골드")이라 quantity(항상 1)가 아니라
      // numericValue를 amount로 쓴다. 나머지 카테고리는 진짜 개수를 세는 quantity를 그대로 쓴다.
      const isNumericCategory = category.key === 'gold' || category.key === 'boundGold' || category.key === 'silver'
      return {
        categoryKey: category.key,
        itemId: item.id,
        itemName: item.name,
        amount: isNumericCategory ? (item.numericValue ?? 0) : item.quantity,
      }
    }
  }
  return null
}
