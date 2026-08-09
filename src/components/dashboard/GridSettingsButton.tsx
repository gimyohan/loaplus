import { Settings } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface GridSettingsButtonProps {
  onClick?: () => void
  className?: string
}

/**
 * 그리드 칸을 차지하지 않고 그리드 우상단 모서리 위로 거의 다 빠져나와 걸리는 책갈피 모양 설정 버튼.
 * 끝의 작은 V자 노치만 그리드 상단 테두리에 살짝 걸쳐 "매달린" 느낌을 준다.
 * 부모가 relative 컨테이너여야 하고, 이 버튼은 overflow-hidden인 WidgetGrid 바깥(형제)에 둬야 잘리지 않는다.
 * z-index를 그리드 위젯(z-10)보다 낮게 둬서, 노치가 겹치는 자리에 위젯이 있으면 위젯이 위로 보이게 한다.
 */
export function GridSettingsButton({ onClick, className }: GridSettingsButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="위젯 설정"
      style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%)' }}
      className={cn(
        'absolute -top-9 right-5 z-0 flex h-11 w-8 items-start justify-center rounded-t-md border border-border bg-card pt-1.5 text-muted-foreground shadow-lg transition-colors hover:border-primary hover:text-primary',
        className,
      )}
    >
      <Settings className="h-4 w-4" />
    </button>
  )
}
