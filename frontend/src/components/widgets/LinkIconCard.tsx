import { useState } from 'react'

import { ScaleToFit } from '@/components/dashboard/ScaleToFit'
import { LinkIconSettingsModal } from '@/components/widgets/LinkIconSettingsModal'
import { LinkIconWidget } from '@/components/widgets/LinkIconWidget'
import { cn } from '@/lib/utils'
import type { WidgetCardProps } from '@/types/widget'

export function LinkIconCard({
  width,
  height,
  disabledClassName,
  className,
  customData,
  onCustomDataChange,
  catalogItem,
}: WidgetCardProps) {
  const [isLinkIconSettingsOpen, setIsLinkIconSettingsOpen] = useState(false)
  const url = (customData?.url as string | null) ?? null
  const label = (customData?.label as string | null) ?? null

  return (
    <>
      <ScaleToFit
        nativeWidth={catalogItem!.nativeWidth!}
        nativeHeight={catalogItem!.nativeHeight!}
        width={width}
        height={height}
        className={cn('select-none rounded-xl', disabledClassName, className)}
      >
        <LinkIconWidget url={url} label={label} onOpenSettings={() => setIsLinkIconSettingsOpen(true)} />
      </ScaleToFit>
      <LinkIconSettingsModal
        open={isLinkIconSettingsOpen}
        onClose={() => setIsLinkIconSettingsOpen(false)}
        url={url}
        label={label}
        onSave={(next) => onCustomDataChange?.(next)}
      />
    </>
  )
}
