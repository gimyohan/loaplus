import contentStagesData from '../data/contentStages.json' with { type: 'json' }
import guardianRaidTargetsData from '../data/guardianRaidTargets.json' with { type: 'json' }

// workspace/frontend/src/data/guardianRaidTargets.json, contentStages.json을 그대로 옮긴 참조
// 데이터. 프론트에서 목록이 바뀌면 이쪽도 함께 갱신해야 한다.
export const GUARDIAN_RAID_TARGETS = guardianRaidTargetsData.targets

// 카오스 던전 - 쿠르잔 전선 - 혼돈의 균열은 아이템 레벨 구간별로 이름만 다른 동일한 계열의
// 컨텐츠라, 쿠르잔 전선 위젯의 자동 목표 산정에는 세 구간을 하나로 이어붙인 전체 진행표를 쓴다
// (workspace/frontend/src/types/contentStages.ts 참고).
export const KURZAN_FRONTLINE_STAGES = [
  ...contentStagesData.chaosDungeon.stages,
  ...contentStagesData.kurzanFrontline.stages,
  ...contentStagesData.chaosRift.stages,
]

/**
 * 캐릭터의 현재 아이템 레벨로 입장 가능한 목표 중 가장 높은 것을 고른다.
 * 입장 가능한 목표가 하나도 없으면(레벨이 최소 요구치에도 못 미치면) 목록에서 가장 낮은
 * 요구 레벨의 목표를 대신 반환한다 — target_name을 항상 비어있지 않게 유지하기 위함이며,
 * 유저는 설정 모달에서 언제든 직접 다른 대상으로 바꿀 수 있다.
 */
export function pickHighestEligibleTarget(
  options: { name: string; minItemLevel: number }[],
  itemLevel: number,
): string {
  const sorted = [...options].sort((a, b) => a.minItemLevel - b.minItemLevel)
  const eligible = sorted.filter((option) => option.minItemLevel <= itemLevel)
  if (eligible.length > 0) {
    return eligible[eligible.length - 1]!.name
  }
  return sorted[0]!.name
}
