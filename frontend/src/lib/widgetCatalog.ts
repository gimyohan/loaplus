import type { WidgetCatalogItem } from '@/types/widget'

// docs/widgets.typ - Default Value(가디언/낙원 등) / Additional Value(텍스트/이미지 등) 위젯 목록.
// section은 위젯 목록(WidgetPalette)에서만 쓰는 표시용 묶음이다 — category(default/additional)는
// 캐릭터 귀속 여부에 따른 노출 조건(hasCharacterRecord)에 계속 쓰이고, section은 그 위에 사용자가
// 보기 편하도록 얹은 5개 그룹(배너/주간 콘텐츠/일일 콘텐츠/커스텀 위젯/툴)이다. group을 section과
// 같은 값으로 둬서, 배너류처럼 같은 section 안 항목 전부가 화살표로 넘겨가며 고르는 카드 하나로
// 묶인다(WidgetPalette의 groupCatalogItems 참고) — 툴(어빌리티 스톤)만 항목이 하나뿐이라 group을
// 안 둬도 자기 kind로 혼자만의 묶음이 된다.
export const WIDGET_CATALOG: WidgetCatalogItem[] = [
  { kind: 'bannerDetailed', label: '캐릭터 상세 배너', category: 'default', w: 10, h: 5, group: 'banner', section: 'banner' },
  { kind: 'banner', label: '캐릭터 배너', category: 'default', w: 10, h: 2, group: 'banner', section: 'banner' },
  { kind: 'bannerCompact', label: '캐릭터 요약 배너', category: 'default', w: 10, h: 1, group: 'banner', section: 'banner' },
  { kind: 'raid', label: '레이드', category: 'default', w: 5, h: 3, group: 'weekly', section: 'weekly' },
  { kind: 'paradise', label: '낙원', category: 'default', w: 5, h: 2, group: 'weekly', section: 'weekly' },
  // 에브니 큐브는 실제로는 주간 콘텐츠가 아니지만, 마땅한 자리가 정해지기 전까지는 일단 여기에 둔다.
  { kind: 'ebonyCube', label: '에브니 큐브', category: 'default', w: 5, h: 2, group: 'weekly', section: 'weekly' },
  { kind: 'halHourglass', label: '할의 모래시계', category: 'default', w: 5, h: 2, group: 'weekly', section: 'weekly' },
  { kind: 'guardian', label: '가디언', category: 'default', w: 5, h: 3, group: 'daily', section: 'daily' },
  { kind: 'kurzanFrontline', label: '쿠르잔 전선', category: 'default', w: 5, h: 3, group: 'daily', section: 'daily' },
  { kind: 'text', label: '텍스트', category: 'additional', w: 5, h: 1, group: 'custom', section: 'custom' },
  { kind: 'textCheckbox', label: '루틴', category: 'additional', w: 5, h: 1, group: 'custom', section: 'custom' },
  { kind: 'image', label: '이미지', category: 'additional', w: 4, h: 4, group: 'custom', section: 'custom' },
  { kind: 'linkIcon', label: '링크 & 아이콘', category: 'additional', w: 1, h: 1, group: 'custom', section: 'custom' },
  { kind: 'abilityStone', label: '어빌리티 스톤', category: 'additional', w: 1, h: 1, section: 'tool' },
]

/** 그리드 한 칸의 픽셀 크기 (docs/db_schema.typ: grid_x, grid_y, width, height) */
export const CELL_SIZE = 50

/** 배너(10x2)의 디자인 원본 크기. ScaleToFit으로 어떤 크기에도 비율 그대로 축소한다. */
export const BANNER_NATIVE_WIDTH = 900
export const BANNER_NATIVE_HEIGHT = 180

/** 배너 컴팩트(10x1)의 디자인 원본 크기. */
export const BANNER_COMPACT_NATIVE_WIDTH = 900
export const BANNER_COMPACT_NATIVE_HEIGHT = 90

/** 배너 상세(10x5)의 디자인 원본 크기. 위쪽 2줄(900x180)은 배너(10x2)와 완전히 동일하고,
 * 아래쪽 3줄(900x270)에 장비/장신구/어빌리티 스톤/팔찌 요약이 추가된다. */
export const BANNER_DETAILED_NATIVE_WIDTH = 900
export const BANNER_DETAILED_NATIVE_HEIGHT = 450

/** 쿠르잔 전선(5x3)의 디자인 원본 크기. */
export const KURZAN_FRONTLINE_NATIVE_WIDTH = 350
export const KURZAN_FRONTLINE_NATIVE_HEIGHT = 210

/** 가디언(5x3)의 디자인 원본 크기. 쿠르잔 전선과 레이아웃이 동일하다. */
export const GUARDIAN_NATIVE_WIDTH = 350
export const GUARDIAN_NATIVE_HEIGHT = 210

/** 낙원(5x2)의 디자인 원본 크기. */
export const PARADISE_NATIVE_WIDTH = 350
export const PARADISE_NATIVE_HEIGHT = 140

/** 레이드(5x3)의 디자인 원본 크기. 가디언/쿠르잔 전선과 레이아웃이 동일하다. */
export const RAID_NATIVE_WIDTH = 350
export const RAID_NATIVE_HEIGHT = 210

/** 에브니 큐브(5x2)의 디자인 원본 크기. 낙원과 레이아웃 비율이 동일하다. */
export const EBONY_CUBE_NATIVE_WIDTH = 350
export const EBONY_CUBE_NATIVE_HEIGHT = 140

/** 할의 모래시계(5x2)의 디자인 원본 크기. 낙원과 레이아웃 비율이 동일하다. */
export const HAL_HOURGLASS_NATIVE_WIDTH = 350
export const HAL_HOURGLASS_NATIVE_HEIGHT = 140

/** 텍스트(5x1)의 디자인 원본 크기. */
export const TEXT_NATIVE_WIDTH = 500
export const TEXT_NATIVE_HEIGHT = 100

/** 루틴(텍스트 · 체크박스, 5x1)의 디자인 원본 크기. */
export const TEXT_CHECKBOX_NATIVE_WIDTH = 500
export const TEXT_CHECKBOX_NATIVE_HEIGHT = 100

/** 이미지(4x4)의 디자인 원본 크기. */
export const IMAGE_NATIVE_WIDTH = 400
export const IMAGE_NATIVE_HEIGHT = 400

/** 링크 & 아이콘(1x1)의 디자인 원본 크기. */
export const LINK_ICON_NATIVE_WIDTH = 100
export const LINK_ICON_NATIVE_HEIGHT = 100

/** 어빌리티 스톤(1x1)의 디자인 원본 크기 — 아이콘 하나뿐이고 실제 상호작용은 모달에서 이루어진다. */
export const ABILITY_STONE_NATIVE_WIDTH = 100
export const ABILITY_STONE_NATIVE_HEIGHT = 100
