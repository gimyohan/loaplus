import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useState } from 'react'

import { useCharacterDirectory } from '@/contexts/CharacterDirectoryContext'
import { cn } from '@/lib/utils'
import { DEFAULT_IMAGE_SIZE, IMAGE_SIZE_HEIGHTS, WIDGET_CATALOG, type ImageSize } from '@/lib/widgetCatalog'
import type { WidgetCatalogItem } from '@/types/widget'

/** 목록에서 위젯을 추가할 때 호출된다. 이미지는 고른 높이 단계를 초기 customData로 함께 넘긴다. */
export type PaletteAddHandler = (item: WidgetCatalogItem, customData?: Record<string, unknown>) => void

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
const IMAGE_SIZES = Object.keys(IMAGE_SIZE_HEIGHTS) as ImageSize[]

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

// 목록의 위젯 카드 하나. 같은 묶음(배너류 등)은 좌우 화살표로 종류를 넘겨 고르고, "추가"를 누르면
// 카드 맨 아래에 붙는다 — 자리는 순서 목록(WidgetDashboard)에서 위아래로 옮긴다. 예전 그리드
// 배치처럼 끌어다 놓을 자리를 고를 필요가 없다(docs/ui_redesign.md).
function CatalogCard({ items, onAdd }: { items: WidgetCatalogItem[]; onAdd: PaletteAddHandler }) {
  const [index, setIndex] = useState(0)
  const [imageSize, setImageSize] = useState<ImageSize>(DEFAULT_IMAGE_SIZE)
  const item = items[index]
  const isFirst = index === 0
  const isLast = index === items.length - 1
  const title = SECTION_LABELS[item.section]

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-foreground">{title}</span>
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold',
            item.category === 'default' ? 'bg-primary/15 text-primary' : 'bg-secondary/15 text-secondary',
          )}
        >
          {CATEGORY_BADGE[item.category]}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          aria-label="이전 종류"
          disabled={isFirst}
          onClick={() => setIndex((prev) => Math.max(prev - 1, 0))}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-0 flex-1 truncate text-center text-sm text-foreground">{item.label}</span>
        <button
          type="button"
          aria-label="다음 종류"
          disabled={isLast}
          onClick={() => setIndex((prev) => Math.min(prev + 1, items.length - 1))}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2">
        {item.kind === 'image' && (
          <div role="radiogroup" aria-label="이미지 높이" className="flex rounded-lg border border-border p-0.5">
            {IMAGE_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                role="radio"
                aria-checked={imageSize === size}
                onClick={() => setImageSize(size)}
                className={cn(
                  'h-7 w-8 rounded-md text-xs font-bold transition-colors',
                  imageSize === size
                    ? 'bg-primary-strong text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {size}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => onAdd(item, item.kind === 'image' ? { size: imageSize } : undefined)}
          className="ml-auto flex h-8 items-center gap-1 rounded-lg border border-foreground/30 px-3 text-sm font-bold text-foreground transition-colors hover:bg-muted"
        >
          <Plus className="h-4 w-4" />
          추가
        </button>
      </div>
    </div>
  )
}

/** 위젯 목록의 한 구역(예: "주간 콘텐츠")에 속한 카드들. 구역 이름은 카드 제목으로 이미 드러난다. */
function CatalogSection({ items, onAdd }: { items: WidgetCatalogItem[]; onAdd: PaletteAddHandler }) {
  if (items.length === 0) return null
  return (
    <>
      {groupCatalogItems(items).map((group) => (
        <CatalogCard key={group[0].group ?? group[0].kind} items={group} onAdd={onAdd} />
      ))}
    </>
  )
}

export interface WidgetPaletteProps {
  className?: string
  /** 이 카드에 귀속된 캐릭터 이름. Default Value 위젯은 이 이름으로 조회되는 캐릭터가 있을 때만 노출한다 */
  characterName: string
  onAdd: PaletteAddHandler
}

export function WidgetPalette({ className, characterName, onAdd }: WidgetPaletteProps) {
  const { findByName } = useCharacterDirectory()
  const hasCharacterRecord = Boolean(characterName && findByName(characterName))

  // 캐릭터 귀속이 필요한 구역(배너/주간 콘텐츠/일일 콘텐츠, category: 'default')과 그렇지 않은
  // 구역(커스텀 위젯/툴)을 나눈다. hidden 항목(잠정 사용 중단된 어빌리티 스톤)은 목록에서 뺀다.
  const sectionsByKey = new Map(
    SECTION_ORDER.map((key) => [key, WIDGET_CATALOG.filter((item) => item.section === key && !item.hidden)]),
  )
  const gatedSections = SECTION_ORDER.filter((key) => sectionsByKey.get(key)?.[0]?.category === 'default')
  const ungatedSections = SECTION_ORDER.filter((key) => !gatedSections.includes(key))

  return (
    <div className={cn('flex flex-col gap-3 rounded-xl border border-border bg-card p-4', className)}>
      <div>
        <h3 className="text-sm font-bold text-foreground">위젯 목록</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">추가하면 카드 맨 아래에 붙습니다.</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        {hasCharacterRecord ? (
          gatedSections.map((key) => <CatalogSection key={key} items={sectionsByKey.get(key)!} onAdd={onAdd} />)
        ) : (
          <p className="text-xs text-muted-foreground">
            {characterName
              ? '등록된 캐릭터가 아니라 기본 위젯을 추가할 수 없습니다.'
              : '캐릭터 이름을 먼저 지정하면 기본 위젯을 추가할 수 있습니다.'}
          </p>
        )}

        <hr className="border-t border-border" />

        {ungatedSections.map((key) => (
          <CatalogSection key={key} items={sectionsByKey.get(key)!} onAdd={onAdd} />
        ))}
      </div>
    </div>
  )
}
