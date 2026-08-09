import type { GuardianSummary } from '@/types/guardian'

// 가디언 토벌은 최대 게이지(100)의 20%씩 소모되는 쿠르잔 전선(200의 20% = 40)과 같은 비율이다
const REST_GAUGE_COST = 20

/**
 * '오늘 수확' 체크 시 발생하는 처리 (docs/db_schema.typ - Action_Logs 참고 대상).
 * 휴식 게이지가 20 이상이면 20을 차감하고(부족하면 그대로 둔다), 완료 처리한다.
 * 실제로 차감이 일어났는지는 restGaugeConsumedByHarvest에 기록해 두고 체크 해제 시 참고한다.
 *
 * TODO: 백엔드 연동 후에는 여기서 API를 호출해 서버 상태를 갱신하고, 그 응답으로
 * 로컬 state를 업데이트해야 한다. 지금은 백엔드가 없으므로 로컬에서만 계산한다.
 */
export function applyGuardianHarvest(data: GuardianSummary): GuardianSummary {
  const consumed = data.restGauge >= REST_GAUGE_COST
  return {
    ...data,
    isHarvested: true,
    restGauge: consumed ? data.restGauge - REST_GAUGE_COST : data.restGauge,
    restGaugeConsumedByHarvest: consumed,
  }
}

/**
 * '오늘 수확' 체크 해제(취소) 시 발생하는 처리.
 * applyGuardianHarvest에서 실제로 게이지가 소모되었을 때만(restGaugeConsumedByHarvest)
 * 20을 복구한다. 소모되지 않았던 경우(게이지 부족으로 차감이 스킵됐던 경우)는 그대로 둔다.
 */
export function revertGuardianHarvest(data: GuardianSummary): GuardianSummary {
  return {
    ...data,
    isHarvested: false,
    restGauge: data.restGaugeConsumedByHarvest
      ? Math.min(data.restGauge + REST_GAUGE_COST, data.restGaugeMax)
      : data.restGauge,
    restGaugeConsumedByHarvest: false,
  }
}
