import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'

import { requireAuth } from '../lib/session.js'

interface StatColumns {
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
  gemstoneTier4Earned: number
}

const ZERO_COLUMNS: StatColumns = {
  raidGoldEarned: 0,
  raidBoundGoldEarned: 0,
  shardGoldEarned: 0,
  shardBoundGoldEarned: 0,
  azenaBlessingGoldEarned: 0,
  azenaBlessingBoundGoldEarned: 0,
  paradiseGoldEarned: 0,
  paradiseBoundGoldEarned: 0,
  otherGoldEarned: 0,
  otherBoundGoldEarned: 0,
  guardianHarvestCount: 0,
  kurzanHarvestCount: 0,
  guardianShardRewardCount: 0,
  kurzanShardRewardCount: 0,
  guardianAzenaBlessingRewardCount: 0,
  kurzanAzenaBlessingRewardCount: 0,
  gemstoneTier4Earned: 0,
}

// Character_Statistics/Character_Statistics_Weekly 둘 다 이 컬럼 집합을 그대로 공유한다
// (docs/db_schema.typ 참고) — "전체 골드"/"편린 전체 횟수"/"아제나 축복 전체 횟수"는 저장하지
// 않고 항상 응답 생성 시점에 카테고리·컨텐츠별 컬럼을 합산해 계산한다.
function toStatFields(row: StatColumns | null) {
  const r = row ?? ZERO_COLUMNS
  return {
    totalGoldEarned: r.raidGoldEarned + r.shardGoldEarned + r.azenaBlessingGoldEarned + r.paradiseGoldEarned + r.otherGoldEarned,
    totalBoundGoldEarned:
      r.raidBoundGoldEarned + r.shardBoundGoldEarned + r.azenaBlessingBoundGoldEarned + r.paradiseBoundGoldEarned + r.otherBoundGoldEarned,
    raidGoldEarned: r.raidGoldEarned,
    raidBoundGoldEarned: r.raidBoundGoldEarned,
    shardGoldEarned: r.shardGoldEarned,
    shardBoundGoldEarned: r.shardBoundGoldEarned,
    azenaBlessingGoldEarned: r.azenaBlessingGoldEarned,
    azenaBlessingBoundGoldEarned: r.azenaBlessingBoundGoldEarned,
    paradiseGoldEarned: r.paradiseGoldEarned,
    paradiseBoundGoldEarned: r.paradiseBoundGoldEarned,
    otherGoldEarned: r.otherGoldEarned,
    otherBoundGoldEarned: r.otherBoundGoldEarned,
    guardianHarvestCount: r.guardianHarvestCount,
    kurzanHarvestCount: r.kurzanHarvestCount,
    shardRewardCount: r.guardianShardRewardCount + r.kurzanShardRewardCount,
    guardianShardRewardCount: r.guardianShardRewardCount,
    kurzanShardRewardCount: r.kurzanShardRewardCount,
    azenaBlessingRewardCount: r.guardianAzenaBlessingRewardCount + r.kurzanAzenaBlessingRewardCount,
    guardianAzenaBlessingRewardCount: r.guardianAzenaBlessingRewardCount,
    kurzanAzenaBlessingRewardCount: r.kurzanAzenaBlessingRewardCount,
    gemstoneTier4Earned: r.gemstoneTier4Earned,
  }
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}

const weeklyQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
})

const itemRewardsQuerySchema = z.object({
  rewardType: z.enum(['SHARD', 'AZENA_BLESSING']),
  contentType: z.enum(['ALL', 'GUARDIAN', 'KURZAN']).default('ALL'),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
})

export async function statisticsRoutes(fastify: FastifyInstance) {
  const auth = requireAuth(fastify)

  /** 요청한 캐릭터가 현재 유저 소유인지 확인. 아니면 404를 응답하고 null을 반환한다. */
  async function requireOwnedCharacter(characterId: string, userId: string, reply: FastifyReply) {
    const character = await fastify.prisma.character.findFirst({ where: { id: characterId, userId } })
    if (!character) {
      reply.code(404).send({ error: 'character_not_found' })
      return null
    }
    return character
  }

  // 모든 엔드포인트는 캐릭터 단위로만 존재한다 — 계정(로스터) 전체 합산을 서버가 미리 SUM해서
  // 캐싱해두는 엔드포인트는 두지 않으며, "모든 캐릭터 합" 뷰는 프론트가 캐릭터별 응답을 직접
  // 더해서 계산한다 (docs/statistics.typ "캐릭터 단위 관리" 참고).

  fastify.get(
    '/api/statistics/characters',
    { preHandler: auth, schema: { tags: ['Statistics'], summary: '캐릭터별 누적 통계 조회' } },
    async (request, reply) => {
    const characters = await fastify.prisma.character.findMany({
      where: { userId: request.userId! },
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
      select: { id: true, characterName: true, statistics: true },
    })

    return reply.send(
      characters.map((character) => ({
        characterId: character.id,
        characterName: character.characterName,
        ...toStatFields(character.statistics),
      })),
    )
  })

  fastify.get<{ Params: { characterId: string } }>(
    '/api/statistics/characters/:characterId/weekly',
    { preHandler: auth, schema: { tags: ['Statistics'], summary: '캐릭터의 주간 통계 조회' } },
    async (request, reply) => {
      const character = await requireOwnedCharacter(request.params.characterId, request.userId!, reply)
      if (!character) return

      const parsed = weeklyQuerySchema.safeParse(request.query)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_request' })
      }

      const rows = await fastify.prisma.characterStatisticWeekly.findMany({
        where: {
          characterId: character.id,
          ...(parsed.data.from || parsed.data.to
            ? {
                weekStartDate: {
                  ...(parsed.data.from ? { gte: parsed.data.from } : {}),
                  ...(parsed.data.to ? { lte: parsed.data.to } : {}),
                },
              }
            : {}),
        },
        orderBy: { weekStartDate: 'asc' },
      })

      return reply.send(
        rows.map((row) => ({
          weekStartDate: toDateOnly(row.weekStartDate),
          ...toStatFields(row),
        })),
      )
    },
  )

  fastify.get(
    '/api/statistics/weekly',
    { preHandler: auth, schema: { tags: ['Statistics'], summary: '내 계정 전체 캐릭터의 주간 통계 조회' } },
    async (request, reply) => {
    const parsed = weeklyQuerySchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_request' })
    }

    const rows = await fastify.prisma.characterStatisticWeekly.findMany({
      where: {
        character: { userId: request.userId! },
        ...(parsed.data.from || parsed.data.to
          ? {
              weekStartDate: {
                ...(parsed.data.from ? { gte: parsed.data.from } : {}),
                ...(parsed.data.to ? { lte: parsed.data.to } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ weekStartDate: 'asc' }, { characterId: 'asc' }],
    })

    return reply.send(
      rows.map((row) => ({
        characterId: row.characterId,
        weekStartDate: toDateOnly(row.weekStartDate),
        ...toStatFields(row),
      })),
    )
  })

  fastify.get<{ Params: { characterId: string } }>(
    '/api/statistics/characters/:characterId/item-rewards',
    { preHandler: auth, schema: { tags: ['Statistics'], summary: '아이템 단위 획득 비율/수량 통계 조회' } },
    async (request, reply) => {
      const character = await requireOwnedCharacter(request.params.characterId, request.userId!, reply)
      if (!character) return

      const parsed = itemRewardsQuerySchema.safeParse(request.query)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_request' })
      }

      const rows = await fastify.prisma.characterItemRewardStat.findMany({
        where: {
          characterId: character.id,
          rewardType: parsed.data.rewardType,
          ...(parsed.data.contentType !== 'ALL' ? { contentType: parsed.data.contentType } : {}),
          ...(parsed.data.from || parsed.data.to
            ? {
                weekStartDate: {
                  ...(parsed.data.from ? { gte: parsed.data.from } : {}),
                  ...(parsed.data.to ? { lte: parsed.data.to } : {}),
                },
              }
            : {}),
        },
      })

      // "전체"(contentType=ALL)는 가디언+쿠르잔을 합산하고, 여러 주에 걸친 행도 아이템(item_id)
      // 단위로 합친다 — 비율은 저장하지 않고 이 합산 결과 기준으로 조회 시점에 계산한다
      // (docs/statistics.typ "아이템 단위 비율·수량 통계" 참고).
      const merged = new Map<string, { itemId: string; itemName: string; categoryKey: string; count: number }>()
      for (const row of rows) {
        const existing = merged.get(row.itemId)
        if (existing) {
          existing.count += row.count
        } else {
          merged.set(row.itemId, {
            itemId: row.itemId,
            itemName: row.itemName,
            categoryKey: row.categoryKey,
            count: row.count,
          })
        }
      }

      const totalCount = [...merged.values()].reduce((sum, item) => sum + item.count, 0)
      const result = [...merged.values()]
        .map((item) => ({ ...item, ratio: totalCount > 0 ? item.count / totalCount : 0 }))
        .sort((a, b) => b.count - a.count)

      return reply.send(result)
    },
  )
}
