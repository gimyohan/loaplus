import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

import { useCharacterDirectory } from '@/contexts/CharacterDirectoryContext'
import { checkCustomWidget, decrementCounterWidget, updateCustomWidget } from '@/lib/customWidgets'
import { fetchWidgetLayout, saveWidgetLayout } from '@/lib/dashboards'
import { pickDefaultLayout } from '@/data/defaultLayouts'
import { useElementWidth } from '@/hooks/useElementWidth'
import { useRaidWidgetActions } from '@/hooks/useRaidWidgetActions'
import { runOptimistic } from '@/lib/optimistic'
import { cn } from '@/lib/utils'
import { CELL_SIZE, WIDGET_CATALOG } from '@/lib/widgetCatalog'
import { collidesWithAny } from '@/lib/widgetLayout'
import { CharacterNameForm } from '@/components/dashboard/CharacterNameForm'
import { DefaultLayoutPromptModal } from '@/components/dashboard/DefaultLayoutPromptModal'
import { WidgetGrid } from '@/components/dashboard/WidgetGrid'
import {
  WidgetPalette,
  type PaletteGrabEndHandler,
  type PaletteGrabMoveHandler,
  type PaletteGrabStartHandler,
} from '@/components/dashboard/WidgetPalette'
import { WidgetPlaceholder } from '@/components/dashboard/WidgetPlaceholder'
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

// 새로 배치된 Additional Value 위젯이 처음부터 갖고 있어야 하는 customData (docs/widgets.typ 참고).
// Default Value 위젯은 customData가 없다(undefined).
const DEFAULT_CUSTOM_DATA: Partial<Record<WidgetKind, Record<string, unknown>>> = {
  text: { text: '' },
  textCheckbox: { text: '', isChecked: false, resetDays: 0 },
  counter: { text: '', count: 0 },
  image: { url: null },
  linkIcon: { url: null, label: null },
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

// 위젯 목록에서 그리드로 옮기는 동안의 상태. 네이티브 HTML5 드래그앤드롭 대신 포인터 이벤트로
// 직접 구현한다 — WidgetPalette.tsx 상단 주석 참고(setDragImage 고스트가 디스플레이 배율에 따라
// 실제 크기와 다르게 보이는 크로미움 버그를 피하기 위함).
interface PaletteDragState {
  item: WidgetCatalogItem
  /** 타일 안에서 실제로 잡은 위치(0~1 비율) — 그리드에 스냅할 때도 이 비율을 그대로 앵커로 쓴다. */
  grabX: number
  grabY: number
  clientX: number
  clientY: number
}

// 이미 놓인 위젯을 옮기는 동안의 상태 — PaletteDragState와 동일한 모양이다. 새 위젯을 목록에서
// 끌어올 때와 똑같이(커서를 따라다니는 플로팅 미리보기 + 그리드 위 스냅 칸 표시) 보여주기 위해
// 드래그 중엔 실제 위젯 좌표(widget.x/y)를 바로 바꾸지 않고, 놓았을 때(pointer up)만 커밋한다.
interface ExistingWidgetDragState {
  widget: PlacedWidget
  grabX: number
  grabY: number
  clientX: number
  clientY: number
}

export interface WidgetDashboardProps {
  /** 이미 실제 캐릭터에 귀속된 카드라면 그 캐릭터 이름을 넘긴다. 넘기면 위젯 배치를
   * 마운트 시 바로 서버에서 조회한다(GET .../dashboards/{characterId}/widgets). 아직 귀속되지
   * 않은 새 카드라면 생략한다 — 위젯 팔레트의 이름 검색으로 귀속되기 전까진 서버에 저장할
   * characterId가 없으므로 로컬 상태로만 동작한다. */
  initialCharacterName?: string
  /** 이 카드에 캐릭터가 (재)귀속될 때마다 알려준다. 카드를 감싸는 상위 UI(예: 대시보드 카드 헤더)가
   * 이 카드의 상태를 몰라도 캐릭터 정보를 표시할 수 있도록 하기 위함이며, WidgetDashboard 자체의
   * 동작에는 영향을 주지 않는다. 처음 등록하는 캐릭터라면 characterId도 함께 넘어온다
   * (CharacterNameForm 참고) — 상위 UI가 findByName으로 다시 찾으면, CharacterDirectoryContext의
   * setCharacters 갱신이 아직 반영되기 전이라 못 찾는 경우가 있어(카드가 영영 임시 uuid로 남는
   * 버그의 원인이었다) 이미 조회된 id를 그대로 전달한다. */
  onCharacterNameChange?: (characterName: string, characterId?: string) => void
  /** 전달하면 카드 좌상단에 삭제 버튼이 표시된다 (호버 시 노출). */
  onRemove?: () => void
  /** 이 카드의 그리드 세로 칸 수(rows)가 서버에서 조회되거나 설정에서 바뀔 때마다 알려준다.
   * 카드를 감싸는 DashboardCard가 카드 전체를 스케일할 때 이 값으로 세로 비율을 맞춘다. */
  onRowsChange?: (rows: number) => void
  /** true면 마운트되자마자 위젯 설정 모달을 자동으로 연다(Add Character로 막 추가된 카드). */
  autoOpenSettings?: boolean
}

export function WidgetDashboard({
  initialCharacterName,
  onCharacterNameChange,
  onRemove,
  onRowsChange,
  autoOpenSettings,
}: WidgetDashboardProps = {}) {
  const [widgets, setWidgets] = useState<PlacedWidget[]>([])
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Add Character로 막 추가된 카드는 마운트되자마자 위젯 설정 모달을 자동으로 연다 — 카드는 항상
  // 새 uuid로 새로 마운트되므로 이 이펙트는 그 카드의 생애주기 동안 한 번만 실행되면 된다.
  useEffect(() => {
    if (autoOpenSettings) setIsSettingsOpen(true)
  }, [autoOpenSettings])
  const [characterName, setCharacterNameState] = useState(initialCharacterName ?? '')
  const [rows, setRowsState] = useState(DEFAULT_ROWS)
  const gridRef = useRef<HTMLDivElement>(null)
  // 위젯 설정 모달의 편집용 그리드는 실제 대시보드(카드 단위 ScaleToFit)와 달리, 모달 폭이 남는
  // 만큼 그리드 자체를 키워서 꽉 채운다 — 칸 하나의 픽셀 크기를 고정 CELL_SIZE 대신 이 칸이 실제로
  // 차지하는 폭을 재서 동적으로 계산한다(gridColumnRef가 붙는 wrapper는 min-w만 있고 자기 콘텐츠
  // 크기에 좌우되지 않으므로 순환 참조 없이 안정적으로 수렴한다). 좌표 계산(드롭 위치, 드래그
  // 이동)도 전부 이 값 기준으로 통일해야 한다 — DB에는 항상 그리드 칸 단위(정수)로만 저장되므로
  // 이 값 자체가 바뀌어도 저장되는 배치 데이터에는 영향이 없다.
  const { ref: gridColumnRef, width: gridColumnWidth } = useElementWidth<HTMLDivElement>()
  const editCellSize = gridColumnWidth > 0 ? gridColumnWidth / DEFAULT_COLUMNS : CELL_SIZE

  const { findByName } = useCharacterDirectory()
  // 귀속된 실제 캐릭터가 있을 때만 위젯 배치를 서버에 조회/저장한다. 아직 이름을 검색해
  // 귀속시키기 전에는 characterId가 없으므로 로컬 state로만 동작한다(위 initialCharacterName 참고).
  const boundCharacterId = characterName ? findByName(characterName)?.id : undefined
  const raidActions = useRaidWidgetActions(widgets, setWidgets, boundCharacterId)

  // 이름을 적용한 캐릭터에 서버 저장 배치가 없을 때(신규 등록, 또는 위젯을 하나도 저장한 적 없는
  // 기존 캐릭터) 기본 배치를 적용할지 지금 화면(귀속 전 미리 놓아뒀을 수 있는 위젯)을 그대로
  // 유지할지 물어야 한다 — snapshotWidgets는 그 순간의 로컬 widgets를 그대로 담아둔다(DefaultLayoutPromptModal 참고).
  const [awaitingLayoutChoice, setAwaitingLayoutChoice] = useState<{ snapshotWidgets: PlacedWidget[] } | null>(null)
  // 카드=캐릭터 귀속이 한 번 확정됐는지(사용자 확인) — 이미 저장된 배치를 그대로 불러왔거나, 위
  // 모달에서 둘 중 하나를 선택한 순간 true가 된다. widgets.length로만 잠금을 판단하면 "위젯을
  // 전부 지우면 다시 다른 이름으로 바꿀 수 있다"는 구멍이 생겨, 원래 캐릭터는 어느 카드에도 안
  // 보이는데 DB에는 그대로 남는 상태가 될 수 있다 — 그래서 한 번 true가 되면 위젯을 나중에 전부
  // 지워도 이 카드가 살아있는 동안(리마운트 전까지) 절대 다시 false로 돌아가지 않는다.
  const [isBindingCommitted, setIsBindingCommitted] = useState(false)
  // 아래 레이아웃 조회 이펙트가 "boundCharacterId 변경" 때만 재실행돼야 해서 widgets를 deps에 못
  // 넣는다(넣으면 위젯 하나 옮길 때마다 다시 조회해버림) — 대신 매 렌더 최신값을 ref로 미러링해
  // 그 이펙트 안에서는 ref로만 읽는다.
  const widgetsRef = useRef(widgets)
  useEffect(() => {
    widgetsRef.current = widgets
  })

  const setCharacterName = (name: string, characterId?: string) => {
    setCharacterNameState(name)
    onCharacterNameChange?.(name, characterId)
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
        // 서버에 저장된 배치가 없다 — 귀속 전 이 카드에 이미 놓아뒀을 수 있는 위젯을 그냥 빈
        // 배치로 덮어써버리면 조용히 사라지므로, widgetsRef(아직 아무것도 덮어쓰지 않았으므로
        // 정확히 "귀속 전 상태")를 스냅샷으로 남기고 사용자에게 기본 배치 적용/현재 배치 유지를
        // 묻는다. setWidgets는 그 선택 이후(handleApplyDefaultLayout/handleKeepCurrentLayout)에만 호출한다.
        if (layout.widgets.length === 0) {
          setAwaitingLayoutChoice({ snapshotWidgets: widgetsRef.current })
          return
        }
        // 그리드 가로 칸 수는 항상 고정(DEFAULT_COLUMNS)이라 layout.columns는 쓰지 않지만, 세로 칸
        // 수(rows)는 캐릭터별로 다를 수 있으니 서버 값을 그대로 반영한다. setRows(래퍼)를 쓰지 않고
        // 직접 부르는 이유는, 매 렌더 새로 만들어지는 그 래퍼를 deps에 넣으면 이 이펙트가 렌더마다
        // 다시 실행돼버리기 때문이다.
        setWidgets(layout.widgets)
        setRowsState(layout.rows)
        onRowsChange?.(layout.rows)
        setIsBindingCommitted(true)
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
  // 실제로 값이 바뀔 때만, 미체크→체크는 -1(0 미만 방지), 체크→미체크는 +1. optimisticUpdate가
  // (바깥 클로저가 아니라) 매번 넘어오는 prev에서 직접 읽는 이유는, 연달아 빠르게 눌러도 각
  // 호출이 그 시점 최신 상태를 기준으로 계산되게 하기 위함이다 — 그 과정에서 "되돌릴 값"도 함께
  // capturedPrevCustomData에 담아둔다(실패 시 revertUpdate가 그 값으로 되돌린다). runOptimistic
  // 기본값(실패 시 되돌림 + 성공 시 재조정) 그대로 쓴다 — checkCustomWidget이 최종 customData를
  // 돌려주므로 재조정도 자연스럽게 된다(lib/optimistic.ts 참고).
  const toggleWidgetChecked = (widgetId: string, isChecked: boolean) => {
    let capturedPrevCustomData: Record<string, unknown> | undefined

    void runOptimistic<PlacedWidget[], PlacedWidget>(
      setWidgets,
      (prev) =>
        prev.map((w) => {
          if (w.id !== widgetId) return w
          const prevCustomData = w.customData ?? {}
          capturedPrevCustomData = prevCustomData
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
      (prev) =>
        prev.map((w) => (w.id === widgetId ? { ...w, customData: capturedPrevCustomData ?? w.customData } : w)),
      () => checkCustomWidget(widgetId, isChecked),
      (response) => (prev) => prev.map((w) => (w.id === widgetId ? response : w)),
      { errorLabel: '체크박스 저장 실패' },
    )
  }

  // 카운터 위젯 카드 클릭 — 숫자를 1 줄인다(0 미만 방지). optimisticUpdate가 매번 prev에서
  // count를 직접 읽는 이유는 위 toggleWidgetChecked와 동일 — 연달아 눌러도 정확히 순서대로
  // 줄어들게 하기 위함이다. 서버는 저장된 값 기준으로 다시 계산해 응답하므로
  // (routes/customWidgets.ts) runOptimistic 기본값의 재조정이 그 응답으로 최종 값을 맞춰준다.
  const decrementWidgetCounter = (widgetId: string) => {
    let capturedPrevCustomData: Record<string, unknown> | undefined

    void runOptimistic<PlacedWidget[], PlacedWidget>(
      setWidgets,
      (prev) =>
        prev.map((w) => {
          if (w.id !== widgetId) return w
          capturedPrevCustomData = w.customData ?? {}
          const currentCount = typeof w.customData?.count === 'number' ? (w.customData.count as number) : 0
          return { ...w, customData: { ...w.customData, count: Math.max(currentCount - 1, 0) } }
        }),
      (prev) =>
        prev.map((w) => (w.id === widgetId ? { ...w, customData: capturedPrevCustomData ?? w.customData } : w)),
      () => decrementCounterWidget(widgetId),
      (response) => (prev) => prev.map((w) => (w.id === widgetId ? response : w)),
      { errorLabel: '카운터 감소 저장 실패' },
    )
  }

  const [paletteDrag, setPaletteDrag] = useState<PaletteDragState | null>(null)

  // 현재 포인터 위치 기준으로 스냅될 그리드 칸 좌표와, 그 자리에 실제로 놓을 수 있는지를 계산한다.
  // 드래그 중 미리보기(그리드 위 스냅 표시)와 놓았을 때(handlePaletteGrabEnd) 양쪽에서 같이 쓴다.
  const computeDropCell = (
    item: { w: number; h: number },
    grabX: number,
    grabY: number,
    clientX: number,
    clientY: number,
    excludeId?: string,
  ) => {
    if (!gridRef.current) return null
    const gridRect = gridRef.current.getBoundingClientRect()
    const withinGrid =
      clientX >= gridRect.left && clientX <= gridRect.right && clientY >= gridRect.top && clientY <= gridRect.bottom
    const localX = clientX - gridRect.left
    const localY = clientY - gridRect.top
    // 스냅 지점이 마우스로 실제로 잡았던 자리(grabX/grabY)가 되도록 칸 단위로 스냅한다 — 항상
    // 중심으로 맞추면 어디를 잡고 옮겼는지와 무관하게 자리가 튀어 보인다.
    const x = clamp(Math.round(localX / editCellSize - item.w * grabX), 0, DEFAULT_COLUMNS - item.w)
    const y = clamp(Math.round(localY / editCellSize - item.h * grabY), 0, rows - item.h)
    // excludeId: 이미 놓인 위젯을 옮기는 중이면 자기 자신과는 겹침으로 치지 않는다.
    const valid = withinGrid && !collidesWithAny({ x, y, w: item.w, h: item.h }, widgets, excludeId)
    return { x, y, withinGrid, valid }
  }

  // 레이드는 서버가 raidId를 생성해줘야 위젯이 성립하므로(POST .../raids) 다른 위젯처럼 임시
  // uuid로 즉시 로컬 생성할 수 없다 — 목표는 일단 고르지 않고(서버가 아이템 레벨 기준 자동 추천)
  // 바로 추가한 뒤, 톱니바퀴(RaidTargetModal, WidgetVisual 참고)에서 원하는 목표로 바꾸게 한다.
  const placeWidgetAt = (item: WidgetCatalogItem, x: number, y: number) => {
    if (item.kind === 'raid') {
      raidActions.createRaidAt(x, y, item.w, item.h)
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

  const handlePaletteGrabStart: PaletteGrabStartHandler = (item, grabX, grabY, clientX, clientY) => {
    setPaletteDrag({ item, grabX, grabY, clientX, clientY })
  }

  const handlePaletteGrabMove: PaletteGrabMoveHandler = (clientX, clientY) => {
    setPaletteDrag((prev) => (prev ? { ...prev, clientX, clientY } : prev))
  }

  // setState 업데이터 함수는 부수효과가 없어야 한다 — StrictMode(개발 모드)가 순수성 검증을 위해
  // 두 번 호출하는데, 여기서처럼 업데이터 안에서 placeWidgetAt(API 호출)을 실행하면 두 번 다
  // 그대로 실행된다. 레이드는 runOptimistic이 함수형 setWidgets로 낙관적 갱신을 쌓기 때문에 두
  // 호출의 결과(placeholder 두 개)가 전부 살아남아, 같은 자리에 레이드 위젯이 두 개 겹쳐서
  // 생성됐다(사용자 확인) — 그래서 부수효과는 업데이터 밖(일반 함수 본문)에서 paletteDrag를
  // 클로저로 직접 읽어 한 번만 실행하고, setPaletteDrag(null)은 부수효과 없는 값 대입만 한다.
  const handlePaletteGrabEnd: PaletteGrabEndHandler = (clientX, clientY) => {
    if (paletteDrag) {
      const cell = computeDropCell(paletteDrag.item, paletteDrag.grabX, paletteDrag.grabY, clientX, clientY)
      if (cell?.valid) placeWidgetAt(paletteDrag.item, cell.x, cell.y)
    }
    setPaletteDrag(null)
  }

  // 드래그 중 실시간으로 스냅 미리보기를 그리기 위한 파생값 — paletteDrag가 바뀔 때마다 다시 계산한다.
  const paletteDropPreview = paletteDrag
    ? computeDropCell(paletteDrag.item, paletteDrag.grabX, paletteDrag.grabY, paletteDrag.clientX, paletteDrag.clientY)
    : null

  const [existingDrag, setExistingDrag] = useState<ExistingWidgetDragState | null>(null)

  // 이미 놓인 위젯을 옮길 때 실제로 좌표를 반영하고 저장한다 — pointer up에서만 호출된다.
  const moveWidgetTo = (widget: PlacedWidget, x: number, y: number) => {
    const next = widgets.map((w) => (w.id === widget.id ? { ...w, x, y } : w))
    setWidgets(next)

    if (widget.kind === 'raid') {
      raidActions.moveRaid(widget, x, y)
      return
    }

    persistLayout(next)
  }

  const handleWidgetPointerDown = (widget: PlacedWidget) => (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('[data-widget-delete]')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const rect = event.currentTarget.getBoundingClientRect()
    setExistingDrag({
      widget,
      grabX: (event.clientX - rect.left) / rect.width,
      grabY: (event.clientY - rect.top) / rect.height,
      clientX: event.clientX,
      clientY: event.clientY,
    })
  }

  const handleWidgetPointerMove = (widget: PlacedWidget) => (event: PointerEvent<HTMLDivElement>) => {
    setExistingDrag((prev) =>
      prev && prev.widget.id === widget.id ? { ...prev, clientX: event.clientX, clientY: event.clientY } : prev,
    )
  }

  // handlePaletteGrabEnd와 같은 이유(StrictMode 이중 호출)로, 부수효과(moveWidgetTo)는 업데이터
  // 밖에서 existingDrag를 클로저로 직접 읽어 한 번만 실행한다.
  const handleWidgetPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId)
    if (existingDrag) {
      const cell = computeDropCell(
        existingDrag.widget,
        existingDrag.grabX,
        existingDrag.grabY,
        existingDrag.clientX,
        existingDrag.clientY,
        existingDrag.widget.id,
      )
      // 클릭만 한 경우(가디언/쿠르잔 전선처럼 내부에 체크박스가 많은 위젯은 클릭할 때마다
      // pointerdown/up이 걸린다)나, 겹침 등으로 놓을 수 없는 자리면 원래 자리를 그대로 둔다.
      if (cell?.valid && (cell.x !== existingDrag.widget.x || cell.y !== existingDrag.widget.y)) {
        moveWidgetTo(existingDrag.widget, cell.x, cell.y)
      }
    }
    setExistingDrag(null)
  }

  // 이미 놓인 위젯을 옮기는 동안의 스냅 미리보기 — paletteDropPreview와 동일한 계산이되, 자기
  // 자신과의 겹침은 무시한다(excludeId).
  const existingDropPreview = existingDrag
    ? computeDropCell(
        existingDrag.widget,
        existingDrag.grabX,
        existingDrag.grabY,
        existingDrag.clientX,
        existingDrag.clientY,
        existingDrag.widget.id,
      )
    : null

  const removeWidget = (id: string) => {
    const widget = widgets.find((w) => w.id === id)
    const next = widgets.filter((w) => w.id !== id)
    setWidgets(next)

    if (widget?.kind === 'raid') {
      raidActions.deleteRaid(widget)
      return
    }

    persistLayout(next)
  }

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
      raidActions.recreateRaidWidgets(
        existingRaidWidgets,
        raidEntries.map((w) => ({ x: w.x, y: w.y, w: w.w, h: w.h })),
      ),
    ]).then(([savedLayout, newRaidWidgets]) => {
      setWidgets([...newRaidWidgets, ...savedLayout.widgets])
      setRows(nextRows)
    })
  }

  // 배치 초기화 — 위젯을 전부 지우고(레이드 포함) 그리드 높이를 기본값으로 되돌린다. 캐릭터
  // 귀속(characterName/boundCharacterId)은 건드리지 않는다. 빈 배치를 적용하는 것과 동일하므로
  // applyTemplateLayout을 그대로 재사용한다.
  const resetLayout = () => applyTemplateLayout({ columns: DEFAULT_COLUMNS, rows: DEFAULT_ROWS, widgets: [] })

  // DefaultLayoutPromptModal "기본 배치 적용" — 아이템 레벨 구간에 맞는 기본 배치를
  // applyTemplateLayout으로 그대로 저장한다(배치 코드 적용과 완전히 같은 경로). 레벨을 못 구했거나
  // (신규 등록 직후 CharacterDirectoryContext 갱신이 아직 안 됐거나) 해당 구간 코드가 비어있으면
  // 아무 것도 하지 않는다 — 서버는 이미 빈 배치이므로 그대로 빈 채로 둔다. 두 버튼 중 어느 쪽을
  // 고르든 이 모달 자체가 "이 카드는 이 캐릭터다"를 확정하는 순간이라, 결과가 빈 배치로 남더라도
  // isBindingCommitted는 항상 true로 둔다(사용자 확인 — 나중에 위젯을 전부 지워도 다시 다른
  // 캐릭터로 못 바꾸게 하려면 여기서부터 잠가야 한다).
  const handleApplyDefaultLayout = () => {
    setAwaitingLayoutChoice(null)
    setIsBindingCommitted(true)
    const itemLevel = characterName ? findByName(characterName)?.itemLevel : undefined
    const layout = pickDefaultLayout(itemLevel)
    if (!layout) return
    applyTemplateLayout(layout).catch((err) => console.error('기본 배치 적용 실패', err))
  }

  // DefaultLayoutPromptModal "현재 배치 유지" — 이름을 귀속하기 전 이 카드에 이미 놓여있던
  // 위젯(스냅샷)을 로컬 상태는 그대로 두고 새로 귀속된 캐릭터에 저장만 한다. 스냅샷이 비어있으면
  // (애초에 아무것도 안 놓여있었으면) 저장할 것도 없으니 그대로 둔다. 이 경우에도 귀속은
  // 확정된다(위 handleApplyDefaultLayout 주석 참고) — 빈 채로 시작하기로 한 것도 선택이다.
  const handleKeepCurrentLayout = () => {
    setIsBindingCommitted(true)
    if (!awaitingLayoutChoice) return
    const { snapshotWidgets } = awaitingLayoutChoice
    setAwaitingLayoutChoice(null)
    if (snapshotWidgets.length === 0) return
    persistLayout(snapshotWidgets)
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
                onCounterDecrement={() => decrementWidgetCounter(widget.id)}
                raidExcludedKeys={raidActions.raidExcludedKeysFor(widget.id)}
                onRaidGateToggle={(gateIndex, cleared) => raidActions.toggleRaidGateCleared(widget.id, gateIndex, cleared)}
                onRaidMoreRewardToggle={(gateIndex, enabled) =>
                  raidActions.toggleRaidGateMoreReward(widget.id, gateIndex, enabled)
                }
                onRaidTargetChange={(raidKey, difficultyKey) => raidActions.changeRaidTarget(widget.id, raidKey, difficultyKey)}
                onRaidGoldRewardChange={(enabled) => raidActions.changeRaidGoldReward(widget.id, enabled)}
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
        {/* 왼쪽 열(그리드 칸) 안에서, 그리드를 직접 편집하는 게 아니라 카드 전체 설정에 해당하는
            그리드 높이/캐릭터 이름/배치 코드를 그리드 위에 얹는다 — 그리드 높이는 내용만큼만
            차지하고 캐릭터 이름이 남는 폭을 채우며 가로로 나란히 놓이고, 그 아래에 배치 코드가 이
            열 전체 폭을 그대로 써서 오른쪽 끝이 그리드 오른쪽 끝과 나란해진다. 오른쪽 위젯 목록은
            이 열과 나란한 형제(items-stretch)라 이 열 전체 높이(상단 컨트롤+그리드)만큼 저절로
            늘어난다. */}
        <div className="flex flex-wrap items-stretch gap-6">
          <div ref={gridColumnRef} className="flex min-w-[320px] flex-[6] flex-col gap-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-stretch gap-4">
                <div className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-card p-3">
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
                </div>
                <CharacterNameForm
                  className="min-w-[200px] flex-1"
                  characterName={characterName}
                  onCharacterNameChange={setCharacterName}
                  locked={isBindingCommitted}
                />
              </div>
              <TemplatePanel
                widgets={widgets}
                rows={rows}
                boundCharacterId={boundCharacterId}
                onApplyLayout={applyTemplateLayout}
                onResetLayout={resetLayout}
              />
            </div>

            <div className="relative inline-block">
              <WidgetGrid ref={gridRef} columns={DEFAULT_COLUMNS} rows={rows} cellSize={editCellSize}>
                {/* 위젯 목록에서 옮기는 중일 때, 실제로 스냅될 칸을 미리 보여준다 — 놓을 수 있으면
                    파란색, 다른 위젯과 겹쳐 놓을 수 없으면 빨간색으로 구분한다. */}
                {paletteDrag && paletteDropPreview?.withinGrid && (
                  <div
                    className={cn(
                      'pointer-events-none absolute z-30 rounded-lg border-2 transition-colors',
                      paletteDropPreview.valid ? 'border-primary bg-primary/20' : 'border-red-500 bg-red-500/20',
                    )}
                    style={{
                      left: paletteDropPreview.x * editCellSize,
                      top: paletteDropPreview.y * editCellSize,
                      width: paletteDrag.item.w * editCellSize,
                      height: paletteDrag.item.h * editCellSize,
                    }}
                  />
                )}
                {/* 이미 놓인 위젯을 옮기는 중일 때도 새 위젯을 배치할 때와 똑같이 스냅될 칸을
                    미리 보여준다. */}
                {existingDrag && existingDropPreview?.withinGrid && (
                  <div
                    className={cn(
                      'pointer-events-none absolute z-30 rounded-lg border-2 transition-colors',
                      existingDropPreview.valid ? 'border-primary bg-primary/20' : 'border-red-500 bg-red-500/20',
                    )}
                    style={{
                      left: existingDropPreview.x * editCellSize,
                      top: existingDropPreview.y * editCellSize,
                      width: existingDrag.widget.w * editCellSize,
                      height: existingDrag.widget.h * editCellSize,
                    }}
                  />
                )}
                {widgets.map((widget) => (
                  <div
                    key={widget.id}
                    onPointerDown={handleWidgetPointerDown(widget)}
                    onPointerMove={handleWidgetPointerMove(widget)}
                    onPointerUp={handleWidgetPointerUp}
                    className={cn(
                      'group absolute z-10 touch-none cursor-move transition-opacity',
                      existingDrag?.widget.id === widget.id && 'z-50 opacity-30',
                    )}
                    style={{
                      left: widget.x * editCellSize,
                      top: widget.y * editCellSize,
                      width: widget.w * editCellSize,
                      height: widget.h * editCellSize,
                    }}
                  >
                    {/* 편집 중엔 이미 놓인 위젯도 실제 데이터로 그리지 않는다 — 배치/이동에 필요한
                        건 이름과 칸 크기뿐이라 위젯 목록(WidgetPalette)과 같은 자리표시자를 쓴다 */}
                    <WidgetPlaceholder
                      label={WIDGET_CATALOG.find((item) => item.kind === widget.kind)?.label ?? widget.kind}
                      w={widget.w}
                      h={widget.h}
                      className="h-full w-full"
                    />
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
            </div>
          </div>

          <WidgetPalette
            className="min-w-[240px] flex-[4]"
            characterName={characterName}
            onGrabStart={handlePaletteGrabStart}
            onGrabMove={handlePaletteGrabMove}
            onGrabEnd={handlePaletteGrabEnd}
          />
        </div>
      </GridSettingsModal>

      <DefaultLayoutPromptModal
        open={awaitingLayoutChoice !== null}
        characterName={characterName}
        onApplyDefault={handleApplyDefaultLayout}
        onKeepCurrent={handleKeepCurrentLayout}
      />

      {/* 위젯 목록에서 그리드로 옮기는 동안 커서를 따라다니는 미리보기. 실제로 놓일 크기 그대로
          CSS 픽셀로 직접 그려서(브라우저 네이티브 드래그 고스트를 쓰지 않음) 디스플레이 배율과
          무관하게 항상 정확한 크기로 보이고, 투명도도 우리가 직접 정한다. body에 포털로 그려서
          모달 등 어떤 조상 엘리먼트의 clipping/transform에도 영향받지 않는다. */}
      {paletteDrag &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[100] flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-primary bg-primary/30 text-center opacity-90 shadow-2xl backdrop-blur-[1px]"
            style={{
              left: paletteDrag.clientX - paletteDrag.grabX * paletteDrag.item.w * editCellSize,
              top: paletteDrag.clientY - paletteDrag.grabY * paletteDrag.item.h * editCellSize,
              width: paletteDrag.item.w * editCellSize,
              height: paletteDrag.item.h * editCellSize,
            }}
          >
            <span className="px-1 text-xs font-medium leading-tight text-foreground">
              {paletteDrag.item.label}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {paletteDrag.item.w}×{paletteDrag.item.h}
            </span>
          </div>,
          document.body,
        )}

      {/* 이미 놓인 위젯을 옮기는 동안에도 위와 동일한 방식의 플로팅 미리보기를 보여준다 —
          원래 자리의 위젯은 흐리게(opacity-30) 남겨두고, 커서를 따라다니는 이 미리보기와 위
          그리드 위 스냅 칸 표시로 어디에 놓일지 확인할 수 있게 한다. */}
      {existingDrag &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[100] flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-primary bg-primary/30 text-center opacity-90 shadow-2xl backdrop-blur-[1px]"
            style={{
              left: existingDrag.clientX - existingDrag.grabX * existingDrag.widget.w * editCellSize,
              top: existingDrag.clientY - existingDrag.grabY * existingDrag.widget.h * editCellSize,
              width: existingDrag.widget.w * editCellSize,
              height: existingDrag.widget.h * editCellSize,
            }}
          >
            <span className="px-1 text-xs font-medium leading-tight text-foreground">
              {WIDGET_CATALOG.find((item) => item.kind === existingDrag.widget.kind)?.label ?? existingDrag.widget.kind}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {existingDrag.widget.w}×{existingDrag.widget.h}
            </span>
          </div>,
          document.body,
        )}
    </div>
  )
}
