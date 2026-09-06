import type { WidgetCatalogItem } from '@/types/widget'

// docs/widgets.typ - Default Value(가디언/낙원 등) / Additional Value(텍스트/이미지 등) 위젯 목록.
// section은 위젯 목록(WidgetPalette)에서만 쓰는 표시용 묶음이다 — category(default/additional)는
// 캐릭터 귀속 여부에 따른 노출 조건(hasCharacterRecord)에 계속 쓰이고, section은 그 위에 사용자가
// 보기 편하도록 얹은 5개 그룹(배너/주간 콘텐츠/일일 콘텐츠/커스텀 위젯/툴)이다. group을 section과
// 같은 값으로 둬서, 배너류처럼 같은 section 안 항목 전부가 화살표로 넘겨가며 고르는 카드 하나로
// 묶인다(WidgetPalette의 groupCatalogItems 참고) — 툴(어빌리티 스톤)만 항목이 하나뿐이라 group을
// 안 둬도 자기 kind로 혼자만의 묶음이 된다.
export const WIDGET_CATALOG: WidgetCatalogItem[] = [
  // bannerDetailed: 위쪽 2줄(900x180)은 banner와 완전히 동일하고, 아래쪽 3줄(900x270)에
  // 장비/장신구/어빌리티 스톤/팔찌 요약이 추가된다.
  { kind: 'bannerDetailed', label: '캐릭터 상세 배너', category: 'default', w: 10, h: 5, group: 'banner', section: 'banner', nativeWidth: 900, nativeHeight: 450 },
  { kind: 'banner', label: '캐릭터 배너', category: 'default', w: 10, h: 2, group: 'banner', section: 'banner', nativeWidth: 900, nativeHeight: 180 },
  { kind: 'bannerCompact', label: '캐릭터 요약 배너', category: 'default', w: 10, h: 1, group: 'banner', section: 'banner', nativeWidth: 900, nativeHeight: 90 },
  // raid: 가디언/쿠르잔 전선과 레이아웃이 동일하다.
  { kind: 'raid', label: '레이드', category: 'default', w: 5, h: 3, group: 'weekly', section: 'weekly', nativeWidth: 350, nativeHeight: 210 },
  { kind: 'paradise', label: '낙원', category: 'default', w: 5, h: 2, group: 'weekly', section: 'weekly', nativeWidth: 350, nativeHeight: 140 },
  // 에브니 큐브는 실제로는 주간 콘텐츠가 아니지만, 마땅한 자리가 정해지기 전까지는 일단 여기에 둔다.
  // 낙원과 레이아웃 비율이 동일하다.
  { kind: 'ebonyCube', label: '에브니 큐브', category: 'default', w: 5, h: 2, group: 'weekly', section: 'weekly', nativeWidth: 350, nativeHeight: 140 },
  { kind: 'halHourglass', label: '할의 모래시계', category: 'default', w: 5, h: 2, group: 'weekly', section: 'weekly', nativeWidth: 350, nativeHeight: 140 },
  { kind: 'guardian', label: '가디언', category: 'default', w: 5, h: 3, group: 'daily', section: 'daily', nativeWidth: 350, nativeHeight: 210 },
  { kind: 'kurzanFrontline', label: '쿠르잔 전선', category: 'default', w: 5, h: 3, group: 'daily', section: 'daily', nativeWidth: 350, nativeHeight: 210 },
  // 배치 전 위젯 목록 카드에서 미리 칸 수를 골라 배치한다(WidgetPalette의 CatalogCard 참고).
  // minW는 2칸: 1칸(50px)은 TextWidget의 좌우 패딩(px-7, 56px)보다 좁아 입력창이 그려질 공간이
  // 아예 없다. maxW는 DEFAULT_COLUMNS(10칸, WidgetDashboard.tsx)까지.
  // 가로 칸 수를 자유롭게 고를 수 있어 ScaleToFit을 쓰지 않으므로 nativeWidth/nativeHeight는 없다.
  { kind: 'text', label: '텍스트', category: 'additional', w: 5, h: 1, group: 'custom', section: 'custom', resizable: true, minW: 2, maxW: 10 },
  // 루틴(체크박스+텍스트+설정 버튼)도 텍스트와 같은 이유로 minW: 3 — 체크박스(36px)+설정
  // 버튼(36px)+컨테이너 좌우 패딩(px-5, 40px)+요소 사이 gap(24px)만으로도 136px(≈2.7칸)가
  // 필요해서 2칸(100px)으로는 아이콘들이 이미 서로 겹친다.
  { kind: 'textCheckbox', label: '루틴', category: 'additional', w: 5, h: 1, group: 'custom', section: 'custom', resizable: true, minW: 3, maxW: 10 },
  // 카운터도 루틴과 같은 이유로 minW: 3 — 숫자 배지 + 설정 버튼 + 컨테이너 좌우 패딩만으로도
  // 비슷한 최소 폭이 필요하다.
  { kind: 'counter', label: '카운터', category: 'additional', w: 5, h: 1, group: 'custom', section: 'custom', resizable: true, minW: 3, maxW: 10 },
  // 이미지는 실제 사진이 object-cover로 어떤 비율에도 알아서 맞춰지므로 가로·세로 둘 다 자유롭게
  // 고를 수 있다 — maxW/maxH는 DEFAULT_COLUMNS와 맞춰 대칭으로 10까지만 우선 허용한다(세로는
  // MAX_ROWS까지 더 늘릴 수 있지만, WidgetDashboard.tsx를 이 파일에서 import하면 순환
  // 참조가 생겨 이 파일만으로 판단 가능한 값을 쓴다).
  { kind: 'image', label: '이미지', category: 'additional', w: 4, h: 4, group: 'custom', section: 'custom', resizable: true, minW: 2, maxW: 10, resizableH: true, minH: 2, maxH: 10 },
  { kind: 'linkIcon', label: '링크 & 아이콘', category: 'additional', w: 1, h: 1, group: 'custom', section: 'custom', nativeWidth: 100, nativeHeight: 100 },
  // 아이콘 하나뿐이고 실제 상호작용은 모달에서 이루어진다.
  // 잠정 사용 중단(사용자 확정, 2026-09-06): 위젯 목록에서 새로 추가할 수 없도록 hidden을
  // 켰다. 이미 배치된 인스턴스는 그대로 두므로(사용자 확정) 카탈로그 자체에서 빼지는 않는다 —
  // WidgetVisual/WidgetDashboard가 렌더링·라벨 조회에 이 항목을 계속 참조한다.
  { kind: 'abilityStone', label: '어빌리티 스톤', category: 'additional', w: 1, h: 1, section: 'tool', nativeWidth: 100, nativeHeight: 100, hidden: true },
]

/** 그리드 한 칸의 픽셀 크기 (docs/db_schema.typ: grid_x, grid_y, width, height) */
export const CELL_SIZE = 50
