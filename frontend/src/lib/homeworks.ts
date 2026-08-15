import { apiFetch } from '@/lib/api'
import { fetchLogs, rollbackLog } from '@/lib/logs'
import type { GuardianSummary } from '@/types/guardian'
import type { KurzanFrontlineSummary } from '@/types/kurzanFrontline'
import type { ParadiseSummary } from '@/types/paradise'

const LOG_LOOKUP_LIMIT = 100

interface HomeworkSummaryDto {
  targetName: string
  restGauge: number
  restGaugeMax: number
  restGaugeThreshold: number
  isHarvested: boolean
  restGaugeConsumedByHarvest: boolean
  /** 자동으로 최고 난이도를 따라가는 중인지 여부. 유저가 대상을 직접 고르면 서버에서 false로 바뀐다. */
  targetAutoManaged: boolean
}

// 프론트 표시엔 targetAutoManaged가 아직 쓰이지 않아 Summary 타입엔 옮기지 않는다.
function toSummary(dto: HomeworkSummaryDto): GuardianSummary {
  return {
    targetName: dto.targetName,
    restGauge: dto.restGauge,
    restGaugeMax: dto.restGaugeMax,
    restGaugeThreshold: dto.restGaugeThreshold,
    isHarvested: dto.isHarvested,
    restGaugeConsumedByHarvest: dto.restGaugeConsumedByHarvest,
  }
}

export interface Homeworks {
  guardian: GuardianSummary
  kurzan: KurzanFrontlineSummary
  paradise: ParadiseSummary
}

export async function fetchHomeworks(characterId: string): Promise<Homeworks> {
  const data = await apiFetch<{
    guardian: HomeworkSummaryDto
    kurzan: HomeworkSummaryDto
    paradise: ParadiseSummary
  }>(`/api/characters/${characterId}/homeworks`)
  return { guardian: toSummary(data.guardian), kurzan: toSummary(data.kurzan), paradise: data.paradise }
}

export async function consumeParadiseTicket(characterId: string): Promise<ParadiseSummary> {
  return apiFetch<ParadiseSummary>(`/api/characters/${characterId}/paradise/ticket/consume`, {
    method: 'POST',
  })
}

export async function consumeParadiseKey(characterId: string): Promise<ParadiseSummary> {
  return apiFetch<ParadiseSummary>(`/api/characters/${characterId}/paradise/key/consume`, {
    method: 'POST',
  })
}

export async function updateParadiseSettings(
  characterId: string,
  input: ParadiseSummary,
): Promise<ParadiseSummary> {
  return apiFetch<ParadiseSummary>(`/api/characters/${characterId}/paradise/settings`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

/** 낙원 귀속골드 획득 기록. 티켓/열쇠 상태는 바뀌지 않고 로그(및 획득 통계)만 남는다. */
export async function recordParadiseGoldReward(characterId: string, amount: number, description?: string): Promise<void> {
  await apiFetch(`/api/characters/${characterId}/paradise/gold-reward`, {
    method: 'POST',
    body: JSON.stringify({ amount, description }),
  })
}

export async function harvestGuardian(characterId: string, description?: string): Promise<GuardianSummary> {
  const data = await apiFetch<HomeworkSummaryDto>(`/api/characters/${characterId}/guardian/harvest`, {
    method: 'POST',
    body: JSON.stringify({ description }),
  })
  return toSummary(data)
}

// 가디언은 공명의 비약에 해당하는 아이템이 없어(docs/api.typ 참고) /guardian/reset을 호출하는
// 프론트 UI가 없다. 백엔드엔 쿠르잔과의 구조적 대칭을 위해 남아있지만, 여기선 wrapper를 두지 않는다.

/**
 * '오늘 수확' 체크박스 해제. 전용 엔드포인트 대신 로그 롤백(`DELETE /api/logs/{logId}`)을
 * 재사용한다 — 지금 체크된 상태를 만든 가장 최근 HARVEST_* 로그를 찾아 그대로 되돌린다
 * (게이지 원복 + 로그 삭제). 공명의 비약과 달리 "없던 일"로 만드는 동작이다 (docs/api.typ 참고).
 * 되돌릴 로그를 못 찾으면(예: 로그 보관 한도 초과로 이미 삭제됨) 에러를 던진다.
 */
async function undoLatestHarvest(
  characterId: string,
  actionType: 'HARVEST_GUARDIAN' | 'HARVEST_KURZAN',
): Promise<void> {
  const logs = await fetchLogs({ characterId, limit: LOG_LOOKUP_LIMIT })
  const target = logs.find((log) => log.actionType === actionType)
  if (!target) {
    throw new Error('되돌릴 수확 기록을 찾을 수 없습니다')
  }
  await rollbackLog(target.id)
}

export async function undoGuardianHarvest(characterId: string): Promise<void> {
  await undoLatestHarvest(characterId, 'HARVEST_GUARDIAN')
}

export async function undoKurzanHarvest(characterId: string): Promise<void> {
  await undoLatestHarvest(characterId, 'HARVEST_KURZAN')
}

export async function updateGuardianTarget(
  characterId: string,
  input: { targetName: string; restGauge: number; restGaugeThreshold: number },
): Promise<GuardianSummary> {
  const data = await apiFetch<HomeworkSummaryDto>(`/api/characters/${characterId}/guardian/target`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  return toSummary(data)
}

export async function harvestKurzan(characterId: string, description?: string): Promise<KurzanFrontlineSummary> {
  const data = await apiFetch<HomeworkSummaryDto>(`/api/characters/${characterId}/kurzan/harvest`, {
    method: 'POST',
    body: JSON.stringify({ description }),
  })
  return toSummary(data)
}

/** 공명의 비약 사용 시 호출한다. 체크박스 해제와는 다른 동작이며, 게이지는 건드리지 않고 완료 여부만 초기화한다. */
export async function resetKurzan(characterId: string): Promise<KurzanFrontlineSummary> {
  const data = await apiFetch<HomeworkSummaryDto>(`/api/characters/${characterId}/kurzan/reset`, {
    method: 'POST',
  })
  return toSummary(data)
}

/** 편린 보상 확정. 가디언 상태는 바뀌지 않고 로그(및 획득 통계)만 남는다. */
export async function claimGuardianShardReward(characterId: string, itemId: string, description?: string): Promise<void> {
  await apiFetch(`/api/characters/${characterId}/guardian/shard-reward`, {
    method: 'POST',
    body: JSON.stringify({ itemId, description }),
  })
}

/** 아제나 축복 보상 확정. 가디언 상태는 바뀌지 않고 로그(및 획득 통계)만 남는다. */
export async function claimGuardianAzenaBlessingReward(characterId: string, itemId: string, description?: string): Promise<void> {
  await apiFetch(`/api/characters/${characterId}/guardian/azena-blessing-reward`, {
    method: 'POST',
    body: JSON.stringify({ itemId, description }),
  })
}

/** 편린 보상 확정. 쿠르잔 상태는 바뀌지 않고 로그(및 획득 통계)만 남는다. */
export async function claimKurzanShardReward(characterId: string, itemId: string, description?: string): Promise<void> {
  await apiFetch(`/api/characters/${characterId}/kurzan/shard-reward`, {
    method: 'POST',
    body: JSON.stringify({ itemId, description }),
  })
}

/** 아제나 축복 보상 확정. 쿠르잔 상태는 바뀌지 않고 로그(및 획득 통계)만 남는다. */
export async function claimKurzanAzenaBlessingReward(characterId: string, itemId: string, description?: string): Promise<void> {
  await apiFetch(`/api/characters/${characterId}/kurzan/azena-blessing-reward`, {
    method: 'POST',
    body: JSON.stringify({ itemId, description }),
  })
}

export async function updateKurzanTarget(
  characterId: string,
  input: { restGauge: number; restGaugeThreshold: number },
): Promise<KurzanFrontlineSummary> {
  const data = await apiFetch<HomeworkSummaryDto>(`/api/characters/${characterId}/kurzan/target`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  return toSummary(data)
}
