// docs/widgets.typ - 쿠르잔 전선(Kurzan Frontline) 위젯: 가디언 위젯의 상태값 관리를 그대로 차용
// (대상 콘텐츠, 휴식 게이지 현재/최대값, 오늘 수확 여부)
export interface KurzanFrontlineSummary {
  targetName: string
  restGauge: number
  restGaugeMax: number
  isHarvested: boolean
}
