import type { WidgetCatalogItem, WidgetKind } from '@/types/widget'

/**
 * 캐릭터 카드 한 장의 폭(px). 카드 안 위젯은 전부 이 폭 하나로 세로로 쌓인다 — 예전처럼 화면 폭에
 * 맞춰 카드를 통째로 확대·축소하지 않으므로 위젯은 어느 화면에서나 디자인 원본 크기로 보인다
 * (docs/ui_redesign.md). 이보다 좁은 화면(모바일)에서만 카드 폭이 줄어든다.
 */
export const CARD_WIDTH = 350

/** 이미지 위젯 높이 단계(카드 폭 350px 기준). custom_data.size로 저장된다. */
export const IMAGE_SIZE_HEIGHTS = { S: 140, M: 210, L: 350 } as const
export type ImageSize = keyof typeof IMAGE_SIZE_HEIGHTS
export const DEFAULT_IMAGE_SIZE: ImageSize = 'M'

// docs/widgets.md - Default Value(가디언/낙원 등) / Additional Value(텍스트/이미지 등) 위젯 목록.
// section은 위젯 목록(WidgetPalette)에서만 쓰는 표시용 묶음이다 — category(default/additional)는
// 캐릭터 귀속 여부에 따른 노출 조건에 쓰이고, section은 그 위에 얹은 5개 그룹(배너/주간 콘텐츠/
// 일일 콘텐츠/커스텀 위젯/툴)이다. group이 같은 항목(배너류 등)은 목록에서 화살표로 넘겨 고르는
// 카드 하나로 묶인다(WidgetPalette의 groupCatalogItems 참고).
//
// height는 카드 폭 350px 기준 높이다. ScaleToFit으로 그리는 위젯은 원본(nativeWidth×nativeHeight)
// 비율을 그대로 따른다 — 원본 폭이 350px인 위젯(가디언 등)은 1:1로 보인다.
export const WIDGET_CATALOG: WidgetCatalogItem[] = [
  // 배너 3종은 아직 원본 폭이 900px이라 350px 카드에서는 0.39배로 줄어든다. 350px 폭 전용
  // 레이아웃으로 다시 설계할 예정이다(docs/ui_redesign.md "캐릭터 상세 배너", 개편 4단계).
  { kind: 'bannerDetailed', label: '캐릭터 상세 배너', category: 'default', height: 175, group: 'banner', section: 'banner', nativeWidth: 900, nativeHeight: 450 },
  { kind: 'banner', label: '캐릭터 배너', category: 'default', height: 70, group: 'banner', section: 'banner', nativeWidth: 900, nativeHeight: 180 },
  { kind: 'bannerCompact', label: '캐릭터 요약 배너', category: 'default', height: 35, group: 'banner', section: 'banner', nativeWidth: 900, nativeHeight: 90 },
  // raid: 가디언/쿠르잔 전선과 레이아웃이 동일하다.
  { kind: 'raid', label: '레이드', category: 'default', height: 210, group: 'weekly', section: 'weekly', nativeWidth: 350, nativeHeight: 210 },
  { kind: 'paradise', label: '낙원', category: 'default', height: 140, group: 'weekly', section: 'weekly', nativeWidth: 350, nativeHeight: 140 },
  // 에브니 큐브는 실제로는 주간 콘텐츠가 아니지만, 마땅한 자리가 정해지기 전까지는 일단 여기에 둔다.
  { kind: 'ebonyCube', label: '에브니 큐브', category: 'default', height: 140, group: 'weekly', section: 'weekly', nativeWidth: 350, nativeHeight: 140 },
  { kind: 'halHourglass', label: '할의 모래시계', category: 'default', height: 140, group: 'weekly', section: 'weekly', nativeWidth: 350, nativeHeight: 140 },
  { kind: 'guardian', label: '가디언', category: 'default', height: 210, group: 'daily', section: 'daily', nativeWidth: 350, nativeHeight: 210 },
  { kind: 'kurzanFrontline', label: '쿠르잔 전선', category: 'default', height: 210, group: 'daily', section: 'daily', nativeWidth: 350, nativeHeight: 210 },
  // 한 줄짜리 커스텀 위젯은 주어진 크기에 직접 맞춰 그리므로(ScaleToFit 미사용) 카드가 좁아져도
  // 높이를 그대로 둔다.
  { kind: 'text', label: '텍스트', category: 'additional', height: 52, fixedHeight: true, group: 'custom', section: 'custom' },
  { kind: 'textCheckbox', label: '루틴', category: 'additional', height: 52, fixedHeight: true, group: 'custom', section: 'custom' },
  { kind: 'counter', label: '카운터', category: 'additional', height: 52, fixedHeight: true, group: 'custom', section: 'custom' },
  // 이미지 높이는 custom_data.size(S/M/L)가 정한다 — 여기 height는 기본 단계(M) 값이다.
  { kind: 'image', label: '이미지', category: 'additional', height: IMAGE_SIZE_HEIGHTS[DEFAULT_IMAGE_SIZE], group: 'custom', section: 'custom' },
  { kind: 'linkIcon', label: '링크 & 아이콘', category: 'additional', height: 72, tile: true, group: 'custom', section: 'custom', nativeWidth: 100, nativeHeight: 100 },
  // 잠정 사용 중단(사용자 확정, 2026-09-06): 위젯 목록에서 새로 추가할 수 없도록 hidden을
  // 켰다. 이미 배치된 인스턴스는 그대로 두므로(사용자 확정) 카탈로그 자체에서 빼지는 않는다.
  { kind: 'abilityStone', label: '어빌리티 스톤', category: 'additional', height: 72, tile: true, section: 'tool', nativeWidth: 100, nativeHeight: 100, hidden: true },
]

export function findCatalogItem(kind: WidgetKind): WidgetCatalogItem | undefined {
  return WIDGET_CATALOG.find((item) => item.kind === kind)
}

export function readImageSize(customData: Record<string, unknown> | null | undefined): ImageSize {
  const size = customData?.size
  return size === 'S' || size === 'M' || size === 'L' ? size : DEFAULT_IMAGE_SIZE
}

/**
 * 위젯 하나가 카드 안에서 차지하는 픽셀 크기. 폭은 카드 폭(타일 위젯만 정사각형), 높이는 종류별
 * 고정값을 카드 폭 비율만큼 맞춘다 — 카드가 350px이면 원본 그대로, 모바일처럼 더 좁으면 비례해
 * 줄어든다(fixedHeight 위젯 제외).
 */
export function widgetBox(
  kind: WidgetKind,
  customData: Record<string, unknown> | null | undefined,
  cardWidth: number = CARD_WIDTH,
): { width: number; height: number } {
  const item = findCatalogItem(kind)
  if (!item) return { width: cardWidth, height: 52 }
  if (item.tile) return { width: item.height, height: item.height }

  const baseHeight = kind === 'image' ? IMAGE_SIZE_HEIGHTS[readImageSize(customData)] : item.height
  const scale = item.fixedHeight ? 1 : cardWidth / CARD_WIDTH
  return { width: cardWidth, height: Math.round(baseHeight * scale) }
}
