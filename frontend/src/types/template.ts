import type { WidgetKind } from '@/types/widget'

/** 배치 코드 하나의 위젯 항목 — 종류·위치·크기만 담는다(customData/레이드 목표 등 내용은 없음). */
export interface TemplateLayoutWidget {
  kind: WidgetKind
  x: number
  y: number
  w: number
  h: number
}

export interface TemplateLayout {
  columns: number
  rows: number
  widgets: TemplateLayoutWidget[]
}
