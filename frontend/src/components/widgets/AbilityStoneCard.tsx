import { useState } from 'react'

import { ScaleToFit } from '@/components/dashboard/ScaleToFit'
import { AbilityStoneModal } from '@/components/widgets/AbilityStoneModal'
import { AbilityStoneWidget } from '@/components/widgets/AbilityStoneWidget'
import { cn } from '@/lib/utils'
import type { WidgetCardProps } from '@/types/widget'

export function AbilityStoneCard({ width, height, disabledClassName, className, catalogItem }: WidgetCardProps) {
  const [isAbilityStoneOpen, setIsAbilityStoneOpen] = useState(false)

  return (
    <>
      <ScaleToFit
        nativeWidth={catalogItem!.nativeWidth!}
        nativeHeight={catalogItem!.nativeHeight!}
        width={width}
        height={height}
        className={cn('select-none rounded-xl', disabledClassName, className)}
      >
        <AbilityStoneWidget onOpen={() => setIsAbilityStoneOpen(true)} />
      </ScaleToFit>
      <AbilityStoneModal open={isAbilityStoneOpen} onClose={() => setIsAbilityStoneOpen(false)} />
    </>
  )
}
