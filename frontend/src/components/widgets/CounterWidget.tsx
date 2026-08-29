import { Settings } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface CounterWidgetProps {
  text: string
  count: number
  onDecrement?: () => void
  onOpenSettings?: () => void
  className?: string
}

/**
 * 텍스트 + 숫자 카운터 위젯 (docs/widgets.typ 참고). 체크박스나 자동 초기화 없이, 카드를 누를
 * 때마다 숫자가 1씩 줄어든다(0 미만으로는 내려가지 않음). 텍스트와 숫자는 이 카드에서 직접
 * 편집하지 않고 톱니바퀴로 여는 설정 모달에서만 편집한다.
 */
export function CounterWidget({ text, count, onDecrement, onOpenSettings, className }: CounterWidgetProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onDecrement?.()}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onDecrement?.()
        }
      }}
      className={cn(
        'flex aspect-[5/1] cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-card px-2.5 shadow-lg transition-colors hover:bg-muted/50 active:bg-muted',
        className,
      )}
    >
      <span
        className={cn('min-w-0 flex-1 truncate text-[15px]', text ? 'text-foreground' : 'text-muted-foreground')}
      >
        {text || '카운터 이름을 입력하세요'}
      </span>

      <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 font-mono text-sm font-semibold text-foreground">
        {count}
      </span>

      <button
        type="button"
        aria-label="카운터 설정"
        onClick={(event) => {
          event.stopPropagation()
          onOpenSettings?.()
        }}
        className="shrink-0 rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Settings className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
