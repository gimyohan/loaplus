// 상세 배너(BANNER_DETAILED)의 "색상·숫자 위주 요약" 표시에 쓰는 색상 규칙(docs/widgets.typ 참고).

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

// 아이템 등급별 텍스트(숫자) 색 팔레트(사용자 확정) — 강화(재련) 단계 구간표(REFINE_LEVEL_BUCKET_SETS)가
// 이 이름으로 색을 참조하므로 그보다 먼저 선언한다. 아래 GRADE_BACKGROUND_COLORS(아이콘 배경, 4개
// 등급만 지정)와는 별개로 8개 등급 전부를 지정한다.
const GRADE_TEXT_COLORS: Record<string, string> = {
  일반: '#ffffff',
  고급: '#8df901',
  희귀: '#00b0fa',
  영웅: '#c340ef',
  전설: '#f99200',
  유물: '#f99200',
  고대: '#e3c7a1',
  에스더: '#3cf2e6',
}

export function gradeTextColor(grade: string): string | null {
  return GRADE_TEXT_COLORS[grade] ?? null
}

// 장비 품질(0~100) 구간 색(사용자 확정) — 아이템 등급 팔레트(GRADE_TEXT_COLORS)와는 별개의
// 전용 팔레트다: 0 없음(게이지 자체가 0%라 색이 안 보임) / 1~9 빨강 / 10~29 노랑 / 30~69 초록 /
// 70~89 파랑 / 90~99 보라 / 100 주황.
const QUALITY_COLOR_RED = '#ff541d'
const QUALITY_COLOR_YELLOW = '#ffff10'
const QUALITY_COLOR_GREEN = '#b2ff0d'
const QUALITY_COLOR_BLUE = '#0fe6ff'
const QUALITY_COLOR_PURPLE = '#fc11ff'
const QUALITY_COLOR_ORANGE = '#ffa031'

const QUALITY_BUCKETS: LevelColorBucket[] = [
  { max: 0, color: COLOR_NONE },
  { max: 9, color: QUALITY_COLOR_RED },
  { max: 29, color: QUALITY_COLOR_YELLOW },
  { max: 69, color: QUALITY_COLOR_GREEN },
  { max: 89, color: QUALITY_COLOR_BLUE },
  { max: 99, color: QUALITY_COLOR_PURPLE },
  { max: 100, color: QUALITY_COLOR_ORANGE },
]

export function qualityColor(quality: number): string {
  return colorForLevel(quality, QUALITY_BUCKETS)
}

// 품질 게이지 바를 위한 그라데이션(사용자 확정) — 오른쪽 끝(현재 값)은 qualityColor 그대로,
// 왼쪽 끝(0)으로 갈수록 같은 색을 어둡게 만든 색을 쓴다. hex 색만 어둡게 계산할 수 있어(RGB
// 채널 스케일), COLOR_NONE(테마 토큰 문자열)처럼 hex가 아니면 그대로(단색) 반환한다 — 어차피
// quality 0일 땐 바 너비 자체가 0%라 안 보인다.
const QUALITY_GAUGE_DARKEN_RATIO = 0.35

function darkenHexColor(hex: string, ratio: number): string {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex)
  if (!match) return hex
  const num = parseInt(match[1], 16)
  const channel = (shift: number) => Math.round(((num >> shift) & 0xff) * (1 - ratio))
  const darkened = (channel(16) << 16) | (channel(8) << 8) | channel(0)
  return `#${darkened.toString(16).padStart(6, '0')}`
}

export function qualityGaugeGradient(quality: number): string {
  const color = qualityColor(quality)
  return `linear-gradient(to right, ${darkenHexColor(color, QUALITY_GAUGE_DARKEN_RATIO)}, ${color})`
}

// 상급 재련 단계(0~40) 구간 색 — 강화(재련) 숫자와 같은 아이템 등급 팔레트를 쓴다(사용자 확정):
// 0 일반 / 1~10 고급 / 11~20 희귀 / 21~30 영웅 / 31~39 전설 / 40 유물. 경계값 자체는 이 앱에서
// 정한 구간(게임 UI 근거 아님)으로 예전과 동일, 색만 교체했다.
const ADVANCED_REFINE_LEVEL_BUCKETS: LevelColorBucket[] = [
  { max: 0, color: GRADE_TEXT_COLORS.일반 },
  { max: 10, color: GRADE_TEXT_COLORS.고급 },
  { max: 20, color: GRADE_TEXT_COLORS.희귀 },
  { max: 30, color: GRADE_TEXT_COLORS.영웅 },
  { max: 39, color: GRADE_TEXT_COLORS.전설 },
  { max: 40, color: GRADE_TEXT_COLORS.유물 },
]

export function advancedRefineLevelColor(advancedRefineLevel: number): string {
  return colorForLevel(advancedRefineLevel, ADVANCED_REFINE_LEVEL_BUCKETS)
}

// 상급 재련 자체가 없는 아이템 이름 — "무기는 상급 재련이 없다"가 아니라, "전율" 세트가
// 상급 재련이 없는 것이다(사용자 확인). 나중에 상급 재련 없는 세트가 더 확인되면 이름만 추가한다.
const NO_ADVANCED_REFINE_ITEM_NAMES = ['전율']

export function hasAdvancedRefine(itemName: string, grade: string): boolean {
  // 에스더 무기도 상급 재련 등급 자체가 없다(사용자 확인) — 이름 패턴과 무관하게 등급으로 먼저 제외.
  if (grade === '에스더') return false
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
    // "운명의 업화"/"운명의 결단" 세트: +10 기준 아이템 레벨 1640대(사용자 확인). 구간 경계는
    // 그대로 두고 색만 아이템 등급 팔레트(일반→유물, 6단계)로 교체했다(사용자 확정).
    nameIncludes: ['업화', '결단'],
    buckets: [
      { max: 9, color: GRADE_TEXT_COLORS.일반 },
      { max: 13, color: GRADE_TEXT_COLORS.고급 },
      { max: 15, color: GRADE_TEXT_COLORS.희귀 },
      { max: 17, color: GRADE_TEXT_COLORS.영웅 },
      { max: 19, color: GRADE_TEXT_COLORS.전설 },
      { max: 25, color: GRADE_TEXT_COLORS.유물 },
    ],
  },
  {
    // "운명의 전율" 세트: +11 기준 아이템 레벨 1730대(사용자 확인). 기존 11~14 구간을 11~12/13~14로
    // 쪼개 한 단계를 더 늘리고, 색은 아이템 등급 팔레트(일반→고대, 7단계)로 교체했다(사용자 확정).
    nameIncludes: ['전율'],
    buckets: [
      { max: 10, color: GRADE_TEXT_COLORS.일반 },
      { max: 12, color: GRADE_TEXT_COLORS.고급 },
      { max: 14, color: GRADE_TEXT_COLORS.희귀 },
      { max: 16, color: GRADE_TEXT_COLORS.영웅 },
      { max: 18, color: GRADE_TEXT_COLORS.전설 },
      { max: 20, color: GRADE_TEXT_COLORS.유물 },
      { max: 25, color: GRADE_TEXT_COLORS.고대 },
    ],
  },
]

/** 아직 구간표가 없는 세트(이름이 위 목록에 안 걸림)는 무채색으로 — 실제와 다른 색을 잘못
 * 보여주는 것보다, "아직 이 세트는 구간이 없다"는 걸 색으로도 드러내는 쪽을 택한다. */
const REFINE_LEVEL_COLOR_UNKNOWN = COLOR_NONE

export function refineLevelColor(refineLevel: number, itemName: string, grade: string): string {
  // 에스더 무기는 재련 구간표 자체가 없고(위 세트 이름 어디에도 안 걸림), 구간과 무관하게 항상
  // 에스더 등급 색으로 통일한다(사용자 확정) — 구간표(REFINE_LEVEL_BUCKET_SETS) 조회보다 먼저 검사.
  if (grade === '에스더') return GRADE_TEXT_COLORS.에스더

  // 이 필드를 추가하기 전에 저장된 캐릭터는 새로고침 전까지 itemName이 없을 수 있다 — 방어적으로 처리.
  const set = REFINE_LEVEL_BUCKET_SETS.find((candidate) =>
    candidate.nameIncludes.some((name) => itemName?.includes(name)),
  )
  if (!set) return REFINE_LEVEL_COLOR_UNKNOWN
  return colorForLevel(refineLevel, set.buckets)
}

// 아이템 등급별 아이콘 배경색(사용자 확정) — 원본 아이콘 이미지가 투명 배경이라 이 색이 아이템
// 뒤로 그대로 비친다. 장비/장신구/어빌리티 스톤/팔찌/완갑 전부 이 하나의 매핑을 공유한다 —
// 예전엔 세트 이름(itemName)으로 장비만 따로 배경색을 정했는데(EQUIPMENT_BACKGROUND_COLORS),
// Open API가 모든 아이템에 공통으로 내려주는 Grade로 일반화했다. 아직 색이 정해지지 않은 등급
// (일반/고급/희귀/영웅)은 매핑에 없으므로 null을 반환해 호출부가 기본 배경(bg-background)을
// 그대로 쓰게 한다.
const GRADE_BACKGROUND_COLORS: Record<string, string> = {
  전설: '#F99200',
  유물: '#FA5D00',
  고대: '#E3C7A1',
  에스더: '#3CF2E6',
}

export function gradeBackgroundColor(grade: string): string | null {
  return GRADE_BACKGROUND_COLORS[grade] ?? null
}

// 어빌리티 스톤 전투 각인 레벨(0~4) 구간 색(사용자 확정) — 아이템 등급 팔레트를 그대로 재사용한다:
// 0 일반 / 1 고급 / 2 희귀 / 3 영웅 / 4 전설.
const ENGRAVING_LEVEL_BUCKETS: LevelColorBucket[] = [
  { max: 0, color: GRADE_TEXT_COLORS.일반 },
  { max: 1, color: GRADE_TEXT_COLORS.고급 },
  { max: 2, color: GRADE_TEXT_COLORS.희귀 },
  { max: 3, color: GRADE_TEXT_COLORS.영웅 },
  { max: 4, color: GRADE_TEXT_COLORS.전설 },
]

export function engravingLevelColor(level: number): string {
  return colorForLevel(level, ENGRAVING_LEVEL_BUCKETS)
}
