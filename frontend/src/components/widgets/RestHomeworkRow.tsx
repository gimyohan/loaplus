import { Bed } from 'lucide-react'
import type { ComponentType } from 'react'

import { Tooltip } from '@/components/ui/tooltip'
import { RestGaugeBar } from '@/components/widgets/RestGaugeBar'
import { ROW_PADDING_CLASSNAME, RowCheckbox, RowSettingsButton, RowTitle, ToggleArea } from '@/components/widgets/rowParts'
import { cn } from '@/lib/utils'

export interface RestHomeworkQuickAction {
  key: string
  label: string
  icon: ComponentType<{ className?: string }>
  onClick: () => void
}

// 빠른 동작 칸의 고정 폭 — 가장 많은 쿠르잔 전선(4개) 기준. 가디언(2개)도 같은 폭을 써서, 두 행이
// 위아래로 놓였을 때 휴식 게이지가 같은 가로 위치에 오게 한다(사용자 확정).
const MAX_QUICK_ACTIONS = 4
const QUICK_ACTION_SIZE_PX = 24

export interface RestHomeworkRowProps {
  targetName: string
  restGauge: number
  restGaugeMax: number
  restGaugeThreshold: number
  isHarvested: boolean
  onToggleHarvested?: (checked: boolean) => void
  onOpenSettings?: () => void
  settingsLabel: string
  /** 빠른 동작 칸(최대 4칸, 왼쪽부터). null은 빈 칸이다 — 가디언은 쿠르잔 전선의 공명비약 자리를 비워
   * 편린·아제나 축복 아이콘이 두 행에서 같은 가로 위치에 오게 한다(사용자 확정). */
  quickActions: Array<RestHomeworkQuickAction | null>
  /** true면 체크박스를 빨갛게 깜빡여 경고한다(쿠르잔: 수확 전 공명비약). */
  checkboxFlashing?: boolean
  className?: string
}

/**
 * 휴식 게이지가 있는 일일 숙제(가디언/쿠르잔 전선)의 행 — 낙원·루틴과 같은 한 줄(약 45px)이다.
 * 오늘 수확 체크 · 대상 이름 · 휴식 게이지(숫자는 툴팁) · 빠른 동작 아이콘 · 설정 순서.
 *
 * 임계 게이지 미만이면 휴식 기간으로 보고 설정을 제외한 상호작용(체크·빠른 동작)을 막는다. 단, 오늘
 * 수확을 해서 임계치 아래로 내려간 경우는 휴식으로 치지 않는다. 체크는 완료 후에도 해제할 수 있다
 * (해제 = 로그 롤백, docs/api.md "체크박스 해제").
 */
export function RestHomeworkRow({
  targetName,
  restGauge,
  restGaugeMax,
  restGaugeThreshold,
  isHarvested,
  onToggleHarvested,
  onOpenSettings,
  settingsLabel,
  quickActions,
  checkboxFlashing = false,
  className,
}: RestHomeworkRowProps) {
  const isResting = restGauge < restGaugeThreshold && !isHarvested
  const gaugeLabel = `휴식 게이지 ${restGauge}/${restGaugeMax}`

  return (
    <div className={cn(ROW_PADDING_CLASSNAME, 'flex items-center gap-2', className)}>
      <ToggleArea disabled={isResting} onToggle={() => onToggleHarvested?.(!isHarvested)} className="min-w-0 flex-1">
        <RowCheckbox
          checked={isHarvested}
          disabled={isResting}
          onChange={onToggleHarvested}
          label="오늘 수확 여부"
          flashing={checkboxFlashing}
        />
        <RowTitle done={isHarvested} className="flex-1">
          {targetName}
        </RowTitle>
        {isResting && (
          <span className="shrink-0 text-muted-foreground" title="휴식 게이지가 기준 미만이라 쉬는 중" aria-label="휴식 중">
            <Bed className="h-3.5 w-3.5" />
          </span>
        )}
        <Tooltip label={gaugeLabel} className="shrink-0">
          <span aria-label={gaugeLabel} className={cn('block', (isHarvested || isResting) && 'opacity-50')}>
            <RestGaugeBar value={restGauge} max={restGaugeMax} className="h-1.5 w-11 gap-0.5" />
          </span>
        </Tooltip>
      </ToggleArea>

      <div className="flex shrink-0 items-center" style={{ width: MAX_QUICK_ACTIONS * QUICK_ACTION_SIZE_PX }}>
        {quickActions.map((action, index) =>
          action === null ? (
            <span key={`empty-${index}`} aria-hidden className="shrink-0" style={{ width: QUICK_ACTION_SIZE_PX }} />
          ) : (
          <Tooltip key={action.key} label={action.label}>
            <button
              type="button"
              aria-label={action.label}
              disabled={isResting}
              onClick={(event) => {
                event.stopPropagation()
                action.onClick()
              }}
              className="flex items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
              style={{ width: QUICK_ACTION_SIZE_PX, height: QUICK_ACTION_SIZE_PX }}
            >
              <action.icon className="h-[15px] w-[15px]" />
            </button>
          </Tooltip>
          ),
        )}
      </div>

      <RowSettingsButton label={settingsLabel} onClick={onOpenSettings} />
    </div>
  )
}
