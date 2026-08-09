import { Check, Settings } from 'lucide-react'

import { AzenaBlessingIcon, ShardIcon } from '@/components/widgets/icons'
import { RestGaugeBar } from '@/components/widgets/RestGaugeBar'
import { cn } from '@/lib/utils'
import type { GuardianSummary } from '@/types/guardian'

// 가디언 토벌에서는 편린 / 아제나 축복만 사용한다
const QUICK_ACTIONS = [
  { key: 'shard', label: '편린', icon: ShardIcon },
  { key: 'azenaBlessing', label: '아제나 축복', icon: AzenaBlessingIcon },
] as const

export interface GuardianWidgetProps {
  data: GuardianSummary
  /** '오늘 수확' 체크박스 토글 (docs/widgets.typ 참고) */
  onToggleHarvested?: (checked: boolean) => void
  onOpenSettings?: () => void
  onQuickAction?: (action: (typeof QUICK_ACTIONS)[number]['key']) => void
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
  onQuickAction,
  className,
}: GuardianWidgetProps) {
  const { targetName, restGauge, restGaugeMax, isHarvested } = data

  return (
    <div
      className={cn(
        'flex aspect-[5/3] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg',
        className,
      )}
    >
      {/* 상단: 오늘 수확 여부 체크박스 / 대상 콘텐츠 이름 / 설정 */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <label className="relative flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center">
          <input
            type="checkbox"
            checked={isHarvested}
            onChange={(event) => onToggleHarvested?.(event.target.checked)}
            aria-label="오늘 수확 여부"
            className="peer h-6 w-6 shrink-0 cursor-pointer appearance-none rounded-md border border-border bg-background transition-colors checked:border-primary checked:bg-primary"
          />
          <Check className="pointer-events-none absolute h-4 w-4 text-primary-foreground opacity-0 peer-checked:opacity-100" />
        </label>

        <h3 className="min-w-0 flex-1 truncate text-center text-lg font-semibold text-foreground">
          {targetName}
        </h3>

        <button
          type="button"
          aria-label="가디언 설정"
          onClick={onOpenSettings}
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>

      {/* 중단: 휴식 게이지 */}
      <div className="flex flex-1 flex-col justify-center gap-3 px-5 py-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
            휴식 게이지
          </span>
          <span className="font-mono text-xs text-secondary">
            {restGauge}/{restGaugeMax}
          </span>
        </div>
        <RestGaugeBar value={restGauge} max={restGaugeMax} />
      </div>

      {/* 하단: 관련 재화 바로가기. 이등분해서 아이콘 주변 배경을 눌러도 클릭되도록 버튼이 각 영역을 꽉 채운다 */}
      <div className="flex divide-x divide-border border-t border-border bg-muted">
        {QUICK_ACTIONS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            aria-label={label}
            onClick={() => onQuickAction?.(key)}
            className="flex flex-1 flex-col items-center justify-center gap-1 py-3 text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
          >
            <Icon className="h-5 w-5" />
            <span className="font-mono text-[10px] uppercase tracking-wide">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
