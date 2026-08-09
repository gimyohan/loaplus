import { useState } from 'react'

import { CharacterBanner } from '@/components/character/CharacterBanner'
import { CharacterBannerCompact } from '@/components/character/CharacterBannerCompact'
import { ScaleToFit } from '@/components/dashboard/ScaleToFit'
import { GuardianWidget } from '@/components/widgets/GuardianWidget'
import { KurzanFrontlineSettingsModal } from '@/components/widgets/KurzanFrontlineSettingsModal'
import { KurzanFrontlineWidget } from '@/components/widgets/KurzanFrontlineWidget'
import { ParadiseSettingsModal } from '@/components/widgets/ParadiseSettingsModal'
import { ParadiseWidget } from '@/components/widgets/ParadiseWidget'
import { TextWidget } from '@/components/widgets/TextWidget'
import {
  applyKurzanFrontlineHarvest,
  resetKurzanFrontlineWithResonancePotion,
  revertKurzanFrontlineHarvest,
} from '@/lib/kurzanFrontline'
import { decrementParadiseKey, decrementParadiseTicket } from '@/lib/paradise'
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
  PARADISE_NATIVE_HEIGHT,
  PARADISE_NATIVE_WIDTH,
  TEXT_NATIVE_HEIGHT,
  TEXT_NATIVE_WIDTH,
  WIDGET_CATALOG,
} from '@/lib/widgetCatalog'
import { mockCharacter } from '@/mocks/character'
import { mockGuardian } from '@/mocks/guardian'
import { mockKurzanFrontline } from '@/mocks/kurzanFrontline'
import { mockParadise } from '@/mocks/paradise'
import { getMockCharacterRecord, updateMockGuardian, updateMockKurzanFrontline } from '@/mocks/characterRegistry'
import type { GuardianSummary } from '@/types/guardian'
import type { KurzanFrontlineSummary } from '@/types/kurzanFrontline'
import type { WidgetKind } from '@/types/widget'

export interface WidgetVisualProps {
  kind: WidgetKind
  width: number
  height: number
  /** true면 위젯 내부 상호작용(새로고침 버튼, 체크박스 등)을 그대로 사용할 수 있다 */
  interactive?: boolean
  /**
   * 이 위젯이 속한 카드에 귀속된 캐릭터 이름. Default Value 위젯(배너, 가디언, 쿠르잔 전선)의
   * 상태를 이 이름을 기준으로 mock 저장소에서 조회/저장한다.
   * 팔레트 미리보기처럼 특정 카드에 속하지 않은 경우 이 prop 자체를 생략해서 예시 데이터를 보여주고,
   * 카드에는 배치됐지만 아직 이름을 설정하지 않은 경우엔 빈 문자열을 넘겨 안내 문구를 보여준다.
   */
  characterName?: string
  className?: string
}

const DEFAULT_VALUE_KINDS: WidgetKind[] = ['banner', 'bannerCompact', 'guardian', 'kurzanFrontline']

interface GuardianWidgetBoundProps {
  initialGuardian: GuardianSummary
  onPersist: (next: GuardianSummary) => void
}

/**
 * 가디언 위젯의 로컬 편집 상태(체크 여부 등)를 소유한다. 부모가 key={characterName}로 렌더링해서,
 * 카드에 귀속된 캐릭터가 바뀌면 이 컴포넌트가 통째로 재마운트되어 새 캐릭터의 값으로 다시 초기화된다
 * — useEffect로 기존 state를 되맞추는 방식보다 확실하고, 리렌더 한 번의 지연도 없다.
 */
function GuardianWidgetBound({ initialGuardian, onPersist }: GuardianWidgetBoundProps) {
  const [guardianData, setGuardianData] = useState(initialGuardian)

  return (
    <GuardianWidget
      data={guardianData}
      onToggleHarvested={(checked) =>
        setGuardianData((prev) => {
          const next = { ...prev, isHarvested: checked }
          onPersist(next)
          return next
        })
      }
    />
  )
}

interface KurzanFrontlineWidgetBoundProps {
  initialKurzan: KurzanFrontlineSummary
  characterNameForModal: string
  onPersist: (next: KurzanFrontlineSummary) => void
}

/** 쿠르잔 전선 버전의 {@link GuardianWidgetBound} — 같은 이유로 key={characterName}로 재마운트한다. */
function KurzanFrontlineWidgetBound({
  initialKurzan,
  characterNameForModal,
  onPersist,
}: KurzanFrontlineWidgetBoundProps) {
  const [kurzanData, setKurzanData] = useState(initialKurzan)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  return (
    <>
      <KurzanFrontlineWidget
        data={kurzanData}
        onToggleHarvested={(checked) =>
          setKurzanData((prev) => {
            const next = checked ? applyKurzanFrontlineHarvest(prev) : revertKurzanFrontlineHarvest(prev)
            onPersist(next)
            return next
          })
        }
        onUseResonancePotion={() =>
          setKurzanData((prev) => {
            const next = resetKurzanFrontlineWithResonancePotion(prev)
            onPersist(next)
            return next
          })
        }
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      <KurzanFrontlineSettingsModal
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        characterName={characterNameForModal}
        data={kurzanData}
        onSave={(next) => {
          setKurzanData(next)
          onPersist(next)
        }}
      />
    </>
  )
}

/**
 * 위젯의 실제 생김새를 주어진 픽셀 크기로 그린다. 배너는 실제 컴포넌트를 축소해서 보여주고,
 * 아직 구현되지 않은 위젯은 크기 비율이 맞는 자리표시(placeholder)로 대체한다.
 * 배치/미리보기 용도(팔레트, 편집 그리드)에서는 interactive를 꺼서 내부 상호작용을 막는다.
 *
 * 백엔드 연동 전이라 각 위젯의 상태(체크 여부, 입력한 텍스트 등)는 이 컴포넌트 인스턴스의
 * 로컬 state로만 보관한다. mock 데이터를 그대로 controlled 값으로 물려주면 클릭해도
 * 즉시 원래 값으로 되돌아가므로, 실제로 상호작용이 가능하려면 이 state가 반드시 필요하다.
 * Default Value 위젯(가디언/쿠르잔 전선)은 추가로 characterName을 키로 삼아 mock 저장소에
 * 상태를 동기화한다 — 위젯을 지웠다 다시 놓아도 같은 이름이면 상태가 유지된다.
 */
export function WidgetVisual({ kind, width, height, interactive = false, characterName, className }: WidgetVisualProps) {
  const catalogItem = WIDGET_CATALOG.find((item) => item.kind === kind)
  const disabledClassName = !interactive && 'pointer-events-none'

  // characterName이 넘어오지 않으면(팔레트 미리보기 등) 특정 카드에 귀속되지 않은 것이므로
  // 항상 예시 mock 데이터를 보여준다. 넘어왔다면 그 이름을 기준으로 조회한다.
  const isBoundToCard = characterName !== undefined
  const record = characterName ? getMockCharacterRecord(characterName) : undefined

  const [isRefreshing, setIsRefreshing] = useState(false)
  const handleRefresh = () => {
    setIsRefreshing(true)
    window.setTimeout(() => setIsRefreshing(false), 1200)
  }

  const [textValue, setTextValue] = useState('')

  const [paradiseData, setParadiseData] = useState(mockParadise)
  const [isParadiseSettingsOpen, setIsParadiseSettingsOpen] = useState(false)

  // 카드에는 배치됐지만 (1) 아직 캐릭터 이름이 설정되지 않았거나 (2) 설정한 이름이 조회되지
  // 않는 경우, Default Value 위젯은 실제 데이터 대신 안내만 보여준다 (docs/db_schema.typ:
  // Default Value는 캐릭터에 종속되므로 캐릭터를 특정할 수 없으면 노출할 데이터가 없다).
  if (isBoundToCard && !record && DEFAULT_VALUE_KINDS.includes(kind)) {
    return (
      <div
        style={{ width, height }}
        className={cn(
          'flex select-none flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-primary/40 bg-primary/10 px-3 text-center text-primary',
          disabledClassName,
          className,
        )}
      >
        <span className="text-xs font-medium">{catalogItem?.label ?? kind}</span>
        <span className="text-[10px] font-normal text-primary/70">
          {characterName.trim()
            ? '등록되지 않은 캐릭터입니다'
            : '위젯 설정에서 캐릭터 이름을 입력해주세요'}
        </span>
      </div>
    )
  }

  const bannerCharacter = record?.character ?? mockCharacter
  // 팔레트 미리보기처럼 카드에 귀속되지 않은 경우에도 remount 키가 흔들리지 않도록 고정값을 쓴다.
  const boundKey = characterName ?? '__preview__'

  if (kind === 'banner') {
    return (
      <ScaleToFit
        nativeWidth={BANNER_NATIVE_WIDTH}
        nativeHeight={BANNER_NATIVE_HEIGHT}
        width={width}
        height={height}
        className={cn('select-none rounded-xl', disabledClassName, className)}
      >
        <CharacterBanner character={bannerCharacter} isRefreshing={isRefreshing} onRefresh={handleRefresh} />
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
          character={bannerCharacter}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
        />
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
        className={cn('select-none rounded-xl', disabledClassName, className)}
      >
        <KurzanFrontlineWidgetBound
          key={boundKey}
          initialKurzan={record?.kurzanFrontline ?? mockKurzanFrontline}
          characterNameForModal={bannerCharacter.characterName}
          onPersist={(next) => {
            if (characterName) updateMockKurzanFrontline(characterName, next)
          }}
        />
      </ScaleToFit>
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
        <GuardianWidgetBound
          key={boundKey}
          initialGuardian={record?.guardian ?? mockGuardian}
          onPersist={(next) => {
            if (characterName) updateMockGuardian(characterName, next)
          }}
        />
      </ScaleToFit>
    )
  }

  if (kind === 'paradise') {
    return (
      <>
        <ScaleToFit
          nativeWidth={PARADISE_NATIVE_WIDTH}
          nativeHeight={PARADISE_NATIVE_HEIGHT}
          width={width}
          height={height}
          className={cn('select-none rounded-xl', disabledClassName, className)}
        >
          <ParadiseWidget
            data={paradiseData}
            onDecrementTicket={() => setParadiseData((prev) => decrementParadiseTicket(prev))}
            onDecrementKey={() => setParadiseData((prev) => decrementParadiseKey(prev))}
            onOpenSettings={() => setIsParadiseSettingsOpen(true)}
          />
        </ScaleToFit>
        <ParadiseSettingsModal
          open={isParadiseSettingsOpen}
          onClose={() => setIsParadiseSettingsOpen(false)}
          characterName={bannerCharacter.characterName}
          data={paradiseData}
          onSave={setParadiseData}
        />
      </>
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
