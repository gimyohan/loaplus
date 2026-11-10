import { useState } from 'react'

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
}: WidgetCardProps) {
  const [isLinkIconSettingsOpen, setIsLinkIconSettingsOpen] = useState(false)
  const url = (customData?.url as string | null) ?? null
  const label = (customData?.label as string | null) ?? null

  return (
    <>
      <div style={{ width, height }} className={cn('select-none', disabledClassName, className)}>
        <LinkIconWidget url={url} label={label} onOpenSettings={() => setIsLinkIconSettingsOpen(true)} />
      </div>
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
