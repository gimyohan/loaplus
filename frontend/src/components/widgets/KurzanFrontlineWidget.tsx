import { Bed, Check, Settings, Ticket } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Tooltip } from '@/components/ui/tooltip'
import { AzenaBlessingIcon, ResonancePotionIcon, ShardIcon } from '@/components/widgets/icons'
import { RestGaugeBar } from '@/components/widgets/RestGaugeBar'
import { RewardSelectionModal, type RewardCategory, type RewardItem } from '@/components/widgets/RewardSelectionModal'
import kurzanAzenaBlessingRewards from '@/data/kurzanAzenaBlessingRewards.json'
import kurzanShardRewards from '@/data/kurzanShardRewards.json'
import { cn } from '@/lib/utils'
import type { KurzanFrontlineSummary } from '@/types/kurzanFrontline'

const SHARD_REWARD_CATEGORIES: RewardCategory[] = kurzanShardRewards.categories
const AZENA_BLESSING_REWARD_CATEGORIES: RewardCategory[] = kurzanAzenaBlessingRewards.categories

const QUICK_ACTIONS = [
  { key: 'resonancePotion', label: '공명비약', icon: ResonancePotionIcon },
  { key: 'shard', label: '편린', icon: ShardIcon },
  { key: 'azenaBlessing', label: '아제나 축복', icon: AzenaBlessingIcon },
  { key: 'ticket', label: '입장권', icon: Ticket },
] as const

// 체크박스 경고 깜빡임 지속 시간(ms). tailwind.config.js의 flash-warning 애니메이션(0.4s * 3회)과 맞춘다
const RESONANCE_WARNING_DURATION_MS = 1200

export interface KurzanFrontlineWidgetProps {
  data: KurzanFrontlineSummary
  /** '오늘 수확' 체크박스 토글 (docs/widgets.typ 참고) */
  onToggleHarvested?: (checked: boolean) => void
  onOpenSettings?: () => void
  onQuickAction?: (action: (typeof QUICK_ACTIONS)[number]['key']) => void
  /** 공명비약 사용(완료 상태에서만 가능): 휴식 게이지는 그대로 두고 체크박스만 초기화한다 */
  onUseResonancePotion?: () => void
  onClaimShardReward?: (item: RewardItem) => void
  onClaimAzenaBlessingReward?: (item: RewardItem) => void
  className?: string
}

/**
 * 쿠르잔 전선(Kurzan Frontline) 위젯. 가디언 토벌과 상태값 관리 체계가 동일하여
 * 대상 콘텐츠 / 휴식 게이지 / 오늘 수확 여부를 같은 형태로 보여준다.
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
  const { targetName, restGauge, restGaugeMax, restGaugeThreshold, isHarvested } = data
  // 임계 게이지 미만이면 휴식 기간으로 보고, 설정(톱니바퀴)을 제외한 상호작용을 막는다.
  // 단, '오늘 수확'을 완료해서 게이지가 임계치 아래로 내려간 경우는 그 결과로 휴식 중 처리하지 않는다
  // (공명비약 재활성화 등 완료 상태에서 필요한 상호작용까지 막히면 안 되기 때문)
  const isResting = restGauge < restGaugeThreshold && !isHarvested
  // 휴식 중에는 설정 외 상호작용을 막는다. 체크박스는 완료 후에도 계속 조작 가능하다 — 체크
  // 해제 시 로그 롤백(게이지 원복)으로 되돌리며, 공명의 비약(게이지는 그대로 두고 체크만 초기화)은
  // 별도 퀵액션 버튼으로 처리한다(docs/api.typ "체크박스 해제" 참고).
  const isCheckboxDisabled = isResting

  // 완료 전에 공명비약을 사용하려고 하면 체크박스를 빨갛게 깜빡여 경고한다
  const [isResonanceWarningActive, setIsResonanceWarningActive] = useState(false)
  const resonanceWarningTimeoutRef = useRef<number | undefined>(undefined)

  // 편린 / 아제나 축복 보상 선택 모달. 데이터를 바꾸지 않는 조회/선택용 UI라 부모로 올리지 않고 위젯 내부에서만 관리한다
  const [isShardRewardModalOpen, setIsShardRewardModalOpen] = useState(false)
  const [isAzenaBlessingRewardModalOpen, setIsAzenaBlessingRewardModalOpen] = useState(false)

  useEffect(() => {
    return () => window.clearTimeout(resonanceWarningTimeoutRef.current)
  }, [])

  const handleQuickActionClick = (key: (typeof QUICK_ACTIONS)[number]['key']) => {
    if (key === 'shard') {
      setIsShardRewardModalOpen(true)
      return
    }

    if (key === 'azenaBlessing') {
      setIsAzenaBlessingRewardModalOpen(true)
      return
    }

    if (key !== 'resonancePotion') {
      onQuickAction?.(key)
      return
    }

    if (!isHarvested) {
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
    <div
      className={cn(
        'relative flex aspect-[5/3] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg',
        className,
      )}
    >
      {/* 상단: 오늘 수확 여부 체크박스 / 대상 콘텐츠 이름 / 설정. 체크박스 자체 외에 이 블럭
          전체를 눌러도 토글되도록 해 매번 체크박스를 정확히 클릭해야 하는 번거로움을 줄인다 */}
      <div
        role="button"
        tabIndex={isCheckboxDisabled ? -1 : 0}
        aria-disabled={isCheckboxDisabled}
        onClick={() => {
          if (!isCheckboxDisabled) onToggleHarvested?.(!isHarvested)
        }}
        onKeyDown={(event) => {
          if (isCheckboxDisabled) return
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onToggleHarvested?.(!isHarvested)
          }
        }}
        className={cn(
          'flex items-center justify-between gap-3 border-b border-border px-5 py-2.5',
          !isCheckboxDisabled && 'cursor-pointer transition-colors hover:bg-muted/50',
        )}
      >
        <label
          className="relative flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md"
          onClick={(event) => event.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={isHarvested}
            disabled={isCheckboxDisabled}
            onChange={(event) => onToggleHarvested?.(event.target.checked)}
            aria-label="오늘 수확 여부"
            className={cn(
              'peer h-6 w-6 shrink-0 cursor-pointer appearance-none rounded-md border border-border bg-background transition-colors checked:border-primary checked:bg-primary disabled:cursor-not-allowed',
              isResonanceWarningActive && 'animate-flash-warning',
            )}
          />
          <Check className="pointer-events-none absolute h-4 w-4 text-primary-foreground opacity-0 peer-checked:opacity-100" />
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
          aria-label="쿠르잔 전선 설정"
          onClick={(event) => {
            event.stopPropagation()
            onOpenSettings?.()
          }}
          className="relative z-20 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>

      {/* 중단: 휴식 게이지. 오늘 수확을 완료하면 대상 콘텐츠 이름처럼 흐리게 표시한다.
          제목 블럭과 마찬가지로 여기를 눌러도 체크박스가 토글된다 */}
      <div
        role="button"
        tabIndex={isCheckboxDisabled ? -1 : 0}
        aria-disabled={isCheckboxDisabled}
        onClick={() => {
          if (!isCheckboxDisabled) onToggleHarvested?.(!isHarvested)
        }}
        onKeyDown={(event) => {
          if (isCheckboxDisabled) return
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onToggleHarvested?.(!isHarvested)
          }
        }}
        className={cn(
          'flex flex-1 flex-col justify-center gap-3 px-5 py-4 transition-opacity',
          isHarvested && 'opacity-50',
          !isCheckboxDisabled && 'cursor-pointer transition-colors hover:bg-muted/50',
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

      {/* 하단: 관련 재화 바로가기. 4등분해서 아이콘 주변 배경을 눌러도 클릭되도록 버튼이 각 영역을 꽉 채운다 */}
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
