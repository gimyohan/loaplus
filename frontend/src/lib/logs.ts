import { apiFetch } from '@/lib/api'

export type ActionType =
  | 'HARVEST_GUARDIAN'
  | 'HARVEST_KURZAN'
  | 'GUARDIAN_SHARD_REWARD'
  | 'GUARDIAN_AZENA_BLESSING_REWARD'
  | 'KURZAN_SHARD_REWARD'
  | 'KURZAN_AZENA_BLESSING_REWARD'
  | 'RAID_GATE_CLEAR'
  | 'OTHER_INCOME_MANUAL'
  | 'PARADISE_GOLD_REWARD'

export interface RewardEntry {
  categoryKey: string
  itemId?: string
  itemName: string
  amount: number
}

export interface LogEntry {
  id: string
  characterId: string
  characterName: string
  actionType: ActionType | null
  rewards: RewardEntry[] | null
  /** 로그 목록에서 항목을 구분하도록 돕는 표시용 자유 텍스트. 통계·롤백에는 쓰이지 않는다. */
  description: string | null
  /** RAID_GATE_CLEAR가 아니면 항상 null */
  raidId: string | null
  /** RAID_GATE_CLEAR일 때만 그 로그가 완료 처리한 관문 번호(0부터) */
  gateIndex: number | null
  createdAt: string
}

export interface FetchLogsParams {
  characterId?: string
  /** 특정 레이드 슬롯의 RAID_GATE_CLEAR 로그만 조회(관문 미완료 처리용, docs/api.typ 참고) */
  raidId?: string
  limit?: number
}

export async function fetchLogs(params: FetchLogsParams = {}): Promise<LogEntry[]> {
  const query = new URLSearchParams()
  if (params.characterId) query.set('characterId', params.characterId)
  if (params.raidId) query.set('raidId', params.raidId)
  if (params.limit) query.set('limit', String(params.limit))
  const queryString = query.toString()
  return apiFetch<LogEntry[]>(`/api/logs${queryString ? `?${queryString}` : ''}`)
}

/** 로그를 역연산(롤백)하고 삭제한다 — 캐릭터의 컨텐츠 상태와 보상 통계가 함께 원복된다. */
export async function rollbackLog(logId: string): Promise<void> {
  await apiFetch<void>(`/api/logs/${logId}`, { method: 'DELETE' })
}
