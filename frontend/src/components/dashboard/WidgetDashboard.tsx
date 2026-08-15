import { useEffect, useRef, useState, type DragEvent, type PointerEvent } from 'react'
import { X } from 'lucide-react'

import { useCharacterDirectory } from '@/contexts/CharacterDirectoryContext'
import { checkCustomWidget, updateCustomWidget } from '@/lib/customWidgets'
import { fetchWidgetLayout, saveWidgetLayout } from '@/lib/dashboards'
import {
  clearRaidGate,
  createRaidWidget,
  deleteRaidWidget,
  setRaidGateMoreReward,
  undoRaidGateClear,
  updateRaidPosition,
  updateRaidTarget,
} from '@/lib/raids'
import { cn } from '@/lib/utils'
import { CELL_SIZE, WIDGET_DRAG_MIME } from '@/lib/widgetCatalog'
import { collidesWithAny } from '@/lib/widgetLayout'
import raidCatalogData from '@/data/raidCatalog.json'
import { WidgetGrid } from '@/components/dashboard/WidgetGrid'
import { WidgetPalette } from '@/components/dashboard/WidgetPalette'
import { TemplatePanel } from '@/components/dashboard/TemplatePanel'
import { PlacedWidgetContent } from '@/components/dashboard/PlacedWidgetContent'
import { GridSettingsButton } from '@/components/dashboard/GridSettingsButton'
import { GridSettingsModal } from '@/components/dashboard/GridSettingsModal'
import type { TemplateLayout } from '@/types/template'
import type { PlacedWidget, WidgetCatalogItem, WidgetKind } from '@/types/widget'

// 카드 하나의 내부 그리드 가로 칸 수. 열은 고정이지만(카드를 여러 열로 배치할 때 너비 계산의
// 기준, DashboardView 참고) 세로 칸 수(rows)는 캐릭터별로 설정 모달에서 바꿀 수 있다 — 카드의
// 원본(native) 픽셀 높이는 그 캐릭터의 rows × CELL_SIZE가 된다.
export const DEFAULT_COLUMNS = 10
export const DEFAULT_ROWS = 16
export const MIN_ROWS = 8
export const MAX_ROWS = 32

const RAID_CATALOG = raidCatalogData.raids

/** raidKey/difficultyKey를 "{레이드명} {난이도명}" 표시 문구로 바꾼다. 카탈로그에 없으면 원본 키를 그대로 쓴다. */
function describeRaidTarget(raidKey: string, difficultyKey: string): string {
  const raid = RAID_CATALOG.find((candidate) => candidate.key === raidKey)
  const difficulty = raid?.difficulties.find((candidate) => candidate.key === difficultyKey)
  return `${raid?.name ?? raidKey} ${difficulty?.name ?? difficultyKey}`
}

// 새로 배치된 Additional Value 위젯이 처음부터 갖고 있어야 하는 customData (docs/widgets.typ 참고).
// Default Value 위젯은 customData가 없다(undefined).
const DEFAULT_CUSTOM_DATA: Partial<Record<WidgetKind, Record<string, unknown>>> = {
  text: { text: '' },
  textCheckbox: { text: '', isChecked: false, resetDays: 0 },
  image: { url: null },
  linkIcon: { url: null, label: null },
}

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

export interface WidgetDashboardProps {
  /** 이미 실제 캐릭터에 귀속된 카드라면 그 캐릭터 이름을 넘긴다. 넘기면 위젯 배치를
   * 마운트 시 바로 서버에서 조회한다(GET .../dashboards/{characterId}/widgets). 아직 귀속되지
   * 않은 새 카드라면 생략한다 — 위젯 팔레트의 이름 검색으로 귀속되기 전까진 서버에 저장할
   * characterId가 없으므로 로컬 상태로만 동작한다. */
  initialCharacterName?: string
  /** 이 카드에 캐릭터가 (재)귀속될 때마다 알려준다. 카드를 감싸는 상위 UI(예: 대시보드 카드 헤더)가
   * 이 카드의 상태를 몰라도 캐릭터 정보를 표시할 수 있도록 하기 위함이며, WidgetDashboard 자체의
   * 동작에는 영향을 주지 않는다. */
  onCharacterNameChange?: (characterName: string) => void
  /** 전달하면 카드 좌상단에 삭제 버튼이 표시된다 (호버 시 노출). */
  onRemove?: () => void
  /** 이 카드의 그리드 세로 칸 수(rows)가 서버에서 조회되거나 설정에서 바뀔 때마다 알려준다.
   * 카드를 감싸는 DashboardCard가 카드 전체를 스케일할 때 이 값으로 세로 비율을 맞춘다. */
  onRowsChange?: (rows: number) => void
}

export function WidgetDashboard({
  initialCharacterName,
  onCharacterNameChange,
  onRemove,
  onRowsChange,
}: WidgetDashboardProps = {}) {
  const [widgets, setWidgets] = useState<PlacedWidget[]>([])
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [characterName, setCharacterNameState] = useState(initialCharacterName ?? '')
  const [rows, setRowsState] = useState(DEFAULT_ROWS)
  const gridRef = useRef<HTMLDivElement>(null)
  const dragState = useRef<DragState | null>(null)

  const { findByName } = useCharacterDirectory()
  // 귀속된 실제 캐릭터가 있을 때만 위젯 배치를 서버에 조회/저장한다. 아직 이름을 검색해
  // 귀속시키기 전에는 characterId가 없으므로 로컬 state로만 동작한다(위 initialCharacterName 참고).
  const boundCharacterId = characterName ? findByName(characterName)?.id : undefined

  const setCharacterName = (name: string) => {
    setCharacterNameState(name)
    onCharacterNameChange?.(name)
  }

  const setRows = (next: number) => {
    setRowsState(next)
    onRowsChange?.(next)
  }

  useEffect(() => {
    if (!boundCharacterId) return
    let cancelled = false
    fetchWidgetLayout(boundCharacterId)
      .then((layout) => {
        if (cancelled) return
        // 그리드 가로 칸 수는 항상 고정(DEFAULT_COLUMNS)이라 layout.columns는 쓰지 않지만, 세로 칸
        // 수(rows)는 캐릭터별로 다를 수 있으니 서버 값을 그대로 반영한다. setRows(래퍼)를 쓰지 않고
        // 직접 부르는 이유는, 매 렌더 새로 만들어지는 그 래퍼를 deps에 넣으면 이 이펙트가 렌더마다
        // 다시 실행돼버리기 때문이다.
        setWidgets(layout.widgets)
        setRowsState(layout.rows)
        onRowsChange?.(layout.rows)
      })
      .catch((err) => console.error('위젯 배치 조회 실패', err))
    return () => {
      cancelled = true
    }
  }, [boundCharacterId, onRowsChange])

  // 위젯이 바뀔 때마다(드래그 완료, 배치/삭제) 전체 배치를 그대로 저장한다. 귀속된 캐릭터가
  // 없으면(아직 검색 전) 저장할 곳이 없으므로 아무 것도 하지 않는다.
  // 백엔드는 이 호출마다 기존 위젯을 전부 지우고 새로 생성하므로(id가 매번 바뀜), 응답으로 받은
  // 배치를 그대로 로컬 상태에 반영해야 한다 — 그래야 Additional Value 위젯의 id가 최신 상태로
  // 유지되어, 대시보드 화면에서 바로 하는 내용 편집(텍스트/체크박스 등, updateWidgetCustomData 등
  // 아래 참고)이 유효한 id로 개별 API를 호출할 수 있다.
  // 레이드(raid) 위젯은 이 엔드포인트로 만들거나 옮길 수 없어(400) body에서 제외하고, 응답에도
  // 포함되지 않으므로 기존 레이드 위젯은 그대로 들고 있다가 응답과 합쳐 되돌려놓는다(docs/api.typ 참고).
  const persistLayout = (nextWidgets: PlacedWidget[]) => {
    if (!boundCharacterId) return
    const raidWidgets = nextWidgets.filter((w) => w.kind === 'raid')
    saveWidgetLayout(boundCharacterId, {
      columns: DEFAULT_COLUMNS,
      rows,
      widgets: nextWidgets
        .filter((w) => w.kind !== 'raid')
        .map(({ kind, x, y, w, h, customData }) => ({ kind, x, y, w, h, customData })),
    })
      .then((layout) => setWidgets([...raidWidgets, ...layout.widgets]))
      .catch((err) => console.error('위젯 배치 저장 실패', err))
  }

  // 그리드 세로 칸 수를 바꾼다. 이미 놓인 위젯(레이드 포함, 그리드 자체를 보여주는 데는 지금
  // 로컬 state에 있는 widgets 전부를 기준으로 삼아야 하므로)의 가장 아래 칸보다 작게는 줄일 수
  // 없다 — 위젯이 그리드 밖으로 밀려나는 걸 막는다.
  const handleRowsChange = (nextRows: number) => {
    if (!boundCharacterId) return
    const minAllowed = Math.max(MIN_ROWS, ...widgets.map((w) => w.y + w.h))
    const clamped = clamp(nextRows, minAllowed, MAX_ROWS)
    if (clamped === rows) return
    setRows(clamped)
    saveWidgetLayout(boundCharacterId, {
      columns: DEFAULT_COLUMNS,
      rows: clamped,
      widgets: widgets
        .filter((w) => w.kind !== 'raid')
        .map(({ kind, x, y, w, h, customData }) => ({ kind, x, y, w, h, customData })),
    }).catch((err) => console.error('그리드 높이 저장 실패', err))
  }

  // 대시보드 화면에서 Additional Value 위젯 하나의 내용(텍스트/이미지 URL 등)만 바로 바꿀 때 쓴다.
  // persistLayout(카드 전체 재저장)과 달리 이 위젯 하나만 PUT하므로, 다른 위젯의 id는 그대로 유지된다.
  const updateWidgetCustomData = (widgetId: string, customData: Record<string, unknown>) => {
    const widget = widgets.find((w) => w.id === widgetId)
    if (!widget) return
    setWidgets((prev) => prev.map((w) => (w.id === widgetId ? { ...w, customData } : w)))
    updateCustomWidget(widgetId, { x: widget.x, y: widget.y, w: widget.w, h: widget.h, customData }).catch(
      (err) => console.error('위젯 내용 저장 실패', err),
    )
  }

  // textCheckbox 위젯의 체크 토글 전용 — customData의 다른 필드는 서버가 그대로 유지한다.
  // remainingCount(카운터)도 백엔드(routes/customWidgets.ts)와 동일한 규칙으로 낙관적으로 갱신한다:
  // 실제로 값이 바뀔 때만, 미체크→체크는 -1(0 미만 방지), 체크→미체크는 +1. 그렇지 않으면 카드에
  // 표시되는 "남음 N"이 다음 새로고침 전까지 한 번의 토글만큼 뒤처져 보인다.
  const toggleWidgetChecked = (widgetId: string, isChecked: boolean) => {
    setWidgets((prev) =>
      prev.map((w) => {
        if (w.id !== widgetId) return w
        const prevCustomData = w.customData ?? {}
        const wasChecked = Boolean(prevCustomData.isChecked)
        const currentRemainingCount =
          typeof prevCustomData.remainingCount === 'number' ? prevCustomData.remainingCount : null
        const nextRemainingCount =
          currentRemainingCount === null || isChecked === wasChecked
            ? currentRemainingCount
            : isChecked
              ? Math.max(currentRemainingCount - 1, 0)
              : currentRemainingCount + 1
        return {
          ...w,
          customData: {
            ...prevCustomData,
            isChecked,
            ...(currentRemainingCount === null ? {} : { remainingCount: nextRemainingCount }),
          },
        }
      }),
    )
    checkCustomWidget(widgetId, isChecked).catch((err) => console.error('체크박스 저장 실패', err))
  }

  // 레이드 관문 완료 체크박스 토글. 체크(완료)는 서버가 앞선 미완료 관문까지 연쇄 완료하고,
  // 해제(미완료)는 전용 엔드포인트가 없어 로그 롤백을 재사용한다(뒤 관문도 함께 미완료가 됨) —
  // 두 경우 모두 서버 응답을 기다리지 않고 먼저 연쇄 규칙대로 로컬 상태를 낙관적으로 갱신한다.
  // 서버 호출이 실패하면(예: 되돌릴 로그를 못 찾음) 낙관적 갱신을 그대로 두지 않고 원래 gates로
  // 되돌린다 — 안 그러면 체크박스가 당장은 바뀐 것처럼 보이다가 다음 새로고침에서야 원상태로
  // "저장이 안 된" 것처럼 보이는 혼란이 생긴다.
  const toggleRaidGateCleared = (widgetId: string, gateIndex: number, cleared: boolean) => {
    const widget = widgets.find((w) => w.id === widgetId)
    if (!widget?.raidId || !widget.raid || !widget.raid.raidKey || !widget.raid.difficultyKey || !boundCharacterId) return
    const raidId = widget.raidId
    const previousGates = widget.raid.gates
    // 로그 목록에서 "무엇을 완료했는지" 바로 알 수 있도록 유저가 고른 목표를 설명에 남긴다
    // (예: "세르카 매칭 1관문") — 연쇄로 여러 관문이 한꺼번에 완료돼도 이번에 클릭한 관문
    // 번호 기준 하나만 넘기면 서버가 이번 요청에서 생기는 로그 전부에 동일하게 저장한다.
    const description = `${describeRaidTarget(widget.raid.raidKey, widget.raid.difficultyKey)} ${gateIndex + 1}관문`

    const revertOptimisticUpdate = () => {
      setWidgets((prev) =>
        prev.map((w) => (w.id === widgetId && w.raid ? { ...w, raid: { ...w.raid, gates: previousGates } } : w)),
      )
    }

    if (cleared) {
      setWidgets((prev) =>
        prev.map((w) =>
          w.id === widgetId && w.raid
            ? { ...w, raid: { ...w.raid, gates: w.raid.gates.map((g, i) => (i <= gateIndex ? { ...g, cleared: true } : g)) } }
            : w,
        ),
      )
      clearRaidGate(boundCharacterId, raidId, gateIndex, description)
        .then((raid) => {
          if (!raid) return
          setWidgets((prev) => prev.map((w) => (w.id === widgetId ? { ...w, raid } : w)))
        })
        .catch((err) => {
          console.error('레이드 관문 완료 처리 실패', err)
          revertOptimisticUpdate()
        })
      return
    }

    setWidgets((prev) =>
      prev.map((w) =>
        w.id === widgetId && w.raid
          ? { ...w, raid: { ...w.raid, gates: w.raid.gates.map((g, i) => (i >= gateIndex ? { ...g, cleared: false } : g)) } }
          : w,
      ),
    )
    undoRaidGateClear(boundCharacterId, raidId, gateIndex).catch((err) => {
      console.error('레이드 관문 되돌리기 실패', err)
      revertOptimisticUpdate()
    })
  }

  // 레이드 관문 '더보기' 토글. 완료 여부와 무관한 단순 플래그라 연쇄 규칙이 없다.
  const toggleRaidGateMoreReward = (widgetId: string, gateIndex: number, enabled: boolean) => {
    const widget = widgets.find((w) => w.id === widgetId)
    if (!widget?.raidId || !widget.raid || !boundCharacterId) return
    const raidId = widget.raidId
    setWidgets((prev) =>
      prev.map((w) =>
        w.id === widgetId && w.raid
          ? {
              ...w,
              raid: { ...w.raid, gates: w.raid.gates.map((g, i) => (i === gateIndex ? { ...g, moreRewardEnabled: enabled } : g)) },
            }
          : w,
      ),
    )
    setRaidGateMoreReward(boundCharacterId, raidId, gateIndex, enabled)
      .then((raid) => setWidgets((prev) => prev.map((w) => (w.id === widgetId ? { ...w, raid } : w))))
      .catch((err) => console.error('레이드 더보기 설정 저장 실패', err))
  }

  // 레이드 목표(레이드/난이도) 변경. 완료된 관문이 있으면 서버가 409를 반환하므로 그대로 던져
  // RaidTargetModal이 실패를 알 수 있게 한다.
  const changeRaidTarget = (widgetId: string, raidKey: string, difficultyKey: string) => {
    const widget = widgets.find((w) => w.id === widgetId)
    if (!widget?.raidId || !boundCharacterId) return
    updateRaidTarget(boundCharacterId, widget.raidId, { raidKey, difficultyKey })
      .then((raid) => setWidgets((prev) => prev.map((w) => (w.id === widgetId ? { ...w, raid } : w))))
      .catch((err) => console.error('레이드 목표 변경 실패', err))
  }

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
    const x = clamp(Math.round(dropX / CELL_SIZE - item.w / 2), 0, DEFAULT_COLUMNS - item.w)
    const y = clamp(Math.round(dropY / CELL_SIZE - item.h / 2), 0, rows - item.h)

    // 이미 다른 위젯이 있는 칸에는 놓을 수 없다 — 겹치면 그냥 드롭을 무시한다.
    if (collidesWithAny({ x, y, w: item.w, h: item.h }, widgets)) return

    // 레이드는 서버가 raidId를 생성해줘야 위젯이 성립하므로(POST .../raids) 다른 위젯처럼 임시
    // uuid로 즉시 로컬 생성할 수 없다 — 목표는 일단 고르지 않고(서버가 아이템 레벨 기준 자동 추천)
    // 바로 추가한 뒤, 톱니바퀴(RaidTargetModal, WidgetVisual 참고)에서 원하는 목표로 바꾸게 한다.
    if (item.kind === 'raid') {
      if (!boundCharacterId) return
      createRaidWidget(boundCharacterId, { x, y, w: item.w, h: item.h })
        .then((widget) => setWidgets((prev) => [...prev, widget]))
        .catch((err) => console.error('레이드 위젯 생성 실패', err))
      return
    }

    const next = [
      ...widgets,
      {
        id: crypto.randomUUID(),
        kind: item.kind,
        x,
        y,
        w: item.w,
        h: item.h,
        customData: DEFAULT_CUSTOM_DATA[item.kind],
      },
    ]
    setWidgets(next)
    persistLayout(next)
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
    const x = clamp(Math.round(drag.originX + deltaX / CELL_SIZE), 0, DEFAULT_COLUMNS - widget.w)
    const y = clamp(Math.round(drag.originY + deltaY / CELL_SIZE), 0, rows - widget.h)

    // 다른 위젯과 겹치는 칸으로는 움직이지 않는다 — 드래그 중인 자기 자신은 비교에서 뺀다.
    // 겹치는 방향으로는 위치가 그대로 멈춰있고, 안 겹치는 다른 방향으로는 계속 움직일 수 있다.
    if (collidesWithAny({ x, y, w: widget.w, h: widget.h }, widgets, widget.id)) return

    setWidgets((prev) => prev.map((w) => (w.id === widget.id ? { ...w, x, y } : w)))
  }

  const handleWidgetPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragState.current
    dragState.current = null
    setDraggingId(null)
    event.currentTarget.releasePointerCapture(event.pointerId)
    if (!drag) return

    const widget = widgets.find((w) => w.id === drag.id)
    // 위치가 실제로 바뀌지 않았으면(드래그 없이 그냥 클릭만 한 경우 포함 — 가디언/쿠르잔 전선처럼
    // 내부에 체크박스가 많은 위젯은 클릭할 때마다 pointerdown/up이 걸린다) 저장할 것도 없으니
    // 그냥 끝낸다. 겹침 등으로 이동이 막혀 원래 자리로 되돌아온 경우도 이 조건에 걸려 저장을 건너뛴다.
    if (!widget || (widget.x === drag.originX && widget.y === drag.originY)) return

    // 레이드는 bulk 저장(persistLayout)이 아예 body에서 제외하므로(docs/api.typ 참고),
    // 위치 이동은 전용 PATCH .../raids/{raidId}/position로 저장한다.
    if (widget.kind === 'raid' && widget.raidId && boundCharacterId) {
      updateRaidPosition(boundCharacterId, widget.raidId, { x: widget.x, y: widget.y, w: widget.w, h: widget.h })
        .then((updated) => setWidgets((prev) => prev.map((w) => (w.id === drag.id ? updated : w))))
        .catch((err) => console.error('레이드 위치 저장 실패', err))
      return
    }

    persistLayout(widgets)
  }

  const removeWidget = (id: string) => {
    const widget = widgets.find((w) => w.id === id)
    const next = widgets.filter((w) => w.id !== id)
    setWidgets(next)

    // 레이드는 bulk 저장이 아니라 전용 DELETE로만 슬롯(Character_Raids 행)이 실제로 지워진다
    // (docs/api.typ 참고) — persistLayout은 raid kind를 body에서 아예 제외하기 때문이다.
    if (widget?.kind === 'raid' && widget.raidId && boundCharacterId) {
      deleteRaidWidget(boundCharacterId, widget.raidId).catch((err) => console.error('레이드 위젯 삭제 실패', err))
      return
    }

    persistLayout(next)
  }

  // 위젯 자신을 뺀, 이미 다른 레이드 위젯이 쓰고 있는 레이드 키 목록. 같은 레이드를 난이도만
  // 바꿔서 중복으로 추가하지 못하게 RaidTargetModal에 넘긴다.
  const raidExcludedKeysFor = (widgetId: string) =>
    widgets
      .filter((w) => w.kind === 'raid' && w.id !== widgetId && w.raid?.raidKey)
      .map((w) => w.raid!.raidKey!)

  // TemplatePanel에서 붙여넣은 배치 코드를 실제로 반영한다. "적용"은 덮어쓰기다 — 코드에 없는
  // 위젯은 사라지고, 코드에 있는 위젯만 남는다. raid가 아닌 위젯은 코드 내용으로 통째로 교체
  // 저장하고(persistLayout과 동일한 replace-all), raid 위젯은 기존 것을 전부 지운 뒤(진행 상태도
  // 함께 사라진다 — 코드는 종류·위치만 담고 진행 상태는 담지 않으므로 되살릴 수 없다) 코드의 raid
  // 항목 수만큼 목표 없는 빈 슬롯을 새로 만든다. 예전엔 기존 raid 위젯을 그대로 두고 새로
  // 추가만 했는데, 같은 코드를 다시 적용할 때마다 위젯이 계속 쌓이는 문제가 있어 이렇게 바꿨다.
  const applyTemplateLayout = (layout: TemplateLayout) => {
    if (!boundCharacterId) return Promise.resolve()

    const raidEntries = layout.widgets.filter((w) => w.kind === 'raid')
    const otherEntries = layout.widgets.filter((w) => w.kind !== 'raid')
    const existingRaidWidgets = widgets.filter((w) => w.kind === 'raid')
    const nextRows = clamp(layout.rows, MIN_ROWS, MAX_ROWS)

    return Promise.all([
      saveWidgetLayout(boundCharacterId, {
        columns: DEFAULT_COLUMNS,
        rows: nextRows,
        widgets: otherEntries.map(({ kind, x, y, w, h }) => ({
          kind,
          x,
          y,
          w,
          h,
          customData: DEFAULT_CUSTOM_DATA[kind],
        })),
      }),
      Promise.all(existingRaidWidgets.map((w) => deleteRaidWidget(boundCharacterId, w.raidId!))).then(() =>
        Promise.all(raidEntries.map((w) => createRaidWidget(boundCharacterId, { x: w.x, y: w.y, w: w.w, h: w.h }))),
      ),
    ]).then(([savedLayout, newRaidWidgets]) => {
      setWidgets([...newRaidWidgets, ...savedLayout.widgets])
      setRows(nextRows)
    })
  }

  return (
    <div>
      {/* 실제 대시보드에 보여지는 뷰. 위젯과 상호작용할 수 있고 격자선은 보이지 않는다.
          배치 편집은 설정 아이콘 → 모달에서 이루어진다 */}
      <div className="group relative inline-block">
        <WidgetGrid columns={DEFAULT_COLUMNS} rows={rows} cellSize={CELL_SIZE} showGridLines={false}>
          {widgets.map((widget) => (
            <div
              key={widget.id}
              className="absolute z-10"
              style={{
                left: widget.x * CELL_SIZE,
                top: widget.y * CELL_SIZE,
                width: widget.w * CELL_SIZE,
                height: widget.h * CELL_SIZE,
              }}
            >
              <PlacedWidgetContent
                widget={widget}
                interactive
                characterName={characterName}
                onCustomDataChange={(customData) => updateWidgetCustomData(widget.id, customData)}
                onCheckboxToggle={(isChecked) => toggleWidgetChecked(widget.id, isChecked)}
                raidExcludedKeys={raidExcludedKeysFor(widget.id)}
                onRaidGateToggle={(gateIndex, cleared) => toggleRaidGateCleared(widget.id, gateIndex, cleared)}
                onRaidMoreRewardToggle={(gateIndex, enabled) =>
                  toggleRaidGateMoreReward(widget.id, gateIndex, enabled)
                }
                onRaidTargetChange={(raidKey, difficultyKey) => changeRaidTarget(widget.id, raidKey, difficultyKey)}
              />
            </div>
          ))}
        </WidgetGrid>

        <GridSettingsButton onClick={() => setIsSettingsOpen(true)} />

        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="카드 삭제"
            className="absolute left-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card/80 text-muted-foreground opacity-0 shadow-sm backdrop-blur transition-opacity hover:border-destructive hover:text-destructive group-hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <GridSettingsModal open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)}>
        {/* 위젯 목록에서 그리드로 드래그해서 배치/이동/삭제하는 편집기 */}
        <div className="flex flex-wrap items-start gap-6">
          <div className="relative inline-block">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">그리드 높이</span>
              <div className="flex items-center gap-1 rounded-lg border border-border p-1">
                <button
                  type="button"
                  aria-label="그리드 높이 줄이기"
                  disabled={!boundCharacterId || rows <= Math.max(MIN_ROWS, ...widgets.map((w) => w.y + w.h))}
                  onClick={() => handleRowsChange(rows - 1)}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                >
                  −
                </button>
                <span className="w-8 text-center font-mono text-sm text-foreground">{rows}</span>
                <button
                  type="button"
                  aria-label="그리드 높이 늘리기"
                  disabled={!boundCharacterId || rows >= MAX_ROWS}
                  onClick={() => handleRowsChange(rows + 1)}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                >
                  +
                </button>
              </div>
              <span className="text-xs text-muted-foreground">칸 (최대 {MAX_ROWS})</span>
            </div>
            <WidgetGrid
              ref={gridRef}
              columns={DEFAULT_COLUMNS}
              rows={rows}
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
                    'group absolute z-10 touch-none cursor-move',
                    draggingId === widget.id && 'z-50',
                  )}
                  style={{
                    left: widget.x * CELL_SIZE,
                    top: widget.y * CELL_SIZE,
                    width: widget.w * CELL_SIZE,
                    height: widget.h * CELL_SIZE,
                  }}
                >
                  <PlacedWidgetContent widget={widget} characterName={characterName} />
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

            {/* 편집 모드에서는 항상 또렷하게 보여준다 (호버 없이도) */}
            <GridSettingsButton className="cursor-default opacity-100" />
          </div>

          <div className="flex flex-col gap-4">
            <TemplatePanel
              widgets={widgets}
              rows={rows}
              boundCharacterId={boundCharacterId}
              onApplyLayout={applyTemplateLayout}
            />
            <WidgetPalette
              maxHeight={rows * CELL_SIZE}
              characterName={characterName}
              onCharacterNameChange={setCharacterName}
            />
          </div>
        </div>
      </GridSettingsModal>
    </div>
  )
}
