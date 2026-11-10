import type { WidgetKind } from '@/types/widget'

/** 배치 코드 하나의 위젯 항목 — 종류만 담는다(customData/레이드 목표 등 내용은 없음). */
export interface TemplateLayoutWidget {
  kind: WidgetKind
}

/** 위→아래 순서대로의 위젯 종류 목록. */
export interface TemplateLayout {
  widgets: TemplateLayoutWidget[]
}
