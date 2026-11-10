import type { CharacterSummary } from '@/types/character'
import type { RaidTargetSummary } from '@/types/raid'

// docs/widgets.typ 기준 위젯 종류.
export type WidgetKind =
  | 'banner'
  | 'bannerCompact'
  | 'bannerDetailed'
  | 'guardian'
  | 'kurzanFrontline'
  | 'paradise'
  | 'raid'
  | 'ebonyCube'
  | 'halHourglass'
  | 'text'
  | 'textCheckbox'
  | 'counter'
  | 'image'
  | 'linkIcon'
  | 'abilityStone'

export interface WidgetCatalogItem {
  kind: WidgetKind
  label: string
  /** Default Value(시스템 제공) 위젯인지, Additional Value(커스텀) 위젯인지 */
  category: 'default' | 'additional'
  /** 카드 폭(CARD_WIDTH, 350px) 기준 위젯 높이(px). 카드가 더 좁으면(모바일) 폭에 비례해 줄어들고,
   * fixedHeight인 위젯은 그대로다. 이미지는 custom_data.size(S/M/L)가 높이를 정하므로 기본값(M)이다. */
  height: number
  /** true면 카드 폭이 좁아져도 높이를 줄이지 않는다(텍스트·루틴·카운터처럼 한 줄짜리). */
  fixedHeight?: boolean
  /** true면 카드 폭 전체가 아니라 height × height 정사각형 타일로 그린다(링크 & 아이콘 등). */
  tile?: boolean
  /** 같은 값을 가진 항목끼리(예: 배너류) 위젯 목록에서 하나의 타일로 묶여 좌우 화살표로
   * 종류를 바꿔가며 고를 수 있다. 없으면 항상 독립된 타일이다. */
  group?: string
  /** 위젯 목록(WidgetPalette)에서 보여줄 때만 쓰는 표시용 묶음. category와는 별개다 — category는
   * 캐릭터 귀속 여부에 따른 노출 조건에 쓰이고, section은 그 위에 사용자가 보기 편하도록 얹은
   * 5개 그룹(배너/주간 콘텐츠/일일 콘텐츠/커스텀 위젯/툴)이다. */
  section: 'banner' | 'weekly' | 'daily' | 'custom' | 'tool'
  /** ScaleToFit으로 그릴 때 쓰는 디자인 원본 픽셀 크기. 주어진 크기에 직접 맞춰 그리는
   * 위젯(text/textCheckbox/counter/image)은 ScaleToFit을 쓰지 않으므로 비워둔다. */
  nativeWidth?: number
  nativeHeight?: number
  /** true면 위젯 목록(WidgetPalette)에서 고를 수 없다 — 이미 배치된 인스턴스의 렌더링/라벨
   * 조회(WidgetVisual, WidgetDashboard)에는 계속 쓰이므로 카탈로그에서 아예 빼지는 않는다. */
  hidden?: boolean
}

/** 카드에 놓인 위젯 하나. 카드 안의 위치는 배열 순서(위→아래)가 정한다(docs/ui_redesign.md). */
export interface PlacedWidget {
  id: string
  kind: WidgetKind
  /** Additional Value 위젯(text/textCheckbox/counter/image/linkIcon)의 위젯별 데이터. Default Value 위젯은 null. */
  customData?: Record<string, unknown> | null
  /** kind === 'raid'일 때만 값이 있다(Character_Raids 참조, docs/api.typ 참고). */
  raidId?: string | null
  raid?: RaidTargetSummary | null
}

/**
 * `WidgetVisual`이 kind별 카드 컴포넌트(`components/widgets/*Card.tsx`)에 내려주는 공통 props.
 * 모든 카드가 이 타입 하나를 받고, 자기 kind에 필요한 필드만 골라 쓴다(WidgetVisual이 원래 갖고
 * 있던 props + 카드 렌더링 전에 미리 계산해두는 파생값들을 합친 것). kind별로 필요한 필드가 크게
 * 달라서(raid 전용 props, customData 전용 props 등) 대부분 선택 필드다 — 카드마다 자기가 실제로
 * 쓰는 필드만 destructure해서 쓰면 된다.
 */
export interface WidgetCardProps {
  width: number
  height: number
  interactive: boolean
  disabledClassName: string | false
  className?: string
  catalogItem?: WidgetCatalogItem
  /** placeholder(캐릭터 미배정) 분기를 통과한 뒤의 표시용 캐릭터. 실제 카드 데이터가 있으면 그 값,
   * 없으면(팔레트 미리보기 등) mockCharacter. */
  bannerCharacter: CharacterSummary
  isRefreshing: boolean
  onRefresh: () => void
  /** 카드에 귀속된 실제 캐릭터 레코드. Default Value 위젯(guardian/kurzanFrontline/paradise/
   * ebonyCube/halHourglass)은 WidgetVisual의 placeholder 분기를 통과한 뒤에만 렌더링되므로 항상
   * 값이 있다고 가정한다(non-null assertion으로 사용). */
  record?: CharacterSummary
  /** Additional Value 위젯의 위젯별 데이터(text/textCheckbox/counter/image/linkIcon). */
  customData?: Record<string, unknown> | null
  onCustomDataChange?: (customData: Record<string, unknown>) => void
  onCheckboxToggle?: (isChecked: boolean) => void
  onCounterDecrement?: () => void
  /** kind === 'raid'일 때 이 위젯 인스턴스가 가리키는 레이드 슬롯의 목표/관문 상태 */
  raid?: RaidTargetSummary | null
  raidExcludedKeys?: string[]
  onRaidGateToggle?: (gateIndex: number, cleared: boolean) => void
  onRaidMoreRewardToggle?: (gateIndex: number, enabled: boolean) => void
  onRaidTargetChange?: (raidKey: string, difficultyKey: string) => void
  onRaidGoldRewardChange?: (enabled: boolean) => void
}
