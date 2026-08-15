import { Settings } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface GridSettingsButtonProps {
  onClick?: () => void
  className?: string
}

/**
 * 그리드 우상단 안쪽 모서리에 겹쳐 놓는 설정 버튼. 카드 밖으로 튀어나오지 않고,
 * 평소엔 옅게 있다가 카드에 마우스를 올리면(부모 group-hover) 또렷해진다.
 * 부모가 relative + group 컨테이너여야 한다.
 */
export function GridSettingsButton({ onClick, className }: GridSettingsButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="위젯 설정"
      className={cn(
        'absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card/80 text-muted-foreground opacity-0 shadow-sm backdrop-blur transition-opacity hover:border-primary hover:text-primary group-hover:opacity-100',
        className,
      )}
    >
      <Settings className="h-3.5 w-3.5" />
    </button>
  )
}
