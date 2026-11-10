import { useState } from 'react'

import {
  RESET_DAYS_OFF,
  TextCheckboxSettingsModal,
  type TextCheckboxResetDays,
} from '@/components/widgets/TextCheckboxSettingsModal'
import { TextCheckboxWidget } from '@/components/widgets/TextCheckboxWidget'
import { useReportPendingHomework } from '@/lib/pendingHomework'
import { cn } from '@/lib/utils'
import type { WidgetCardProps } from '@/types/widget'

export function TextCheckboxCard({
  width,
  disabledClassName,
  className,
  customData,
  onCustomDataChange,
  onCheckboxToggle,
  bannerCharacter,
  interactive,
  record,
}: WidgetCardProps) {
  const [isTextCheckboxSettingsOpen, setIsTextCheckboxSettingsOpen] = useState(false)

  const isChecked = Boolean(customData?.isChecked)
  // 사이드바 미완료 뱃지: 체크 안 된 루틴이면 1개(실제 카드에 배치된 인스턴스만, RaidCard 참고).
  useReportPendingHomework(interactive ? record?.id : undefined, !isChecked)
  const text = (customData?.text as string | undefined) ?? ''
  const resetDays = (customData?.resetDays as TextCheckboxResetDays | undefined) ?? RESET_DAYS_OFF
  const remainingCount =
    typeof customData?.remainingCount === 'number' ? (customData.remainingCount as number) : null

  return (
    <>
      {/* text와 같은 이유로 ScaleToFit을 쓰지 않는다 — 루틴도 가로 칸 수를 자유롭게 고를 수
          있어(widgetCatalog.ts) native 비율과 실제 배치 비율이 달라질 수 있다. */}
      <div style={{ width }} className={cn('select-none', disabledClassName, className)}>
        <TextCheckboxWidget
          text={text}
          isChecked={isChecked}
          remainingCount={remainingCount}
          onToggleChecked={onCheckboxToggle}
          onOpenSettings={() => setIsTextCheckboxSettingsOpen(true)}
          className="h-full w-full"
        />
      </div>
      <TextCheckboxSettingsModal
        open={isTextCheckboxSettingsOpen}
        onClose={() => setIsTextCheckboxSettingsOpen(false)}
        characterName={bannerCharacter.characterName}
        text={text}
        resetDays={resetDays}
        remainingCount={remainingCount}
        onSave={(value) => onCustomDataChange?.({ ...customData, ...value })}
      />
    </>
  )
}
