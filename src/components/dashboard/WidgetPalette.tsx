import { useState, type DragEvent, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { WidgetVisual } from '@/components/dashboard/WidgetVisual'
import { cn } from '@/lib/utils'
import { CELL_SIZE, WIDGET_CATALOG, WIDGET_DRAG_MIME } from '@/lib/widgetCatalog'
import { getMockCharacterRecord } from '@/mocks/characterRegistry'
import type { WidgetCatalogItem } from '@/types/widget'

function PaletteItem({ item, characterName }: { item: WidgetCatalogItem; characterName?: string }) {
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
          드래그하는 동안 크기 감각이 그대로 유지되도록 한다. Default Value 위젯은 characterName을
          넘겨서 실제로 이 카드에 귀속된 캐릭터의 데이터로 미리보기를 그린다. */}
      <WidgetVisual
        kind={item.kind}
        width={item.w * CELL_SIZE}
        height={item.h * CELL_SIZE}
        characterName={item.category === 'default' ? characterName : undefined}
      />
    </div>
  )
}

export interface WidgetPaletteProps {
  /** 목록이 이 높이를 넘어가면 모달 전체가 아니라 목록 안에서만 스크롤된다 */
  maxHeight?: number
  className?: string
  /** 이 카드에 귀속된 캐릭터 이름. Default Value 위젯은 이 이름으로 조회되는 캐릭터가 있을 때만 노출한다 */
  characterName: string
  onCharacterNameChange: (characterName: string) => void
}

export function WidgetPalette({
  maxHeight,
  className,
  characterName,
  onCharacterNameChange,
}: WidgetPaletteProps) {
  const [characterNameInput, setCharacterNameInput] = useState(characterName)
  const hasCharacterRecord = Boolean(characterName && getMockCharacterRecord(characterName))

  const defaultWidgets = WIDGET_CATALOG.filter((item) => item.category === 'default')
  const additionalWidgets = WIDGET_CATALOG.filter((item) => item.category === 'additional')

  const handleCharacterNameSave = (event: FormEvent) => {
    event.preventDefault()
    onCharacterNameChange(characterNameInput.trim())
  }

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

          {/* 이 카드가 어떤 캐릭터에 귀속되는지 여기서 지정한다. 등록된 캐릭터가 아니면
              아래 Default Value 위젯 목록 자체를 노출하지 않는다 (docs/db_schema.typ:
              Default Value는 위젯이 아니라 캐릭터에 종속) */}
          <form
            onSubmit={handleCharacterNameSave}
            className="flex flex-col gap-2 rounded-lg border border-border bg-background/50 p-3"
          >
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-medium text-foreground">캐릭터 이름</span>
              <input
                type="text"
                value={characterNameInput}
                onChange={(event) => setCharacterNameInput(event.target.value)}
                placeholder="예: 주먹밥괴물냥차차차"
                className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </label>
            <Button type="submit" className="h-8 px-3 py-0 text-xs">
              캐릭터 이름 적용
            </Button>
            {characterName && !hasCharacterRecord && (
              <p className="text-xs text-destructive">
                등록되지 않은 캐릭터입니다. Default Value 위젯을 사용할 수 없습니다.
              </p>
            )}
          </form>

          {hasCharacterRecord ? (
            defaultWidgets.map((item) => (
              <PaletteItem key={item.kind} item={item} characterName={characterName} />
            ))
          ) : (
            <p className="text-xs text-muted-foreground">
              {characterName
                ? '등록된 캐릭터가 아니라 Default Value 위젯을 배치할 수 없습니다.'
                : '캐릭터 이름을 적용하면 Default Value 위젯을 배치할 수 있습니다.'}
            </p>
          )}
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
