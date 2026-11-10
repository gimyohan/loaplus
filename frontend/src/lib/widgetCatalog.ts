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
// 배너를 뺀 위젯은 카드 한 면 위의 "행"으로 그리고(components/widgets/rowParts.tsx) 높이는 내용이
// 정한다 — height는 참고용 대략값이다. 높이를 실제로 쓰는 건 이미지(S/M/L)와 정사각형 타일뿐이다.
export const WIDGET_CATALOG: WidgetCatalogItem[] = [
  // 배너: 예전 3종(상세/기본/요약)을 350px 배너 하나로 합쳤다(components/character/CharacterBanner.tsx).
  // DB의 세 종류는 그대로 두고 장비 정보를 처음에 펼칠지만 다르다 — 새로 추가할 때는 상세 배너
  // 하나만 고를 수 있고(나머지는 hidden), 이미 놓인 기본/요약 배너도 같은 배너로 보인다.
  // 높이는 접고 펼침에 따라 달라져 위젯 스스로 정한다(height는 접힌 헤더 높이, 참고용).
  { kind: 'bannerDetailed', label: '캐릭터 배너', category: 'default', height: 80, group: 'banner', section: 'banner' },
  { kind: 'banner', label: '캐릭터 배너(기본)', category: 'default', height: 80, group: 'banner', section: 'banner', hidden: true },
  { kind: 'bannerCompact', label: '캐릭터 배너(요약)', category: 'default', height: 80, group: 'banner', section: 'banner', hidden: true },
  // raid: 가디언/쿠르잔 전선과 레이아웃이 동일하다.
  { kind: 'raid', label: '레이드', category: 'default', height: 108, group: 'weekly', section: 'weekly' },
  { kind: 'paradise', label: '낙원', category: 'default', height: 44, group: 'weekly', section: 'weekly' },
  // 에브니 큐브는 실제로는 주간 콘텐츠가 아니지만, 마땅한 자리가 정해지기 전까지는 일단 여기에 둔다.
  { kind: 'ebonyCube', label: '에브니 큐브', category: 'default', height: 72, group: 'weekly', section: 'weekly' },
  { kind: 'halHourglass', label: '할의 모래시계', category: 'default', height: 44, group: 'weekly', section: 'weekly' },
  { kind: 'guardian', label: '가디언', category: 'default', height: 76, group: 'daily', section: 'daily' },
  { kind: 'kurzanFrontline', label: '쿠르잔 전선', category: 'default', height: 76, group: 'daily', section: 'daily' },
  { kind: 'text', label: '텍스트', category: 'additional', height: 44, group: 'custom', section: 'custom' },
  { kind: 'textCheckbox', label: '루틴', category: 'additional', height: 44, group: 'custom', section: 'custom' },
  { kind: 'counter', label: '카운터', category: 'additional', height: 44, group: 'custom', section: 'custom' },
  // 이미지 높이는 custom_data.size(S/M/L)가 정한다 — 여기 height는 기본 단계(M) 값이다.
  { kind: 'image', label: '이미지', category: 'additional', height: IMAGE_SIZE_HEIGHTS[DEFAULT_IMAGE_SIZE], group: 'custom', section: 'custom' },
  { kind: 'linkIcon', label: '링크 & 아이콘', category: 'additional', height: 40, tile: true, group: 'custom', section: 'custom' },
  // 잠정 사용 중단(사용자 확정, 2026-09-06): 위젯 목록에서 새로 추가할 수 없도록 hidden을
  // 켰다. 이미 배치된 인스턴스는 그대로 두므로(사용자 확정) 카탈로그 자체에서 빼지는 않는다.
  { kind: 'abilityStone', label: '어빌리티 스톤', category: 'additional', height: 40, tile: true, section: 'tool', hidden: true },
]

export function findCatalogItem(kind: WidgetKind): WidgetCatalogItem | undefined {
  return WIDGET_CATALOG.find((item) => item.kind === kind)
}

export function readImageSize(customData: Record<string, unknown> | null | undefined): ImageSize {
  const size = customData?.size
  return size === 'S' || size === 'M' || size === 'L' ? size : DEFAULT_IMAGE_SIZE
}

/**
 * 위젯 하나가 카드 안에서 차지하는 픽셀 크기. 폭은 카드 폭(타일 위젯만 정사각형)이고, 높이는 이미지만
 * 의미가 있다(S/M/L을 카드 폭 비율만큼 맞춤) — 나머지 행 위젯은 내용이 높이를 정하므로 참고값이다.
 */
export function widgetBox(
  kind: WidgetKind,
  customData: Record<string, unknown> | null | undefined,
  cardWidth: number = CARD_WIDTH,
): { width: number; height: number } {
  const item = findCatalogItem(kind)
  if (!item) return { width: cardWidth, height: 44 }
  if (item.tile) return { width: item.height, height: item.height }
  if (kind === 'image') {
    return { width: cardWidth, height: Math.round(IMAGE_SIZE_HEIGHTS[readImageSize(customData)] * (cardWidth / CARD_WIDTH)) }
  }
  return { width: cardWidth, height: item.height }
}
