import type { DragEvent } from 'react'

import { WidgetVisual } from '@/components/dashboard/WidgetVisual'
import { cn } from '@/lib/utils'
import { CELL_SIZE, WIDGET_CATALOG, WIDGET_DRAG_MIME } from '@/lib/widgetCatalog'
import type { WidgetCatalogItem } from '@/types/widget'

function PaletteItem({ item }: { item: WidgetCatalogItem }) {
  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData(WIDGET_DRAG_MIME, JSON.stringify(item))
    event.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="w-fit cursor-grab select-none transition-opacity hover:opacity-80 active:cursor-grabbing"
    >
      {/* 그리드에 실제로 놓일 때와 동일한 픽셀 크기(CELL_SIZE)로 그려서,
          드래그하는 동안 크기 감각이 그대로 유지되도록 한다. */}
      <WidgetVisual kind={item.kind} width={item.w * CELL_SIZE} height={item.h * CELL_SIZE} />
    </div>
  )
}

export interface WidgetPaletteProps {
  /** 목록이 이 높이를 넘어가면 모달 전체가 아니라 목록 안에서만 스크롤된다 */
  maxHeight?: number
  className?: string
}

export function WidgetPalette({ maxHeight, className }: WidgetPaletteProps) {
  const defaultWidgets = WIDGET_CATALOG.filter((item) => item.category === 'default')
  const additionalWidgets = WIDGET_CATALOG.filter((item) => item.category === 'additional')

  return (
    <div
      className={cn(
        // 위젯을 실제 배치 크기 그대로 보여주므로, 가장 넓은 위젯(배너, 10칸)이 잘리지 않도록
        // 고정 너비 대신 내용물에 맞춰 너비를 정한다.
        'flex w-fit shrink-0 flex-col gap-4 rounded-xl border border-border bg-card p-4',
        className,
      )}
    >
      <div>
        <h3 className="text-sm font-semibold text-foreground">위젯 목록</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          그리드로 드래그해서 배치하세요
        </p>
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto" style={{ maxHeight }}>
        <div className="flex flex-col gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Default Value
          </span>
          {defaultWidgets.map((item) => (
            <PaletteItem key={item.kind} item={item} />
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Additional Value
          </span>
          {additionalWidgets.map((item) => (
            <PaletteItem key={item.kind} item={item} />
          ))}
        </div>
      </div>
    </div>
  )
}
