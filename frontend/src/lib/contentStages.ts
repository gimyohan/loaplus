import contentStagesData from '@/data/contentStages.json'

const CHAOS_RIFT_STAGE_NAMES = new Set(contentStagesData.chaosRift.stages.map((stage) => stage.name))

/**
 * 쿠르잔 전선의 현재 목표(targetName)가 혼돈의 균열 구간으로 넘어갔는지 판정한다. 이 구간에서는
 * "티켓" 퀵액션이 에브니 큐브 티켓 대신 시련의 모래를 적립하므로, 위젯에서 버튼 아이콘/라벨을
 * 미리 고르는 데 쓴다(workspace/backend/src/lib/contentTargets.ts의 동명 함수와 동일 판정 —
 * 실제 적립 대상은 서버가 최종 결정한다, docs/ebony_cube_hal_hourglass.typ 참고).
 */
export function isChaosRiftKurzanTarget(targetName: string): boolean {
  return CHAOS_RIFT_STAGE_NAMES.has(targetName)
}
