import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'

import { createRewardLog, toLogEntry } from '../../lib/actionLogs.js'
import { getOrCreateParadise } from '../../lib/homeworkDefaults.js'
import { requireAuth } from '../../lib/session.js'
import { toParadiseSummary } from './shared.js'

const paradiseSettingsSchema = z.object({
  ticketCount: z.number().int().min(0),
  keyCount: z.number().int().min(0),
  autoRecharge: z.boolean(),
})

// 낙원은 귀속골드만 지급하므로(docs/statistics.typ 참고) 기타 수입과 달리 필드가 하나뿐이다.
const paradiseGoldRewardSchema = z.object({
  amount: z.number().int().min(1),
  description: z.string().trim().min(1).optional(),
})

export async function paradiseHomeworkRoutes(fastify: FastifyInstance) {
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
    '/api/characters/:characterId/paradise/ticket/consume',
    { preHandler: auth, schema: { tags: ['Paradise'], summary: '천상 스택(티켓) 1개 소모' } },
    async (request, reply) => {
      const character = await requireOwnedCharacter(
        request.params.characterId,
        request.userId!,
        reply,
      )
      if (!character) return

      const paradise = await getOrCreateParadise(fastify.prisma, character.id)
      const updated = await fastify.prisma.paradise.update({
        where: { characterId: character.id },
        data: { ticketCount: Math.max(paradise.ticketCount - 1, 0) },
      })

      return reply.send(toParadiseSummary(updated))
    },
  )

  fastify.post<{ Params: { characterId: string } }>(
    '/api/characters/:characterId/paradise/key/consume',
    { preHandler: auth, schema: { tags: ['Paradise'], summary: '지옥 열쇠 1개 소모' } },
    async (request, reply) => {
      const character = await requireOwnedCharacter(
        request.params.characterId,
        request.userId!,
        reply,
      )
      if (!character) return

      const paradise = await getOrCreateParadise(fastify.prisma, character.id)
      const updated = await fastify.prisma.paradise.update({
        where: { characterId: character.id },
        data: { keyCount: Math.max(paradise.keyCount - 1, 0) },
      })

      return reply.send(toParadiseSummary(updated))
    },
  )

  fastify.patch<{ Params: { characterId: string } }>(
    '/api/characters/:characterId/paradise/settings',
    { preHandler: auth, schema: { tags: ['Paradise'], summary: '자동 충전 등 낙원 설정 변경' } },
    async (request, reply) => {
      const character = await requireOwnedCharacter(
        request.params.characterId,
        request.userId!,
        reply,
      )
      if (!character) return

      const parsed = paradiseSettingsSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_request' })
      }

      await getOrCreateParadise(fastify.prisma, character.id)
      const updated = await fastify.prisma.paradise.update({
        where: { characterId: character.id },
        data: {
          ticketCount: parsed.data.ticketCount,
          keyCount: parsed.data.keyCount,
          autoRecharge: parsed.data.autoRecharge,
        },
      })

      return reply.send(toParadiseSummary(updated))
    },
  )

  // 낙원 보상(귀속골드) 확정. 편린/아제나 축복과 동일하게 티켓/열쇠 상태는 건드리지 않고
  // 로그(및 획득 통계 paradise_bound_gold_earned)만 남긴다 — createRewardLog 재사용
  // (docs/statistics.typ "골드 획득 카테고리" 참고, 낙원 위젯 재설계의 일부).
  fastify.post<{ Params: { characterId: string } }>(
    '/api/characters/:characterId/paradise/gold-reward',
    { preHandler: auth, schema: { tags: ['Paradise'], summary: '낙원 귀속골드 획득 기록' } },
    async (request, reply) => {
      const character = await requireOwnedCharacter(
        request.params.characterId,
        request.userId!,
        reply,
      )
      if (!character) return

      const parsed = paradiseGoldRewardSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_request' })
      }

      const log = await createRewardLog(fastify.prisma, {
        userId: request.userId!,
        characterId: character.id,
        actionType: 'PARADISE_GOLD_REWARD',
        rewards: [{ categoryKey: 'boundGold', itemName: '귀속골드', amount: parsed.data.amount }],
        description: parsed.data.description,
      })

      return reply.code(201).send(toLogEntry(log))
    },
  )
}
