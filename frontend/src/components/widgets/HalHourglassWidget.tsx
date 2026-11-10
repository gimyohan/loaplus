import { ROW_PADDING_CLASSNAME, RowCheckbox, RowSettingsButton, RowTitle, ToggleArea } from '@/components/widgets/rowParts'
import { cn } from '@/lib/utils'
import type { HalHourglassSummary } from '@/types/halHourglass'

const MAX_SAND_STACK = 5

export interface HalHourglassWidgetProps {
  data: HalHourglassSummary
  /** 주간 완료 체크박스 토글 */
  onToggleCompleted?: (checked: boolean) => void
  onOpenSettings?: () => void
  className?: string
}

/**
 * 할의 모래시계 위젯 — 카드 안 행 하나. 주간 완료 체크(행을 눌러도 토글, 가디언/쿠르잔과 같은
 * 패턴), 단계 이름, 시련의 모래 스택(5칸, 표시 전용), 설정.
 */
export function HalHourglassWidget({ data, onToggleCompleted, onOpenSettings, className }: HalHourglassWidgetProps) {
  const { level, sandStack, isCompleted } = data

  return (
    <div className={cn(ROW_PADDING_CLASSNAME, 'flex items-center gap-2', className)}>
      <ToggleArea onToggle={() => onToggleCompleted?.(!isCompleted)} className="flex-1">
        <RowCheckbox checked={isCompleted} onChange={onToggleCompleted} label="주간 완료 여부" />
        <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
          <RowTitle done={isCompleted}>할의 모래시계</RowTitle>
          <span className="shrink-0 text-xs text-muted-foreground">{level}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1" aria-label={`시련의 모래 ${sandStack}/${MAX_SAND_STACK}`}>
          {Array.from({ length: MAX_SAND_STACK }, (_, index) => (
            <span
              key={index}
              className={cn(
                'h-2 w-2 rounded-full border transition-colors',
                index < sandStack ? 'border-primary bg-primary' : 'border-foreground/25',
              )}
            />
          ))}
        </span>
      </ToggleArea>
      <RowSettingsButton label="할의 모래시계 설정" onClick={onOpenSettings} />
    </div>
  )
}
