import { Prisma } from '@prisma/client'
import type { ActionLog, ActionType, PrismaClient } from '@prisma/client'

import { ticketColumnField } from './ebonyCubeCatalog.js'
import type { TicketType } from './ebonyCubeCatalog.js'
import { retentionCutoffDate, weekStartDateKey } from './resetLogic.js'

export interface RewardEntry {
  categoryKey: string
  itemId?: string
  itemName: string
  amount: number
}

export interface RaidGateState {
  cleared: boolean
  moreRewardEnabled: boolean
}

type StatisticDelta = Partial<{
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
  guardianShardRewardCount: number
  kurzanShardRewardCount: number
  guardianAzenaBlessingRewardCount: number
  kurzanAzenaBlessingRewardCount: number
  cubeGemEarned: number
}>

interface ItemRewardDelta {
  contentType: 'GUARDIAN' | 'KURZAN'
  rewardType: 'SHARD' | 'AZENA_BLESSING'
  itemId: string
  categoryKey: string
  itemName: string
  count: 1 | -1
}

interface StatisticDeltaResult {
  statDelta: StatisticDelta
  itemRewardDelta: ItemRewardDelta | null
}

/**
 * action_type이 Character_Statistics(및 동일 컬럼 집합의 Character_Statistics_Weekly)의 어느
 * 컬럼을 얼마나 바꾸는지는 여기서 매번 명시적으로 결정한다 — content_type 같은 범용 키로
 * 자동 파생시키지 않는다(docs/db_schema.typ "핵심 설계 철학" 4번 참고). sign은 생성 시 +1,
 * 롤백 시 -1. 편린/아제나 축복 보상은 Character_Item_Reward_Stats도 함께 갱신해야 하므로
 * itemRewardDelta를 별도로 반환한다(docs/db_schema.typ의 Character_Item_Reward_Stats 참고).
 */
function computeStatisticDelta(actionType: ActionType, rewards: RewardEntry[], sign: 1 | -1): StatisticDeltaResult {
  switch (actionType) {
    case 'HARVEST_GUARDIAN':
      return { statDelta: { guardianHarvestCount: sign }, itemRewardDelta: null }
    case 'HARVEST_KURZAN':
      return { statDelta: { kurzanHarvestCount: sign }, itemRewardDelta: null }
    case 'GUARDIAN_SHARD_REWARD':
    case 'KURZAN_SHARD_REWARD': {
      const isGuardian = actionType === 'GUARDIAN_SHARD_REWARD'
      const reward = rewards[0]
      const statDelta: StatisticDelta = {
        ...(isGuardian ? { guardianShardRewardCount: sign } : { kurzanShardRewardCount: sign }),
        ...(reward?.categoryKey === 'gold' ? { shardGoldEarned: sign * reward.amount } : {}),
        ...(reward?.categoryKey === 'boundGold' ? { shardBoundGoldEarned: sign * reward.amount } : {}),
      }
      const itemRewardDelta: ItemRewardDelta | null = reward?.itemId
        ? {
            contentType: isGuardian ? 'GUARDIAN' : 'KURZAN',
            rewardType: 'SHARD',
            itemId: reward.itemId,
            categoryKey: reward.categoryKey,
            itemName: reward.itemName,
            count: sign,
          }
        : null
      return { statDelta, itemRewardDelta }
    }
    case 'GUARDIAN_AZENA_BLESSING_REWARD':
    case 'KURZAN_AZENA_BLESSING_REWARD': {
      const isGuardian = actionType === 'GUARDIAN_AZENA_BLESSING_REWARD'
      const reward = rewards[0]
      const statDelta: StatisticDelta = {
        ...(isGuardian ? { guardianAzenaBlessingRewardCount: sign } : { kurzanAzenaBlessingRewardCount: sign }),
        ...(reward?.categoryKey === 'gold' ? { azenaBlessingGoldEarned: sign * reward.amount } : {}),
        ...(reward?.categoryKey === 'boundGold' ? { azenaBlessingBoundGoldEarned: sign * reward.amount } : {}),
      }
      const itemRewardDelta: ItemRewardDelta | null = reward?.itemId
        ? {
            contentType: isGuardian ? 'GUARDIAN' : 'KURZAN',
            rewardType: 'AZENA_BLESSING',
            itemId: reward.itemId,
            categoryKey: reward.categoryKey,
            itemName: reward.itemName,
            count: sign,
          }
        : null
      return { statDelta, itemRewardDelta }
    }
    case 'RAID_GATE_CLEAR': {
      // '더보기'는 관문 완료와 독립적인 별개 플래그라 여기 보상 계산에는 관여하지 않는다
      // (docs/widgets.typ "레이드" 참고). 관문 하나가 골드+귀속골드를 동시에 줄 수 있다.
      const goldAmount = rewards.find((reward) => reward.categoryKey === 'gold')?.amount ?? 0
      const boundGoldAmount = rewards.find((reward) => reward.categoryKey === 'boundGold')?.amount ?? 0
      return {
        statDelta: {
          ...(goldAmount !== 0 ? { raidGoldEarned: sign * goldAmount } : {}),
          ...(boundGoldAmount !== 0 ? { raidBoundGoldEarned: sign * boundGoldAmount } : {}),
        },
        itemRewardDelta: null,
      }
    }
    case 'OTHER_INCOME_MANUAL': {
      const goldAmount = rewards.find((reward) => reward.categoryKey === 'gold')?.amount ?? 0
      const boundGoldAmount = rewards.find((reward) => reward.categoryKey === 'boundGold')?.amount ?? 0
      return {
        statDelta: {
          ...(goldAmount !== 0 ? { otherGoldEarned: sign * goldAmount } : {}),
          ...(boundGoldAmount !== 0 ? { otherBoundGoldEarned: sign * boundGoldAmount } : {}),
        },
        itemRewardDelta: null,
      }
    }
    case 'PARADISE_GOLD_REWARD': {
      // 낙원은 귀속골드만 지급한다 — gold 카테고리 보상은 이 액션에서 발생하지 않는다
      // (docs/statistics.typ "골드 획득 카테고리" 참고).
      const boundGoldAmount = rewards.find((reward) => reward.categoryKey === 'boundGold')?.amount ?? 0
      return {
        statDelta: boundGoldAmount !== 0 ? { paradiseBoundGoldEarned: sign * boundGoldAmount } : {},
        itemRewardDelta: null,
      }
    }
    case 'EBONY_CUBE_CLEAR': {
      const gemstoneAmount = rewards.find((reward) => reward.categoryKey === 'gemstone')?.amount ?? 0
      return {
        statDelta: gemstoneAmount !== 0 ? { cubeGemEarned: sign * gemstoneAmount } : {},
        itemRewardDelta: null,
      }
    }
    // 할의 모래시계 완료는 Character_Statistics 갱신표(docs/db_schema.typ)에 대상 컬럼이 없다 —
    // 보상은 로그에만 기록되고 누적 통계에는 반영되지 않는다(확정). 스택 수동 조절
    // (PATCH .../hal-hourglass/sand)은 보상을 지급하지 않는 단순 상태 조정이라 애초에 로그를
    // 남기지 않으므로 이 스위치에 해당 case가 없다.
    case 'HAL_HOURGLASS_COMPLETE':
      return { statDelta: {}, itemRewardDelta: null }
  }
}

function toIncrementUpdateData(delta: StatisticDelta) {
  return Object.fromEntries(Object.entries(delta).map(([column, value]) => [column, { increment: value }]))
}

/**
 * Character_Statistics(전체 기간) + Character_Statistics_Weekly(그 행위가 일어난 시각이 속한
 * 주)를 같은 델타로 함께 upsert한다. 그 뒤 이 캐릭터의 90일 초과 주간/아이템 통계 행을 같은
 * 트랜잭션 안에서 하드 삭제한다 — 별도 배치 없는 "쓰기 시점 트림"(docs/statistics.typ "3개월
 * 리텐션 정책" 참고). `at`은 생성 시에는 로그 생성 시각, 롤백 시에는 원본 로그의 created_at을
 * 받는다(롤백은 항상 원래 행위가 적립됐던 주를 다시 찾아 역연산 — docs/statistics.typ "주간
 * 경계 정의" 참고). 리텐션 컷오프 자체는 항상 실제 현재 시각 기준이다.
 */
async function applyStatisticDelta(
  tx: Prisma.TransactionClient,
  characterId: string,
  statDelta: StatisticDelta,
  at: Date,
) {
  if (Object.keys(statDelta).length === 0) return

  await tx.characterStatistic.upsert({
    where: { characterId },
    create: { characterId, ...statDelta },
    update: toIncrementUpdateData(statDelta),
  })

  const weekStartDate = weekStartDateKey(at)
  await tx.characterStatisticWeekly.upsert({
    where: { characterId_weekStartDate: { characterId, weekStartDate } },
    create: { characterId, weekStartDate, ...statDelta },
    update: toIncrementUpdateData(statDelta),
  })

  const cutoff = retentionCutoffDate(new Date())
  // character_id는 uuid 컬럼이라, 캐스팅 없이 바인딩하면 Prisma가 text로 보내 "uuid = text"
  // 연산자 부재 에러가 난다 — 타입 지정 쿼리 빌더(findMany 등)와 달리 raw 쿼리는 컬럼의 네이티브
  // 타입을 자동으로 알지 못하므로 명시적으로 캐스팅한다.
  await tx.$executeRaw`
    DELETE FROM character_statistics_weekly
    WHERE character_id = ${characterId}::uuid AND week_start_date < ${cutoff}
  `
  await tx.$executeRaw`
    DELETE FROM character_item_reward_stats
    WHERE character_id = ${characterId}::uuid AND week_start_date < ${cutoff}
  `
}

/**
 * Character_Item_Reward_Stats의 (캐릭터, 주, 컨텐츠, 보상 종류, 아이템) 행을 count +1(생성)
 * 또는 -1(롤백)한다. 롤백 대상 행이 리텐션 트림으로 이미 지워졌다면(90일 초과) 조용히
 * 건너뛴다 — 그 시점엔 이미 통계에서 빠진 값이라 되돌릴 것이 없다.
 */
async function applyItemRewardDelta(
  tx: Prisma.TransactionClient,
  characterId: string,
  delta: ItemRewardDelta,
  at: Date,
) {
  const weekStartDate = weekStartDateKey(at)
  const where = {
    characterId_weekStartDate_contentType_rewardType_itemId: {
      characterId,
      weekStartDate,
      contentType: delta.contentType,
      rewardType: delta.rewardType,
      itemId: delta.itemId,
    },
  }

  if (delta.count > 0) {
    await tx.characterItemRewardStat.upsert({
      where,
      create: {
        characterId,
        weekStartDate,
        contentType: delta.contentType,
        rewardType: delta.rewardType,
        itemId: delta.itemId,
        categoryKey: delta.categoryKey,
        itemName: delta.itemName,
        count: 1,
      },
      update: { count: { increment: 1 }, categoryKey: delta.categoryKey, itemName: delta.itemName },
    })
    return
  }

  const existing = await tx.characterItemRewardStat.findUnique({ where })
  if (!existing) return
  if (existing.count <= 1) {
    await tx.characterItemRewardStat.delete({ where })
  } else {
    await tx.characterItemRewardStat.update({ where, data: { count: { decrement: 1 } } })
  }
}

// Action_Logs는 "최근 행위 취소" 전용이지 무제한 이력 보관용이 아니다 — 유저당 이 개수를
// 넘는 오래된 로그는 새 로그가 생길 때마다 즉시 하드 삭제한다 (docs/db_schema.typ "유저당
// 보관 개수 캡" 참고).
const ACTION_LOG_CAP_PER_USER = 200

/**
 * created_at 기준 최신 ACTION_LOG_CAP_PER_USER개만 남기고 나머지를 삭제한다. 한 트랜잭션에서
 * 로그가 여러 건(레이드 관문 연쇄 완료 등) 생성돼도 마지막에 한 번만 호출하면 된다 — NOT IN
 * 서브쿼리가 그 시점의 전체 개수를 기준으로 트림하므로 몇 건이 새로 생겼는지 셀 필요가 없다.
 */
export function enforceActionLogCap(client: Pick<PrismaClient, '$executeRaw'>, userId: string) {
  // user_id는 uuid 컬럼이라 명시적으로 캐스팅한다 (위 applyStatisticDelta의 raw 쿼리와 동일한 이유).
  return client.$executeRaw`
    DELETE FROM action_logs
    WHERE user_id = ${userId}::uuid
      AND id NOT IN (
        SELECT id FROM action_logs
        WHERE user_id = ${userId}::uuid
        ORDER BY created_at DESC
        LIMIT ${ACTION_LOG_CAP_PER_USER}
      )
  `
}

/**
 * '오늘 수확' 상태 갱신 + 로그 생성 + 통계 갱신을 하나의 인터랙티브 트랜잭션으로 묶는다.
 * Character_Statistics_Weekly upsert와 리텐션 트림이 여러 단계로 이루어져 배열 스타일
 * $transaction으로는 표현할 수 없으므로, homeworks.ts가 이 함수 전체를
 * fastify.prisma.$transaction(async (tx) => ...) 안에서 호출한다.
 */
export async function applyHarvestStatistics(
  tx: Prisma.TransactionClient,
  characterId: string,
  actionType: 'HARVEST_GUARDIAN' | 'HARVEST_KURZAN',
  at: Date,
) {
  const { statDelta } = computeStatisticDelta(actionType, [], 1)
  await applyStatisticDelta(tx, characterId, statDelta, at)
}

export function toLogEntry(log: ActionLog & { character: { characterName: string } }) {
  const isRaidGateClear = log.actionType === 'RAID_GATE_CLEAR'
  const revertParams = isRaidGateClear
    ? (log.revertParams as { raidId: string; gateIndex: number } | null)
    : null
  return {
    id: log.id,
    characterId: log.characterId,
    characterName: log.character.characterName,
    actionType: log.actionType,
    rewards: log.rewards as RewardEntry[] | null,
    description: log.description,
    raidId: revertParams?.raidId ?? null,
    gateIndex: revertParams?.gateIndex ?? null,
    createdAt: log.createdAt,
  }
}

/**
 * docs/db_schema.typ의 Action_Logs 롤백 프로세스(①상태 역연산 → ②Character_Statistics(+주간
 * +아이템별) 역연산 → ③로그 삭제)를 하나의 트랜잭션으로 수행한다. 호출부에서 로그의
 * 소유권(userId) 확인은 이미 끝났다고 가정한다. 통계 역연산은 항상 로그의 created_at이
 * 속했던 주를 기준으로 한다(docs/statistics.typ "마감/개시" 참고).
 */
export async function revertActionLog(prisma: PrismaClient, log: ActionLog): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // ① revert_params가 있으면 해당 콘텐츠 테이블 상태를 역연산한다.
    if (log.actionType && log.revertParams) {
      if (log.actionType === 'HARVEST_GUARDIAN') {
        const params = log.revertParams as { restGaugeConsumed: number }
        await tx.guardian.update({
          where: { characterId: log.characterId },
          data: {
            isHarvested: false,
            restGaugeConsumedByHarvest: false,
            restGauge: { increment: params.restGaugeConsumed },
          },
        })
      } else if (log.actionType === 'HARVEST_KURZAN') {
        const params = log.revertParams as { restGaugeConsumed: number }
        await tx.kurzanFrontline.update({
          where: { characterId: log.characterId },
          data: {
            isHarvested: false,
            restGaugeConsumedByHarvest: false,
            restGauge: { increment: params.restGaugeConsumed },
          },
        })
      } else if (log.actionType === 'EBONY_CUBE_CLEAR') {
        // 소모한 등급의 티켓 수량만 되돌린다 — 선택 상태(selected_ticket_type)는 건드리지
        // 않는다(docs/ebony_cube_hal_hourglass.typ 참고, 문서에 명시된 롤백 범위는 수량뿐).
        const params = log.revertParams as { ticketType: string; consumedCount: number }
        const column = ticketColumnField(params.ticketType as TicketType)
        await tx.ebonyCube.update({
          where: { characterId: log.characterId },
          data: { [column]: { increment: params.consumedCount } },
        })
      } else if (log.actionType === 'HAL_HOURGLASS_COMPLETE') {
        const params = log.revertParams as { sandStackConsumed: number }
        const current = await tx.halHourglass.findUniqueOrThrow({ where: { characterId: log.characterId } })
        await tx.halHourglass.update({
          where: { characterId: log.characterId },
          data: {
            isCompleted: false,
            sandStack: Math.min(5, Math.max(0, current.sandStack + params.sandStackConsumed)),
          },
        })
      } else if (log.actionType === 'RAID_GATE_CLEAR') {
        // 관문 하나만 콕 집어 미완료로 되돌린다 — 그 뒤(더 늦은 순서) 관문을 함께 되돌리는 건
        // FE가 관문별로 분리된 로그를 여러 번 호출해서 처리한다(docs/api.typ "관문 미완료 처리" 참고).
        const params = log.revertParams as { raidId: string; gateIndex: number }
        const raid = await tx.characterRaid.findUniqueOrThrow({ where: { id: params.raidId } })
        const gates = raid.gates as unknown as RaidGateState[]
        gates[params.gateIndex] = { ...gates[params.gateIndex], cleared: false }
        await tx.characterRaid.update({
          where: { id: params.raidId },
          data: { gates: gates as unknown as Prisma.InputJsonValue },
        })
      }
    }

    // ② Character_Statistics(+주간+아이템별)를 생성 시와 반대 방향으로 되돌린다.
    if (log.actionType) {
      const rewards = (log.rewards as RewardEntry[] | null) ?? []
      const { statDelta, itemRewardDelta } = computeStatisticDelta(log.actionType, rewards, -1)
      await applyStatisticDelta(tx, log.characterId, statDelta, log.createdAt)
      if (itemRewardDelta) {
        await applyItemRewardDelta(tx, log.characterId, itemRewardDelta, log.createdAt)
      }
    }

    // ③ 로그 자체는 이력을 남기지 않고 하드 삭제한다.
    await tx.actionLog.delete({ where: { id: log.id } })
  })
}

export type ActionLogCreateInput = Prisma.ActionLogUncheckedCreateInput

// gold/boundGold/silver는 카탈로그 이름이 곧 수량("10,000골드")이라, 로그 표시용으로는
// 카테고리 라벨만 남기고 실제 수량은 amount로 일반화한다 — Character_Item_Reward_Stats(아래
// applyItemRewardDelta)는 이 변환 이전의 원본 rewards(구체적인 카탈로그 이름)를 그대로 쓰므로
// "무엇을 얼마나 얻었는지 보여주는 로그 표시"와 "구체적으로 어떤 아이템이 몇 번 나왔는지 세는
// 통계"가 서로 영향을 주지 않는다 (docs/db_schema.typ의 Action_Logs "rewards" 참고).
const GENERIC_REWARD_CATEGORY_LABELS: Record<string, string> = {
  gold: '골드',
  boundGold: '귀속골드',
  silver: '실링',
}

function toDisplayRewards(rewards: RewardEntry[]): RewardEntry[] {
  return rewards.map((reward) => {
    const genericLabel = GENERIC_REWARD_CATEGORY_LABELS[reward.categoryKey]
    return genericLabel ? { ...reward, itemName: genericLabel } : reward
  })
}

/**
 * 편린/아제나 축복처럼 콘텐츠 상태는 건드리지 않고 보상만 확정하는 행위의 로그를 남긴다.
 * revert_params는 되돌릴 상태 컬럼이 없으므로 항상 null이며 (docs/db_schema.typ 참고),
 * Character_Statistics(+주간+아이템별) 컬럼을 함께 갱신한다. `POST .../other-income`
 * (OTHER_INCOME_MANUAL)도 상태 변경이 없는 보상 전용 행위라 이 함수를 그대로 재사용한다
 * (docs/api.typ "기타 수입 수동 기록" 참고). `description`은 호출부(각 라우트)가 요청 바디로
 * 받은 값을 그대로 넘기며, 여기서 action_type별로 다시 계산하지 않는다.
 */
export async function createRewardLog(
  prisma: PrismaClient,
  params: {
    userId: string
    characterId: string
    actionType: ActionType
    rewards: RewardEntry[]
    description?: string
  },
) {
  return prisma.$transaction(async (tx) => {
    const now = new Date()
    const log = await tx.actionLog.create({
      data: {
        userId: params.userId,
        characterId: params.characterId,
        actionType: params.actionType,
        rewards: toDisplayRewards(params.rewards) as unknown as Prisma.InputJsonValue,
        description: params.description ?? null,
        createdAt: now,
      },
      include: { character: { select: { characterName: true } } },
    })

    // 통계(전체 골드 합산 + 아이템별 카운트)는 표시용으로 일반화되기 전의 원본 rewards를 쓴다.
    const { statDelta, itemRewardDelta } = computeStatisticDelta(params.actionType, params.rewards, 1)
    await applyStatisticDelta(tx, params.characterId, statDelta, now)
    if (itemRewardDelta) {
      await applyItemRewardDelta(tx, params.characterId, itemRewardDelta, now)
    }
    await enforceActionLogCap(tx, params.userId)

    return log
  })
}

/**
 * 레이드 관문 하나를 완료 처리한다(POST .../raids/{raidId}/gates/{gateIndex}/clear). 연쇄 완료
 * (앞선 미완료 관문까지 함께 완료)는 이 함수의 책임이 아니다 — 그 계산은 FE가 하고, 필요하면
 * 이 엔드포인트를 관문 순서대로 여러 번 호출한다(docs/widgets.typ "레이드" 참고). 그래야 관문마다
 * Action_Logs 행이 하나씩, 각자의 description으로 정확히 남는다. `description`은 호출부(라우트)가
 * 요청 바디로 받은 값을 그대로 넘기며, 여기서 다시 계산하지 않는다(createRewardLog와 동일한 원칙).
 */
export async function createRaidGateClearLog(
  prisma: PrismaClient,
  params: {
    userId: string
    characterId: string
    raidId: string
    gates: RaidGateState[]
    gateIndex: number
    rewards: RewardEntry[]
    description?: string
  },
) {
  return prisma.$transaction(async (tx) => {
    const now = new Date()
    const gates = params.gates.map((gate) => ({ ...gate }))
    gates[params.gateIndex] = { ...gates[params.gateIndex], cleared: true }

    await tx.actionLog.create({
      data: {
        userId: params.userId,
        characterId: params.characterId,
        actionType: 'RAID_GATE_CLEAR',
        revertParams: { raidId: params.raidId, gateIndex: params.gateIndex },
        rewards:
          params.rewards.length > 0
            ? (toDisplayRewards(params.rewards) as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        description: params.description ?? null,
        createdAt: now,
      } satisfies ActionLogCreateInput,
    })

    const { statDelta } = computeStatisticDelta('RAID_GATE_CLEAR', params.rewards, 1)
    await applyStatisticDelta(tx, params.characterId, statDelta, now)

    const updatedRaid = await tx.characterRaid.update({
      where: { id: params.raidId },
      data: { gates: gates as unknown as Prisma.InputJsonValue },
    })

    await enforceActionLogCap(tx, params.userId)

    return updatedRaid
  })
}

/**
 * 에브니 큐브 클리어(POST .../ebony-cube/clear). 선택된 등급의 티켓을 consumedCount만큼
 * 차감하고 4티어 보석 보상을 지급한다 — 호출부(라우트)가 이미 보유 수량 검증(consumedCount
 * 이하인지)을 마쳤다고 가정한다(docs/ebony_cube_hal_hourglass.typ 참고).
 */
export async function createEbonyCubeClearLog(
  prisma: PrismaClient,
  params: {
    userId: string
    characterId: string
    ticketType: TicketType
    consumedCount: number
    rewards: RewardEntry[]
    description?: string
  },
) {
  return prisma.$transaction(async (tx) => {
    const now = new Date()
    const column = ticketColumnField(params.ticketType)

    const updatedEbonyCube = await tx.ebonyCube.update({
      where: { characterId: params.characterId },
      data: { [column]: { decrement: params.consumedCount } },
    })

    await tx.actionLog.create({
      data: {
        userId: params.userId,
        characterId: params.characterId,
        actionType: 'EBONY_CUBE_CLEAR',
        revertParams: { ticketType: params.ticketType, consumedCount: params.consumedCount },
        rewards: toDisplayRewards(params.rewards) as unknown as Prisma.InputJsonValue,
        description: params.description ?? null,
        createdAt: now,
      } satisfies ActionLogCreateInput,
    })

    const { statDelta } = computeStatisticDelta('EBONY_CUBE_CLEAR', params.rewards, 1)
    await applyStatisticDelta(tx, params.characterId, statDelta, now)
    await enforceActionLogCap(tx, params.userId)

    return updatedEbonyCube
  })
}

/**
 * 할의 모래시계 주간 완료(POST .../hal-hourglass/complete). 현재 스택(N)으로 (N+1)배 보상을
 * 계산해 지급하고, is_completed를 true로, sand_stack을 0으로 만든다(스택 소진 — 확정).
 */
export async function createHalHourglassCompleteLog(
  prisma: PrismaClient,
  params: {
    userId: string
    characterId: string
    sandStackConsumed: number
    rewards: RewardEntry[]
    description?: string
  },
) {
  return prisma.$transaction(async (tx) => {
    const now = new Date()

    const updatedHourglass = await tx.halHourglass.update({
      where: { characterId: params.characterId },
      data: { isCompleted: true, sandStack: 0 },
    })

    await tx.actionLog.create({
      data: {
        userId: params.userId,
        characterId: params.characterId,
        actionType: 'HAL_HOURGLASS_COMPLETE',
        revertParams: { sandStackConsumed: params.sandStackConsumed },
        rewards: toDisplayRewards(params.rewards) as unknown as Prisma.InputJsonValue,
        description: params.description ?? null,
        createdAt: now,
      } satisfies ActionLogCreateInput,
    })

    // HAL_HOURGLASS_COMPLETE는 Character_Statistics 갱신표에 대상 컬럼이 없다 — 로그에만 남는다.
    await enforceActionLogCap(tx, params.userId)

    return updatedHourglass
  })
}
