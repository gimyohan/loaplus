import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export interface TooltipProps {
  label: string
  children: ReactNode
  className?: string
}

/**
 * 순수 CSS(group-hover)로만 동작하는 가벼운 툴팁. 자식을 감싸는 wrapper에 이름 붙인
 * group(`group/tooltip`)을 걸어서, 이 컴포넌트를 여러 개 나란히 둬도(예: 위젯 퀵액션 버튼들)
 * 그리고 상위에 다른 이름 없는 group(카드 호버 등)이 있어도 서로 오작동하지 않는다.
 */
export function Tooltip({ label, children, className }: TooltipProps) {
  return (
    <div className={cn('group/tooltip relative flex', className)}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute -top-2 left-1/2 z-30 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-border bg-card px-3 py-1.5 font-mono text-base uppercase tracking-wide text-foreground opacity-0 shadow-lg transition-opacity group-hover/tooltip:opacity-100"
      >
        {label}
      </span>
    </div>
  )
}
