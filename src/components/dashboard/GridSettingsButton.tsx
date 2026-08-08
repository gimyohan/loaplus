import type { CSSProperties, PointerEvent } from 'react'
import { Settings } from 'lucide-react'

import { cn } from '@/lib/utils'
import { CELL_SIZE } from '@/lib/widgetCatalog'

export interface GridSettingsButtonProps {
  style?: CSSProperties
  onClick?: () => void
  onPointerDown?: (event: PointerEvent<HTMLButtonElement>) => void
  onPointerMove?: (event: PointerEvent<HTMLButtonElement>) => void
  onPointerUp?: (event: PointerEvent<HTMLButtonElement>) => void
  /** 위젯 설정 모달 안에서는 다른 위젯처럼 드래그로 재배치할 수 있다 */
  draggable?: boolean
  className?: string
}

/**
 * 그리드에 반드시 포함되는 설정 아이콘. 다른 위젯과 달리 팔레트에서 배치하는 대상이 아니고
 * 삭제할 수 없지만, 위젯 설정 모달 안에서는 다른 위젯처럼 위치를 옮길 수 있다.
 */
export function GridSettingsButton({
  style,
  onClick,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  draggable = false,
  className,
}: GridSettingsButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      aria-label="위젯 설정"
      style={{ width: CELL_SIZE, height: CELL_SIZE, ...style }}
      className={cn(
        'absolute z-10 flex touch-none items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow transition-colors hover:border-primary hover:text-primary',
        draggable && 'cursor-move',
        className,
      )}
    >
      <Settings className="h-4 w-4" />
    </button>
  )
}
