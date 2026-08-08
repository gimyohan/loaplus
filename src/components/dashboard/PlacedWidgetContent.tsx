import { WidgetVisual } from '@/components/dashboard/WidgetVisual'
import { CELL_SIZE } from '@/lib/widgetCatalog'
import type { PlacedWidget } from '@/types/widget'

export interface PlacedWidgetContentProps {
  widget: PlacedWidget
  interactive?: boolean
}

export function PlacedWidgetContent({ widget, interactive = false }: PlacedWidgetContentProps) {
  return (
    <WidgetVisual
      kind={widget.kind}
      width={widget.w * CELL_SIZE}
      height={widget.h * CELL_SIZE}
      interactive={interactive}
      className="h-full w-full"
    />
  )
}
