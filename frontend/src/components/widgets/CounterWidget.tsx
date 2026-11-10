import { Minus } from 'lucide-react'

import { ROW_PADDING_CLASSNAME, RowSettingsButton } from '@/components/widgets/rowParts'
import { cn } from '@/lib/utils'

export interface CounterWidgetProps {
  text: string
  count: number
  /** 행 클릭 — 숫자 1 감소(0 미만 방지는 서버/부모가 처리) */
  onDecrement?: () => void
  onOpenSettings?: () => void
  className?: string
}

/** 카운터 위젯 — 카드 안 행 하나. 행을 누를 때마다 숫자가 1씩 줄어든다. */
export function CounterWidget({ text, count, onDecrement, onOpenSettings, className }: CounterWidgetProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${text || '카운터'} 1 감소`}
      onClick={() => onDecrement?.()}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onDecrement?.()
        }
      }}
      className={cn(
        ROW_PADDING_CLASSNAME,
        'group/counter flex cursor-pointer items-center gap-2 transition-colors hover:bg-white/[0.03] active:bg-white/[0.06]',
        className,
      )}
    >
      <span className={cn('min-w-0 flex-1 truncate text-[15px]', text ? 'text-foreground' : 'text-muted-foreground')}>
        {text || '카운터 이름을 입력하세요'}
      </span>
      <Minus className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/counter:opacity-100" aria-hidden />
      <span className="shrink-0 rounded-md bg-white/[0.06] px-2 py-px font-mono text-sm font-bold text-foreground">{count}</span>
      <RowSettingsButton label="카운터 설정" onClick={onOpenSettings} />
    </div>
  )
}
