import { ROW_PADDING_CLASSNAME, RowCheckbox, RowSettingsButton, RowTitle, ToggleArea } from '@/components/widgets/rowParts'
import { cn } from '@/lib/utils'

export interface TextCheckboxWidgetProps {
  text: string
  isChecked: boolean
  /** null이면 카운터를 쓰지 않는다(docs/db_schema.md 텍스트&체크박스 remainingCount) */
  remainingCount?: number | null
  onToggleChecked?: (checked: boolean) => void
  onOpenSettings?: () => void
  className?: string
}

/** 루틴(텍스트 & 체크박스) 위젯 — 카드 안 행 하나. 행을 눌러도 체크가 토글된다. */
export function TextCheckboxWidget({
  text,
  isChecked,
  remainingCount = null,
  onToggleChecked,
  onOpenSettings,
  className,
}: TextCheckboxWidgetProps) {
  return (
    <div className={cn(ROW_PADDING_CLASSNAME, 'flex items-center gap-2', className)}>
      <ToggleArea onToggle={() => onToggleChecked?.(!isChecked)} className="flex-1">
        <RowCheckbox checked={isChecked} onChange={onToggleChecked} label="완료 여부" />
        {text ? (
          <RowTitle done={isChecked} className="flex-1 font-normal">
            {text}
          </RowTitle>
        ) : (
          <span className="min-w-0 flex-1 truncate text-[15px] text-muted-foreground">할 일을 입력하세요</span>
        )}
        {remainingCount !== null && (
          <span className="shrink-0 rounded-md bg-white/[0.06] px-1.5 py-px text-xs font-bold text-muted-foreground">
            남음 {remainingCount}
          </span>
        )}
      </ToggleArea>
      <RowSettingsButton label="루틴 설정" onClick={onOpenSettings} />
    </div>
  )
}
