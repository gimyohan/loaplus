import type { GuardianSummary } from '@/types/guardian'

// 백엔드/Open API 연동 전까지 사용하는 로컬 목업 데이터 (docs/widgets.typ - 가디언)
export const mockGuardian: GuardianSummary = {
  targetName: '드렉탈라스',
  restGauge: 0,
  restGaugeMax: 100,
  restGaugeThreshold: 0,
  isHarvested: false,
  restGaugeConsumedByHarvest: false,
}
