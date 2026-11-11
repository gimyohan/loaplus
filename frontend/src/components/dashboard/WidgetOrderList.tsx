import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { GripVertical, X } from 'lucide-react'

import raidCatalogData from '@/data/raidCatalog.json'
import { cn } from '@/lib/utils'
import { IMAGE_SIZE_HEIGHTS, findCatalogItem, readImageSize, type ImageSize } from '@/lib/widgetCatalog'
import type { PlacedWidget } from '@/types/widget'

const RAID_CATALOG = raidCatalogData.raids
const IMAGE_SIZES = Object.keys(IMAGE_SIZE_HEIGHTS) as ImageSize[]

// 이만큼(px) 움직여야 드래그로 본다 — 줄을 그냥 누르기만 했을 때 흔들려 순서가 바뀌지 않도록.
const DRAG_START_THRESHOLD_PX = 4

function widgetLabel(widget: PlacedWidget) {
  return findCatalogItem(widget.kind)?.label ?? widget.kind
}

function readString(customData: PlacedWidget['customData'], key: string) {
  const value = customData?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function urlHost(url: string | null) {
  if (!url) return null
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

/** 같은 종류가 여러 개일 때 서로 구분할 수 있게 이름 옆에 붙이는 내용(레이드 목표, 적어 둔 글 등). */
function widgetDetail(widget: PlacedWidget): string | null {
  switch (widget.kind) {
    case 'raid': {
      if (!widget.raid?.raidKey) return '목표 미정'
      const raid = RAID_CATALOG.find((candidate) => candidate.key === widget.raid!.raidKey)
      const difficulty = raid?.difficulties.find((candidate) => candidate.key === widget.raid!.difficultyKey)
      return [raid?.name ?? widget.raid.raidKey, difficulty?.name ?? widget.raid.difficultyKey].filter(Boolean).join(' ')
    }
    case 'text':
    case 'textCheckbox':
    case 'counter':
      return readString(widget.customData, 'text')
    case 'linkIcon':
      return readString(widget.customData, 'label') ?? urlHost(readString(widget.customData, 'url'))
    case 'image':
      return urlHost(readString(widget.customData, 'url'))
    default:
      return null
  }
}

function isPendingRaid(widget: PlacedWidget, isLocal: (widget: PlacedWidget) => boolean) {
  return widget.kind === 'raid' && isLocal(widget)
}

interface PointerDrag {
  pointerId: number
  startY: number
  fromIndex: number
  overIndex: number
  /** 이웃한 두 줄의 세로 간격(줄 높이 + gap). 줄 높이가 모두 같아서(h-10) 한 값으로 충분하다. */
  stride: number
  started: boolean
}

interface DragView {
  fromIndex: number
  overIndex: number
  offsetY: number
  stride: number
}

export interface WidgetOrderListProps {
  widgets: PlacedWidget[]
  /** 아직 서버에 저장되지 않은 위젯인지(레이드 자리표시자는 "추가 중…"으로 표시하고 삭제를 막는다). */
  isLocalWidget: (widget: PlacedWidget) => boolean
  /** fromIndex 위젯을 toIndex 자리로 옮긴다(사이 위젯들은 한 칸씩 밀린다). 드래그는 놓을 때 한 번만 부른다. */
  onMove: (fromIndex: number, toIndex: number) => void
  onRemove: (widget: PlacedWidget) => void
  onImageSizeChange: (widget: PlacedWidget, size: ImageSize) => void
}

/**
 * 위젯 설정 모달의 "위젯 순서" 목록. 줄을 잡고 끌어 원하는 자리에 놓으면 한 번에 옮겨진다 —
 * 예전 ↑/↓ 버튼은 한 번에 한 칸만 움직였고, 연달아 누르면 마우스 아래로 내려온 다른 위젯을 다시
 * 올려 두 위젯이 자리만 맞바꾸는 문제가 있었다(2026-11-11 사용자 피드백으로 교체).
 *
 * 마우스는 줄 어디를 잡아도 되고, 터치는 손잡이(⋮⋮)에서만 시작한다 — 줄 전체를 touch-action:
 * none으로 막으면 긴 목록에서 모달을 스크롤할 곳이 없어진다. 키보드는 손잡이에 포커스를 두고
 * 위/아래 화살표로 한 칸씩 옮긴다.
 */
export function WidgetOrderList({ widgets, isLocalWidget, onMove, onRemove, onImageSizeChange }: WidgetOrderListProps) {
  const listRef = useRef<HTMLOListElement>(null)
  const pointerDragRef = useRef<PointerDrag | null>(null)
  const [dragView, setDragView] = useState<DragView | null>(null)

  // 키보드로 옮긴 뒤 손잡이 포커스를 되살린다 — React가 줄을 재배치하면서 포커스된 줄 자체를
  // DOM에서 옮기면 브라우저가 포커스를 잃는다.
  const refocusWidgetIdRef = useRef<string | null>(null)
  useEffect(() => {
    const widgetId = refocusWidgetIdRef.current
    if (!widgetId) return
    refocusWidgetIdRef.current = null
    listRef.current?.querySelector<HTMLButtonElement>(`[data-drag-handle="${widgetId}"]`)?.focus()
  }, [widgets])

  const handlePointerDown = (event: PointerEvent<HTMLLIElement>, index: number) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const target = event.target as HTMLElement
    // 이미지 높이·삭제 같은 줄 안의 다른 버튼은 원래대로 클릭되게 둔다(손잡이 버튼만 예외).
    if (target.closest('button:not([data-drag-handle])')) return
    const rows = listRef.current?.children
    if (!rows || rows.length < 2) return
    const stride = rows[1]!.getBoundingClientRect().top - rows[0]!.getBoundingClientRect().top
    pointerDragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      fromIndex: index,
      overIndex: index,
      stride,
      started: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: PointerEvent<HTMLLIElement>) => {
    const drag = pointerDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const rawOffset = event.clientY - drag.startY
    if (!drag.started && Math.abs(rawOffset) < DRAG_START_THRESHOLD_PX) return
    drag.started = true
    // 목록 맨 위/맨 아래 너머로는 끌려가지 않게 막는다.
    const offsetY = Math.min(
      Math.max(rawOffset, -drag.fromIndex * drag.stride),
      (widgets.length - 1 - drag.fromIndex) * drag.stride,
    )
    drag.overIndex = drag.fromIndex + Math.round(offsetY / drag.stride)
    setDragView({ fromIndex: drag.fromIndex, overIndex: drag.overIndex, offsetY, stride: drag.stride })
  }

  const finishPointerDrag = (event: PointerEvent<HTMLLIElement>, commit: boolean) => {
    const drag = pointerDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    pointerDragRef.current = null
    setDragView(null)
    if (commit && drag.started && drag.overIndex !== drag.fromIndex) onMove(drag.fromIndex, drag.overIndex)
  }

  const handleHandleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number, widget: PlacedWidget) => {
    const delta = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0
    if (!delta) return
    event.preventDefault()
    const target = index + delta
    if (target < 0 || target >= widgets.length) return
    refocusWidgetIdRef.current = widget.id
    onMove(index, target)
  }

  // 끄는 동안 다른 줄들이 비켜 서는 거리. 놓으면 배열 순서가 실제로 바뀌고 이동량은 0으로 돌아간다.
  const shiftFor = (index: number) => {
    if (!dragView || index === dragView.fromIndex) return 0
    const { fromIndex, overIndex, stride } = dragView
    if (fromIndex < overIndex && index > fromIndex && index <= overIndex) return -stride
    if (overIndex < fromIndex && index >= overIndex && index < fromIndex) return stride
    return 0
  }

  const iconButtonClass =
    'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30'

  return (
    <ol ref={listRef} className="flex flex-col gap-1">
      {widgets.map((widget, index) => {
        const isDragging = dragView?.fromIndex === index
        const pending = isPendingRaid(widget, isLocalWidget)
        const label = widgetLabel(widget)
        const detail = widgetDetail(widget)
        return (
          <li
            key={widget.id}
            onPointerDown={(event) => handlePointerDown(event, index)}
            onPointerMove={handlePointerMove}
            onPointerUp={(event) => finishPointerDrag(event, true)}
            onPointerCancel={(event) => finishPointerDrag(event, false)}
            className={cn(
              'relative flex h-10 cursor-grab select-none items-center gap-2 rounded-lg bg-background pl-1 pr-2',
              // 끄는 동안에만 비켜 서는 애니메이션을 켠다 — 놓는 순간에도 켜져 있으면 재배치된 줄이
              // 이전 이동량에서 0으로 한 번 더 미끄러져 보인다.
              dragView && !isDragging && 'transition-transform duration-150',
              isDragging && 'z-10 cursor-grabbing shadow-lg ring-1 ring-primary',
            )}
            style={{ transform: `translateY(${isDragging ? dragView.offsetY : shiftFor(index)}px)` }}
          >
            <button
              type="button"
              data-drag-handle={widget.id}
              aria-label={`${label} 순서 옮기기 (위/아래 화살표)`}
              title="끌어서 순서 바꾸기"
              onKeyDown={(event) => handleHandleKeyDown(event, index, widget)}
              className="flex h-7 w-6 shrink-0 touch-none items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
            >
              <GripVertical className="h-4 w-4" />
            </button>

            <span className="min-w-0 flex-1 truncate text-sm text-foreground">
              {label}
              {pending ? (
                <span className="ml-2 text-xs text-muted-foreground">추가 중…</span>
              ) : (
                detail && <span className="ml-2 text-xs text-muted-foreground">{detail}</span>
              )}
            </span>

            {widget.kind === 'image' && (
              <div role="radiogroup" aria-label="이미지 높이" className="flex rounded-md border border-border p-0.5">
                {IMAGE_SIZES.map((size) => {
                  const active = readImageSize(widget.customData) === size
                  return (
                    <button
                      key={size}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => onImageSizeChange(widget, size)}
                      className={cn(
                        'h-6 w-7 rounded text-[11px] font-bold transition-colors',
                        active ? 'bg-primary-strong text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {size}
                    </button>
                  )
                })}
              </div>
            )}

            <button
              type="button"
              aria-label="위젯 삭제"
              disabled={pending}
              onClick={() => onRemove(widget)}
              className={cn(iconButtonClass, 'hover:bg-danger/15 hover:text-danger')}
            >
              <X className="h-4 w-4" />
            </button>
          </li>
        )
      })}
    </ol>
  )
}
