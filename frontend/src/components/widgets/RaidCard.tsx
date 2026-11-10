import { useState } from 'react'

import { RaidTargetModal } from '@/components/widgets/RaidTargetModal'
import { RaidWidget, type RaidGateView } from '@/components/widgets/RaidWidget'
import { cn } from '@/lib/utils'
import { useReportPendingHomework } from '@/lib/pendingHomework'
import raidCatalogData from '@/data/raidCatalog.json'
import type { RaidTargetSummary } from '@/types/raid'
import type { WidgetCardProps } from '@/types/widget'

const RAID_CATALOG = raidCatalogData.raids

// 팔레트 미리보기 등 특정 위젯 인스턴스에 묶이지 않은 곳에서 raid를 렌더링할 때 쓰는 예시 데이터.
// 실제로 막 추가한 레이드 위젯도 목표 없이 빈 상태로 시작하므로, 미리보기도 같은 빈 상태를 보여준다.
const MOCK_RAID_PREVIEW: RaidTargetSummary = {
  raidKey: null,
  difficultyKey: null,
  gates: [],
  goldRewardEnabled: true,
}

export function RaidCard({
  width,
  disabledClassName,
  className,
  bannerCharacter,
  interactive,
  record,
  raid,
  raidExcludedKeys,
  onRaidGateToggle,
  onRaidMoreRewardToggle,
  onRaidTargetChange,
  onRaidGoldRewardChange,
}: WidgetCardProps) {
  const [isRaidSettingsOpen, setIsRaidSettingsOpen] = useState(false)

  // 특정 위젯 인스턴스에 묶이지 않은 미리보기(팔레트 등)는 raid가 전달되지 않으므로 예시 데이터를 쓴다.
  const raidData = raid ?? MOCK_RAID_PREVIEW
  const raidDefinition = RAID_CATALOG.find((candidate) => candidate.key === raidData.raidKey)
  const difficultyDefinition = raidDefinition?.difficulties.find(
    (candidate) => candidate.key === raidData.difficultyKey,
  )
  const gateViews: RaidGateView[] = raidData.gates.map((gate, index) => ({
    cleared: gate.cleared,
    moreRewardEnabled: gate.moreRewardEnabled,
    goldReward: difficultyDefinition?.gates[index]?.goldReward ?? 0,
    boundGoldReward: difficultyDefinition?.gates[index]?.boundGoldReward ?? 0,
  }))
  const hasClearedGate = raidData.gates.some((gate) => gate.cleared)
  // 사이드바 미완료 뱃지: 목표를 정한 레이드에 안 깬 관문이 남아 있으면 1개. 미리보기(팔레트·배치
  // 편집)는 interactive가 꺼져 있어 보고하지 않는다 — 실제 카드에 배치된 인스턴스만 센다.
  useReportPendingHomework(
    interactive ? record?.id : undefined,
    raid && raid.raidKey ? raid.gates.some((gate) => !gate.cleared) : null,
  )

  return (
    <>
      <div style={{ width }} className={cn('select-none', disabledClassName, className)}>
        <RaidWidget
          raidName={raidDefinition?.name ?? raidData.raidKey}
          difficultyName={difficultyDefinition?.name ?? raidData.difficultyKey}
          gates={gateViews}
          goldRewardEnabled={raidData.goldRewardEnabled}
          onToggleGateCleared={onRaidGateToggle}
          onToggleMoreReward={onRaidMoreRewardToggle}
          onOpenSettings={() => setIsRaidSettingsOpen(true)}
        />
      </div>
      <RaidTargetModal
        open={isRaidSettingsOpen}
        onClose={() => setIsRaidSettingsOpen(false)}
        title={`${bannerCharacter.characterName}의 레이드 설정`}
        characterItemLevel={bannerCharacter.itemLevel}
        excludedRaidKeys={raidExcludedKeys}
        initialRaidKey={raidData.raidKey}
        initialDifficultyKey={raidData.difficultyKey}
        locked={hasClearedGate}
        onConfirm={(raidKey, difficultyKey) => {
          onRaidTargetChange?.(raidKey, difficultyKey)
          setIsRaidSettingsOpen(false)
        }}
        goldRewardEnabled={raidData.goldRewardEnabled}
        onGoldRewardChange={(enabled) => onRaidGoldRewardChange?.(enabled)}
      />
    </>
  )
}
