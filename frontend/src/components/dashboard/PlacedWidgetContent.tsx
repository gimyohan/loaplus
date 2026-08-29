import { WidgetVisual } from '@/components/dashboard/WidgetVisual'
import { CELL_SIZE } from '@/lib/widgetCatalog'
import type { PlacedWidget } from '@/types/widget'

export interface PlacedWidgetContentProps {
  widget: PlacedWidget
  interactive?: boolean
  /** 이 위젯이 놓인 카드에 귀속된 캐릭터 이름. WidgetVisual로 그대로 전달한다 */
  characterName?: string
  /** Additional Value 위젯의 텍스트/이미지 URL 등 내용이 바뀌었을 때(interactive일 때만 의미 있음) */
  onCustomDataChange?: (customData: Record<string, unknown>) => void
  /** textCheckbox 위젯의 체크 토글(interactive일 때만 의미 있음) */
  onCheckboxToggle?: (isChecked: boolean) => void
  /** counter 위젯 카드 클릭(숫자 1 감소, interactive일 때만 의미 있음) */
  onCounterDecrement?: () => void
  /** 이미 다른 레이드 위젯이 쓰고 있는 레이드 키 목록(이 위젯 자신은 제외). WidgetVisual로 그대로 전달한다 */
  raidExcludedKeys?: string[]
  /** 레이드 관문 완료 체크박스 토글(interactive일 때만 의미 있음) */
  onRaidGateToggle?: (gateIndex: number, cleared: boolean) => void
  /** 레이드 관문 '더보기' 토글(interactive일 때만 의미 있음) */
  onRaidMoreRewardToggle?: (gateIndex: number, enabled: boolean) => void
  /** 레이드 목표(레이드/난이도) 변경(interactive일 때만 의미 있음) */
  onRaidTargetChange?: (raidKey: string, difficultyKey: string) => void
  /** 레이드 골드 획득 허용/거부 토글(interactive일 때만 의미 있음) */
  onRaidGoldRewardChange?: (enabled: boolean) => void
}

export function PlacedWidgetContent({
  widget,
  interactive = false,
  characterName,
  onCustomDataChange,
  onCheckboxToggle,
  onCounterDecrement,
  raidExcludedKeys,
  onRaidGateToggle,
  onRaidMoreRewardToggle,
  onRaidTargetChange,
  onRaidGoldRewardChange,
}: PlacedWidgetContentProps) {
  return (
    <WidgetVisual
      kind={widget.kind}
      width={widget.w * CELL_SIZE}
      height={widget.h * CELL_SIZE}
      interactive={interactive}
      characterName={characterName}
      customData={widget.customData}
      onCustomDataChange={onCustomDataChange}
      onCheckboxToggle={onCheckboxToggle}
      onCounterDecrement={onCounterDecrement}
      raid={widget.raid}
      raidExcludedKeys={raidExcludedKeys}
      onRaidGateToggle={onRaidGateToggle}
      onRaidMoreRewardToggle={onRaidMoreRewardToggle}
      onRaidTargetChange={onRaidTargetChange}
      onRaidGoldRewardChange={onRaidGoldRewardChange}
      className="h-full w-full"
    />
  )
}
