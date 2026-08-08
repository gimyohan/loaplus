// docs/widgets.typ - 가디언(Guardian) 위젯: 쿠르잔 전선과 상태값 관리 체계가 동일
// (대상 콘텐츠, 휴식 게이지 현재/최대값, 오늘 수확 여부)
export interface GuardianSummary {
  targetName: string
  restGauge: number
  restGaugeMax: number
  isHarvested: boolean
}
