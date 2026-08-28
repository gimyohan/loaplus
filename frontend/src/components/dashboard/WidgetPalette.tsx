import { ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react'
import { useEffect, useState, type ChangeEvent, type PointerEvent } from 'react'

import { Tooltip } from '@/components/ui/tooltip'
import { useCharacterDirectory } from '@/contexts/CharacterDirectoryContext'
import { clamp, cn } from '@/lib/utils'
import { WIDGET_CATALOG } from '@/lib/widgetCatalog'
import type { WidgetCatalogItem } from '@/types/widget'

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1)
}

/** 위젯 목록 카드에서 가로(w)·세로(h) 칸 수를 각각 입력창으로 고를 때 쓰는 상태 묶음 — 텍스트/
 * 루틴(가로만)과 이미지(가로+세로) 둘 다 같은 로직을 쓰므로 축 하나만큼을 여기 모았다.
 * value는 실제로 배치에 쓰이는 확정값이고, draft는 입력창에 그대로 타이핑 중인 문자열이다 —
 * 확정값 하나로만 입력창을 그리면 숫자를 다 지웠을 때 즉시 이전 값으로 되돌아가버려 새 값을
 * 이어서 입력할 수 없다(TextWidget의 textDraft/onBlur 패턴과 동일한 이유).
 */
function useDimensionDraft(initial: number, min: number, max: number) {
  const [value, setValue] = useState(initial)
  const [draft, setDraft] = useState(String(initial))
  useEffect(() => {
    setValue(initial)
    setDraft(String(initial))
  }, [initial, min, max])

  // 입력 중엔 숫자가 아닌 문자만 걸러내고, 완전히 비우는 것도 허용한다(새 값을 이어 입력할 수
  // 있도록) — 실제 확정값(value)은 유효한 숫자가 나올 때만 min~max로 clamp해서 갱신한다.
  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const digits = event.target.value.replace(/[^0-9]/g, '')
    setDraft(digits)
    if (digits === '') return
    setValue(clamp(Number(digits), min, max))
  }

  // 포커스를 벗어날 때 입력창 표시를 확정값으로 맞춘다 — 비운 채로 두거나(digits==='') 범위를
  // 벗어난 값을 입력해 clamp된 경우 모두, 실제로 배치될 값을 그대로 보여주기 위함이다.
  const onBlur = () => setDraft(String(value))

  return { value, draft, onChange, onBlur }
}

export type PaletteGrabStartHandler = (
  item: WidgetCatalogItem,
  grabX: number,
  grabY: number,
  clientX: number,
  clientY: number,
) => void
export type PaletteGrabMoveHandler = (clientX: number, clientY: number) => void
export type PaletteGrabEndHandler = (clientX: number, clientY: number) => void

interface PaletteItemHandlers {
  onGrabStart: PaletteGrabStartHandler
  onGrabMove: PaletteGrabMoveHandler
  onGrabEnd: PaletteGrabEndHandler
}

const SECTION_ORDER = ['banner', 'weekly', 'daily', 'custom', 'tool'] as const
const SECTION_LABELS: Record<(typeof SECTION_ORDER)[number], string> = {
  banner: '배너',
  weekly: '주간 콘텐츠',
  daily: '일일 콘텐츠',
  custom: '커스텀 위젯',
  tool: '도구',
}
const CATEGORY_BADGE: Record<WidgetCatalogItem['category'], string> = {
  default: '기본 위젯',
  additional: '커스텀 위젯',
}

/** item.group이 같은 항목끼리 묶는다. group이 없으면 자기 kind를 키로 써서 혼자만의 묶음이 된다.
 * 카탈로그에 나온 순서를 그대로 유지한다. */
function groupCatalogItems(items: WidgetCatalogItem[]): WidgetCatalogItem[][] {
  const groups = new Map<string, WidgetCatalogItem[]>()
  const order: string[] = []
  for (const item of items) {
    const key = item.group ?? item.kind
    if (!groups.has(key)) {
      groups.set(key, [])
      order.push(key)
    }
    groups.get(key)!.push(item)
  }
  return order.map((key) => groups.get(key)!)
}

// 목록의 위젯 카드 하나. 실제 위젯(캐릭터 데이터)을 그리지 않고 이름·칸 크기만 큰 미리보기 박스에
// 보여준다 — 목록은 순수 시각 요소라 실제 크기·비율과 달라도 배치 계산에 전혀 영향이 없다(실제
// 좌표 계산은 항상 그리드의 CELL_SIZE 기준). 미리보기 박스 크기를 항목마다 다르게(w×h 비례) 두지
// 않고 전부 같은 높이로 고정한 것도 같은 이유다 — 여러 크기로 묶인 항목(배너류)을 화살표로
// 넘겨가며 골라도 카드 높이가 흔들리지 않아야 한다.
//
// 그리드로 옮길 때는 네이티브 HTML5 드래그앤드롭(draggable/dataTransfer.setDragImage) 대신
// 포인터 이벤트로 직접 구현한다 — setDragImage로 만든 고스트는 브라우저가 OS 레벨에서
// 렌더링하는데, 디스플레이 배율(DPI 스케일)이 100%가 아니면 고스트가 실제 크기보다 크게(또는
// 작게) 보이는 크로미움의 오래된 버그가 있어 "실제 배치될 크기와 다르게 보인다"는 문제를 근본적
// 으로 해결할 수 없었다. 포인터 이벤트로 직접 고스트를 그리면(WidgetDashboard 참고) 화면에 보이는
// 크기가 항상 실제 CSS 픽셀 그대로라 이런 배율 문제가 생기지 않고, 투명도 등 스타일도 우리가
// 완전히 제어할 수 있다.
function CatalogCard({ items, onGrabStart, onGrabMove, onGrabEnd }: { items: WidgetCatalogItem[] } & PaletteItemHandlers) {
  const [index, setIndex] = useState(0)
  const item = items[index]
  const isFirst = index === 0
  const isLast = index === items.length - 1
  // 카드 제목은 항상 그 묶음의 이름(SECTION_LABELS)을 쓴다 — 항목이 하나뿐인 카드(어빌리티 스톤
  // 등)도 좌우 버튼을 똑같이 두므로(양쪽 다 비활성화될 뿐) 묶음 취급이 일관된다. 화살표로 넘길
  // 때마다 항목별 이름(item.label)은 미리보기 박스 안에서만 바뀐다.
  const title = SECTION_LABELS[item.section]

  // item.resizable/resizableH일 때만 배치 전 가로(w)·세로(h) 칸 수를 직접 고를 수 있다 — 화살표로
  // 다른 종류(item)로 넘어가면 그 종류의 기본 w/h로 되돌린다(예전에 고른 값이 다른 위젯 종류에
  // 남아있으면 혼란스럽다). min/max를 지정하지 않은 축은 item.w/item.h 그대로 고정(제자리)이 된다.
  const minW = item.minW ?? item.w
  const maxW = item.maxW ?? item.w
  const minH = item.minH ?? item.h
  const maxH = item.maxH ?? item.h
  const width = useDimensionDraft(item.w, minW, maxW)
  const height = useDimensionDraft(item.h, minH, maxH)

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    // 포인터 캡처: 이후 커서가 이 카드 밖(그리드 위 등)으로 나가도 move/up 이벤트가 계속
    // 이 엘리먼트로 들어온다 — 기존 위젯 이동(handleWidgetPointerDown)과 동일한 방식. 화살표
    // 버튼은 이 미리보기 박스 위에 겹쳐 그려지지만 별도 엘리먼트라 버튼 클릭이 여기로 새지 않는다.
    event.currentTarget.setPointerCapture(event.pointerId)
    const rect = event.currentTarget.getBoundingClientRect()
    const grabX = clamp01((event.clientX - rect.left) / rect.width)
    const grabY = clamp01((event.clientY - rect.top) / rect.height)
    // resizable(H) 위젯은 카드에서 고른 칸 수를 그대로 배치될 크기로 넘긴다 — 실제 배치/미리보기는
    // 전부 이 item.w/h를 기준으로 계산되므로(WidgetDashboard), 여기서만 값을 바꿔주면 나머지는
    // 그대로 동작한다.
    const resolved =
      item.resizable || item.resizableH
        ? {
            ...item,
            ...(item.resizable ? { w: width.value } : {}),
            ...(item.resizableH ? { h: height.value } : {}),
          }
        : item
    onGrabStart(resolved, grabX, grabY, event.clientX, event.clientY)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    onGrabMove(event.clientX, event.clientY)
  }

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId)
    onGrabEnd(event.clientX, event.clientY)
  }

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
            item.category === 'default' ? 'bg-primary/15 text-primary' : 'bg-secondary/15 text-secondary',
          )}
        >
          {CATEGORY_BADGE[item.category]}
        </span>
      </div>

      <hr className="my-2 border-t border-border" />

      {/* 화살표를 미리보기 박스 위에 겹쳐 그리면(예전 방식) 버튼이 작아서 살짝만 빗나가도 박스의
          pointerdown(드래그 시작)이 걸려버린다 — 화살표를 박스 옆 자기 자리로 빼고 크게 키워서
          오클릭을 줄인다. 박스 폭은 그만큼 줄어들지만 카드 폭 안에서 나누는 것이라 넘치지 않는다. */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="이전 종류"
            disabled={isFirst}
            onClick={() => setIndex((prev) => Math.max(prev - 1, 0))}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          {/* 위젯 이름/크기는 이 박스 밖(아래 행)으로 뺐다 — 박스 자체는 순전히 드래그 시작
              지점이라 "끌어서 배치" 안내만 담는다. */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="flex h-24 min-w-0 flex-1 touch-none cursor-grab select-none items-center justify-center rounded-lg border border-dashed border-border bg-background/40 px-2 text-center transition-colors hover:bg-muted active:cursor-grabbing"
          >
            <span className="text-xs font-medium leading-tight text-muted-foreground">끌어서 배치</span>
          </div>
          <button
            type="button"
            aria-label="다음 종류"
            disabled={isLast}
            onClick={() => setIndex((prev) => Math.min(prev + 1, items.length - 1))}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* 위 행의 화살표 두 개 바로 아래에 오도록, 그 행과 같은 좌우 폭(화살표 자리 포함)을 그대로
            맞춘다 — 이름은 왼쪽 화살표 쪽, 크기(또는 크기 조절)는 오른쪽 화살표 쪽. */}
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="max-w-[45%] truncate text-left text-[10px] font-medium leading-tight text-foreground">
            {item.label}
          </span>

          {item.resizable || item.resizableH ? (
            <div className="flex items-center gap-0.5">
              {item.resizable ? (
                <input
                  type="text"
                  inputMode="numeric"
                  aria-label="가로 칸 수"
                  value={width.draft}
                  onChange={width.onChange}
                  onBlur={width.onBlur}
                  className="w-7 rounded border border-border bg-background px-1 py-0.5 text-center font-mono text-xs font-bold text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              ) : (
                <span className="font-mono text-xs font-bold text-primary">{item.w}</span>
              )}
              <span className="font-mono text-xs font-bold text-primary">×</span>
              {item.resizableH ? (
                <input
                  type="text"
                  inputMode="numeric"
                  aria-label="세로 칸 수"
                  value={height.draft}
                  onChange={height.onChange}
                  onBlur={height.onBlur}
                  className="w-7 rounded border border-border bg-background px-1 py-0.5 text-center font-mono text-xs font-bold text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              ) : (
                <span className="font-mono text-xs font-bold text-primary">{item.h}</span>
              )}
            </div>
          ) : (
            <span className="font-mono text-xs font-bold text-primary">
              {item.w}×{item.h}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/** 위젯 목록의 한 구역(예: "주간 콘텐츠")에 속한 카드들. 같은 group을 가진 항목은 CatalogCard
 * 하나로 묶여 화살표로 종류를 바꿔가며 고른다 — 구역 이름은 그 카드 제목(SECTION_LABELS)으로
 * 이미 드러나므로 구역마다 별도 제목을 또 붙이지 않는다. */
function CatalogSection({ items, ...handlers }: { items: WidgetCatalogItem[] } & PaletteItemHandlers) {
  if (items.length === 0) return null
  return (
    <>
      {groupCatalogItems(items).map((group) => (
        <CatalogCard key={group[0].group ?? group[0].kind} items={group} {...handlers} />
      ))}
    </>
  )
}

export interface WidgetPaletteProps {
  className?: string
  /** 이 카드에 귀속된 캐릭터 이름. Default Value 위젯은 이 이름으로 조회되는 캐릭터가 있을 때만 노출한다 */
  characterName: string
  /** 목록 타일을 눌러 그리드로 옮기기 시작/이동/종료할 때(WidgetDashboard가 실제 배치를 계산) */
  onGrabStart: PaletteGrabStartHandler
  onGrabMove: PaletteGrabMoveHandler
  onGrabEnd: PaletteGrabEndHandler
}

export function WidgetPalette({ className, characterName, onGrabStart, onGrabMove, onGrabEnd }: WidgetPaletteProps) {
  const { findByName } = useCharacterDirectory()
  const hasCharacterRecord = Boolean(characterName && findByName(characterName))
  const handlers: PaletteItemHandlers = { onGrabStart, onGrabMove, onGrabEnd }

  // 캐릭터 귀속이 필요한 구역(배너/주간 콘텐츠/일일 콘텐츠, category: 'default')과 그렇지 않은
  // 구역(커스텀 위젯/툴, category: 'additional')을 나눈다 — 구역 순서는 SECTION_ORDER 그대로.
  const sectionsByKey = new Map(SECTION_ORDER.map((key) => [key, WIDGET_CATALOG.filter((item) => item.section === key)]))
  const gatedSections = SECTION_ORDER.filter((key) => sectionsByKey.get(key)?.[0]?.category === 'default')
  const ungatedSections = SECTION_ORDER.filter((key) => !gatedSections.includes(key))

  return (
    <div
      className={cn('flex flex-col gap-4 rounded-xl border border-border bg-card p-4', className)}
    >
      <div className="flex items-center gap-1.5">
        <h3 className="text-sm font-semibold text-foreground">위젯 목록</h3>
        <Tooltip label="그리드로 드래그해서 배치하세요">
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
        </Tooltip>
      </div>

      {/* min-h-0: flex 자식은 기본적으로 자기 콘텐츠 높이 아래로 줄어들지 않아(min-height: auto),
          flex-1이 있어도 부모(이 목록 박스, 그리드 열과 나란히 stretch로 높이가 맞춰진다)보다
          내용이 짧으면 넘치는 만큼 부모가 같이 늘어나 버린다 — min-h-0을 둬야 flex-1이 실제로
          부모 높이만큼만 차지하고, 내용이 그보다 길 때만 이 안에서 스크롤된다. */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
        {hasCharacterRecord ? (
          gatedSections.map((key) => <CatalogSection key={key} items={sectionsByKey.get(key)!} {...handlers} />)
        ) : (
          characterName && (
            <p className="text-xs text-muted-foreground">
              등록된 캐릭터가 아니라 Default Value 위젯을 배치할 수 없습니다.
            </p>
          )
        )}

        <hr className="border-t border-border" />

        {ungatedSections.map((key) => (
          <CatalogSection key={key} items={sectionsByKey.get(key)!} {...handlers} />
        ))}
      </div>
    </div>
  )
}
