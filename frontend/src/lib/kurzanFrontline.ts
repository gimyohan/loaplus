import type { KurzanFrontlineSummary } from '@/types/kurzanFrontline'

const REST_GAUGE_COST = 40

/**
 * '오늘 수확' 체크 시 발생하는 처리 (docs/db_schema.typ - Action_Logs 참고 대상).
 * 휴식 게이지가 40 이상이면 40을 차감하고(부족하면 그대로 둔다), 완료 처리한다.
 * 실제로 차감이 일어났는지는 restGaugeConsumedByHarvest에 기록해 두고 체크 해제 시 참고한다.
 *
 * TODO: 백엔드 연동 후에는 여기서 API를 호출해 서버 상태를 갱신하고, 그 응답으로
 * 로컬 state를 업데이트해야 한다. 지금은 백엔드가 없으므로 로컬에서만 계산한다.
 */
export function applyKurzanFrontlineHarvest(data: KurzanFrontlineSummary): KurzanFrontlineSummary {
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
 * applyKurzanFrontlineHarvest에서 실제로 게이지가 소모되었을 때만(restGaugeConsumedByHarvest)
 * 40을 복구한다. 소모되지 않았던 경우(게이지 부족으로 차감이 스킵됐던 경우)는 그대로 둔다.
 */
export function revertKurzanFrontlineHarvest(data: KurzanFrontlineSummary): KurzanFrontlineSummary {
  return {
    ...data,
    isHarvested: false,
    restGauge: data.restGaugeConsumedByHarvest
      ? Math.min(data.restGauge + REST_GAUGE_COST, data.restGaugeMax)
      : data.restGauge,
    restGaugeConsumedByHarvest: false,
  }
}

/**
 * '공명비약' 사용 시 발생하는 처리. 공명비약은 컨텐츠를 재활성화하는 아이템이므로
 * (오늘 수확 완료 상태에서만 사용 가능) 휴식 게이지는 건드리지 않고 체크박스만 초기화한다.
 */
export function resetKurzanFrontlineWithResonancePotion(
  data: KurzanFrontlineSummary,
): KurzanFrontlineSummary {
  return {
    ...data,
    isHarvested: false,
    restGaugeConsumedByHarvest: false,
  }
}
