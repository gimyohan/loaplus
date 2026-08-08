import { forwardRef, type CSSProperties, type HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

export interface WidgetGridProps extends HTMLAttributes<HTMLDivElement> {
  /** 그리드 가로 칸 수 (docs/overview.typ: 캐릭터 카드는 n x m 그리드로 구성) */
  columns?: number
  /** 그리드 세로 칸 수 */
  rows?: number
  /** 칸 하나의 픽셀 크기. 위젯은 이 단위의 배수로 배치된다 (docs/db_schema.typ: grid_x, grid_y, width, height) */
  cellSize?: number
}

/**
 * 캐릭터 카드 내부에 위젯을 자유롭게 배치하는 그리드 컨테이너.
 * 위젯은 children으로 넘겨 절대 위치(top/left, cellSize 배수)로 배치한다.
 * 드롭 좌표 계산 등을 위해 ref로 DOM 노드에 접근할 수 있다.
 */
export const WidgetGrid = forwardRef<HTMLDivElement, WidgetGridProps>(function WidgetGrid(
  { columns = 10, rows = 16, cellSize = 30, className, style, children, ...props },
  ref,
) {
  const gridLineStyle: CSSProperties = {
    width: columns * cellSize,
    height: rows * cellSize,
    backgroundImage: [
      'linear-gradient(to right, rgb(var(--border) / 0.6) 1px, transparent 1px)',
      'linear-gradient(to bottom, rgb(var(--border) / 0.6) 1px, transparent 1px)',
    ].join(', '),
    backgroundSize: `${cellSize}px ${cellSize}px`,
    ...style,
  }

  return (
    <div
      ref={ref}
      className={cn(
        'relative shrink-0 overflow-hidden rounded-xl border border-border bg-card shadow-2xl',
        className,
      )}
      style={gridLineStyle}
      {...props}
    >
      {children}
    </div>
  )
})
