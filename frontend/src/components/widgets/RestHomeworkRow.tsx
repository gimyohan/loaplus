import { Bed } from 'lucide-react'
import type { ComponentType } from 'react'

import { RestGaugeBar } from '@/components/widgets/RestGaugeBar'
import {
  ROW_PADDING_CLASSNAME,
  RowCheckbox,
  RowIconButton,
  RowSettingsButton,
  RowTitle,
  ToggleArea,
} from '@/components/widgets/rowParts'
import { cn } from '@/lib/utils'

export interface RestHomeworkQuickAction {
  key: string
  label: string
  icon: ComponentType<{ className?: string }>
  onClick: () => void
}

export interface RestHomeworkRowProps {
  targetName: string
  restGauge: number
  restGaugeMax: number
  restGaugeThreshold: number
  isHarvested: boolean
  onToggleHarvested?: (checked: boolean) => void
  onOpenSettings?: () => void
  settingsLabel: string
  quickActions: RestHomeworkQuickAction[]
  /** true면 체크박스를 빨갛게 깜빡여 경고한다(쿠르잔: 수확 전 공명비약). */
  checkboxFlashing?: boolean
  className?: string
}

/**
 * 휴식 게이지가 있는 일일 숙제(가디언/쿠르잔 전선)의 행. 윗줄은 오늘 수확 체크·대상 이름·휴식
 * 게이지·설정, 아랫줄은 빠른 동작(편린/아제나 축복 등) 아이콘이다 — 예전 210px 박스의 기능을 그대로
 * 두고 높이만 72px 안팎으로 줄였다.
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

  return (
    <div className={cn(ROW_PADDING_CLASSNAME, 'flex flex-col gap-1', className)}>
      <div className="flex items-center gap-2">
        <ToggleArea disabled={isResting} onToggle={() => onToggleHarvested?.(!isHarvested)} className="flex-1">
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
            <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground" title="휴식 게이지가 기준 미만이라 쉬는 중">
              <Bed className="h-3.5 w-3.5" />
              휴식
            </span>
          )}
          <div className={cn('flex shrink-0 items-center gap-1.5', (isHarvested || isResting) && 'opacity-50')}>
            <RestGaugeBar value={restGauge} max={restGaugeMax} className="h-1.5 w-[60px] gap-0.5" />
            <span className="w-[50px] text-right font-mono text-xs text-muted-foreground">
              {restGauge}/{restGaugeMax}
            </span>
          </div>
        </ToggleArea>
        <RowSettingsButton label={settingsLabel} onClick={onOpenSettings} />
      </div>

      <div className="flex items-center gap-0.5 pl-5">
        {quickActions.map(({ key, label, icon, onClick }) => (
          <RowIconButton key={key} label={label} icon={icon} onClick={onClick} disabled={isResting} />
        ))}
      </div>
    </div>
  )
}
