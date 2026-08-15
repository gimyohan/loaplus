import { apiFetch } from '@/lib/api'
import { fetchLogs, rollbackLog } from '@/lib/logs'
import type { PlacedWidget } from '@/types/widget'
import type { RaidTargetSummary } from '@/types/raid'

interface RaidTargetDto extends RaidTargetSummary {
  raidId: string
}

/**
 * 레이드 위젯(슬롯) 하나를 생성한다. Character_Raids 행 + Dashboard_Widgets(RAID) 행이 함께 만들어진다.
 * raidKey/difficultyKey를 생략하면 서버가 캐릭터 아이템 레벨 기준으로 자동 추천한다(둘 다 생략해야
 * 하며 하나만 보내면 400) — 위젯을 팔레트에서 드래그해 추가할 때는 목표를 먼저 고르게 하지 않고
 * 일단 추가한 뒤, 톱니바퀴(RaidTargetModal)에서 원하는 목표로 바꾸게 한다.
 */
export async function createRaidWidget(
  characterId: string,
  input: { raidKey?: string; difficultyKey?: string; x: number; y: number; w: number; h: number },
): Promise<PlacedWidget> {
  return apiFetch<PlacedWidget>(`/api/characters/${characterId}/raids`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

/** 레이드 위젯(슬롯) 삭제. Character_Raids 행과 이 슬롯의 RAID_GATE_CLEAR 로그도 함께 정리된다. */
export async function deleteRaidWidget(characterId: string, raidId: string): Promise<void> {
  await apiFetch<void>(`/api/characters/${characterId}/raids/${raidId}`, { method: 'DELETE' })
}

/**
 * 그리드 위치/크기만 변경한다. `PUT /api/dashboards/{characterId}/widgets`(전체 교체)가
 * `kind: "raid"`를 거부하므로(docs/api.typ 참고) 레이드 위젯을 그리드에서 옮기려면 이 엔드포인트를
 * 써야 한다. 목표/관문 진행 상태는 건드리지 않아 완료된 관문이 있어도 제한 없이 옮길 수 있다.
 */
export async function updateRaidPosition(
  characterId: string,
  raidId: string,
  input: { x: number; y: number; w: number; h: number },
): Promise<PlacedWidget> {
  return apiFetch<PlacedWidget>(`/api/characters/${characterId}/raids/${raidId}/position`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

/** 목표 레이드/난이도 변경. 완료된 관문이 하나라도 있으면 서버가 409를 반환한다(docs/api.typ 참고). */
export async function updateRaidTarget(
  characterId: string,
  raidId: string,
  input: { raidKey: string; difficultyKey: string },
): Promise<RaidTargetSummary> {
  return apiFetch<RaidTargetDto>(`/api/characters/${characterId}/raids/${raidId}/target`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

/**
 * gateIndex 관문을 완료 처리한다. 그보다 앞선 미완료 관문도 서버가 함께 완료 처리한다(연쇄).
 * description을 넘기면 이번 요청으로 새로 생기는 로그 전부(연쇄로 완료되는 앞선 관문 포함)에
 * 동일하게 저장된다(docs/api.typ "관문 완료 처리" 참고).
 */
export async function clearRaidGate(
  characterId: string,
  raidId: string,
  gateIndex: number,
  description?: string,
): Promise<RaidTargetSummary | undefined> {
  return apiFetch<RaidTargetDto | undefined>(
    `/api/characters/${characterId}/raids/${raidId}/gates/${gateIndex}/clear`,
    { method: 'POST', body: JSON.stringify({ description }) },
  )
}

/** gateIndex 관문의 '더보기' 토글 값을 변경한다. 완료 여부·보상과 무관한 단순 플래그다. */
export async function setRaidGateMoreReward(
  characterId: string,
  raidId: string,
  gateIndex: number,
  enabled: boolean,
): Promise<RaidTargetSummary> {
  return apiFetch<RaidTargetDto>(
    `/api/characters/${characterId}/raids/${raidId}/gates/${gateIndex}/more-reward`,
    { method: 'PATCH', body: JSON.stringify({ enabled }) },
  )
}

/**
 * gateIndex 관문을 다시 미완료로 되돌린다. 전용 엔드포인트가 없어 로그 롤백을 재사용한다 —
 * 관문마다 로그가 하나씩 분리돼 있어, gateIndex 이상인 RAID_GATE_CLEAR 로그를 모두 찾아
 * 각각 되돌린다(gateIndex보다 늦은 관문도 함께 미완료가 되는 연쇄 규칙, docs/api.typ
 * "관문 미완료 처리" 참고).
 *
 * 정확히 gateIndex 자신의 로그가 없으면(유저당 200개 보관 캡으로 이미 밀려났거나, 애초에 그
 * 관문이 API를 거치지 않고 cleared:true가 된 데이터 불일치 등) 되돌릴 방법이 없다 — 이 경우
 * undoLatestHarvest(가디언/쿠르잔 '오늘 수확' 되돌리기)와 동일하게 명시적으로 에러를 던진다.
 * 여기서 조용히 아무 것도 안 하고 성공한 것처럼 끝내면, 체크박스는 로컬에서 낙관적으로
 * 해제되지만 서버 상태는 그대로라 새로고침하면 다시 체크된 채로 돌아와 "저장이 안 된다"는
 * 혼란을 준다.
 */
export async function undoRaidGateClear(characterId: string, raidId: string, gateIndex: number): Promise<void> {
  const logs = await fetchLogs({ characterId, raidId, limit: 100 })
  const targets = logs.filter(
    (log) => log.actionType === 'RAID_GATE_CLEAR' && (log.gateIndex ?? -1) >= gateIndex,
  )
  if (!targets.some((log) => log.gateIndex === gateIndex)) {
    throw new Error('되돌릴 관문 완료 기록을 찾을 수 없습니다')
  }
  for (const log of targets) {
    await rollbackLog(log.id)
  }
}
