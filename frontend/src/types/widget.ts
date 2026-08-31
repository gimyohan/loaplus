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
  /** 그리드 칸 단위 크기 */
  w: number
  h: number
  /** 같은 값을 가진 항목끼리(예: 배너류) 위젯 목록에서 하나의 타일로 묶여 좌우 화살표로
   * 종류를 바꿔가며 고를 수 있다. 없으면 항상 독립된 타일이다. */
  group?: string
  /** 위젯 목록(WidgetPalette)에서 보여줄 때만 쓰는 표시용 묶음. category와는 별개다 — category는
   * 캐릭터 귀속 여부에 따른 노출 조건에 쓰이고, section은 그 위에 사용자가 보기 편하도록 얹은
   * 5개 그룹(배너/주간 콘텐츠/일일 콘텐츠/커스텀 위젯/툴)이다. */
  section: 'banner' | 'weekly' | 'daily' | 'custom' | 'tool'
  /** true면 위젯 목록 카드에서 배치 전에 가로 칸 수(w)를 직접 조절할 수 있다(minW~maxW).
   * 없으면 항상 w 그대로 고정 배치된다. */
  resizable?: boolean
  minW?: number
  maxW?: number
  /** true면 세로 칸 수(h)도 같은 방식으로 배치 전에 조절할 수 있다(minH~maxH). resizable(가로)과
   * 서로 독립이다 — 텍스트/루틴처럼 가로만 조절되는 위젯은 이 값 없이 resizable만 켠다. */
  resizableH?: boolean
  minH?: number
  maxH?: number
  /** ScaleToFit으로 그릴 때 쓰는 디자인 원본 픽셀 크기. 가로/세로 칸 수를 자유롭게 고를 수 있는
   * 위젯(text/textCheckbox/counter/image)은 ScaleToFit을 쓰지 않으므로 비워둔다. */
  nativeWidth?: number
  nativeHeight?: number
}

export interface PlacedWidget {
  id: string
  kind: WidgetKind
  /** 그리드 칸 단위 좌표 */
  x: number
  y: number
  w: number
  h: number
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
