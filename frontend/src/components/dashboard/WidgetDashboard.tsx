import { useEffect, useRef, useState, type SetStateAction } from 'react'
import { ArrowDown, ArrowUp, Settings, X } from 'lucide-react'

import { useCharacterDirectory } from '@/contexts/CharacterDirectoryContext'
import { checkCustomWidget, decrementCounterWidget, updateCustomWidget } from '@/lib/customWidgets'
import { fetchWidgetLayout, saveWidgetOrder, type WidgetOrderEntry } from '@/lib/dashboards'
import { pickDefaultLayout } from '@/data/defaultLayouts'
import { useRaidWidgetActions } from '@/hooks/useRaidWidgetActions'
import { runOptimistic } from '@/lib/optimistic'
import { createRaidWidget, deleteRaidWidget } from '@/lib/raids'
import { cn } from '@/lib/utils'
import { CARD_WIDTH, IMAGE_SIZE_HEIGHTS, findCatalogItem, readImageSize, type ImageSize } from '@/lib/widgetCatalog'
import { CharacterNameForm } from '@/components/dashboard/CharacterNameForm'
import { DefaultLayoutPromptModal } from '@/components/dashboard/DefaultLayoutPromptModal'
import { WidgetPalette, type PaletteAddHandler } from '@/components/dashboard/WidgetPalette'
import { TemplatePanel } from '@/components/dashboard/TemplatePanel'
import { PlacedWidgetContent } from '@/components/dashboard/PlacedWidgetContent'
import { GridSettingsModal } from '@/components/dashboard/GridSettingsModal'
import type { TemplateLayout } from '@/types/template'
import type { PlacedWidget, WidgetKind } from '@/types/widget'

// 새로 추가된 Additional Value 위젯이 처음부터 갖고 있어야 하는 customData (docs/widgets.md 참고).
// Default Value 위젯은 customData가 없다(undefined).
const DEFAULT_CUSTOM_DATA: Partial<Record<WidgetKind, Record<string, unknown>>> = {
  text: { text: '' },
  textCheckbox: { text: '', isChecked: false, resetDays: 0 },
  counter: { text: '', count: 0 },
  image: { url: null, size: 'M' },
  linkIcon: { url: null, label: null },
}

const IMAGE_SIZES = Object.keys(IMAGE_SIZE_HEIGHTS) as ImageSize[]

// 아직 서버에 저장되지 않은 위젯의 임시 id 앞머리. 일반 위젯은 다음 순서 저장(PUT)에서 kind로
// 보내져 서버가 만들고, 레이드는 POST .../raids 응답이 오면 진짜 위젯으로 교체된다.
const LOCAL_ID_PREFIX = 'local-'

function isLocalWidget(widget: PlacedWidget) {
  return widget.id.startsWith(LOCAL_ID_PREFIX)
}

function newLocalId() {
  return LOCAL_ID_PREFIX + crypto.randomUUID()
}

function widgetLabel(widget: PlacedWidget) {
  return findCatalogItem(widget.kind)?.label ?? widget.kind
}

// 자기 박스를 그대로 갖는 위젯(배너). 나머지는 카드 한 면 위의 행으로 묶인다.
const STANDALONE_KINDS = new Set<WidgetKind>(['banner', 'bannerCompact', 'bannerDetailed'])

type CardSegment =
  | { type: 'standalone'; widget: PlacedWidget }
  /** items의 배열 원소는 연속한 정사각형 타일(링크 & 아이콘 등) 묶음 — 한 행에 나란히 놓인다. */
  | { type: 'rows'; key: string; items: Array<PlacedWidget | PlacedWidget[]> }

/**
 * 사용자가 정한 순서는 그대로 두고, 이어지는 행 위젯끼리만 한 면(구분선으로 나뉜 행들)으로 묶는다.
 * 배너가 중간에 있으면 그 앞뒤가 서로 다른 면이 된다.
 */
function groupCardSegments(widgets: PlacedWidget[]): CardSegment[] {
  const segments: CardSegment[] = []
  for (const widget of widgets) {
    if (STANDALONE_KINDS.has(widget.kind)) {
      segments.push({ type: 'standalone', widget })
      continue
    }
    let current = segments[segments.length - 1]
    if (!current || current.type !== 'rows') {
      current = { type: 'rows', key: widget.id, items: [] }
      segments.push(current)
    }
    const isTile = Boolean(findCatalogItem(widget.kind)?.tile)
    const last = current.items[current.items.length - 1]
    if (isTile && Array.isArray(last)) last.push(widget)
    else current.items.push(isTile ? [widget] : widget)
  }
  return segments
}

export interface WidgetDashboardProps {
  /** 이미 실제 캐릭터에 귀속된 카드라면 그 캐릭터 이름을 넘긴다. 넘기면 위젯 목록을
   * 마운트 시 바로 서버에서 조회한다(GET .../dashboards/{characterId}/widgets). 아직 귀속되지
   * 않은 새 카드라면 생략한다 — 이름 검색으로 귀속되기 전까진 서버에 저장할 characterId가
   * 없으므로 로컬 상태로만 동작한다. */
  initialCharacterName?: string
  /** 이 카드에 캐릭터가 (재)귀속될 때마다 알려준다. 처음 등록하는 캐릭터라면 characterId도 함께
   * 넘어온다(CharacterNameForm 참고) — 상위 UI가 findByName으로 다시 찾으면 컨텍스트 갱신이 아직
   * 반영되기 전이라 못 찾는 경우가 있어(카드가 임시 uuid로 남는 버그의 원인이었다) 그대로 전달한다. */
  onCharacterNameChange?: (characterName: string, characterId?: string) => void
  /** 전달하면 카드 좌상단에 삭제 버튼이 표시된다 (호버 시 노출). */
  onRemove?: () => void
  /** true면 마운트되자마자 위젯 설정 모달을 자동으로 연다(Add Character로 막 추가된 카드). */
  autoOpenSettings?: boolean
  /** 카드 폭(px). 데스크톱은 CARD_WIDTH 고정, 모바일은 화면이 더 좁으면 그만큼 줄어든다. */
  cardWidth?: number
}

/**
 * 캐릭터 카드 한 장. 위젯을 위→아래 순서대로 카드 폭 하나로 쌓는다(docs/ui_redesign.md) — 예전
 * 그리드 자유 배치처럼 좌표·크기를 고르지 않고, 설정 모달에서 위젯을 추가/삭제하고 순서만 바꾼다.
 *
 * 순서에 영향을 주는 서버 호출(순서 저장 PUT, 레이드 생성/삭제, 배치 코드 적용)은 전부 한 줄로
 * 세워(enqueue) 앞 호출이 끝난 뒤에 다음 호출을 보낸다. 버튼을 연달아 눌러도 (1) 아직 저장 중인
 * 새 위젯이 두 번 만들어지거나 (2) 서버엔 이미 생긴 레이드가 순서 배열에서 빠져 거부되는 일이 없다.
 */
export function WidgetDashboard({
  initialCharacterName,
  onCharacterNameChange,
  onRemove,
  autoOpenSettings,
  cardWidth = CARD_WIDTH,
}: WidgetDashboardProps = {}) {
  const [widgets, setWidgetsState] = useState<PlacedWidget[]>([])
  // 서버 호출 직전에 "지금" 순서를 읽어야 해서 state와 별도로 항상 최신 값을 들고 있는다 —
  // setState 반영(리렌더)을 기다리지 않도록 갱신은 전부 updateWidgets를 거친다.
  const widgetsRef = useRef<PlacedWidget[]>([])
  const updateWidgets = (action: SetStateAction<PlacedWidget[]>) => {
    widgetsRef.current = typeof action === 'function' ? action(widgetsRef.current) : action
    setWidgetsState(widgetsRef.current)
  }

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  useEffect(() => {
    if (autoOpenSettings) setIsSettingsOpen(true)
  }, [autoOpenSettings])

  const [characterName, setCharacterNameState] = useState(initialCharacterName ?? '')
  const { findByName } = useCharacterDirectory()
  // 귀속된 실제 캐릭터가 있을 때만 위젯 목록을 서버에 조회/저장한다.
  const boundCharacterId = characterName ? findByName(characterName)?.id : undefined
  const raidActions = useRaidWidgetActions(widgets, updateWidgets, boundCharacterId)

  // 이름을 적용한 캐릭터에 서버 저장 위젯이 없을 때(신규 등록 등) 기본 배치를 적용할지, 귀속 전에
  // 미리 놓아둔 위젯을 그대로 쓸지 묻는다(DefaultLayoutPromptModal).
  const [awaitingLayoutChoice, setAwaitingLayoutChoice] = useState<{ snapshotWidgets: PlacedWidget[] } | null>(null)
  // 카드=캐릭터 귀속이 한 번 확정되면 이 카드가 살아있는 동안 다시 다른 이름으로 바꿀 수 없다
  // (위젯을 전부 지워도 마찬가지 — 원래 캐릭터가 어느 카드에도 안 보이는데 DB엔 남는 상태를 막는다).
  const [isBindingCommitted, setIsBindingCommitted] = useState(false)

  const setCharacterName = (name: string, characterId?: string) => {
    setCharacterNameState(name)
    onCharacterNameChange?.(name, characterId)
  }

  useEffect(() => {
    if (!boundCharacterId) return
    let cancelled = false
    fetchWidgetLayout(boundCharacterId)
      .then((layout) => {
        if (cancelled) return
        if (layout.widgets.length === 0) {
          setAwaitingLayoutChoice({ snapshotWidgets: widgetsRef.current })
          return
        }
        widgetsRef.current = layout.widgets
        setWidgetsState(layout.widgets)
        setIsBindingCommitted(true)
      })
      .catch((err) => console.error('위젯 목록 조회 실패', err))
    return () => {
      cancelled = true
    }
  }, [boundCharacterId])

  // --- 서버 호출 직렬화 --------------------------------------------------------------------------
  const queueRef = useRef<Promise<unknown>>(Promise.resolve())
  // 지우기로 한(화면에선 이미 뺀) 레이드 위젯 중 아직 DELETE가 끝나지 않은 것들. 그 사이에 나가는
  // 순서 저장은 서버에 아직 남아있는 이 레이드를 포함해야 거부되지 않는다(raid_widget_missing).
  const pendingRaidDeletesRef = useRef(new Set<string>())

  const enqueue = <T,>(task: () => Promise<T>): Promise<T> => {
    const run = queueRef.current.then(task)
    queueRef.current = run.catch(() => undefined)
    return run
  }

  // 지금 화면의 순서를 그대로 서버에 맞춘다. 실행되는 시점의 최신 순서를 읽으므로, 여러 번 연달아
  // 불려도 마지막 호출이 최종 순서를 남긴다. 응답으로 받은 새 위젯 id는 임시 id 자리에 끼워 넣는다
  // (응답 전체로 덮어쓰지 않는다 — 그 사이 화면에서 더 바뀐 내용이 사라지지 않도록).
  const persistOrder = () => {
    const characterId = boundCharacterId
    if (!characterId) return Promise.resolve()
    return enqueue(async () => {
      const current = widgetsRef.current.filter((widget) => !(widget.kind === 'raid' && isLocalWidget(widget)))
      const localIds = current.filter(isLocalWidget).map((widget) => widget.id)
      const keptIds = new Set(current.filter((widget) => !isLocalWidget(widget)).map((widget) => widget.id))
      const entries: WidgetOrderEntry[] = current.map((widget) =>
        isLocalWidget(widget)
          ? { kind: widget.kind, ...(widget.customData ? { customData: widget.customData } : {}) }
          : { id: widget.id },
      )
      for (const id of pendingRaidDeletesRef.current) entries.push({ id })

      const layout = await saveWidgetOrder(characterId, entries)
      const created = layout.widgets.filter((widget) => !keptIds.has(widget.id) && !pendingRaidDeletesRef.current.has(widget.id))
      const idMap = new Map(localIds.map((id, index) => [id, created[index]]))
      updateWidgets((prev) => prev.map((widget) => idMap.get(widget.id) ?? widget))
    }).catch((err) => console.error('위젯 순서 저장 실패', err))
  }

  // --- 위젯 내용 편집(대시보드에서 바로) ---------------------------------------------------------
  // Additional Value 위젯 하나의 내용(텍스트/이미지 URL/크기 등)만 바꾼다 — 이 위젯 하나만 PUT한다.
  // 아직 저장 전인(임시 id) 위젯은 다음 순서 저장 때 이 내용 그대로 만들어지므로 로컬만 바꾼다.
  const updateWidgetCustomData = (widgetId: string, customData: Record<string, unknown>) => {
    const widget = widgetsRef.current.find((w) => w.id === widgetId)
    if (!widget) return
    updateWidgets((prev) => prev.map((w) => (w.id === widgetId ? { ...w, customData } : w)))
    if (isLocalWidget(widget)) return
    updateCustomWidget(widgetId, { customData }).catch((err) => console.error('위젯 내용 저장 실패', err))
  }

  // textCheckbox 위젯의 체크 토글 — remainingCount(카운터)도 백엔드(routes/customWidgets.ts)와 같은
  // 규칙으로 낙관적으로 갱신한다(실제로 값이 바뀔 때만, 미체크→체크 -1(0 미만 방지), 체크→미체크 +1).
  const toggleWidgetChecked = (widgetId: string, isChecked: boolean) => {
    let capturedPrevCustomData: Record<string, unknown> | undefined

    void runOptimistic<PlacedWidget[], PlacedWidget>(
      updateWidgets,
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

  // 카운터 위젯 카드 클릭 — 숫자를 1 줄인다(0 미만 방지). 서버가 저장된 값 기준으로 다시 계산해
  // 응답하므로 runOptimistic 기본값의 재조정이 최종 값을 맞춰준다.
  const decrementWidgetCounter = (widgetId: string) => {
    let capturedPrevCustomData: Record<string, unknown> | undefined

    void runOptimistic<PlacedWidget[], PlacedWidget>(
      updateWidgets,
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

  // --- 순서 편집(설정 모달) ----------------------------------------------------------------------
  const handleAddWidget: PaletteAddHandler = (item, customDataOverride) => {
    if (item.kind === 'raid') {
      // 레이드는 서버가 raidId를 만들어줘야 성립하므로(POST .../raids) 자리표시자를 먼저 끝에 넣고,
      // 응답이 오면 진짜 위젯으로 바꾼다. 서버는 새 레이드를 카드 맨 아래에 붙이므로, 그 사이
      // 자리표시자를 옮겼다면 순서를 한 번 더 저장해 맞춘다.
      const characterId = boundCharacterId
      if (!characterId) return
      const placeholderId = newLocalId()
      updateWidgets((prev) => [...prev, { id: placeholderId, kind: 'raid' }])
      void enqueue(async () => {
        const created = await createRaidWidget(characterId)
        const isLast = widgetsRef.current[widgetsRef.current.length - 1]?.id === placeholderId
        updateWidgets((prev) => prev.map((widget) => (widget.id === placeholderId ? created : widget)))
        if (!isLast) void persistOrder()
      }).catch((err) => {
        console.error('레이드 위젯 생성 실패', err)
        updateWidgets((prev) => prev.filter((widget) => widget.id !== placeholderId))
      })
      return
    }

    const customData = DEFAULT_CUSTOM_DATA[item.kind]
      ? { ...DEFAULT_CUSTOM_DATA[item.kind], ...customDataOverride }
      : undefined
    updateWidgets((prev) => [...prev, { id: newLocalId(), kind: item.kind, customData }])
    void persistOrder()
  }

  const moveWidget = (index: number, delta: -1 | 1) => {
    const target = index + delta
    if (target < 0 || target >= widgetsRef.current.length) return
    updateWidgets((prev) => {
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
    void persistOrder()
  }

  const removeWidget = (widget: PlacedWidget) => {
    updateWidgets((prev) => prev.filter((w) => w.id !== widget.id))
    const characterId = boundCharacterId
    if (widget.kind === 'raid') {
      // 아직 생성 중인 자리표시자는 서버에 없으니 화면에서만 뺀다(생성 응답은 교체할 대상이 없어 무시된다).
      if (!characterId || !widget.raidId || isLocalWidget(widget)) return
      pendingRaidDeletesRef.current.add(widget.id)
      // 삭제 대기 표시는 이 작업 안에서 지워야 한다 — 바깥 .finally로 지우면 줄의 다음 작업(순서
      // 저장)이 먼저 시작돼, 이미 지워진 레이드 id를 보내 거부(unknown_widget)될 수 있다.
      void enqueue(async () => {
        try {
          await deleteRaidWidget(characterId, widget.raidId!)
        } finally {
          pendingRaidDeletesRef.current.delete(widget.id)
        }
      }).catch((err) => console.error('레이드 위젯 삭제 실패', err))
      return
    }
    void persistOrder()
  }

  // 배치 코드/기본 배치 적용 — "적용"은 덮어쓰기다. 기존 레이드 슬롯은 진행 상태와 함께 지우고(코드는
  // 종류·순서만 담아 되살릴 수 없다) 코드의 레이드 항목 수만큼 빈 슬롯을 새로 만든 뒤, 코드 순서
  // 그대로 저장한다(그 외 기존 위젯은 순서 저장이 지운다).
  const applyTemplateLayout = (layout: TemplateLayout) => {
    const characterId = boundCharacterId
    if (!characterId) return Promise.resolve()

    return enqueue(async () => {
      const existingRaids = widgetsRef.current.filter((widget) => widget.kind === 'raid' && widget.raidId && !isLocalWidget(widget))
      await Promise.all(existingRaids.map((widget) => deleteRaidWidget(characterId, widget.raidId!)))

      const raidCount = layout.widgets.filter((widget) => widget.kind === 'raid').length
      const createdRaids: PlacedWidget[] = []
      for (let i = 0; i < raidCount; i += 1) createdRaids.push(await createRaidWidget(characterId))

      let raidCursor = 0
      const entries: WidgetOrderEntry[] = layout.widgets.map(({ kind }) => {
        if (kind === 'raid') return { id: createdRaids[raidCursor++].id }
        const customData = DEFAULT_CUSTOM_DATA[kind]
        return customData ? { kind, customData } : { kind }
      })
      const saved = await saveWidgetOrder(characterId, entries)
      updateWidgets(saved.widgets)
    })
  }

  const resetLayout = () => applyTemplateLayout({ widgets: [] })

  // DefaultLayoutPromptModal "기본 배치 적용". 두 버튼 중 어느 쪽을 고르든 이 순간 귀속이 확정된다.
  const handleApplyDefaultLayout = () => {
    setAwaitingLayoutChoice(null)
    setIsBindingCommitted(true)
    const itemLevel = characterName ? findByName(characterName)?.itemLevel : undefined
    const layout = pickDefaultLayout(itemLevel)
    if (!layout) return
    applyTemplateLayout(layout).catch((err) => console.error('기본 배치 적용 실패', err))
  }

  // DefaultLayoutPromptModal "현재 배치 유지" — 귀속 전에 놓아둔 위젯(전부 임시 id)을 그대로 저장한다.
  const handleKeepCurrentLayout = () => {
    setIsBindingCommitted(true)
    if (!awaitingLayoutChoice) return
    const { snapshotWidgets } = awaitingLayoutChoice
    setAwaitingLayoutChoice(null)
    if (snapshotWidgets.length === 0) return
    updateWidgets(snapshotWidgets)
    void persistOrder()
  }

  const renderWidget = (widget: PlacedWidget) => (
    <PlacedWidgetContent
      key={widget.id}
      widget={widget}
      cardWidth={cardWidth}
      interactive
      characterName={characterName}
      onCustomDataChange={(customData) => updateWidgetCustomData(widget.id, customData)}
      onCheckboxToggle={(isChecked) => toggleWidgetChecked(widget.id, isChecked)}
      onCounterDecrement={() => decrementWidgetCounter(widget.id)}
      raidExcludedKeys={raidActions.raidExcludedKeysFor(widget.id)}
      onRaidGateToggle={(gateIndex, cleared) => raidActions.toggleRaidGateCleared(widget.id, gateIndex, cleared)}
      onRaidMoreRewardToggle={(gateIndex, enabled) => raidActions.toggleRaidGateMoreReward(widget.id, gateIndex, enabled)}
      onRaidTargetChange={(raidKey, difficultyKey) => raidActions.changeRaidTarget(widget.id, raidKey, difficultyKey)}
      onRaidGoldRewardChange={(enabled) => raidActions.changeRaidGoldReward(widget.id, enabled)}
    />
  )

  return (
    <div>
      {/* 실제 대시보드에 보이는 카드. 배너는 자기 박스로, 그 밖의 연속한 위젯들은 카드 한 면 위의
          행으로 묶어 그린다(groupCardSegments). 배치 편집은 오른쪽 위 도구 막대 → 설정 모달. */}
      <div className="group relative flex flex-col gap-2" style={{ width: cardWidth }}>
        {groupCardSegments(widgets).map((segment) =>
          segment.type === 'standalone' ? (
            renderWidget(segment.widget)
          ) : (
            <div key={segment.key} className="divide-y divide-border rounded-xl border border-border bg-card">
              {segment.items.map((item) =>
                Array.isArray(item) ? (
                  <div key={item[0].id} className="flex flex-wrap gap-2 px-3 py-2">
                    {item.map(renderWidget)}
                  </div>
                ) : (
                  renderWidget(item)
                ),
              )}
            </div>
          ),
        )}

        {widgets.length === 0 && (
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Settings className="h-5 w-5" />
            {characterName ? '위젯을 추가해 보세요' : '캐릭터와 위젯을 설정해 보세요'}
          </button>
        )}

        {/* 카드 단위 도구 막대(슬랙 메시지의 호버 도구 막대 자리) — 카드에 마우스를 올리면 오른쪽 위
            모서리에 뜬다. 첫 위젯의 자체 설정 버튼과 겹치지 않도록 카드 바깥쪽으로 살짝 띄운다. */}
        <div className="absolute -top-3 right-3 z-20 flex items-center rounded-lg border border-border bg-card p-0.5 opacity-0 shadow-lg transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            aria-label="위젯 설정"
            title="위젯 설정"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
          >
            <Settings className="h-4 w-4" />
          </button>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              aria-label="카드 삭제"
              title="카드 삭제"
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-danger/15 hover:text-danger"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <GridSettingsModal open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)}>
        <div className="flex flex-wrap items-stretch gap-6">
          <div className="flex min-w-[300px] flex-[6] flex-col gap-4">
            <CharacterNameForm
              characterName={characterName}
              onCharacterNameChange={setCharacterName}
              locked={isBindingCommitted}
            />
            <TemplatePanel
              widgets={widgets}
              boundCharacterId={boundCharacterId}
              onApplyLayout={applyTemplateLayout}
              onResetLayout={resetLayout}
            />

            <section aria-label="위젯 순서" className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-bold text-foreground">위젯 순서</h3>
                <span className="text-xs text-muted-foreground">위에서부터 카드에 쌓입니다</span>
              </div>
              {widgets.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">오른쪽 위젯 목록에서 추가하세요.</p>
              ) : (
                <ol className="flex flex-col gap-1">
                  {widgets.map((widget, index) => (
                    <WidgetOrderRow
                      key={widget.id}
                      widget={widget}
                      isFirst={index === 0}
                      isLast={index === widgets.length - 1}
                      onMoveUp={() => moveWidget(index, -1)}
                      onMoveDown={() => moveWidget(index, 1)}
                      onRemove={() => removeWidget(widget)}
                      onImageSizeChange={(size) =>
                        updateWidgetCustomData(widget.id, { ...(widget.customData ?? {}), size })
                      }
                    />
                  ))}
                </ol>
              )}
            </section>
          </div>

          <WidgetPalette className="min-w-[260px] flex-[4]" characterName={characterName} onAdd={handleAddWidget} />
        </div>
      </GridSettingsModal>

      <DefaultLayoutPromptModal
        open={awaitingLayoutChoice !== null}
        characterName={characterName}
        onApplyDefault={handleApplyDefaultLayout}
        onKeepCurrent={handleKeepCurrentLayout}
      />
    </div>
  )
}

interface WidgetOrderRowProps {
  widget: PlacedWidget
  isFirst: boolean
  isLast: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
  onImageSizeChange: (size: ImageSize) => void
}

/** 위젯 순서 목록의 한 줄 — 이름(레이드는 목표), 이미지면 높이 단계, 위/아래 이동, 삭제. */
function WidgetOrderRow({ widget, isFirst, isLast, onMoveUp, onMoveDown, onRemove, onImageSizeChange }: WidgetOrderRowProps) {
  const isPendingRaid = widget.kind === 'raid' && isLocalWidget(widget)
  const iconButtonClass =
    'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30'

  return (
    <li className="flex h-10 items-center gap-2 rounded-lg bg-background px-2">
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
        {widgetLabel(widget)}
        {isPendingRaid && <span className="ml-2 text-xs text-muted-foreground">추가 중…</span>}
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
                onClick={() => onImageSizeChange(size)}
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

      <button type="button" aria-label="위로" disabled={isFirst} onClick={onMoveUp} className={iconButtonClass}>
        <ArrowUp className="h-4 w-4" />
      </button>
      <button type="button" aria-label="아래로" disabled={isLast} onClick={onMoveDown} className={iconButtonClass}>
        <ArrowDown className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="위젯 삭제"
        disabled={isPendingRaid}
        onClick={onRemove}
        className={cn(iconButtonClass, 'hover:bg-danger/15 hover:text-danger')}
      >
        <X className="h-4 w-4" />
      </button>
    </li>
  )
}
