import { WidgetVisual } from '@/components/dashboard/WidgetVisual'
import { CELL_SIZE } from '@/lib/widgetCatalog'
import type { PlacedWidget } from '@/types/widget'

export interface PlacedWidgetContentProps {
  widget: PlacedWidget
  interactive?: boolean
  /** 이 위젯이 놓인 카드에 귀속된 캐릭터 이름. WidgetVisual로 그대로 전달한다 */
  characterName?: string
}

export function PlacedWidgetContent({ widget, interactive = false, characterName }: PlacedWidgetContentProps) {
  return (
    <WidgetVisual
      kind={widget.kind}
      width={widget.w * CELL_SIZE}
      height={widget.h * CELL_SIZE}
      interactive={interactive}
      characterName={characterName}
      className="h-full w-full"
    />
  )
}
