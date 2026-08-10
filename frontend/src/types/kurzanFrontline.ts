// docs/widgets.typ - 쿠르잔 전선(Kurzan Frontline) 위젯: 가디언 위젯의 상태값 관리를 그대로 차용
// (대상 콘텐츠, 휴식 게이지 현재/최대/임계값, 오늘 수확 여부)
export interface KurzanFrontlineSummary {
  targetName: string
  restGauge: number
  restGaugeMax: number
  /** docs/db_schema.typ: thresholdRestGauge — 이 값을 넘으면 보너스 효과가 줄어드는 기준점 */
  restGaugeThreshold: number
  isHarvested: boolean
  /** '오늘 수확' 체크로 휴식 게이지가 실제로 소모되었는지 여부. 체크 해제 시 복구할지 판단하는 데 쓰인다 */
  restGaugeConsumedByHarvest: boolean
}
