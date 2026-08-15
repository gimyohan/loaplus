import { Check, Settings } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface TextCheckboxWidgetProps {
  text: string
  isChecked: boolean
  /** null이면 카운터 기능을 쓰지 않아 표시하지 않는다 */
  remainingCount?: number | null
  onToggleChecked?: (checked: boolean) => void
  onOpenSettings?: () => void
  className?: string
}

/**
 * 체크박스 + 텍스트(할 일 등) + 설정(반복 옵션) 위젯 (docs/widgets.typ 참고). 텍스트는 이
 * 카드에서 직접 편집하지 않고 톱니바퀴로 여는 설정 모달에서만 편집한다.
 */
export function TextCheckboxWidget({
  text,
  isChecked,
  remainingCount = null,
  onToggleChecked,
  onOpenSettings,
  className,
}: TextCheckboxWidgetProps) {
  return (
    <div
      className={cn(
        'flex aspect-[5/1] items-center gap-3 rounded-xl border border-border bg-card px-5 shadow-lg',
        className,
      )}
    >
      <label className="relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(event) => onToggleChecked?.(event.target.checked)}
          aria-label="완료 여부"
          className="peer h-9 w-9 shrink-0 cursor-pointer appearance-none rounded-md border border-border bg-background transition-colors checked:border-primary checked:bg-primary"
        />
        <Check className="pointer-events-none absolute h-7 w-7 text-primary-foreground opacity-0 peer-checked:opacity-100" />
      </label>

      <span
        className={cn(
          'ml-3 min-w-0 flex-1 truncate text-3xl',
          text ? 'text-foreground' : 'text-muted-foreground',
          isChecked && text && 'text-muted-foreground line-through decoration-2',
        )}
      >
        {text || '할 일을 입력하세요'}
      </span>

      {remainingCount !== null && (
        <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-lg font-semibold text-muted-foreground">
          남음 {remainingCount}
        </span>
      )}

      <button
        type="button"
        aria-label="텍스트 · 체크박스 설정"
        onClick={onOpenSettings}
        className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Settings className="h-7 w-7" />
      </button>
    </div>
  )
}
