import type { KurzanFrontlineSummary } from '@/types/kurzanFrontline'

// 백엔드/Open API 연동 전까지 사용하는 로컬 목업 데이터 (docs/widgets.typ - 쿠르잔 전선)
export const mockKurzanFrontline: KurzanFrontlineSummary = {
  targetName: '네프타 작전 1',
  restGauge: 0,
  restGaugeMax: 200,
  restGaugeThreshold: 0,
  isHarvested: false,
  restGaugeConsumedByHarvest: false,
}
