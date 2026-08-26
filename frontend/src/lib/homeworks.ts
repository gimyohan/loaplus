import { apiFetch } from '@/lib/api'
import { fetchLogs, rollbackLog } from '@/lib/logs'
import type { EbonyCubeSummary, TicketType } from '@/types/ebonyCube'
import type { GuardianSummary } from '@/types/guardian'
import type { HalHourglassSummary } from '@/types/halHourglass'
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
  ebonyCube: EbonyCubeSummary
  halHourglass: HalHourglassSummary
}

// 카드 하나에 배치된 가디언/쿠르잔 전선/낙원/에브니 큐브/할의 모래시계 위젯이 마운트 시
// 각자 독립적으로 fetchHomeworks(characterId)를 호출한다(WidgetVisual.tsx). 이 호출들은
// 전부 같은 characterId·같은 엔드포인트를 부르므로 두 겹으로 합친다:
// 1) 진행 중인 요청은 Promise를 공유해 실제 HTTP 호출을 1번으로 합친다.
// 2) 막 받아온 응답은 아주 짧게(HOMEWORKS_CACHE_TTL_MS) 캐시해둔다 — 위젯들의 useEffect가
//    같은 타이밍에 실행되지 않고 몇 ms 어긋나게 스케줄되는 경우(React StrictMode의 개발 모드
//    2회 실행 포함)까지 흡수하기 위함이다. 값이 바뀌었을 수 있는 시점(체크박스 해제 등 로그
//    롤백 뒤 재조회)에는 `force: true`로 이 캐시를 건너뛰어 항상 서버에서 새로 받아온다.
const HOMEWORKS_CACHE_TTL_MS = 300

const inFlightHomeworks = new Map<string, Promise<Homeworks>>()
const resolvedHomeworksCache = new Map<string, { data: Homeworks; expiresAt: number }>()

export function fetchHomeworks(
  characterId: string,
  options?: { force?: boolean },
): Promise<Homeworks> {
  if (!options?.force) {
    const cached = resolvedHomeworksCache.get(characterId)
    if (cached && cached.expiresAt > Date.now()) {
      return Promise.resolve(cached.data)
    }

    const existing = inFlightHomeworks.get(characterId)
    if (existing) return existing
  }

  const promise = apiFetch<{
    guardian: HomeworkSummaryDto
    kurzan: HomeworkSummaryDto
    paradise: ParadiseSummary
    ebonyCube: EbonyCubeSummary
    halHourglass: HalHourglassSummary
  }>(`/api/characters/${characterId}/homeworks`)
    .then((data) => {
      const result: Homeworks = {
        guardian: toSummary(data.guardian),
        kurzan: toSummary(data.kurzan),
        paradise: data.paradise,
        ebonyCube: data.ebonyCube,
        halHourglass: data.halHourglass,
      }
      resolvedHomeworksCache.set(characterId, {
        data: result,
        expiresAt: Date.now() + HOMEWORKS_CACHE_TTL_MS,
      })
      return result
    })
    .finally(() => {
      inFlightHomeworks.delete(characterId)
    })

  inFlightHomeworks.set(characterId, promise)
  return promise
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
 * 체크박스 해제(가디언/쿠르잔 '오늘 수확', 할의 모래시계 '주간 완료'). 전용 엔드포인트 대신
 * 로그 롤백(`DELETE /api/logs/{logId}`)을 재사용한다 — 지금 체크된 상태를 만든 가장 최근 로그를
 * 찾아 그대로 되돌린다(게이지/스택 원복 + 로그 삭제, docs/api.typ 참고). 되돌릴 로그를 못 찾으면
 * (예: 로그 보관 한도 초과로 이미 삭제됨) 에러를 던진다.
 */
async function undoLatestHarvest(
  characterId: string,
  actionType: 'HARVEST_GUARDIAN' | 'HARVEST_KURZAN' | 'HAL_HOURGLASS_COMPLETE',
): Promise<void> {
  const logs = await fetchLogs({ characterId, limit: LOG_LOOKUP_LIMIT })
  const target = logs.find((log) => log.actionType === actionType)
  if (!target) {
    throw new Error('되돌릴 완료 기록을 찾을 수 없습니다')
  }
  await rollbackLog(target.id)
}

export async function undoGuardianHarvest(characterId: string): Promise<void> {
  await undoLatestHarvest(characterId, 'HARVEST_GUARDIAN')
}

export async function undoKurzanHarvest(characterId: string): Promise<void> {
  await undoLatestHarvest(characterId, 'HARVEST_KURZAN')
}

export async function undoHalHourglassComplete(characterId: string): Promise<void> {
  await undoLatestHarvest(characterId, 'HAL_HOURGLASS_COMPLETE')
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

/**
 * 쿠르잔 전선 위젯의 입장권 표시 영역 클릭. 현재 target_name에 대응하는 에브니 큐브 등급의 보유
 * 수량이 1 늘어난다 — '오늘 수확' 여부와 무관하게 언제든 누를 수 있고 로그를 남기지 않는다
 * (docs/ebony_cube_hal_hourglass.typ 참고). 목표가 카오스 던전/혼돈의 균열 단계라 매핑표에 없으면
 * 서버가 409 ticket_not_available_for_target을 던진다.
 */
export async function collectKurzanTicket(characterId: string): Promise<EbonyCubeSummary> {
  return apiFetch<EbonyCubeSummary>(`/api/characters/${characterId}/kurzan/ticket/collect`, {
    method: 'POST',
  })
}

/** 좌우 화살표로 큐브 목표 등급을 순환 선택한다(수량이 남은 등급만 대상). */
export async function cycleEbonyCubeTarget(
  characterId: string,
  direction: 'prev' | 'next',
): Promise<EbonyCubeSummary> {
  return apiFetch<EbonyCubeSummary>(`/api/characters/${characterId}/ebony-cube/target`, {
    method: 'PATCH',
    body: JSON.stringify({ direction }),
  })
}

/** '1회 클리어'/'3회 클리어' 버튼. 선택된 등급의 입장권을 times개 소모하고 4티어 보석 보상을 지급한다. */
export async function clearEbonyCube(
  characterId: string,
  times: 1 | 3,
  description?: string,
): Promise<EbonyCubeSummary> {
  return apiFetch<EbonyCubeSummary>(`/api/characters/${characterId}/ebony-cube/clear`, {
    method: 'POST',
    body: JSON.stringify({ times, description }),
  })
}

/** 설정 모달의 등급별 입장권 수량 조절(delta). 보상 없는 단순 상태 조정이라 로그를 남기지 않는다. */
export async function adjustEbonyCubeTicket(
  characterId: string,
  ticketType: TicketType,
  delta: number,
): Promise<EbonyCubeSummary> {
  return apiFetch<EbonyCubeSummary>(`/api/characters/${characterId}/ebony-cube/tickets/${ticketType}`, {
    method: 'PATCH',
    body: JSON.stringify({ delta }),
  })
}

/** 시련의 모래 획득 클릭. 스택 +1(최대 5, 이미 5면 그대로). 로그를 남기지 않는다. */
export async function collectHalHourglassSand(characterId: string): Promise<HalHourglassSummary> {
  return apiFetch<HalHourglassSummary>(`/api/characters/${characterId}/hal-hourglass/sand/collect`, {
    method: 'POST',
  })
}

/** 주간 완료 체크박스. 현재 스택 N에 따라 (N+1)배 보상을 지급하고 스택을 0으로 소진한다. */
export async function completeHalHourglass(
  characterId: string,
  description?: string,
): Promise<HalHourglassSummary> {
  return apiFetch<HalHourglassSummary>(`/api/characters/${characterId}/hal-hourglass/complete`, {
    method: 'POST',
    body: JSON.stringify({ description }),
  })
}

/** 설정 모달의 시련의 모래 스택 수동 조절(delta). 보상 없는 단순 상태 조정이라 로그를 남기지 않는다. */
export async function adjustHalHourglassSand(characterId: string, delta: number): Promise<HalHourglassSummary> {
  return apiFetch<HalHourglassSummary>(`/api/characters/${characterId}/hal-hourglass/sand`, {
    method: 'PATCH',
    body: JSON.stringify({ delta }),
  })
}
