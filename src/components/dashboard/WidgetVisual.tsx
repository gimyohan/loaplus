import { useState } from 'react'

import { CharacterBanner } from '@/components/character/CharacterBanner'
import { CharacterBannerCompact } from '@/components/character/CharacterBannerCompact'
import { ScaleToFit } from '@/components/dashboard/ScaleToFit'
import { GuardianWidget } from '@/components/widgets/GuardianWidget'
import { KurzanFrontlineSettingsModal } from '@/components/widgets/KurzanFrontlineSettingsModal'
import { KurzanFrontlineWidget } from '@/components/widgets/KurzanFrontlineWidget'
import { TextWidget } from '@/components/widgets/TextWidget'
import {
  applyKurzanFrontlineHarvest,
  resetKurzanFrontlineWithResonancePotion,
  revertKurzanFrontlineHarvest,
} from '@/lib/kurzanFrontline'
import { cn } from '@/lib/utils'
import {
  BANNER_COMPACT_NATIVE_HEIGHT,
  BANNER_COMPACT_NATIVE_WIDTH,
  BANNER_NATIVE_HEIGHT,
  BANNER_NATIVE_WIDTH,
  GUARDIAN_NATIVE_HEIGHT,
  GUARDIAN_NATIVE_WIDTH,
  KURZAN_FRONTLINE_NATIVE_HEIGHT,
  KURZAN_FRONTLINE_NATIVE_WIDTH,
  TEXT_NATIVE_HEIGHT,
  TEXT_NATIVE_WIDTH,
  WIDGET_CATALOG,
} from '@/lib/widgetCatalog'
import { mockCharacter } from '@/mocks/character'
import { mockGuardian } from '@/mocks/guardian'
import { mockKurzanFrontline } from '@/mocks/kurzanFrontline'
import type { WidgetKind } from '@/types/widget'

export interface WidgetVisualProps {
  kind: WidgetKind
  width: number
  height: number
  /** true면 위젯 내부 상호작용(새로고침 버튼, 체크박스 등)을 그대로 사용할 수 있다 */
  interactive?: boolean
  className?: string
}

/**
 * 위젯의 실제 생김새를 주어진 픽셀 크기로 그린다. 배너는 실제 컴포넌트를 축소해서 보여주고,
 * 아직 구현되지 않은 위젯은 크기 비율이 맞는 자리표시(placeholder)로 대체한다.
 * 배치/미리보기 용도(팔레트, 편집 그리드)에서는 interactive를 꺼서 내부 상호작용을 막는다.
 *
 * 백엔드 연동 전이라 각 위젯의 상태(체크 여부, 입력한 텍스트 등)는 이 컴포넌트 인스턴스의
 * 로컬 state로만 보관한다. mock 데이터를 그대로 controlled 값으로 물려주면 클릭해도
 * 즉시 원래 값으로 되돌아가므로, 실제로 상호작용이 가능하려면 이 state가 반드시 필요하다.
 */
export function WidgetVisual({ kind, width, height, interactive = false, className }: WidgetVisualProps) {
  const catalogItem = WIDGET_CATALOG.find((item) => item.kind === kind)
  const disabledClassName = !interactive && 'pointer-events-none'

  const [isRefreshing, setIsRefreshing] = useState(false)
  const handleRefresh = () => {
    setIsRefreshing(true)
    window.setTimeout(() => setIsRefreshing(false), 1200)
  }

  const [kurzanData, setKurzanData] = useState(mockKurzanFrontline)
  const [isKurzanSettingsOpen, setIsKurzanSettingsOpen] = useState(false)
  const [guardianData, setGuardianData] = useState(mockGuardian)
  const [textValue, setTextValue] = useState('')

  if (kind === 'banner') {
    return (
      <ScaleToFit
        nativeWidth={BANNER_NATIVE_WIDTH}
        nativeHeight={BANNER_NATIVE_HEIGHT}
        width={width}
        height={height}
        className={cn('select-none rounded-xl', disabledClassName, className)}
      >
        <CharacterBanner character={mockCharacter} isRefreshing={isRefreshing} onRefresh={handleRefresh} />
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
        className={cn('select-none rounded-xl', disabledClassName, className)}
      >
        <CharacterBannerCompact
          character={mockCharacter}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
        />
      </ScaleToFit>
    )
  }

  if (kind === 'kurzanFrontline') {
    return (
      <>
        <ScaleToFit
          nativeWidth={KURZAN_FRONTLINE_NATIVE_WIDTH}
          nativeHeight={KURZAN_FRONTLINE_NATIVE_HEIGHT}
          width={width}
          height={height}
          className={cn('select-none rounded-xl', disabledClassName, className)}
        >
          <KurzanFrontlineWidget
            data={kurzanData}
            onToggleHarvested={(checked) =>
              setKurzanData((prev) =>
                checked ? applyKurzanFrontlineHarvest(prev) : revertKurzanFrontlineHarvest(prev),
              )
            }
            onUseResonancePotion={() =>
              setKurzanData((prev) => resetKurzanFrontlineWithResonancePotion(prev))
            }
            onOpenSettings={() => setIsKurzanSettingsOpen(true)}
          />
        </ScaleToFit>
        <KurzanFrontlineSettingsModal
          open={isKurzanSettingsOpen}
          onClose={() => setIsKurzanSettingsOpen(false)}
          characterName={mockCharacter.characterName}
          data={kurzanData}
          onSave={setKurzanData}
        />
      </>
    )
  }

  if (kind === 'guardian') {
    return (
      <ScaleToFit
        nativeWidth={GUARDIAN_NATIVE_WIDTH}
        nativeHeight={GUARDIAN_NATIVE_HEIGHT}
        width={width}
        height={height}
        className={cn('select-none rounded-xl', disabledClassName, className)}
      >
        <GuardianWidget
          data={guardianData}
          onToggleHarvested={(checked) => setGuardianData((prev) => ({ ...prev, isHarvested: checked }))}
        />
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
        className={cn('select-none rounded-xl', disabledClassName, className)}
      >
        <TextWidget value={textValue} onChange={setTextValue} />
      </ScaleToFit>
    )
  }

  return (
    <div
      style={{ width, height }}
      className={cn(
        'flex select-none items-center justify-center rounded-lg border-2 border-dashed text-center text-xs font-medium leading-tight',
        disabledClassName,
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
