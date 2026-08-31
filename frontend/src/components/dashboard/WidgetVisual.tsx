import { useState } from 'react'

import { useCharacterDirectory } from '@/contexts/CharacterDirectoryContext'
import { cn } from '@/lib/utils'
import { WIDGET_CATALOG } from '@/lib/widgetCatalog'
import { WIDGET_CARD_REGISTRY } from '@/lib/widgetRegistry'
import { mockCharacter } from '@/mocks/character'
import type { RaidTargetSummary } from '@/types/raid'
import type { WidgetCardProps, WidgetKind } from '@/types/widget'

export interface WidgetVisualProps {
  kind: WidgetKind
  width: number
  height: number
  /** true면 위젯 내부 상호작용(새로고침 버튼, 체크박스 등)을 그대로 사용할 수 있다 */
  interactive?: boolean
  /**
   * 이 위젯이 속한 카드에 귀속된 캐릭터 이름. Default Value 위젯(배너, 가디언, 쿠르잔 전선)의
   * 상태를 이 이름으로 실제 캐릭터 API(CharacterDirectoryContext)에서 조회한다.
   * 팔레트 미리보기처럼 특정 카드에 속하지 않은 경우 이 prop 자체를 생략해서 예시 데이터를 보여주고,
   * 카드에는 배치됐지만 아직 이름을 설정하지 않은 경우엔 빈 문자열을 넘겨 안내 문구를 보여준다.
   */
  characterName?: string
  /** Additional Value 위젯의 위젯별 데이터(text/textCheckbox/image/linkIcon). Default Value 위젯은 무시된다. */
  customData?: Record<string, unknown> | null
  /** Additional Value 위젯의 내용이 바뀌었을 때(interactive일 때만 호출됨) */
  onCustomDataChange?: (customData: Record<string, unknown>) => void
  /** textCheckbox 위젯의 체크 토글(interactive일 때만 호출됨) */
  onCheckboxToggle?: (isChecked: boolean) => void
  /** counter 위젯 카드 클릭(숫자 1 감소, interactive일 때만 호출됨) */
  onCounterDecrement?: () => void
  /** kind === 'raid'일 때 이 위젯 인스턴스가 가리키는 레이드 슬롯의 목표/관문 상태 */
  raid?: RaidTargetSummary | null
  /** 이미 다른 레이드 위젯이 쓰고 있는 레이드 키 목록(이 위젯 자신은 제외) — 목표 변경 모달에서
   * 같은 레이드를 중복으로 고르지 못하게 막는 데 쓴다 */
  raidExcludedKeys?: string[]
  /** 레이드 관문 완료 체크박스 토글(interactive일 때만 호출됨) */
  onRaidGateToggle?: (gateIndex: number, cleared: boolean) => void
  /** 레이드 관문 '더보기' 토글(interactive일 때만 호출됨) */
  onRaidMoreRewardToggle?: (gateIndex: number, enabled: boolean) => void
  /** 레이드 목표(레이드/난이도) 변경(interactive일 때만 호출됨) */
  onRaidTargetChange?: (raidKey: string, difficultyKey: string) => void
  /** 레이드 골드 획득 허용/거부 토글(interactive일 때만 호출됨) */
  onRaidGoldRewardChange?: (enabled: boolean) => void
  className?: string
}

const DEFAULT_VALUE_KINDS: WidgetKind[] = [
  'banner',
  'bannerCompact',
  'bannerDetailed',
  'guardian',
  'kurzanFrontline',
  'paradise',
  'raid',
  'ebonyCube',
  'halHourglass',
]

/**
 * 위젯의 실제 생김새를 주어진 픽셀 크기로 그린다. kind별 실제 렌더링(상태, API 호출, 설정 모달)은
 * `WIDGET_CARD_REGISTRY`에 등록된 카드 컴포넌트(`components/widgets/*Card.tsx`)가 담당하고, 이
 * 컴포넌트는 그 카드들이 공통으로 필요로 하는 파생값(캐릭터 조회, 새로고침, disabled 스타일 등)을
 * 한 번만 계산해서 내려주는 얇은 디스패처다. 아직 카드가 등록되지 않은 kind는 크기 비율만 맞는
 * 자리표시(placeholder)로 대체한다. 배치/미리보기 용도(팔레트, 편집 그리드)에서는 interactive를
 * 꺼서 내부 상호작용을 막는다.
 *
 * Default Value 위젯(배너, 가디언, 쿠르잔 전선 등)은 카드에 귀속된 실제 캐릭터가 있을 때만
 * 렌더링되며(아래 placeholder 분기 참고), 이 시점부터는 항상 실제 캐릭터 API로 상태를 읽고 쓴다.
 * 텍스트 등 Additional Value 위젯은 아직 커스텀 위젯 API가 없어 이 컴포넌트 인스턴스의 로컬
 * state로만 보관한다.
 */
export function WidgetVisual({
  kind,
  width,
  height,
  interactive = false,
  characterName,
  customData,
  onCustomDataChange,
  onCheckboxToggle,
  onCounterDecrement,
  raid,
  raidExcludedKeys,
  onRaidGateToggle,
  onRaidMoreRewardToggle,
  onRaidTargetChange,
  onRaidGoldRewardChange,
  className,
}: WidgetVisualProps) {
  const catalogItem = WIDGET_CATALOG.find((item) => item.kind === kind)
  const disabledClassName = !interactive && 'pointer-events-none'

  // characterName이 넘어오지 않으면(팔레트 미리보기 등) 특정 카드에 귀속되지 않은 것이므로
  // 항상 예시 mock 데이터를 보여준다. 넘어왔다면 실제 캐릭터 API 목록(CharacterDirectoryContext)에서
  // 그 이름을 조회한다 — 등록된 실제 캐릭터일 때만 값이 있다.
  const { findByName, refresh } = useCharacterDirectory()
  const isBoundToCard = characterName !== undefined
  const record = characterName ? findByName(characterName) : undefined

  const [isRefreshing, setIsRefreshing] = useState(false)
  const handleRefresh = () => {
    if (!record) {
      // 카드에 귀속되지 않은 미리보기(예시 데이터)라 새로고침할 실제 캐릭터가 없다 — 스핀만 보여준다.
      setIsRefreshing(true)
      window.setTimeout(() => setIsRefreshing(false), 1200)
      return
    }

    setIsRefreshing(true)
    refresh(record.id)
      .catch((err) => console.error('캐릭터 정보 새로고침 실패', err))
      .finally(() => setIsRefreshing(false))
  }

  // 카드에는 배치됐지만 (1) 아직 캐릭터 이름이 설정되지 않았거나 (2) 설정한 이름이 조회되지
  // 않는 경우, Default Value 위젯은 실제 데이터 대신 안내만 보여준다 (docs/db_schema.typ:
  // Default Value는 캐릭터에 종속되므로 캐릭터를 특정할 수 없으면 노출할 데이터가 없다).
  // 캐릭터가 필요한 카드 컴포넌트는 이 분기를 통과한 뒤에만 렌더링되므로 record가 항상 있다.
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

  const bannerCharacter = record ?? mockCharacter

  const Card = WIDGET_CARD_REGISTRY[kind]
  if (Card) {
    const cardProps: WidgetCardProps = {
      width,
      height,
      interactive,
      disabledClassName,
      className,
      catalogItem,
      bannerCharacter,
      isRefreshing,
      onRefresh: handleRefresh,
      record,
      customData,
      onCustomDataChange,
      onCheckboxToggle,
      onCounterDecrement,
      raid,
      raidExcludedKeys,
      onRaidGateToggle,
      onRaidMoreRewardToggle,
      onRaidTargetChange,
      onRaidGoldRewardChange,
    }
    return <Card {...cardProps} />
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
