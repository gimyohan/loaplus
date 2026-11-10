import { useState } from 'react'

import { AzenaBlessingIcon, ShardIcon } from '@/components/widgets/icons'
import { RestHomeworkRow } from '@/components/widgets/RestHomeworkRow'
import { RewardSelectionModal, type RewardItem } from '@/components/widgets/RewardSelectionModal'
import { AZENA_BLESSING_REWARD_CATEGORIES, SHARD_REWARD_CATEGORIES } from '@/lib/rewardCatalog'
import type { GuardianSummary } from '@/types/guardian'

export interface GuardianWidgetProps {
  data: GuardianSummary
  /** '오늘 수확' 체크박스 토글 (docs/widgets.md 참고) */
  onToggleHarvested?: (checked: boolean) => void
  onOpenSettings?: () => void
  onClaimShardReward?: (item: RewardItem) => void
  onClaimAzenaBlessingReward?: (item: RewardItem) => void
  className?: string
}

/**
 * 가디언(Guardian) 위젯 — 카드 안 행 하나. 쿠르잔 전선과 상태값 관리 체계가 같아(대상 콘텐츠 /
 * 휴식 게이지 / 오늘 수확) 같은 행(RestHomeworkRow)을 쓰고, 빠른 동작은 편린 / 아제나 축복 둘뿐이다
 * (보상 목록은 쿠르잔 전선과 공유, lib/rewardCatalog.ts).
 */
export function GuardianWidget({
  data,
  onToggleHarvested,
  onOpenSettings,
  onClaimShardReward,
  onClaimAzenaBlessingReward,
  className,
}: GuardianWidgetProps) {
  // 보상 선택 모달은 데이터를 바꾸지 않는 선택 UI라 위젯 안에서만 관리한다.
  const [isShardRewardModalOpen, setIsShardRewardModalOpen] = useState(false)
  const [isAzenaBlessingRewardModalOpen, setIsAzenaBlessingRewardModalOpen] = useState(false)

  return (
    <>
      <RestHomeworkRow
        {...data}
        onToggleHarvested={onToggleHarvested}
        onOpenSettings={onOpenSettings}
        settingsLabel="가디언 설정"
        quickActions={[
          { key: 'shard', label: '편린', icon: ShardIcon, onClick: () => setIsShardRewardModalOpen(true) },
          {
            key: 'azenaBlessing',
            label: '아제나 축복',
            icon: AzenaBlessingIcon,
            onClick: () => setIsAzenaBlessingRewardModalOpen(true),
          },
        ]}
        className={className}
      />

      <RewardSelectionModal
        open={isShardRewardModalOpen}
        onClose={() => setIsShardRewardModalOpen(false)}
        title="편린 보상 선택"
        categories={SHARD_REWARD_CATEGORIES}
        onSelectItem={onClaimShardReward}
      />

      <RewardSelectionModal
        open={isAzenaBlessingRewardModalOpen}
        onClose={() => setIsAzenaBlessingRewardModalOpen(false)}
        title="아제나 축복 보상 선택"
        categories={AZENA_BLESSING_REWARD_CATEGORIES}
        onSelectItem={onClaimAzenaBlessingReward}
      />
    </>
  )
}
