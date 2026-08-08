import { useRef, useState, type DragEvent, type PointerEvent } from 'react'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { CELL_SIZE, WIDGET_DRAG_MIME } from '@/lib/widgetCatalog'
import { WidgetGrid } from '@/components/dashboard/WidgetGrid'
import { WidgetPalette } from '@/components/dashboard/WidgetPalette'
import { PlacedWidgetContent } from '@/components/dashboard/PlacedWidgetContent'
import { GridSettingsButton } from '@/components/dashboard/GridSettingsButton'
import { GridSettingsModal } from '@/components/dashboard/GridSettingsModal'
import type { PlacedWidget, WidgetCatalogItem } from '@/types/widget'

const DEFAULT_COLUMNS = 10
const DEFAULT_ROWS = 16

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
  const [columns, setColumns] = useState(DEFAULT_COLUMNS)
  const [rows, setRows] = useState(DEFAULT_ROWS)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsPosition, setSettingsPosition] = useState({ x: 0, y: 0 })
  const [isDraggingSettings, setIsDraggingSettings] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)
  const dragState = useRef<DragState | null>(null)
  const settingsDragState = useRef<{
    pointerStartX: number
    pointerStartY: number
    originX: number
    originY: number
  } | null>(null)

  // 그리드를 줄일 때 이미 배치된 위젯(설정 아이콘 포함)이 밖으로 밀려나지 않도록 최소 칸 수를 계산
  const minColumns = Math.max(
    widgets.reduce((max, w) => Math.max(max, w.x + w.w), 1),
    settingsPosition.x + 1,
  )
  const minRows = Math.max(
    widgets.reduce((max, w) => Math.max(max, w.y + w.h), 1),
    settingsPosition.y + 1,
  )

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
    const x = clamp(Math.round(dropX / CELL_SIZE - item.w / 2), 0, columns - item.w)
    const y = clamp(Math.round(dropY / CELL_SIZE - item.h / 2), 0, rows - item.h)

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
    const x = clamp(Math.round(drag.originX + deltaX / CELL_SIZE), 0, columns - widget.w)
    const y = clamp(Math.round(drag.originY + deltaY / CELL_SIZE), 0, rows - widget.h)

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

  const handleSettingsPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    settingsDragState.current = {
      pointerStartX: event.clientX,
      pointerStartY: event.clientY,
      originX: settingsPosition.x,
      originY: settingsPosition.y,
    }
    setIsDraggingSettings(true)
  }

  const handleSettingsPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = settingsDragState.current
    if (!drag) return

    const deltaX = event.clientX - drag.pointerStartX
    const deltaY = event.clientY - drag.pointerStartY
    const x = clamp(Math.round(drag.originX + deltaX / CELL_SIZE), 0, columns - 1)
    const y = clamp(Math.round(drag.originY + deltaY / CELL_SIZE), 0, rows - 1)

    setSettingsPosition({ x, y })
  }

  const handleSettingsPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    settingsDragState.current = null
    setIsDraggingSettings(false)
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return (
    <div>
      {/* 실제 대시보드에 보여지는 뷰. 위젯과 상호작용할 수 있고 격자선은 보이지 않는다.
          배치 편집은 설정 아이콘 → 모달에서 이루어진다 */}
      <WidgetGrid columns={columns} rows={rows} cellSize={CELL_SIZE} showGridLines={false}>
        <GridSettingsButton
          style={{ left: settingsPosition.x * CELL_SIZE, top: settingsPosition.y * CELL_SIZE }}
          onClick={() => setIsSettingsOpen(true)}
        />

        {widgets.map((widget) => (
          <div
            key={widget.id}
            className="absolute"
            style={{
              left: widget.x * CELL_SIZE,
              top: widget.y * CELL_SIZE,
              width: widget.w * CELL_SIZE,
              height: widget.h * CELL_SIZE,
            }}
          >
            <PlacedWidgetContent widget={widget} interactive />
          </div>
        ))}
      </WidgetGrid>

      <GridSettingsModal
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        columns={columns}
        rows={rows}
        minColumns={minColumns}
        minRows={minRows}
        onResize={(nextColumns, nextRows) => {
          setColumns(nextColumns)
          setRows(nextRows)
        }}
      >
        {/* 위젯 목록에서 그리드로 드래그해서 배치/이동/삭제하는 편집기 */}
        <div className="flex flex-wrap items-start gap-6">
          <WidgetGrid
            ref={gridRef}
            columns={columns}
            rows={rows}
            cellSize={CELL_SIZE}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {/* 삭제 버튼 없이 위치만 옮길 수 있는, 항상 존재하는 설정 아이콘 */}
            <GridSettingsButton
              style={{
                left: settingsPosition.x * CELL_SIZE,
                top: settingsPosition.y * CELL_SIZE,
              }}
              draggable
              className={isDraggingSettings ? 'z-50' : undefined}
              onPointerDown={handleSettingsPointerDown}
              onPointerMove={handleSettingsPointerMove}
              onPointerUp={handleSettingsPointerUp}
            />

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

          <WidgetPalette maxHeight={rows * CELL_SIZE} />
        </div>
      </GridSettingsModal>
    </div>
  )
}
