import { Bed, Check, Settings } from 'lucide-react'
import { useState } from 'react'

import { Tooltip } from '@/components/ui/tooltip'
import { AzenaBlessingIcon, ShardIcon } from '@/components/widgets/icons'
import { RestGaugeBar } from '@/components/widgets/RestGaugeBar'
import { RewardSelectionModal, type RewardCategory, type RewardItem } from '@/components/widgets/RewardSelectionModal'
import kurzanAzenaBlessingRewards from '@/data/kurzanAzenaBlessingRewards.json'
import kurzanShardRewards from '@/data/kurzanShardRewards.json'
import { cn } from '@/lib/utils'
import type { GuardianSummary } from '@/types/guardian'

// 가디언 토벌에서는 편린 / 아제나 축복만 사용한다
// 보상 목록은 쿠르잔 전선과 같은 재화 체계를 그대로 쓰므로 데이터도 공유한다
const SHARD_REWARD_CATEGORIES: RewardCategory[] = kurzanShardRewards.categories
const AZENA_BLESSING_REWARD_CATEGORIES: RewardCategory[] = kurzanAzenaBlessingRewards.categories

const QUICK_ACTIONS = [
  { key: 'shard', label: '편린', icon: ShardIcon },
  { key: 'azenaBlessing', label: '아제나 축복', icon: AzenaBlessingIcon },
] as const

export interface GuardianWidgetProps {
  data: GuardianSummary
  /** '오늘 수확' 체크박스 토글 (docs/widgets.typ 참고) */
  onToggleHarvested?: (checked: boolean) => void
  onOpenSettings?: () => void
  onClaimShardReward?: (item: RewardItem) => void
  onClaimAzenaBlessingReward?: (item: RewardItem) => void
  className?: string
}

/**
 * 가디언(Guardian) 위젯. 쿠르잔 전선과 상태값 관리 체계가 동일하여
 * 대상 콘텐츠 / 휴식 게이지 / 오늘 수확 여부를 같은 형태로 보여준다.
 */
export function GuardianWidget({
  data,
  onToggleHarvested,
  onOpenSettings,
  onClaimShardReward,
  onClaimAzenaBlessingReward,
  className,
}: GuardianWidgetProps) {
  const { targetName, restGauge, restGaugeMax, restGaugeThreshold, isHarvested } = data
  // 임계 게이지 미만이면 휴식 기간으로 보고, 설정(톱니바퀴)을 제외한 상호작용을 막는다.
  // 단, '오늘 수확'을 완료해서 게이지가 임계치 아래로 내려간 경우는 그 결과로 휴식 중 처리하지 않는다
  const isResting = restGauge < restGaugeThreshold && !isHarvested
  // 휴식 중에는 설정 외 상호작용을 막는다. 체크박스는 완료 후에도 계속 조작 가능하다 —
  // 체크 해제 시 로그 롤백으로 되돌린다(docs/api.typ "체크박스 해제" 참고).
  const isCheckboxDisabled = isResting

  // 편린 / 아제나 축복 보상 선택 모달. 데이터를 바꾸지 않는 조회/선택용 UI라 부모로 올리지 않고 위젯 내부에서만 관리한다
  const [isShardRewardModalOpen, setIsShardRewardModalOpen] = useState(false)
  const [isAzenaBlessingRewardModalOpen, setIsAzenaBlessingRewardModalOpen] = useState(false)

  const handleQuickActionClick = (key: (typeof QUICK_ACTIONS)[number]['key']) => {
    if (key === 'shard') {
      setIsShardRewardModalOpen(true)
      return
    }

    setIsAzenaBlessingRewardModalOpen(true)
  }

  return (
    <div
      className={cn(
        'relative flex aspect-[5/3] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg',
        className,
      )}
    >
      {/* 상단: 오늘 수확 여부 체크박스 / 대상 콘텐츠 이름 / 설정 */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <label className="relative flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center">
          <input
            type="checkbox"
            checked={isHarvested}
            disabled={isCheckboxDisabled}
            onChange={(event) => onToggleHarvested?.(event.target.checked)}
            aria-label="오늘 수확 여부"
            className="peer h-7 w-7 shrink-0 cursor-pointer appearance-none rounded-md border border-border bg-background transition-colors checked:border-primary checked:bg-primary disabled:cursor-not-allowed"
          />
          <Check className="pointer-events-none absolute h-5 w-5 text-primary-foreground opacity-0 peer-checked:opacity-100" />
        </label>

        <h3
          className={cn(
            'min-w-0 flex-1 truncate text-center text-xl font-semibold text-foreground',
            isHarvested && 'text-muted-foreground line-through decoration-2',
          )}
        >
          {targetName}
        </h3>

        {/* 휴식 중에도 설정만은 항상 클릭 가능해야 하므로 오버레이보다 위 스택에 둔다 */}
        <button
          type="button"
          aria-label="가디언 설정"
          onClick={onOpenSettings}
          className="relative z-20 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Settings className="h-6 w-6" />
        </button>
      </div>

      {/* 중단: 휴식 게이지. 오늘 수확을 완료하면 대상 콘텐츠 이름처럼 흐리게 표시한다 */}
      <div
        className={cn(
          'flex flex-1 flex-col justify-center gap-3 px-5 py-4 transition-opacity',
          isHarvested && 'opacity-50',
        )}
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-base uppercase tracking-wide text-muted-foreground">
            휴식 게이지
          </span>
          <span className="font-mono text-base text-secondary">
            {restGauge}/{restGaugeMax}
          </span>
        </div>
        <RestGaugeBar value={restGauge} max={restGaugeMax} className="h-4" />
      </div>

      {/* 하단: 관련 재화 바로가기. 이등분해서 아이콘 주변 배경을 눌러도 클릭되도록 버튼이 각 영역을 꽉 채운다 */}
      <div className="flex divide-x divide-border border-t border-border bg-muted">
        {QUICK_ACTIONS.map(({ key, label, icon: Icon }) => (
          <Tooltip key={key} label={label} className="flex-1">
            <button
              type="button"
              aria-label={label}
              disabled={isResting}
              onClick={() => handleQuickActionClick(key)}
              className="flex flex-1 flex-col items-center justify-center py-3.5 text-muted-foreground transition-colors hover:bg-card hover:text-foreground disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              <Icon className="h-7 w-7" />
            </button>
          </Tooltip>
        ))}
      </div>

      {/* 휴식 중 오버레이: 반투명 막 + 침대 아이콘으로 쉬는 느낌을 준다. 설정 버튼만 위 스택이라 가려지지 않는다 */}
      {isResting && (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/70 backdrop-blur-[2px]">
          <Bed className="h-10 w-10 text-muted-foreground" />
          <span className="font-mono text-sm uppercase tracking-wide text-muted-foreground">
            휴식 중
          </span>
        </div>
      )}

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
    </div>
  )
}
