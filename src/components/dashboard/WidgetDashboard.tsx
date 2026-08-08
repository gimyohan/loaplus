import { useRef, useState, type DragEvent, type PointerEvent } from 'react'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { CELL_SIZE, WIDGET_DRAG_MIME } from '@/lib/widgetCatalog'
import { WidgetGrid } from '@/components/dashboard/WidgetGrid'
import { WidgetPalette } from '@/components/dashboard/WidgetPalette'
import { PlacedWidgetContent } from '@/components/dashboard/PlacedWidgetContent'
import type { PlacedWidget, WidgetCatalogItem } from '@/types/widget'

const COLUMNS = 10
const ROWS = 16

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

interface DragState {
  id: string
  pointerStartX: number
  pointerStartY: number
  originX: number
  originY: number
}

export function WidgetDashboard() {
  const [widgets, setWidgets] = useState<PlacedWidget[]>([])
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const dragState = useRef<DragState | null>(null)

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const raw = event.dataTransfer.getData(WIDGET_DRAG_MIME)
    if (!raw || !gridRef.current) return

    const item = JSON.parse(raw) as WidgetCatalogItem
    const gridRect = gridRef.current.getBoundingClientRect()
    const dropX = event.clientX - gridRect.left
    const dropY = event.clientY - gridRect.top

    // 드롭 지점이 위젯의 중심이 되도록 칸 단위로 스냅
    const x = clamp(Math.round(dropX / CELL_SIZE - item.w / 2), 0, COLUMNS - item.w)
    const y = clamp(Math.round(dropY / CELL_SIZE - item.h / 2), 0, ROWS - item.h)

    setWidgets((prev) => [
      ...prev,
      { id: crypto.randomUUID(), kind: item.kind, x, y, w: item.w, h: item.h },
    ])
  }

  const handleWidgetPointerDown = (widget: PlacedWidget) => (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('[data-widget-delete]')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragState.current = {
      id: widget.id,
      pointerStartX: event.clientX,
      pointerStartY: event.clientY,
      originX: widget.x,
      originY: widget.y,
    }
    setDraggingId(widget.id)
  }

  const handleWidgetPointerMove = (widget: PlacedWidget) => (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragState.current
    if (!drag || drag.id !== widget.id) return

    const deltaX = event.clientX - drag.pointerStartX
    const deltaY = event.clientY - drag.pointerStartY
    const x = clamp(Math.round(drag.originX + deltaX / CELL_SIZE), 0, COLUMNS - widget.w)
    const y = clamp(Math.round(drag.originY + deltaY / CELL_SIZE), 0, ROWS - widget.h)

    setWidgets((prev) => prev.map((w) => (w.id === widget.id ? { ...w, x, y } : w)))
  }

  const handleWidgetPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    dragState.current = null
    setDraggingId(null)
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const removeWidget = (id: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id))
  }

  return (
    <div className="flex flex-wrap items-start gap-6">
      <WidgetGrid
        ref={gridRef}
        columns={COLUMNS}
        rows={ROWS}
        cellSize={CELL_SIZE}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {widgets.map((widget) => (
          <div
            key={widget.id}
            onPointerDown={handleWidgetPointerDown(widget)}
            onPointerMove={handleWidgetPointerMove(widget)}
            onPointerUp={handleWidgetPointerUp}
            className={cn(
              'group absolute touch-none cursor-move',
              draggingId === widget.id && 'z-50',
            )}
            style={{
              left: widget.x * CELL_SIZE,
              top: widget.y * CELL_SIZE,
              width: widget.w * CELL_SIZE,
              height: widget.h * CELL_SIZE,
            }}
          >
            <PlacedWidgetContent widget={widget} />
            <button
              type="button"
              data-widget-delete
              onClick={() => removeWidget(widget.id)}
              aria-label="위젯 삭제"
              className="absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 shadow transition-opacity hover:bg-red-600 group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </WidgetGrid>

      <WidgetPalette />
    </div>
  )
}
