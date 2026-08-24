// 상세 배너(BANNER_DETAILED)의 "색상·숫자 위주 요약" 표시에 쓰는 색상 규칙(docs/widgets.typ 참고).
function chartColor(n: 1 | 2 | 3): string {
  return `rgb(var(--chart-${n}))`
}

// 장비 품질(0~100) 등급 색. 로스트아크 Open API 응답(ArmoryEquipment[].Tooltip의 ItemTitle
// 요소)에는 qualityValue(숫자)만 있고 등급 색상 자체는 내려주지 않는다 — 실제 응답을 까봐 직접
// 확인함(quality: 90인 아이템의 ItemTitle에 qualityValue 외에 색상 필드 없음). 그래서 실제
// 게임 UI가 쓰는 품질 구간별 색을 그대로 재현한다: 0 없음 / 1~30 빨강 / 31~69 초록 / 70~89 파랑
// / 90~99 보라 / 100 주황.
const QUALITY_COLOR_NONE = 'rgb(var(--muted-foreground))'
const QUALITY_COLOR_RED = '#F04747'
const QUALITY_COLOR_GREEN = '#22C55E'
const QUALITY_COLOR_BLUE = '#3B82F6'
const QUALITY_COLOR_PURPLE = '#A855F7'
const QUALITY_COLOR_ORANGE = '#F97316'

export function qualityColor(quality: number): string {
  if (quality <= 0) return QUALITY_COLOR_NONE
  if (quality <= 30) return QUALITY_COLOR_RED
  if (quality <= 69) return QUALITY_COLOR_GREEN
  if (quality <= 89) return QUALITY_COLOR_BLUE
  if (quality <= 99) return QUALITY_COLOR_PURPLE
  return QUALITY_COLOR_ORANGE
}

/** 어빌리티 스톤 전투 각인 레벨(1~3)을 색상으로 구분한다(별도 색 정보 없음 — 이 앱 차트 팔레트 재사용). */
export function engravingLevelColor(level: number): string {
  if (level >= 3) return chartColor(2)
  if (level >= 2) return chartColor(1)
  return 'rgb(var(--muted-foreground))'
}
