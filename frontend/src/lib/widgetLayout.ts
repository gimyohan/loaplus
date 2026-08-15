export interface WidgetRect {
  x: number
  y: number
  w: number
  h: number
}

function rectsOverlap(a: WidgetRect, b: WidgetRect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

/**
 * rect가 others 중 하나와도 겹치면 true. 이동 중인 위젯 자신은 excludeId로 비교에서 뺀다.
 * 그리드 드래그 배치(WidgetDashboard)와 배치 코드 적용(templateCode)에서 함께 쓴다.
 */
export function collidesWithAny<T extends WidgetRect & { id?: string }>(
  rect: WidgetRect,
  others: T[],
  excludeId?: string,
): boolean {
  return others.some((other) => other.id !== excludeId && rectsOverlap(rect, other))
}
