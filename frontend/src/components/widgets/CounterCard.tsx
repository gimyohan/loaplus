import { useState } from 'react'

import { CounterSettingsModal } from '@/components/widgets/CounterSettingsModal'
import { CounterWidget } from '@/components/widgets/CounterWidget'
import { cn } from '@/lib/utils'
import type { WidgetCardProps } from '@/types/widget'

export function CounterCard({
  width,
  height,
  disabledClassName,
  className,
  customData,
  onCustomDataChange,
  onCounterDecrement,
  bannerCharacter,
}: WidgetCardProps) {
  const [isCounterSettingsOpen, setIsCounterSettingsOpen] = useState(false)

  const text = (customData?.text as string | undefined) ?? ''
  const count = typeof customData?.count === 'number' ? (customData.count as number) : 0

  return (
    <>
      {/* text/textCheckbox와 같은 이유로 ScaleToFit을 쓰지 않는다 — 카운터도 가로 칸 수를
          자유롭게 고를 수 있다(widgetCatalog.ts). */}
      <div style={{ width, height }} className={cn('select-none', disabledClassName, className)}>
        <CounterWidget
          text={text}
          count={count}
          onDecrement={onCounterDecrement}
          onOpenSettings={() => setIsCounterSettingsOpen(true)}
          className="h-full w-full"
        />
      </div>
      <CounterSettingsModal
        open={isCounterSettingsOpen}
        onClose={() => setIsCounterSettingsOpen(false)}
        characterName={bannerCharacter.characterName}
        text={text}
        count={count}
        onSave={(value) => onCustomDataChange?.({ ...customData, ...value })}
      />
    </>
  )
}
