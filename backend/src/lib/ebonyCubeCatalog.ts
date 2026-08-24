import contentStagesData from '../data/contentStages.json' with { type: 'json' }
import ebonyCubeRewardsData from '../data/ebonyCubeRewards.json' with { type: 'json' }

export const TICKET_TYPES = ['unlock1', 'unlock2', 'unlock3', 'unlock4'] as const
export type TicketType = (typeof TICKET_TYPES)[number]

interface TicketTierDefinition {
  ticketType: TicketType
  label: string
  gemstoneReward: number
}

// workspace/frontend/src/data/ebonyCubeRewards.json을 그대로 옮긴 참조 데이터.
export const TICKET_TIERS = ebonyCubeRewardsData.tiers as TicketTierDefinition[]

export function findTicketTier(ticketType: string): TicketTierDefinition | null {
  return TICKET_TIERS.find((tier) => tier.ticketType === ticketType) ?? null
}

interface KurzanStageWithTicketType {
  name: string
  ticketType?: TicketType
}

// contentStages.json의 kurzanFrontline.stages[].ticketType을 그대로 읽는다 — 큐브 등급은
// 전적으로 쿠르잔 목표에 의해 결정되며, 이 매핑은 아이템 레벨 구간으로 "가장 높은 가능 목표"를
// 추론하는 방식(할의 모래시계 레벨 산정과 동일한 패턴)이 아니라 target_name별 직접 매핑표다
// (docs/ebony_cube_hal_hourglass.typ "쿠르잔 전선 위젯 변경" 참고).
const KURZAN_TICKET_TYPE_BY_TARGET_NAME: Record<string, TicketType> = Object.fromEntries(
  (contentStagesData.kurzanFrontline.stages as KurzanStageWithTicketType[])
    .filter((stage): stage is KurzanStageWithTicketType & { ticketType: TicketType } => stage.ticketType !== undefined)
    .map((stage) => [stage.name, stage.ticketType]),
)

/**
 * 쿠르잔 전선의 현재 target_name(=쿠르잔 위젯 목표)이 어느 큐브 티켓 등급에 대응하는지 찾는다.
 * 이 서비스는 아직 카오스 던전 위젯이 없어 target_name이 카오스 던전·혼돈의 균열 스테이지일
 * 수도 있다 — 그런 경우 매핑표에 없으므로 null을 반환한다(호출부가 409로 거부).
 */
export function ticketTypeForKurzanTarget(targetName: string): TicketType | null {
  return KURZAN_TICKET_TYPE_BY_TARGET_NAME[targetName] ?? null
}

/** Ebony_Cubes 행에서 등급별 티켓 보유 수량을 읽기 위한 명시적 매핑 (등급 4종 고정 원칙). */
export function ticketCountByType(ebonyCube: {
  ticketCountUnlock1: number
  ticketCountUnlock2: number
  ticketCountUnlock3: number
  ticketCountUnlock4: number
}): Record<TicketType, number> {
  return {
    unlock1: ebonyCube.ticketCountUnlock1,
    unlock2: ebonyCube.ticketCountUnlock2,
    unlock3: ebonyCube.ticketCountUnlock3,
    unlock4: ebonyCube.ticketCountUnlock4,
  }
}

/** ticketType에 대응하는 Ebony_Cubes 컬럼(Prisma 필드) 이름. */
export function ticketColumnField(
  ticketType: TicketType,
): 'ticketCountUnlock1' | 'ticketCountUnlock2' | 'ticketCountUnlock3' | 'ticketCountUnlock4' {
  switch (ticketType) {
    case 'unlock1':
      return 'ticketCountUnlock1'
    case 'unlock2':
      return 'ticketCountUnlock2'
    case 'unlock3':
      return 'ticketCountUnlock3'
    case 'unlock4':
      return 'ticketCountUnlock4'
  }
}

/** 수량이 1개 이상인 등급만, unlock1~unlock4 고정 순서로 반환한다 (화살표 순환 대상). */
export function availableTicketTypes(counts: Record<TicketType, number>): TicketType[] {
  return TICKET_TYPES.filter((ticketType) => counts[ticketType] > 0)
}

/**
 * 좌우 화살표 선택. 순환(wrap-around)하지 않는다 — 마지막 항목에서 다음을 누르거나 첫 항목에서
 * 이전을 누르면 그대로 멈춘다. 현재 선택이 available 목록에 없으면(예: 방금 0이 됨) next는
 * 목록의 첫 번째, prev는 마지막을 반환해 "가장 가까운 유효한 값"으로 수렴시킨다. available이
 * 비어있으면 null(선택 불가).
 */
export function cycleTicketType(
  available: TicketType[],
  current: TicketType | null,
  direction: 'prev' | 'next',
): TicketType | null {
  if (available.length === 0) return null
  const currentIndex = current ? available.indexOf(current) : -1
  if (currentIndex === -1) {
    return direction === 'next' ? available[0]! : available[available.length - 1]!
  }
  const delta = direction === 'next' ? 1 : -1
  const nextIndex = Math.min(Math.max(currentIndex + delta, 0), available.length - 1)
  return available[nextIndex]!
}

/**
 * "보유 티켓이 하나도 없으면 selected_ticket_type은 null, 하나라도 있으면 수량이 남은 등급을
 * 가리켜야 한다"는 불변식(docs/db_schema.typ의 Ebony_Cubes 참고)을 티켓 수량이 바뀔 때마다
 * 유지한다. 현재 선택이 여전히 유효하면(수량 > 0) 그대로 두고, 무효화됐으면(null이었거나
 * 방금 0이 됨) 이번에 수량이 바뀐 등급을 우선 후보로, 그마저 0이면 unlock1~4 순서로 가장 먼저
 * 남아있는 등급을 고른다.
 */
export function ensureValidSelection(
  counts: Record<TicketType, number>,
  current: TicketType | null,
  justChanged: TicketType,
): TicketType | null {
  if (current && counts[current] > 0) return current
  if (counts[justChanged] > 0) return justChanged
  return availableTicketTypes(counts)[0] ?? null
}
