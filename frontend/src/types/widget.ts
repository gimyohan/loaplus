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
