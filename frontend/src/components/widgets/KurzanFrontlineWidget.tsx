import { Ticket } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { EBONY_CUBE_TICKET_ICONS, FateShardIcon, TrialSandIcon } from '@/components/widgets/gameItemIcons'
import { AzenaBlessingIcon, ResonancePotionIcon } from '@/components/widgets/icons'
import { RestHomeworkRow } from '@/components/widgets/RestHomeworkRow'
import { RewardSelectionModal, type RewardItem } from '@/components/widgets/RewardSelectionModal'
import { isChaosRiftKurzanTarget, kurzanTicketType } from '@/lib/contentStages'
import { AZENA_BLESSING_REWARD_CATEGORIES, SHARD_REWARD_CATEGORIES } from '@/lib/rewardCatalog'
import type { KurzanFrontlineSummary } from '@/types/kurzanFrontline'

export type QuickActionKey = 'resonancePotion' | 'shard' | 'azenaBlessing' | 'ticket'

// 수확 전에 공명비약을 누르면 체크박스를 빨갛게 깜빡여 "먼저 수확하세요"를 알린다.
const RESONANCE_WARNING_DURATION_MS = 1200

export interface KurzanFrontlineWidgetProps {
  data: KurzanFrontlineSummary
  /** '오늘 수확' 체크박스 토글 (docs/widgets.md 참고) */
  onToggleHarvested?: (checked: boolean) => void
  onOpenSettings?: () => void
  /** 공명비약/편린/아제나 축복을 제외한 빠른 동작(입장권 · 시련의 모래) */
  onQuickAction?: (action: QuickActionKey) => void
  /** 공명비약 사용(오늘 수확을 완료한 뒤에만 호출된다) */
  onUseResonancePotion?: () => void
  onClaimShardReward?: (item: RewardItem) => void
  onClaimAzenaBlessingReward?: (item: RewardItem) => void
  className?: string
}

/**
 * 쿠르잔 전선 위젯 — 카드 안 행 하나(가디언과 같은 RestHomeworkRow). 빠른 동작은 공명비약 / 편린 /
 * 아제나 축복 / 입장권(대상이 혼돈의 균열 단계면 시련의 모래) 넷이다.
 */
export function KurzanFrontlineWidget({
  data,
  onToggleHarvested,
  onOpenSettings,
  onQuickAction,
  onUseResonancePotion,
  onClaimShardReward,
  onClaimAzenaBlessingReward,
  className,
}: KurzanFrontlineWidgetProps) {
  const isSandStage = isChaosRiftKurzanTarget(data.targetName)
  // 입장권 버튼은 대상 단계가 주는 에브니 큐브 입장권 등급의 공식 아이콘. 매핑이 없는 대상이면 기존 티켓 아이콘.
  const ticketType = kurzanTicketType(data.targetName)
  const TicketIcon = ticketType ? EBONY_CUBE_TICKET_ICONS[ticketType] : Ticket

  const [isResonanceWarningActive, setIsResonanceWarningActive] = useState(false)
  const resonanceWarningTimeoutRef = useRef<number | undefined>(undefined)
  const [isShardRewardModalOpen, setIsShardRewardModalOpen] = useState(false)
  const [isAzenaBlessingRewardModalOpen, setIsAzenaBlessingRewardModalOpen] = useState(false)

  useEffect(() => {
    return () => window.clearTimeout(resonanceWarningTimeoutRef.current)
  }, [])

  // 공명비약은 오늘 수확을 다시 할 수 있게 완료 여부만 초기화하는 아이템이라, 아직 수확 전이면 쓸
  // 이유가 없다 — 그때는 사용하지 않고 체크박스를 깜빡여 알린다.
  const handleResonancePotion = () => {
    if (!data.isHarvested) {
      window.clearTimeout(resonanceWarningTimeoutRef.current)
      setIsResonanceWarningActive(true)
      resonanceWarningTimeoutRef.current = window.setTimeout(
        () => setIsResonanceWarningActive(false),
        RESONANCE_WARNING_DURATION_MS,
      )
      return
    }
    onUseResonancePotion?.()
  }

  return (
    <>
      <RestHomeworkRow
        {...data}
        onToggleHarvested={onToggleHarvested}
        onOpenSettings={onOpenSettings}
        settingsLabel="쿠르잔 전선 설정"
        checkboxFlashing={isResonanceWarningActive}
        quickActions={[
          { key: 'resonancePotion', label: '공명비약', icon: ResonancePotionIcon, onClick: handleResonancePotion },
          { key: 'shard', label: '편린', icon: FateShardIcon, onClick: () => setIsShardRewardModalOpen(true) },
          {
            key: 'azenaBlessing',
            label: '아제나 축복',
            icon: AzenaBlessingIcon,
            onClick: () => setIsAzenaBlessingRewardModalOpen(true),
          },
          {
            key: 'ticket',
            label: isSandStage ? '시련의 모래' : '입장권',
            icon: isSandStage ? TrialSandIcon : TicketIcon,
            onClick: () => onQuickAction?.('ticket'),
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
