import type { WidgetCatalogItem } from '@/types/widget'

// docs/widgets.typ - Default Value(가디언/낙원 등) / Additional Value(텍스트/이미지 등) 위젯 목록
export const WIDGET_CATALOG: WidgetCatalogItem[] = [
  { kind: 'banner', label: '배너 (10x2)', category: 'default', w: 10, h: 2 },
  { kind: 'bannerCompact', label: '배너 (10x1)', category: 'default', w: 10, h: 1 },
  { kind: 'guardian', label: '가디언', category: 'default', w: 5, h: 3 },
  { kind: 'kurzanFrontline', label: '쿠르잔 전선', category: 'default', w: 5, h: 3 },
  { kind: 'paradise', label: '낙원', category: 'default', w: 5, h: 4 },
  { kind: 'text', label: '텍스트', category: 'additional', w: 5, h: 1 },
  { kind: 'textCheckbox', label: '텍스트 · 체크박스', category: 'additional', w: 4, h: 2 },
  { kind: 'image', label: '이미지', category: 'additional', w: 4, h: 4 },
]

export const WIDGET_DRAG_MIME = 'application/x-loaplus-widget'

/** 그리드 한 칸의 픽셀 크기 (docs/db_schema.typ: grid_x, grid_y, width, height) */
export const CELL_SIZE = 50

/** 배너(10x2)의 디자인 원본 크기. ScaleToFit으로 어떤 크기에도 비율 그대로 축소한다. */
export const BANNER_NATIVE_WIDTH = 900
export const BANNER_NATIVE_HEIGHT = 180

/** 배너 컴팩트(10x1)의 디자인 원본 크기. */
export const BANNER_COMPACT_NATIVE_WIDTH = 900
export const BANNER_COMPACT_NATIVE_HEIGHT = 90

/** 쿠르잔 전선(5x3)의 디자인 원본 크기. */
export const KURZAN_FRONTLINE_NATIVE_WIDTH = 350
export const KURZAN_FRONTLINE_NATIVE_HEIGHT = 210

/** 가디언(5x3)의 디자인 원본 크기. 쿠르잔 전선과 레이아웃이 동일하다. */
export const GUARDIAN_NATIVE_WIDTH = 350
export const GUARDIAN_NATIVE_HEIGHT = 210

/** 텍스트(5x1)의 디자인 원본 크기. */
export const TEXT_NATIVE_WIDTH = 500
export const TEXT_NATIVE_HEIGHT = 100
