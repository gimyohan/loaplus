import contentStagesData from '@/data/contentStages.json'
import ebonyCubeRewardsData from '@/data/ebonyCubeRewards.json'
import type { TicketType } from '@/types/ebonyCube'

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

interface KurzanStageWithTicketType {
  name: string
  ticketType?: string
}

const KURZAN_TICKET_TYPE_BY_TARGET_NAME: Record<string, string> = Object.fromEntries(
  (contentStagesData.kurzanFrontline.stages as KurzanStageWithTicketType[])
    .filter((stage): stage is KurzanStageWithTicketType & { ticketType: string } => stage.ticketType !== undefined)
    .map((stage) => [stage.name, stage.ticketType]),
)

const TICKET_TIER_LABEL_BY_TYPE: Record<string, string> = Object.fromEntries(
  ebonyCubeRewardsData.tiers.map((tier) => [tier.ticketType, tier.label]),
)

/**
 * 쿠르잔 전선의 targetName에 대응하는 큐브 티켓 등급 라벨(예: "제 1 해금")을 찾는다. 매핑이
 * 없으면(카오스 던전/혼돈의 균열/알 수 없는 이름) null — workspace/backend/src/lib/
 * ebonyCubeCatalog.ts의 ticketTypeForKurzanTarget과 동일 판정이며, 여기서는 획득 토스트
 * 문구를 만드는 용도로만 쓴다(실제 적립은 서버가 최종 결정).
 */
/** 쿠르잔 전선 targetName에 대응하는 에브니 큐브 입장권 종류(예: "unlock1"). 매핑이 없으면 null. */
export function kurzanTicketType(targetName: string): TicketType | null {
  return (KURZAN_TICKET_TYPE_BY_TARGET_NAME[targetName] as TicketType | undefined) ?? null
}

export function kurzanTicketTierLabel(targetName: string): string | null {
  const ticketType = KURZAN_TICKET_TYPE_BY_TARGET_NAME[targetName]
  if (!ticketType) return null
  return TICKET_TIER_LABEL_BY_TYPE[ticketType] ?? null
}
