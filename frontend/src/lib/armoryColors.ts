// 상세 배너(BANNER_DETAILED)의 "색상·숫자 위주 요약" 표시에 쓰는 색상 규칙(docs/widgets.typ 참고).
function chartColor(n: 1 | 2 | 3): string {
  return `rgb(var(--chart-${n}))`
}

// 로스트아크 Open API 응답(ArmoryEquipment[].Tooltip)에는 품질/재련 단계 등의 "숫자"만 있고
// 그 숫자를 어떤 색으로 보여줄지는 내려주지 않는다 — 그래서 이 파일에서 값 구간(레벨)별 색을
// 직접 관리한다. 구간 정의는 buckets 배열 하나로만 하면 되도록 통일해, 새 지표가 추가되거나
// 구간이 바뀌어도 이 파일만 고치면 된다.
interface LevelColorBucket {
  /** 이 구간에 속하는 값의 최댓값(포함). 배열은 반드시 오름차순으로 정의한다. */
  max: number
  color: string
}

/** value가 속하는 첫 구간의 색을 반환한다. 모든 구간의 max보다 크면 마지막(최고) 구간 색을 쓴다. */
function colorForLevel(value: number, buckets: LevelColorBucket[]): string {
  const bucket = buckets.find((b) => value <= b.max)
  return (bucket ?? buckets[buckets.length - 1]).color
}

const COLOR_NONE = 'rgb(var(--muted-foreground))'
const COLOR_RED = '#F04747'
const COLOR_GREEN = '#22C55E'
const COLOR_BLUE = '#3B82F6'
const COLOR_PURPLE = '#A855F7'
const COLOR_ORANGE = '#F97316'

// 장비 품질(0~100) 구간 색 — 실제 게임 UI가 쓰는 품질 구간별 색을 그대로 재현한다: 0 없음 /
// 1~30 빨강 / 31~69 초록 / 70~89 파랑 / 90~99 보라 / 100 주황.
const QUALITY_BUCKETS: LevelColorBucket[] = [
  { max: 0, color: COLOR_NONE },
  { max: 30, color: COLOR_RED },
  { max: 69, color: COLOR_GREEN },
  { max: 89, color: COLOR_BLUE },
  { max: 99, color: COLOR_PURPLE },
  { max: 100, color: COLOR_ORANGE },
]

export function qualityColor(quality: number): string {
  return colorForLevel(quality, QUALITY_BUCKETS)
}

// 상급 재련 단계(0~40) 구간 색 — 품질 색상 팔레트를 그대로 재사용한다(사용자 확정, 게임 UI 근거는
// 아니고 이 앱에서 정한 구간): 0 없음 / 1~10 빨강 / 11~20 초록 / 21~30 파랑 / 31~39 보라 / 40 주황.
const ADVANCED_REFINE_LEVEL_BUCKETS: LevelColorBucket[] = [
  { max: 0, color: COLOR_NONE },
  { max: 10, color: COLOR_RED },
  { max: 20, color: COLOR_GREEN },
  { max: 30, color: COLOR_BLUE },
  { max: 39, color: COLOR_PURPLE },
  { max: 40, color: COLOR_ORANGE },
]

export function advancedRefineLevelColor(advancedRefineLevel: number): string {
  return colorForLevel(advancedRefineLevel, ADVANCED_REFINE_LEVEL_BUCKETS)
}

// 상급 재련 자체가 없는 아이템 이름 — "무기는 상급 재련이 없다"가 아니라, "전율" 세트가
// 상급 재련이 없는 것이다(사용자 확인). 나중에 상급 재련 없는 세트가 더 확인되면 이름만 추가한다.
const NO_ADVANCED_REFINE_ITEM_NAMES = ['전율']

export function hasAdvancedRefine(itemName: string): boolean {
  return !NO_ADVANCED_REFINE_ITEM_NAMES.some((name) => itemName?.includes(name))
}

// 강화 단계(재련 단계)는 아이템 레벨과의 대응이 세트마다 다르다 — 예: "운명의 업화" 세트는 +10이
// 아이템 레벨 1640대인데 "운명의 전율" 세트는 +11이 1730대다(같은 강화 수치라도 시작 레벨이
// 다름, 사용자 확인). 그래서 quality/advancedRefineLevel처럼 값 하나로 구간을 정할 수 없고,
// 아이템 이름에 포함된 세트 이름 문자열로 먼저 어느 세트인지 찾은 뒤 그 세트 전용 구간표를
// 적용한다. 새 세트가 나올 때마다 이 배열에 항목을 하나 추가하면 된다.
interface RefineLevelBucketSet {
  /** EquipmentSlotDetail.itemName(재련 접두사를 뗀 이름)에 이 중 하나라도 포함되면 이 세트로
   * 판정한다 — 같은 강화 구간을 공유하는 세트가 이름을 여러 개 쓸 수 있다(예: "업화"/"결단"). */
  nameIncludes: string[]
  buckets: LevelColorBucket[]
}

const REFINE_LEVEL_BUCKET_SETS: RefineLevelBucketSet[] = [
  {
    // "운명의 업화"/"운명의 결단" 세트: +10 기준 아이템 레벨 1640대(사용자 확인).
    nameIncludes: ['업화', '결단'],
    buckets: [
      { max: 9, color: COLOR_NONE },
      { max: 13, color: COLOR_RED },
      { max: 15, color: COLOR_GREEN },
      { max: 17, color: COLOR_BLUE },
      { max: 19, color: COLOR_PURPLE },
      { max: 25, color: COLOR_ORANGE },
    ],
  },
  {
    // "운명의 전율" 세트: +11 기준 아이템 레벨 1730대(사용자 확인).
    nameIncludes: ['전율'],
    buckets: [
      { max: 10, color: COLOR_NONE },
      { max: 14, color: COLOR_RED },
      { max: 16, color: COLOR_GREEN },
      { max: 18, color: COLOR_BLUE },
      { max: 20, color: COLOR_PURPLE },
      { max: 25, color: COLOR_ORANGE },
    ],
  },
]

/** 아직 구간표가 없는 세트(이름이 위 목록에 안 걸림)는 무채색으로 — 실제와 다른 색을 잘못
 * 보여주는 것보다, "아직 이 세트는 구간이 없다"는 걸 색으로도 드러내는 쪽을 택한다. */
const REFINE_LEVEL_COLOR_UNKNOWN = COLOR_NONE

export function refineLevelColor(refineLevel: number, itemName: string): string {
  // 이 필드를 추가하기 전에 저장된 캐릭터는 새로고침 전까지 itemName이 없을 수 있다 — 방어적으로 처리.
  const set = REFINE_LEVEL_BUCKET_SETS.find((candidate) =>
    candidate.nameIncludes.some((name) => itemName?.includes(name)),
  )
  if (!set) return REFINE_LEVEL_COLOR_UNKNOWN
  return colorForLevel(refineLevel, set.buckets)
}

// 장비 슬롯 아이콘의 배경색 — 세트별 고유색(사용자 확정). 원본 아이콘 이미지가 투명 배경이라
// 이 색이 아이템 뒤로 그대로 비친다. 목걸이 등 장신구나 아직 색이 없는 세트는 null을 반환해
// 호출부가 기본 배경(bg-background)을 그대로 쓰게 한다.
interface EquipmentBackgroundColorSet {
  nameIncludes: string
  color: string
}

const EQUIPMENT_BACKGROUND_COLORS: EquipmentBackgroundColorSet[] = [
  { nameIncludes: '결단', color: '#7d2b03' },
  { nameIncludes: '업화', color: '#e9d099' },
  { nameIncludes: '전율', color: '#bea371' },
]

export function equipmentBackgroundColor(itemName: string): string | null {
  return EQUIPMENT_BACKGROUND_COLORS.find((set) => itemName?.includes(set.nameIncludes))?.color ?? null
}

/** "전율" 세트는 장비 칸 테두리를 secondary 색으로 강조한다(사용자 확정). */
export function isJeonyulItem(itemName: string): boolean {
  return Boolean(itemName?.includes('전율'))
}

/** 어빌리티 스톤 전투 각인 레벨(1~3)을 색상으로 구분한다(별도 색 정보 없음 — 이 앱 차트 팔레트 재사용). */
export function engravingLevelColor(level: number): string {
  if (level >= 3) return chartColor(2)
  if (level >= 2) return chartColor(1)
  return 'rgb(var(--muted-foreground))'
}
