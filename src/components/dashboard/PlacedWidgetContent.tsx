import { WidgetVisual } from '@/components/dashboard/WidgetVisual'
import { CELL_SIZE } from '@/lib/widgetCatalog'
import type { PlacedWidget } from '@/types/widget'

export function PlacedWidgetContent({ widget }: { widget: PlacedWidget }) {
  return (
    <WidgetVisual
      kind={widget.kind}
      width={widget.w * CELL_SIZE}
      height={widget.h * CELL_SIZE}
      className="h-full w-full"
    />
  )
}
