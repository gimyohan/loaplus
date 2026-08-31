import { CharacterBanner } from '@/components/character/CharacterBanner'
import { ScaleToFit } from '@/components/dashboard/ScaleToFit'
import { cn } from '@/lib/utils'
import type { WidgetCardProps } from '@/types/widget'

export function BannerCard({
  width,
  height,
  disabledClassName,
  className,
  bannerCharacter,
  isRefreshing,
  onRefresh,
  catalogItem,
}: WidgetCardProps) {
  return (
    <ScaleToFit
      nativeWidth={catalogItem!.nativeWidth!}
      nativeHeight={catalogItem!.nativeHeight!}
      width={width}
      height={height}
      className={cn('select-none rounded-xl', disabledClassName, className)}
    >
      <CharacterBanner character={bannerCharacter} isRefreshing={isRefreshing} onRefresh={onRefresh} />
    </ScaleToFit>
  )
}
