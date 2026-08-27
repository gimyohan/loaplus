import type { RewardCategory } from '@/components/widgets/RewardSelectionModal'
import kurzanAzenaBlessingRewardsData from '@/data/kurzanAzenaBlessingRewards.json'
import kurzanShardRewardsData from '@/data/kurzanShardRewards.json'
import { findItem } from '@/lib/itemCatalog'

interface CatalogItemRef {
  itemId: string
  amount: number
}

interface CatalogCategory {
  key: string
  label: string
  items: CatalogItemRef[]
}

// kurzanShardRewards.json/kurzanAzenaBlessingRewards.json은 카테고리 탭 구성(key/label)과
// itemId·amount만 담고, 이름·이미지는 itemCatalog.json에서 찾아 채운다(workspace/backend의
// lib/rewardCatalog.ts와 동일 원칙) — RewardSelectionModal이 기대하는 RewardItem 모양으로
// 미리 조립해 GuardianWidget.tsx/KurzanFrontlineWidget.tsx 양쪽이 그대로 쓸 수 있게 한다.
// 카탈로그에 없는 itemId는 운영 데이터 불일치로 보고 조용히 건너뛴다.
function resolveCategories(categories: CatalogCategory[]): RewardCategory[] {
  return categories.map((category) => ({
    key: category.key,
    label: category.label,
    items: category.items.flatMap((entry) => {
      const item = findItem(entry.itemId)
      if (!item) return []
      return [{ id: item.id, name: item.name, quantity: entry.amount, imageUrl: item.imageUrl }]
    }),
  }))
}

// 가디언 토벌과 쿠르잔 전선은 같은 재화 체계를 그대로 쓰므로(GuardianWidget.tsx·
// KurzanFrontlineWidget.tsx 둘 다 이 상수를 그대로 import) 카탈로그도 콘텐츠별로 나누지 않고 공유한다.
export const SHARD_REWARD_CATEGORIES: RewardCategory[] = resolveCategories(
  kurzanShardRewardsData.categories as CatalogCategory[],
)
export const AZENA_BLESSING_REWARD_CATEGORIES: RewardCategory[] = resolveCategories(
  kurzanAzenaBlessingRewardsData.categories as CatalogCategory[],
)
