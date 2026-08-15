import type { RaidTargetSummary } from '@/types/raid'

// docs/widgets.typ 기준 위젯 종류.
export type WidgetKind =
  | 'banner'
  | 'bannerCompact'
  | 'guardian'
  | 'kurzanFrontline'
  | 'paradise'
  | 'raid'
  | 'text'
  | 'textCheckbox'
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
}

export interface PlacedWidget {
  id: string
  kind: WidgetKind
  /** 그리드 칸 단위 좌표 */
  x: number
  y: number
  w: number
  h: number
  /** Additional Value 위젯(text/textCheckbox/image/linkIcon)의 위젯별 데이터. Default Value 위젯은 null. */
  customData?: Record<string, unknown> | null
  /** kind === 'raid'일 때만 값이 있다(Character_Raids 참조, docs/api.typ 참고). */
  raidId?: string | null
  raid?: RaidTargetSummary | null
}
