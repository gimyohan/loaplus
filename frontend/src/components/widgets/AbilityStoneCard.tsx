import { useState } from 'react'

import { AbilityStoneModal } from '@/components/widgets/AbilityStoneModal'
import { AbilityStoneWidget } from '@/components/widgets/AbilityStoneWidget'
import { cn } from '@/lib/utils'
import type { WidgetCardProps } from '@/types/widget'

export function AbilityStoneCard({ width, height, disabledClassName, className }: WidgetCardProps) {
  const [isAbilityStoneOpen, setIsAbilityStoneOpen] = useState(false)

  return (
    <>
      <div style={{ width, height }} className={cn('select-none', disabledClassName, className)}>
        <AbilityStoneWidget onOpen={() => setIsAbilityStoneOpen(true)} />
      </div>
      <AbilityStoneModal open={isAbilityStoneOpen} onClose={() => setIsAbilityStoneOpen(false)} />
    </>
  )
}
