import { CharacterBanner } from '@/components/character/CharacterBanner'
import { CharacterBannerCompact } from '@/components/character/CharacterBannerCompact'
import { ScaleToFit } from '@/components/dashboard/ScaleToFit'
import { KurzanFrontlineWidget } from '@/components/widgets/KurzanFrontlineWidget'
import { TextWidget } from '@/components/widgets/TextWidget'
import { cn } from '@/lib/utils'
import {
  BANNER_COMPACT_NATIVE_HEIGHT,
  BANNER_COMPACT_NATIVE_WIDTH,
  BANNER_NATIVE_HEIGHT,
  BANNER_NATIVE_WIDTH,
  KURZAN_FRONTLINE_NATIVE_HEIGHT,
  KURZAN_FRONTLINE_NATIVE_WIDTH,
  TEXT_NATIVE_HEIGHT,
  TEXT_NATIVE_WIDTH,
  WIDGET_CATALOG,
} from '@/lib/widgetCatalog'
import { mockCharacter } from '@/mocks/character'
import { mockKurzanFrontline } from '@/mocks/kurzanFrontline'
import type { WidgetKind } from '@/types/widget'

export interface WidgetVisualProps {
  kind: WidgetKind
  width: number
  height: number
  className?: string
}

/**
 * 위젯의 실제 생김새를 주어진 픽셀 크기로 그린다. 배너는 실제 컴포넌트를 축소해서 보여주고,
 * 아직 구현되지 않은 위젯은 크기 비율이 맞는 자리표시(placeholder)로 대체한다.
 * 배치/미리보기 용도이므로 내부 상호작용(새로고침 버튼 등)은 항상 비활성화한다.
 */
export function WidgetVisual({ kind, width, height, className }: WidgetVisualProps) {
  const catalogItem = WIDGET_CATALOG.find((item) => item.kind === kind)

  if (kind === 'banner') {
    return (
      <ScaleToFit
        nativeWidth={BANNER_NATIVE_WIDTH}
        nativeHeight={BANNER_NATIVE_HEIGHT}
        width={width}
        height={height}
        className={cn('pointer-events-none select-none rounded-xl', className)}
      >
        <CharacterBanner character={mockCharacter} />
      </ScaleToFit>
    )
  }

  if (kind === 'bannerCompact') {
    return (
      <ScaleToFit
        nativeWidth={BANNER_COMPACT_NATIVE_WIDTH}
        nativeHeight={BANNER_COMPACT_NATIVE_HEIGHT}
        width={width}
        height={height}
        className={cn('pointer-events-none select-none rounded-xl', className)}
      >
        <CharacterBannerCompact character={mockCharacter} />
      </ScaleToFit>
    )
  }

  if (kind === 'kurzanFrontline') {
    return (
      <ScaleToFit
        nativeWidth={KURZAN_FRONTLINE_NATIVE_WIDTH}
        nativeHeight={KURZAN_FRONTLINE_NATIVE_HEIGHT}
        width={width}
        height={height}
        className={cn('pointer-events-none select-none rounded-xl', className)}
      >
        <KurzanFrontlineWidget data={mockKurzanFrontline} />
      </ScaleToFit>
    )
  }

  if (kind === 'text') {
    return (
      <ScaleToFit
        nativeWidth={TEXT_NATIVE_WIDTH}
        nativeHeight={TEXT_NATIVE_HEIGHT}
        width={width}
        height={height}
        className={cn('pointer-events-none select-none rounded-xl', className)}
      >
        <TextWidget value="" />
      </ScaleToFit>
    )
  }

  return (
    <div
      style={{ width, height }}
      className={cn(
        'pointer-events-none flex select-none items-center justify-center rounded-lg border-2 border-dashed text-center text-xs font-medium leading-tight',
        catalogItem?.category === 'default'
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-secondary/40 bg-secondary/10 text-secondary',
        className,
      )}
    >
      {catalogItem?.label ?? kind}
    </div>
  )
}
