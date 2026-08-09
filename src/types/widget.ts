// docs/widgets.typ 기준 위젯 종류. 'banner'/'bannerCompact'/'guardian'/'kurzanFrontline'/'paradise'/
// 'text'만 실제 컴포넌트로 구현되어 있고, 나머지는 그리드 배치 동작을 보여주기 위한
// 자리표시(placeholder) 위젯이다.
export type WidgetKind =
  | 'banner'
  | 'bannerCompact'
  | 'guardian'
  | 'kurzanFrontline'
  | 'paradise'
  | 'text'
  | 'textCheckbox'
  | 'image'

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
}
