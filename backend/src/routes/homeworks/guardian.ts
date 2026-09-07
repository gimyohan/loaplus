import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'

import type { Prisma } from '@prisma/client'

import { getOrCreateGuardian, GUARDIAN_REST_GAUGE_COST, GUARDIAN_REST_GAUGE_MAX } from '../../lib/homeworkDefaults.js'
import type { ActionLogCreateInput } from '../../lib/actionLogs.js'
import { applyHarvestStatistics, createRewardLog, enforceActionLogCap, toDisplayRewards, toLogEntry } from '../../lib/actionLogs.js'
import { GUARDIAN_RAID_TARGETS, pickHighestEligibleTarget } from '../../lib/contentTargets.js'
import { buildGuardianHarvestRewards } from '../../lib/guardianRewardCatalog.js'
import { AZENA_BLESSING_REWARD_CATALOG, findRewardCatalogItem, SHARD_REWARD_CATALOG } from '../../lib/rewardCatalog.js'
import { requireAuth } from '../../lib/session.js'
import { harvestSchema, rewardSelectionSchema, toHomeworkSummary } from './shared.js'

const targetUpdateSchema = z.object({
  targetName: z.string().trim().min(1),
  restGauge: z.number().int().min(0),
  restGaugeThreshold: z.number().int().min(0),
})

export async function guardianHomeworkRoutes(fastify: FastifyInstance) {
  const auth = requireAuth(fastify)

  async function requireOwnedCharacter(characterId: string, userId: string, reply: FastifyReply) {
    const character = await fastify.prisma.character.findFirst({
      where: { id: characterId, userId },
    })
    if (!character) {
      reply.code(404).send({ error: 'character_not_found' })
      return null
    }
    return character
  }

  fastify.post<{ Params: { characterId: string } }>(
    '/api/characters/:characterId/guardian/harvest',
    { preHandler: auth, schema: { tags: ['Guardian'], summary: "가디언 토벌 '오늘 수확' 처리" } },
    async (request, reply) => {
      const character = await requireOwnedCharacter(
        request.params.characterId,
        request.userId!,
        reply,
      )
      if (!character) return

      const guardian = await getOrCreateGuardian(fastify.prisma, character.id, character.itemLevel)
      if (guardian.isHarvested) {
        return reply.code(409).send({ error: 'already_harvested' })
      }

      const parsed = harvestSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_request' })
      }

      const consumed = guardian.restGauge >= GUARDIAN_REST_GAUGE_COST
      const restGaugeConsumed = consumed ? GUARDIAN_REST_GAUGE_COST : 0
      // 1640 이상 목표만 보상이 있고(guardianRewardCatalog.ts 참고), 휴식 게이지를 소모한
      // 수확이면 보상이 2배가 된다(사용자 확인).
      const rewards = buildGuardianHarvestRewards(guardian.targetName, consumed)

      const updated = await fastify.prisma.$transaction(async (tx) => {
        const updatedGuardian = await tx.guardian.update({
          where: { characterId: character.id },
          data: {
            isHarvested: true,
            restGauge: guardian.restGauge - restGaugeConsumed,
            restGaugeConsumedByHarvest: consumed,
          },
        })
        const now = new Date()
        await tx.actionLog.create({
          data: {
            userId: request.userId!,
            characterId: character.id,
            actionType: 'HARVEST_GUARDIAN',
            revertParams: { restGaugeConsumed },
            rewards: toDisplayRewards(rewards) as unknown as Prisma.InputJsonValue,
            description: parsed.data?.description ?? null,
            createdAt: now,
          } satisfies ActionLogCreateInput,
        })
        await applyHarvestStatistics(tx, character.id, 'HARVEST_GUARDIAN', now, rewards)
        await enforceActionLogCap(tx, request.userId!)
        return updatedGuardian
      })

      return reply.send(toHomeworkSummary(updated))
    },
  )

  fastify.post<{ Params: { characterId: string } }>(
    '/api/characters/:characterId/guardian/reset',
    { preHandler: auth, schema: { tags: ['Guardian'], summary: "'오늘 수확' 완료 상태 초기화 (미사용)" } },
    async (request, reply) => {
      const character = await requireOwnedCharacter(
        request.params.characterId,
        request.userId!,
        reply,
      )
      if (!character) return

      const guardian = await getOrCreateGuardian(fastify.prisma, character.id, character.itemLevel)
      if (!guardian.isHarvested) {
        return reply.code(409).send({ error: 'not_harvested_yet' })
      }

      const updated = await fastify.prisma.guardian.update({
        where: { characterId: character.id },
        data: { isHarvested: false, restGaugeConsumedByHarvest: false },
      })

      return reply.send(toHomeworkSummary(updated))
    },
  )

  fastify.patch<{ Params: { characterId: string } }>(
    '/api/characters/:characterId/guardian/target',
    { preHandler: auth, schema: { tags: ['Guardian'], summary: '대상 가디언 변경' } },
    async (request, reply) => {
      const character = await requireOwnedCharacter(
        request.params.characterId,
        request.userId!,
        reply,
      )
      if (!character) return

      const parsed = targetUpdateSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_request' })
      }
      if (
        parsed.data.restGauge > GUARDIAN_REST_GAUGE_MAX ||
        parsed.data.restGaugeThreshold > GUARDIAN_REST_GAUGE_MAX
      ) {
        return reply.code(400).send({ error: 'invalid_request' })
      }

      await getOrCreateGuardian(fastify.prisma, character.id, character.itemLevel)
      // 선택한 대상이 현재 레벨 기준 자동 산정 값(가능한 가장 높은 가디언)과 같으면 자동 관리를
      // 켜고, 다르면(유저가 일부러 더 낮은 단계를 골랐으면) 끈다 — 이 모달은 게이지/임계치만
      // 바꿀 때도 항상 현재 targetName을 그대로 함께 보내므로, 매번 무조건 끄면 게이지만 조절해도
      // 자동 관리가 깨져 이후 새로고침으로도 최고 목표로 다시 맞춰지지 않는 문제가 있었다.
      const defaultTargetName = pickHighestEligibleTarget(GUARDIAN_RAID_TARGETS, character.itemLevel)
      const updated = await fastify.prisma.guardian.update({
        where: { characterId: character.id },
        data: {
          targetName: parsed.data.targetName,
          restGauge: parsed.data.restGauge,
          restGaugeThreshold: parsed.data.restGaugeThreshold,
          targetAutoManaged: parsed.data.targetName === defaultTargetName,
        },
      })

      return reply.send(toHomeworkSummary(updated))
    },
  )

  fastify.post<{ Params: { characterId: string } }>(
    '/api/characters/:characterId/guardian/shard-reward',
    { preHandler: auth, schema: { tags: ['Guardian'], summary: "'편린' 퀵액션 보상 확정" } },
    async (request, reply) => {
      const character = await requireOwnedCharacter(
        request.params.characterId,
        request.userId!,
        reply,
      )
      if (!character) return

      const parsed = rewardSelectionSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_request' })
      }

      const reward = findRewardCatalogItem(SHARD_REWARD_CATALOG, parsed.data.itemId)
      if (!reward) {
        return reply.code(400).send({ error: 'invalid_reward_item' })
      }

      const log = await createRewardLog(fastify.prisma, {
        userId: request.userId!,
        characterId: character.id,
        actionType: 'GUARDIAN_SHARD_REWARD',
        rewards: [reward],
        description: parsed.data.description,
      })

      return reply.code(201).send(toLogEntry(log))
    },
  )

  fastify.post<{ Params: { characterId: string } }>(
    '/api/characters/:characterId/guardian/azena-blessing-reward',
    { preHandler: auth, schema: { tags: ['Guardian'], summary: "'아제나 축복' 퀵액션 보상 확정" } },
    async (request, reply) => {
      const character = await requireOwnedCharacter(
        request.params.characterId,
        request.userId!,
        reply,
      )
      if (!character) return

      const parsed = rewardSelectionSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_request' })
      }

      const reward = findRewardCatalogItem(AZENA_BLESSING_REWARD_CATALOG, parsed.data.itemId)
      if (!reward) {
        return reply.code(400).send({ error: 'invalid_reward_item' })
      }

      const log = await createRewardLog(fastify.prisma, {
        userId: request.userId!,
        characterId: character.id,
        actionType: 'GUARDIAN_AZENA_BLESSING_REWARD',
        rewards: [reward],
        description: parsed.data.description,
      })

      return reply.code(201).send(toLogEntry(log))
    },
  )
}
