import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'

import { createEbonyCubeClearLog, createHalHourglassCompleteLog } from '../lib/actionLogs.js'
import {
  availableTicketTypes,
  cycleTicketType,
  ensureValidSelection,
  findTicketTier,
  ticketColumnField,
  ticketCountByType,
  TICKET_TYPES,
} from '../lib/ebonyCubeCatalog.js'
import type { TicketType } from '../lib/ebonyCubeCatalog.js'
import { collectHalHourglassSand, getOrCreateEbonyCube, getOrCreateHalHourglass } from '../lib/homeworkDefaults.js'
import { buildHalHourglassCompleteRewards, findHalHourglassLevel } from '../lib/halHourglassCatalog.js'
import { requireAuth } from '../lib/session.js'
import { toEbonyCubeSummary, toHalHourglassSummary } from '../lib/widgetSummaries.js'

const ticketTypeParamSchema = z.object({ ticketType: z.enum(TICKET_TYPES) })

const targetDirectionSchema = z.object({ direction: z.enum(['prev', 'next']) })

const ticketDeltaSchema = z.object({ delta: z.number().int() })

const clearSchema = z.object({
  times: z.union([z.literal(1), z.literal(3)]),
  description: z.string().trim().min(1).optional(),
})

const optionalDescriptionSchema = z.object({ description: z.string().trim().min(1).optional() }).optional()

const sandAdjustSchema = z.object({ delta: z.number().int() })

export async function ebonyCubeHalHourglassRoutes(fastify: FastifyInstance) {
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

  // === 에브니 큐브 ===========================================================

  fastify.patch<{ Params: { characterId: string } }>(
    '/api/characters/:characterId/ebony-cube/target',
    { preHandler: auth, schema: { tags: ['EbonyCube'], summary: '좌우 화살표로 큐브 목표 등급 선택 변경' } },
    async (request, reply) => {
      const character = await requireOwnedCharacter(request.params.characterId, request.userId!, reply)
      if (!character) return

      const parsed = targetDirectionSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_request' })
      }

      const ebonyCube = await getOrCreateEbonyCube(fastify.prisma, character.id)
      const available = availableTicketTypes(ticketCountByType(ebonyCube))
      const nextSelection = cycleTicketType(
        available,
        ebonyCube.selectedTicketType as TicketType | null,
        parsed.data.direction,
      )

      if (nextSelection === ebonyCube.selectedTicketType) {
        return reply.send(toEbonyCubeSummary(ebonyCube))
      }

      const updated = await fastify.prisma.ebonyCube.update({
        where: { characterId: character.id },
        data: { selectedTicketType: nextSelection },
      })
      return reply.send(toEbonyCubeSummary(updated))
    },
  )

  fastify.post<{ Params: { characterId: string } }>(
    '/api/characters/:characterId/ebony-cube/clear',
    { preHandler: auth, schema: { tags: ['EbonyCube'], summary: "'1회 클리어'/'3회 클리어' 버튼" } },
    async (request, reply) => {
      const character = await requireOwnedCharacter(request.params.characterId, request.userId!, reply)
      if (!character) return

      const parsed = clearSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_request' })
      }

      const ebonyCube = await getOrCreateEbonyCube(fastify.prisma, character.id)
      const ticketType = ebonyCube.selectedTicketType as TicketType | null
      if (!ticketType) {
        return reply.code(400).send({ error: 'no_ticket_selected' })
      }

      const counts = ticketCountByType(ebonyCube)
      if (counts[ticketType] < parsed.data.times) {
        return reply.code(400).send({ error: 'insufficient_tickets' })
      }

      const tier = findTicketTier(ticketType)
      if (!tier) {
        return reply.code(500).send({ error: 'ebony_cube_catalog_inconsistent' })
      }

      const updated = await createEbonyCubeClearLog(fastify.prisma, {
        userId: request.userId!,
        characterId: character.id,
        ticketType,
        consumedCount: parsed.data.times,
        rewards: [
          {
            categoryKey: 'gemstone',
            itemName: '4티어 보석',
            amount: tier.gemstoneReward * parsed.data.times,
          },
        ],
        description: parsed.data.description,
      })

      // 소모 결과 선택된 등급의 수량이 0이 됐으면(다른 등급 재고가 있는 한) 다음 유효한 등급으로 넘어간다.
      const newCounts = ticketCountByType(updated)
      const nextSelection = ensureValidSelection(newCounts, ticketType, ticketType)
      const final =
        nextSelection === updated.selectedTicketType
          ? updated
          : await fastify.prisma.ebonyCube.update({
              where: { characterId: character.id },
              data: { selectedTicketType: nextSelection },
            })

      return reply.code(201).send(toEbonyCubeSummary(final))
    },
  )

  fastify.patch<{ Params: { characterId: string; ticketType: string } }>(
    '/api/characters/:characterId/ebony-cube/tickets/:ticketType',
    { preHandler: auth, schema: { tags: ['EbonyCube'], summary: '설정 모달의 등급별 티켓 수량 조절' } },
    async (request, reply) => {
      const character = await requireOwnedCharacter(request.params.characterId, request.userId!, reply)
      if (!character) return

      const paramsParsed = ticketTypeParamSchema.safeParse(request.params)
      const bodyParsed = ticketDeltaSchema.safeParse(request.body)
      if (!paramsParsed.success || !bodyParsed.success) {
        return reply.code(400).send({ error: 'invalid_request' })
      }
      const ticketType = paramsParsed.data.ticketType

      const ebonyCube = await getOrCreateEbonyCube(fastify.prisma, character.id)
      const counts = ticketCountByType(ebonyCube)
      const result = counts[ticketType] + bodyParsed.data.delta
      if (result < 0) {
        return reply.code(400).send({ error: 'invalid_request' })
      }

      const column = ticketColumnField(ticketType)
      const updated = await fastify.prisma.ebonyCube.update({
        where: { characterId: character.id },
        data: { [column]: result },
      })

      const nextSelection = ensureValidSelection(
        ticketCountByType(updated),
        updated.selectedTicketType as TicketType | null,
        ticketType,
      )
      const final =
        nextSelection === updated.selectedTicketType
          ? updated
          : await fastify.prisma.ebonyCube.update({
              where: { characterId: character.id },
              data: { selectedTicketType: nextSelection },
            })

      return reply.send(toEbonyCubeSummary(final))
    },
  )

  // === 할의 모래시계 ==========================================================

  fastify.post<{ Params: { characterId: string } }>(
    '/api/characters/:characterId/hal-hourglass/sand/collect',
    { preHandler: auth, schema: { tags: ['HalHourglass'], summary: '시련의 모래 획득 클릭 (스택 +1, 최대 5)' } },
    async (request, reply) => {
      const character = await requireOwnedCharacter(request.params.characterId, request.userId!, reply)
      if (!character) return

      const updated = await collectHalHourglassSand(fastify.prisma, character.id, character.itemLevel)
      return reply.send(toHalHourglassSummary(updated))
    },
  )

  fastify.post<{ Params: { characterId: string } }>(
    '/api/characters/:characterId/hal-hourglass/complete',
    { preHandler: auth, schema: { tags: ['HalHourglass'], summary: '주간 완료 처리 ((스택+1)배 보상 확정 후 스택 소진)' } },
    async (request, reply) => {
      const character = await requireOwnedCharacter(request.params.characterId, request.userId!, reply)
      if (!character) return

      const hourglass = await getOrCreateHalHourglass(fastify.prisma, character.id, character.itemLevel)
      if (hourglass.isCompleted) {
        return reply.code(409).send({ error: 'already_completed' })
      }

      const parsed = optionalDescriptionSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_request' })
      }

      const level = findHalHourglassLevel(hourglass.level)
      if (!level) {
        return reply.code(500).send({ error: 'hal_hourglass_catalog_inconsistent' })
      }

      const updated = await createHalHourglassCompleteLog(fastify.prisma, {
        userId: request.userId!,
        characterId: character.id,
        sandStackConsumed: hourglass.sandStack,
        rewards: buildHalHourglassCompleteRewards(level, hourglass.sandStack),
        description: parsed.data?.description,
      })

      return reply.send(toHalHourglassSummary(updated))
    },
  )

  fastify.patch<{ Params: { characterId: string } }>(
    '/api/characters/:characterId/hal-hourglass/sand',
    { preHandler: auth, schema: { tags: ['HalHourglass'], summary: '설정 모달의 시련의 모래 스택 수동 조절' } },
    async (request, reply) => {
      const character = await requireOwnedCharacter(request.params.characterId, request.userId!, reply)
      if (!character) return

      const parsed = sandAdjustSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_request' })
      }

      const hourglass = await getOrCreateHalHourglass(fastify.prisma, character.id, character.itemLevel)
      const newSandStack = hourglass.sandStack + parsed.data.delta
      if (newSandStack < 0 || newSandStack > 5) {
        return reply.code(400).send({ error: 'invalid_request' })
      }

      // 보상을 지급하지 않는 단순 상태 조정이라 에브니 큐브 티켓 수량 조절과 동일하게
      // 로그를 남기지 않는다(docs/ebony_cube_hal_hourglass.typ 참고).
      const updated = await fastify.prisma.halHourglass.update({
        where: { characterId: character.id },
        data: { sandStack: newSandStack },
      })

      return reply.send(toHalHourglassSummary(updated))
    },
  )
}
