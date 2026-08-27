// docs/widgets.typ - 가디언(Guardian) 위젯: 쿠르잔 전선과 상태값 관리 체계가 동일
// (대상 콘텐츠, 휴식 게이지 현재/최대/임계값, 오늘 수확 여부)
export interface GuardianSummary {
  targetName: string
  restGauge: number
  restGaugeMax: number
  /** docs/db_schema.typ: thresholdRestGauge — 이 값 미만이면 휴식 중으로 보고 상호작용을 막는다 */
  restGaugeThreshold: number
  isHarvested: boolean
  /** '오늘 수확' 체크로 휴식 게이지가 실제로 소모되었는지 여부. 체크 해제 시 복구할지 판단하는 데 쓰인다 */
  restGaugeConsumedByHarvest: boolean
  /** 자동으로 최고 난이도를 따라가는 중인지 여부. 설정 모달에서 자동 산정값과 다른 대상을 고르면 서버에서 false로 바뀐다 */
  targetAutoManaged: boolean
}
