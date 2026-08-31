import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'

import type { ActionLogCreateInput } from '../../lib/actionLogs.js'
import { applyHarvestStatistics, createRewardLog, enforceActionLogCap, toLogEntry } from '../../lib/actionLogs.js'
import { isChaosRiftKurzanTarget } from '../../lib/contentTargets.js'
import type { TicketType } from '../../lib/ebonyCubeCatalog.js'
import { ensureValidSelection, ticketColumnField, ticketCountByType, ticketTypeForKurzanTarget } from '../../lib/ebonyCubeCatalog.js'
import {
  collectHalHourglassSand,
  getOrCreateEbonyCube,
  getOrCreateKurzanFrontline,
  KURZAN_REST_GAUGE_COST,
  KURZAN_REST_GAUGE_MAX,
} from '../../lib/homeworkDefaults.js'
import { AZENA_BLESSING_REWARD_CATALOG, findRewardCatalogItem, SHARD_REWARD_CATALOG } from '../../lib/rewardCatalog.js'
import { requireAuth } from '../../lib/session.js'
import { toEbonyCubeSummary, toHalHourglassSummary } from '../../lib/widgetSummaries.js'
import { harvestSchema, rewardSelectionSchema, toHomeworkSummary } from './shared.js'

const gaugeSettingsSchema = z.object({
  restGauge: z.number().int().min(0),
  restGaugeThreshold: z.number().int().min(0),
})

export async function kurzanHomeworkRoutes(fastify: FastifyInstance) {
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
    '/api/characters/:characterId/kurzan/harvest',
    { preHandler: auth, schema: { tags: ['Kurzan'], summary: "쿠르잔 전선 '오늘 수확' 처리" } },
    async (request, reply) => {
      const character = await requireOwnedCharacter(
        request.params.characterId,
        request.userId!,
        reply,
      )
      if (!character) return

      const kurzan = await getOrCreateKurzanFrontline(fastify.prisma, character.id, character.itemLevel)
      if (kurzan.isHarvested) {
        return reply.code(409).send({ error: 'already_harvested' })
      }

      const parsed = harvestSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_request' })
      }

      const consumed = kurzan.restGauge >= KURZAN_REST_GAUGE_COST
      const restGaugeConsumed = consumed ? KURZAN_REST_GAUGE_COST : 0

      const updated = await fastify.prisma.$transaction(async (tx) => {
        const updatedKurzan = await tx.kurzanFrontline.update({
          where: { characterId: character.id },
          data: {
            isHarvested: true,
            restGauge: kurzan.restGauge - restGaugeConsumed,
            restGaugeConsumedByHarvest: consumed,
          },
        })
        const now = new Date()
        await tx.actionLog.create({
          data: {
            userId: request.userId!,
            characterId: character.id,
            actionType: 'HARVEST_KURZAN',
            revertParams: { restGaugeConsumed },
            description: parsed.data?.description ?? null,
            createdAt: now,
          } satisfies ActionLogCreateInput,
        })
        await applyHarvestStatistics(tx, character.id, 'HARVEST_KURZAN', now)
        await enforceActionLogCap(tx, request.userId!)
        return updatedKurzan
      })

      return reply.send(toHomeworkSummary(updated))
    },
  )

  fastify.post<{ Params: { characterId: string } }>(
    '/api/characters/:characterId/kurzan/reset',
    { preHandler: auth, schema: { tags: ['Kurzan'], summary: '공명의 비약 사용 (수확 상태 초기화 + 입장권 충전)' } },
    async (request, reply) => {
      const character = await requireOwnedCharacter(
        request.params.characterId,
        request.userId!,
        reply,
      )
      if (!character) return

      const kurzan = await getOrCreateKurzanFrontline(fastify.prisma, character.id, character.itemLevel)
      if (!kurzan.isHarvested) {
        return reply.code(409).send({ error: 'not_harvested_yet' })
      }

      const updated = await fastify.prisma.kurzanFrontline.update({
        where: { characterId: character.id },
        data: { isHarvested: false, restGaugeConsumedByHarvest: false },
      })

      return reply.send(toHomeworkSummary(updated))
    },
  )

  fastify.patch<{ Params: { characterId: string } }>(
    '/api/characters/:characterId/kurzan/target',
    { preHandler: auth, schema: { tags: ['Kurzan'], summary: '대상 컨텐츠 변경' } },
    async (request, reply) => {
      const character = await requireOwnedCharacter(
        request.params.characterId,
        request.userId!,
        reply,
      )
      if (!character) return

      const parsed = gaugeSettingsSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_request' })
      }
      if (
        parsed.data.restGauge > KURZAN_REST_GAUGE_MAX ||
        parsed.data.restGaugeThreshold > KURZAN_REST_GAUGE_MAX
      ) {
        return reply.code(400).send({ error: 'invalid_request' })
      }

      await getOrCreateKurzanFrontline(fastify.prisma, character.id, character.itemLevel)
      const updated = await fastify.prisma.kurzanFrontline.update({
        where: { characterId: character.id },
        data: {
          restGauge: parsed.data.restGauge,
          restGaugeThreshold: parsed.data.restGaugeThreshold,
        },
      })

      return reply.send(toHomeworkSummary(updated))
    },
  )

  // 쿠르잔 전선 위젯의 티켓 표시 영역 클릭. 현재 target_name이 혼돈의 균열 구간이면 에브니 큐브
  // 대신 시련의 모래 스택을 적립하고(할의 모래시계와 동일한 +1/최대 5 규칙), 그 외(카오스 던전
  // 제외 — 아직 위젯 없음)는 기존처럼 target_name에 대응하는 큐브 티켓 등급을 찾아 Ebony_Cubes의
  // 그 등급 컬럼을 +1 한다. '오늘 수확' 여부와 무관하게 언제든 누를 수 있고, 둘 다 로그를 남기지
  // 않는 단순 적립이다(docs/ebony_cube_hal_hourglass.typ "쿠르잔 전선 위젯 변경" 참고). 대상이
  // ebonyCube/halHourglass 둘 중 어느 쪽이든 될 수 있는 kurzan 액션의 부수효과이므로, 그 판단과
  // 함께 kurzan.ts에 그대로 둔다(각 위젯 자신의 요약 변환은 lib/widgetSummaries.ts를 재사용).
  fastify.post<{ Params: { characterId: string } }>(
    '/api/characters/:characterId/kurzan/ticket/collect',
    {
      preHandler: auth,
      schema: {
        tags: ['Kurzan'],
        summary: '쿠르잔 전선 티켓 획득 클릭 (구간에 따라 에브니 큐브 등급별 +1 또는 시련의 모래 +1)',
      },
    },
    async (request, reply) => {
      const character = await requireOwnedCharacter(
        request.params.characterId,
        request.userId!,
        reply,
      )
      if (!character) return

      const kurzan = await getOrCreateKurzanFrontline(fastify.prisma, character.id, character.itemLevel)

      if (isChaosRiftKurzanTarget(kurzan.targetName)) {
        const updated = await collectHalHourglassSand(fastify.prisma, character.id, character.itemLevel)
        return reply.send(toHalHourglassSummary(updated))
      }

      await getOrCreateEbonyCube(fastify.prisma, character.id)

      // 이 서비스는 아직 카오스 던전 위젯이 없어 target_name이 카오스 던전 스테이지일 수도 있다 —
      // 그런 경우 큐브 등급 매핑표에 없으므로 거부한다.
      const ticketType = ticketTypeForKurzanTarget(kurzan.targetName)
      if (!ticketType) {
        return reply.code(409).send({ error: 'ticket_not_available_for_target' })
      }
      const column = ticketColumnField(ticketType)
      const incremented = await fastify.prisma.ebonyCube.update({
        where: { characterId: character.id },
        data: { [column]: { increment: 1 } },
      })
      const selectedTicketType = ensureValidSelection(
        ticketCountByType(incremented),
        incremented.selectedTicketType as TicketType | null,
        ticketType,
      )
      const updated =
        selectedTicketType === incremented.selectedTicketType
          ? incremented
          : await fastify.prisma.ebonyCube.update({
              where: { characterId: character.id },
              data: { selectedTicketType },
            })

      return reply.send(toEbonyCubeSummary(updated))
    },
  )

  fastify.post<{ Params: { characterId: string } }>(
    '/api/characters/:characterId/kurzan/shard-reward',
    { preHandler: auth, schema: { tags: ['Kurzan'], summary: "'편린' 퀵액션 보상 확정" } },
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
        actionType: 'KURZAN_SHARD_REWARD',
        rewards: [reward],
        description: parsed.data.description,
      })

      return reply.code(201).send(toLogEntry(log))
    },
  )

  fastify.post<{ Params: { characterId: string } }>(
    '/api/characters/:characterId/kurzan/azena-blessing-reward',
    { preHandler: auth, schema: { tags: ['Kurzan'], summary: "'아제나 축복' 퀵액션 보상 확정" } },
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
        actionType: 'KURZAN_AZENA_BLESSING_REWARD',
        rewards: [reward],
        description: parsed.data.description,
      })

      return reply.code(201).send(toLogEntry(log))
    },
  )
}
