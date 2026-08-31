import { apiFetch } from '@/lib/api'

/** Character_Statistics/Character_Statistics_Weekly 공용 필드(docs/statistics.typ 참고). */
export interface StatFields {
  totalGoldEarned: number
  totalBoundGoldEarned: number
  raidGoldEarned: number
  raidBoundGoldEarned: number
  shardGoldEarned: number
  shardBoundGoldEarned: number
  azenaBlessingGoldEarned: number
  azenaBlessingBoundGoldEarned: number
  paradiseGoldEarned: number
  paradiseBoundGoldEarned: number
  otherGoldEarned: number
  otherBoundGoldEarned: number
  guardianHarvestCount: number
  kurzanHarvestCount: number
  shardRewardCount: number
  guardianShardRewardCount: number
  kurzanShardRewardCount: number
  azenaBlessingRewardCount: number
  guardianAzenaBlessingRewardCount: number
  kurzanAzenaBlessingRewardCount: number
  /** 에브니 큐브 클리어·할의 모래시계 완료로 누적된 4티어 보석 수량(docs/ebony_cube_hal_hourglass.typ
   * 참고). 골드 카테고리 5종과는 별개 재화라 골드/귀속골드 합산에는 포함되지 않는다. */
  gemstoneTier4Earned: number
}

export interface CharacterStatistics extends StatFields {
  characterId: string
  characterName: string
}

export interface WeeklyStatRow extends StatFields {
  weekStartDate: string
  characterId: string
}

export interface CharacterWeeklyStatRow extends StatFields {
  weekStartDate: string
}

export interface ItemRewardStat {
  itemId: string
  itemName: string
  categoryKey: string
  count: number
  ratio: number
}

export type ItemRewardType = 'SHARD' | 'AZENA_BLESSING'
export type ItemRewardContentType = 'ALL' | 'GUARDIAN' | 'KURZAN'

/** 계정 내 모든 캐릭터의 전체 기간 누적 통계(docs/api.typ 통계 섹션). 로스터 합산은 프론트 책임. */
export async function fetchCharacterStatistics(): Promise<CharacterStatistics[]> {
  return apiFetch<CharacterStatistics[]>('/api/statistics/characters')
}

function toWeeklyQuery(from?: string, to?: string): string {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const query = params.toString()
  return query ? `?${query}` : ''
}

/** 내 캐릭터 전체의 주간 원본 행을 characterId가 태그된 채로 한 번에 나열한다(합산은 프론트 책임). */
export async function fetchAllWeeklyStatistics(from?: string, to?: string): Promise<WeeklyStatRow[]> {
  return apiFetch<WeeklyStatRow[]>(`/api/statistics/weekly${toWeeklyQuery(from, to)}`)
}

/** 특정 캐릭터 한 명의 주간 원본 행. */
export async function fetchCharacterWeeklyStatistics(
  characterId: string,
  from?: string,
  to?: string,
): Promise<CharacterWeeklyStatRow[]> {
  return apiFetch<CharacterWeeklyStatRow[]>(
    `/api/statistics/characters/${characterId}/weekly${toWeeklyQuery(from, to)}`,
  )
}

/** 캐릭터 한 명의 편린/아제나 축복 아이템별 수량·비율(전체 기간, 카테고리는 서버가 합산해 응답). */
export async function fetchCharacterItemRewards(
  characterId: string,
  rewardType: ItemRewardType,
  contentType: ItemRewardContentType = 'ALL',
): Promise<ItemRewardStat[]> {
  const params = new URLSearchParams({ rewardType, contentType })
  return apiFetch<ItemRewardStat[]>(`/api/statistics/characters/${characterId}/item-rewards?${params.toString()}`)
}

export interface OtherIncomeInput {
  goldAmount: number
  boundGoldAmount: number
  /** 필수 — 이 행위는 "무엇을 위한 기록인지" 유저가 직접 남기는 게 유일한 목적이다(docs/api.typ 참고). */
  description: string
}

/** 게임이 자동 집계하지 않는 기타 수입을 유저가 직접 기록한다(docs/statistics.typ "기타 수입 수동 기록"). */
export async function postOtherIncome(characterId: string, input: OtherIncomeInput): Promise<void> {
  await apiFetch(`/api/characters/${characterId}/other-income`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
